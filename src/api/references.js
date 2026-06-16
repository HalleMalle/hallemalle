import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase'

const TITLE_MAX = 80
const DESCRIPTION_MAX = 1000
const TAG_MAX = 20
const TAGS_MAX = 5

function createReferenceError(code, message) {
  const error = new Error(message)
  error.code = code

  return error
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createReferenceError(
      'REF-CONFIG-MISSING',
      'Firebase 설정 후 참고주제 기능을 사용할 수 있어요.'
    )
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createReferenceError(code, '로그인이 필요한 기능입니다.')
  }
}

// 태그 입력을 정규화한다: 트림·빈값 제거·길이 제한·중복 제거·최대 개수 제한.
function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return []
  }

  const seen = new Set()
  const normalized = []

  for (const rawTag of tags) {
    if (typeof rawTag !== 'string') {
      continue
    }

    const tag = rawTag.trim()

    if (!tag || tag.length > TAG_MAX || seen.has(tag)) {
      continue
    }

    seen.add(tag)
    normalized.push(tag)

    if (normalized.length >= TAGS_MAX) {
      break
    }
  }

  return normalized
}

// references/{referenceId} 문서를 화면에서 쓰기 좋은 형태로 정규화한다.
// 스키마 출처: firestore.rules의 references 규칙 (snake_case).
function toReference(referenceId, referenceData, tags) {
  return {
    referenceId,
    ...referenceData,
    title: referenceData.title || '',
    description: referenceData.description || '',
    sourceType: referenceData.source_type || 'internal',
    likesCount: referenceData.likes_count || 0,
    createdBy: referenceData.created_by || '',
    createdAt: referenceData.created_at || null,
    updatedAt: referenceData.updated_at || null,
    tags,
  }
}

// reference_tags 컬렉션을 한 번에 읽어 reference_id 기준으로 묶는다.
// 태그 로딩 실패는 목록 조회 자체를 막지 않는다 (graceful degradation).
async function getTagsByReferenceId() {
  const tagsByReferenceId = new Map()

  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'reference_tags'))
  } catch {
    return tagsByReferenceId
  }

  snapshot.forEach((tagSnapshot) => {
    const tagData = tagSnapshot.data()
    const referenceId = tagData.reference_id

    if (!referenceId || !tagData.tag) {
      return
    }

    const existingTags = tagsByReferenceId.get(referenceId) || []
    existingTags.push(tagData.tag)
    tagsByReferenceId.set(referenceId, existingTags)
  })

  return tagsByReferenceId
}

// 단일 주제의 reference_tags 문서 스냅샷을 반환한다 (수정·삭제 시 재사용).
async function getTagDocsByReferenceId(referenceId) {
  const tagsQuery = query(
    collection(db, 'reference_tags'),
    where('reference_id', '==', referenceId)
  )

  return getDocs(tagsQuery)
}

// 주제의 태그를 입력값과 일치하도록 재동기화한다 (기존 삭제 후 신규 추가).
// 태그 동기화 실패는 본문 저장 결과를 되돌리지 않는다 (best-effort).
async function syncTags(referenceId, tags) {
  try {
    const existing = await getTagDocsByReferenceId(referenceId)
    const batch = writeBatch(db)

    existing.forEach((tagSnapshot) => {
      batch.delete(tagSnapshot.ref)
    })

    tags.forEach((tag) => {
      const tagRef = doc(collection(db, 'reference_tags'))
      batch.set(tagRef, { reference_id: referenceId, tag })
    })

    await batch.commit()
  } catch {
    // 태그 동기화는 보조 작업이므로 실패해도 본문 변경은 유지한다.
  }
}

