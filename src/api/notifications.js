import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase'

function createNotificationError(code, message) {
  const error = new Error(message)
  error.code = code

  return error
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createNotificationError(
      'NOTI-CONFIG-MISSING',
      'Firebase 설정 후 알림 기능을 사용할 수 있어요.'
    )
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createNotificationError(code, '로그인이 필요한 기능입니다.')
  }
}

function toMillis(timestamp) {
  if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }

  return 0
}

// notifications/{id} 문서를 화면용으로 정규화한다.
// 스키마 출처: firestore.rules의 notifications 규칙 (snake_case).
function toNotification(notificationId, data) {
  return {
    notificationId,
    receiverUid: data.receiver_uid || '',
    type: data.type || '',
    message: data.message || '',
    isRead: data.is_read ?? false,
    refProjectId: data.ref_project_id || null,
    refApplicationId: data.ref_application_id || null,
    createdAt: data.created_at || null,
  }
}

// 현재 사용자의 알림을 최신순으로 반환한다.
// receiver_uid 단일 equality 필터만 사용하고 정렬은 클라이언트에서 처리해
// 복합 인덱스 없이 동작하도록 한다(scraps/retrospectives 컨벤션).
async function fetchNotifications(uid) {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('receiver_uid', '==', uid)
  )

  const snapshot = await getDocs(notificationsQuery)

  return snapshot.docs
    .map((notificationSnapshot) =>
      toNotification(notificationSnapshot.id, notificationSnapshot.data())
    )
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
}

// F-NOTI-002: 알림 목록 조회 (본인, 최신순).
export async function getNotifications(uid) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'NOTI-002-UNAUTHENTICATED')

  try {
    return await fetchNotifications(uid)
  } catch (error) {
    if (error?.code === 'NOTI-002-UNAUTHENTICATED') {
      throw error
    }

    throw createNotificationError(
      'NOTI-002-LOAD-FAILED',
      '알림 목록을 불러오지 못했습니다.'
    )
  }
}

// F-NOTI-001: 알림 요약 조회 (최근 limit건 + 전체/미확인 수).
export async function getNotificationSummary(uid, { limit = 5 } = {}) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'NOTI-001-UNAUTHENTICATED')

  const safeLimit =
    Number.isInteger(limit) && limit >= 1 && limit <= 10 ? limit : 5

  let all
  try {
    all = await fetchNotifications(uid)
  } catch {
    throw createNotificationError(
      'NOTI-001-LOAD-FAILED',
      '알림을 불러오지 못했습니다.'
    )
  }

  return {
    recentNotifications: all.slice(0, safeLimit),
    totalCount: all.length,
    unreadCount: all.filter((notification) => !notification.isRead).length,
  }
}

// 알림 읽음 처리. is_read 단일 필드만 갱신한다
// (firestore.rules update가 affectedKeys().hasOnly(['is_read'])를 강제).
export async function markAsRead({ uid, notificationId }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'NOTI-UNAUTHENTICATED')

  if (!notificationId) {
    return { notificationId: null, changed: false }
  }

  try {
    await updateDoc(doc(db, 'notifications', notificationId), { is_read: true })
  } catch {
    throw createNotificationError(
      'NOTI-UPDATE-FAILED',
      '알림 상태를 변경하지 못했습니다.'
    )
  }

  return { notificationId, changed: true }
}

// 미확인 알림 일괄 읽음 처리. is_read만 배치로 갱신한다.
export async function markAllAsRead(uid) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'NOTI-UNAUTHENTICATED')

  let unread
  try {
    const all = await fetchNotifications(uid)
    unread = all.filter((notification) => !notification.isRead)
  } catch {
    throw createNotificationError(
      'NOTI-UPDATE-FAILED',
      '알림 상태를 변경하지 못했습니다.'
    )
  }

  if (unread.length === 0) {
    return { updatedCount: 0 }
  }

  try {
    const batch = writeBatch(db)

    unread.forEach((notification) => {
      batch.update(doc(db, 'notifications', notification.notificationId), {
        is_read: true,
      })
    })

    await batch.commit()
  } catch {
    throw createNotificationError(
      'NOTI-UPDATE-FAILED',
      '알림 상태를 변경하지 못했습니다.'
    )
  }

  return { updatedCount: unread.length }
}
