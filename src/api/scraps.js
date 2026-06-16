import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase'
import { getReferencesByIds } from './references'

const SCRAP_TARGET_TYPES = ['together', 'reference']
const SCRAP_ACTIONS = ['SCRAP', 'UNSCRAP']

function createScrapError(code, message) {
  const error = new Error(message)
  error.code = code

  return error
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createScrapError(
      'REF-CONFIG-MISSING',
      'Firebase 설정 후 찜 기능을 사용할 수 있어요.'
    )
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createScrapError(code, '로그인이 필요한 기능입니다.')
  }
}

// scraps 문서 ID는 {uid}_{targetType}_{targetId} 복합키.
// 동일 대상에 대한 중복 찜을 docId 차원에서 차단한다 (스키마 출처: firestore.rules).
function buildScrapId(uid, targetType, targetId) {
  return `${uid}_${targetType}_${targetId}`
}

function toMillis(timestamp) {
  if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }

  return 0
}

// 현재 사용자의 참고 주제 찜 레코드를 created_at 내림차순으로 반환한다.
// uid 단일 등가 필터만 사용하고 target_type 필터/정렬은 클라이언트에서 처리해
// 별도 복합 인덱스 없이 동작하도록 한다.
async function getReferenceScraps(uid) {
  const scrapsQuery = query(collection(db, 'scraps'), where('uid', '==', uid))
  const snapshot = await getDocs(scrapsQuery)

  return snapshot.docs
    .map((scrapSnapshot) => scrapSnapshot.data())
    .filter(
      (scrapData) =>
        scrapData.target_type === 'reference' && scrapData.target_id
    )
    .sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at))
}

// F-REF-002: 참고 주제 찜 변경 (SCRAP / UNSCRAP).
export async function toggleScrap({ uid, targetType, targetId, action }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-002-UNAUTHENTICATED')

  if (!SCRAP_TARGET_TYPES.includes(targetType)) {
    throw createScrapError(
      'REF-002-INVALID-TARGET',
      '찜 대상이 올바르지 않습니다.'
    )
  }

  if (!targetId) {
    throw createScrapError('REF-002-NOT-FOUND', '참고 주제를 찾을 수 없습니다.')
  }

  if (!SCRAP_ACTIONS.includes(action)) {
    throw createScrapError(
      'REF-002-INVALID-ACTION',
      '찜 처리 방식이 올바르지 않습니다.'
    )
  }

  const scrapId = buildScrapId(uid, targetType, targetId)
  const scrapRef = doc(db, 'scraps', scrapId)

  try {
    const existing = await getDoc(scrapRef)

    if (action === 'SCRAP') {
      if (existing.exists()) {
        return { targetId, isScrapped: true, changed: false }
      }

      await setDoc(scrapRef, {
        scrap_id: scrapId,
        uid,
        target_type: targetType,
        target_id: targetId,
        created_at: serverTimestamp(),
      })

      return { targetId, isScrapped: true, changed: true }
    }

    if (!existing.exists()) {
      return { targetId, isScrapped: false, changed: false }
    }

    await deleteDoc(scrapRef)

    return { targetId, isScrapped: false, changed: true }
  } catch {
    throw createScrapError('REF-002-SAVE-FAILED', '찜 처리에 실패했습니다.')
  }
}

// 토글 상태 표시용: 현재 사용자가 찜한 참고 주제 ID 집합.
// 찜 상태 로딩 실패는 목록 조회를 막지 않도록 빈 Set을 반환한다.
export async function getScrappedReferenceIds(uid) {
  assertFirebaseConfigured()

  if (!uid) {
    return new Set()
  }

  let scraps
  try {
    scraps = await getReferenceScraps(uid)
  } catch {
    return new Set()
  }

  return new Set(scraps.map((scrapData) => scrapData.target_id))
}

// F-REF-003: 찜한 주제 목록 조회.
export async function getScrappedReferences(uid) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-003-UNAUTHENTICATED')

  let scraps
  try {
    scraps = await getReferenceScraps(uid)
  } catch {
    throw createScrapError(
      'REF-003-LOAD-FAILED',
      '찜한 주제를 불러오지 못했습니다.'
    )
  }

  if (scraps.length === 0) {
    return []
  }

  const referenceIds = scraps.map((scrapData) => scrapData.target_id)

  return getReferencesByIds(referenceIds)
}