// F-REF-001: 참고 주제 목록 조회. sort=LATEST(최신) | POPULAR(추천순).
// 인증/접근 차단은 ProtectedRoute + Firestore Rules에서 수행한다.
export async function getReferences({ sort = 'LATEST' } = {}) {
  assertFirebaseConfigured()

  const orderField = sort === 'POPULAR' ? 'likes_count' : 'created_at'
  const referencesQuery = query(
    collection(db, 'references'),
    orderBy(orderField, 'desc')
  )

  let snapshot
  try {
    snapshot = await getDocs(referencesQuery)
  } catch {
    throw createReferenceError(
      'REF-001-LOAD-FAILED',
      '참고 주제를 불러오지 못했습니다.'
    )
  }

  if (snapshot.empty) {
    return []
  }

  const tagsByReferenceId = await getTagsByReferenceId()

  return snapshot.docs.map((referenceSnapshot) => {
    const referenceData = referenceSnapshot.data()
    const referenceId = referenceData.reference_id || referenceSnapshot.id

    return toReference(
      referenceSnapshot.id,
      referenceData,
      tagsByReferenceId.get(referenceId) || []
    )
  })
}

// 단일 참고 주제 조회 (수정 폼 프리필 등). 없으면 null.
export async function getReferenceById(referenceId) {
  assertFirebaseConfigured()

  if (!referenceId) {
    return null
  }

  let snapshot
  try {
    snapshot = await getDoc(doc(db, 'references', referenceId))
  } catch {
    throw createReferenceError(
      'REF-001-LOAD-FAILED',
      '참고 주제를 불러오지 못했습니다.'
    )
  }

  if (!snapshot.exists()) {
    return null
  }

  let tags = []
  try {
    const tagDocs = await getTagDocsByReferenceId(referenceId)
    tags = tagDocs.docs
      .map((tagSnapshot) => tagSnapshot.data().tag)
      .filter(Boolean)
  } catch {
    // 태그 로딩 실패 시 빈 배열을 유지한다 (graceful degradation).
  }

  return toReference(snapshot.id, snapshot.data(), tags)
}

// 주어진 referenceId 목록에 해당하는 참고 주제를 입력 순서대로 반환한다.
// 찜한 주제 목록(F-REF-003) 등에서 정규화 로직을 재사용하기 위한 헬퍼.
export async function getReferencesByIds(referenceIds) {
  assertFirebaseConfigured()

  if (!referenceIds || referenceIds.length === 0) {
    return []
  }

  let snapshots
  try {
    snapshots = await Promise.all(
      referenceIds.map((referenceId) =>
        getDoc(doc(db, 'references', referenceId))
      )
    )
  } catch {
    throw createReferenceError(
      'REF-003-LOAD-FAILED',
      '찜한 주제를 불러오지 못했습니다.'
    )
  }

  const tagsByReferenceId = await getTagsByReferenceId()

  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => {
      const referenceData = snapshot.data()
      const referenceId = referenceData.reference_id || snapshot.id

      return toReference(
        snapshot.id,
        referenceData,
        tagsByReferenceId.get(referenceId) || []
      )
    })
}

// F-REF-005: 참고 주제 작성. source_type=internal, likes_count=0으로 초기화한다.
// 태그는 reference_tags 생성 규칙이 references 사전 존재를 요구하므로 본문 저장 후 추가한다.
export async function createReference({ uid, title, description, tags = [] }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-005-UNAUTHENTICATED')

  const normalizedTitle = (title || '').trim()
  const normalizedDescription = (description || '').trim()

  if (!normalizedTitle || !normalizedDescription) {
    throw createReferenceError(
      'REF-005-REQUIRED-MISSING',
      '제목과 설명을 입력해주세요.'
    )
  }

  if (
    normalizedTitle.length > TITLE_MAX ||
    normalizedDescription.length > DESCRIPTION_MAX
  ) {
    throw createReferenceError(
      'REF-005-REQUIRED-MISSING',
      `제목은 ${TITLE_MAX}자, 설명은 ${DESCRIPTION_MAX}자 이내로 입력해주세요.`
    )
  }

  const normalizedTags = normalizeTags(tags)
  const referenceRef = doc(collection(db, 'references'))
  const referenceId = referenceRef.id

  try {
    await setDoc(referenceRef, {
      reference_id: referenceId,
      title: normalizedTitle,
      description: normalizedDescription,
      source_type: 'internal',
      likes_count: 0,
      created_by: uid,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
  } catch {
    throw createReferenceError(
      'REF-005-CREATE-FAILED',
      '참고 주제 작성에 실패했습니다.'
    )
  }

  if (normalizedTags.length > 0) {
    await syncTags(referenceId, normalizedTags)
  }

  return { referenceId }
}

// F-REF-006: 참고 주제 수정. 작성자만, 본문(title/description)·태그 변경.
export async function updateReference({
  uid,
  referenceId,
  title,
  description,
  tags,
}) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-006-UNAUTHENTICATED')

  if (!referenceId) {
    throw createReferenceError(
      'REF-006-NOT-FOUND',
      '참고 주제를 찾을 수 없습니다.'
    )
  }

  const referenceRef = doc(db, 'references', referenceId)

  let snapshot
  try {
    snapshot = await getDoc(referenceRef)
  } catch {
    throw createReferenceError(
      'REF-006-UPDATE-FAILED',
      '참고 주제 수정에 실패했습니다.'
    )
  }

  if (!snapshot.exists()) {
    throw createReferenceError(
      'REF-006-NOT-FOUND',
      '참고 주제를 찾을 수 없습니다.'
    )
  }

  if (snapshot.data().created_by !== uid) {
    throw createReferenceError('REF-006-FORBIDDEN', '수정 권한이 없습니다.')
  }

  const patch = { updated_at: serverTimestamp() }

  if (title !== undefined) {
    const normalizedTitle = (title || '').trim()

    if (!normalizedTitle || normalizedTitle.length > TITLE_MAX) {
      throw createReferenceError(
        'REF-006-UPDATE-FAILED',
        `제목은 1~${TITLE_MAX}자로 입력해주세요.`
      )
    }

    patch.title = normalizedTitle
  }

  if (description !== undefined) {
    const normalizedDescription = (description || '').trim()

    if (
      !normalizedDescription ||
      normalizedDescription.length > DESCRIPTION_MAX
    ) {
      throw createReferenceError(
        'REF-006-UPDATE-FAILED',
        `설명은 1~${DESCRIPTION_MAX}자로 입력해주세요.`
      )
    }

    patch.description = normalizedDescription
  }

  try {
    await updateDoc(referenceRef, patch)
  } catch {
    throw createReferenceError(
      'REF-006-UPDATE-FAILED',
      '참고 주제 수정에 실패했습니다.'
    )
  }

  if (tags !== undefined) {
    await syncTags(referenceId, normalizeTags(tags))
  }

  return { referenceId }
}

// F-REF-007: 참고 주제 삭제. 작성자만, 연관 태그·추천(Like)도 함께 정리한다.
export async function deleteReference({ uid, referenceId }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-007-UNAUTHENTICATED')

  if (!referenceId) {
    throw createReferenceError(
      'REF-007-NOT-FOUND',
      '참고 주제를 찾을 수 없습니다.'
    )
  }

  const referenceRef = doc(db, 'references', referenceId)

  let snapshot
  try {
    snapshot = await getDoc(referenceRef)
  } catch {
    throw createReferenceError(
      'REF-007-DELETE-FAILED',
      '참고 주제 삭제에 실패했습니다.'
    )
  }

  if (!snapshot.exists()) {
    throw createReferenceError(
      'REF-007-NOT-FOUND',
      '참고 주제를 찾을 수 없습니다.'
    )
  }

  if (snapshot.data().created_by !== uid) {
    throw createReferenceError('REF-007-FORBIDDEN', '삭제 권한이 없습니다.')
  }

  try {
    const [tagDocs, likeDocs] = await Promise.all([
      getTagDocsByReferenceId(referenceId),
      getDocs(
        query(
          collection(db, 'reference_likes'),
          where('reference_id', '==', referenceId)
        )
      ),
    ])

    // 주제 문서가 아직 존재하는 동안 연관 문서를 같은 배치로 삭제한다
    // (Rules의 get/exists는 커밋 전 상태를 읽으므로 작성자 검증이 통과한다).
    const batch = writeBatch(db)

    tagDocs.forEach((tagSnapshot) => batch.delete(tagSnapshot.ref))
    likeDocs.forEach((likeSnapshot) => batch.delete(likeSnapshot.ref))
    batch.delete(referenceRef)

    await batch.commit()
  } catch {
    throw createReferenceError(
      'REF-007-DELETE-FAILED',
      '참고 주제 삭제에 실패했습니다.'
    )
  }

  return { referenceId, deleted: true }
}
