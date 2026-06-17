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
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase'

// 회고록(코드 키 Retrospective*)의 Firestore 컬렉션명은 memoirs (firestore.rules 기준).
const TITLE_MAX = 100
const CONTENT_MAX = 10000

function createMemoirError(code, message) {
  const error = new Error(message)
  error.code = code

  return error
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createMemoirError(
      'MEM-CONFIG-MISSING',
      'Firebase 설정 후 회고록 기능을 사용할 수 있어요.'
    )
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createMemoirError(code, '로그인이 필요한 기능입니다.')
  }
}

// memoirs/{memoirId} 문서를 화면에서 쓰기 좋은 형태로 정규화한다.
// 스키마 출처: firestore.rules의 memoirs 규칙 (snake_case).
function toMemoir(memoirId, data) {
  return {
    memoirId,
    title: data.title || '',
    content: data.content || '',
    isPublic: data.is_public ?? true,
    refProjectId: data.ref_project_id || null,
    createdBy: data.created_by || '',
    createdAt: data.created_at || null,
    updatedAt: data.updated_at || null,
  }
}

// F-MEM-001: 공개 회고록 목록 조회 (최신순).
// 목록은 비로그인(Guest)도 열람 가능 — 접근 차단은 Firestore Rules에서 수행한다.
export async function getMemoirs() {
  assertFirebaseConfigured()

  const memoirsQuery = query(
    collection(db, 'memoirs'),
    where('is_public', '==', true),
    orderBy('created_at', 'desc')
  )

  let snapshot
  try {
    snapshot = await getDocs(memoirsQuery)
  } catch {
    throw createMemoirError(
      'MEM-001-LOAD-FAILED',
      '회고록을 불러오지 못했습니다.'
    )
  }

  return snapshot.docs.map((memoirSnapshot) =>
    toMemoir(memoirSnapshot.id, memoirSnapshot.data())
  )
}

// 단일 회고록 조회 (상세·수정 프리필). 없으면 null.
export async function getMemoirById(memoirId) {
  assertFirebaseConfigured()

  if (!memoirId) {
    return null
  }

  let snapshot
  try {
    snapshot = await getDoc(doc(db, 'memoirs', memoirId))
  } catch {
    throw createMemoirError(
      'MEM-001-LOAD-FAILED',
      '회고록을 불러오지 못했습니다.'
    )
  }

  if (!snapshot.exists()) {
    return null
  }

  return toMemoir(snapshot.id, snapshot.data())
}

// F-MEM-002: 회고록 작성. is_public=true(전체 공개)로 고정한다.
export async function createMemoir({ uid, title, content, relatedPostId }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'MEM-002-UNAUTHENTICATED')

  const normalizedTitle = (title || '').trim()
  const normalizedContent = (content || '').trim()

  if (!normalizedTitle || !normalizedContent) {
    throw createMemoirError(
      'MEM-002-REQUIRED-MISSING',
      '제목과 내용을 입력해주세요.'
    )
  }

  if (
    normalizedTitle.length > TITLE_MAX ||
    normalizedContent.length > CONTENT_MAX
  ) {
    throw createMemoirError(
      'MEM-002-REQUIRED-MISSING',
      `제목은 ${TITLE_MAX}자, 내용은 ${CONTENT_MAX}자 이내로 입력해주세요.`
    )
  }

  // 관련 구인(선택)이 있으면 존재 여부를 검증한다.
  if (relatedPostId) {
    let projectSnapshot
    try {
      projectSnapshot = await getDoc(doc(db, 'togethers', relatedPostId))
    } catch {
      throw createMemoirError(
        'MEM-002-CREATE-FAILED',
        '회고록 작성에 실패했습니다.'
      )
    }

    if (!projectSnapshot.exists()) {
      throw createMemoirError(
        'MEM-002-RELATED-NOT-FOUND',
        '관련 구인 정보를 찾을 수 없습니다.'
      )
    }
  }

  const memoirRef = doc(collection(db, 'memoirs'))
  const memoirId = memoirRef.id
  const payload = {
    memoir_id: memoirId,
    created_by: uid,
    title: normalizedTitle,
    content: normalizedContent,
    is_public: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }

  if (relatedPostId) {
    payload.ref_project_id = relatedPostId
  }

  try {
    await setDoc(memoirRef, payload)
  } catch {
    throw createMemoirError(
      'MEM-002-CREATE-FAILED',
      '회고록 작성에 실패했습니다.'
    )
  }

  return { memoirId }
}

// F-MEM-003: 회고록 수정. 작성자만, 본문(title/content) 변경.
export async function updateMemoir({ uid, memoirId, title, content }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'MEM-003-UNAUTHENTICATED')

  if (!memoirId) {
    throw createMemoirError('MEM-003-NOT-FOUND', '회고록을 찾을 수 없습니다.')
  }

  const memoirRef = doc(db, 'memoirs', memoirId)

  let snapshot
  try {
    snapshot = await getDoc(memoirRef)
  } catch {
    throw createMemoirError(
      'MEM-003-UPDATE-FAILED',
      '회고록 수정에 실패했습니다.'
    )
  }

  if (!snapshot.exists()) {
    throw createMemoirError('MEM-003-NOT-FOUND', '회고록을 찾을 수 없습니다.')
  }

  if (snapshot.data().created_by !== uid) {
    throw createMemoirError('MEM-003-FORBIDDEN', '회고록 수정 권한이 없습니다.')
  }

  const patch = { updated_at: serverTimestamp() }

  if (title !== undefined) {
    const normalizedTitle = (title || '').trim()

    if (!normalizedTitle || normalizedTitle.length > TITLE_MAX) {
      throw createMemoirError('MEM-003-INVALID-INPUT', '수정 내용을 확인해주세요.')
    }

    patch.title = normalizedTitle
  }

  if (content !== undefined) {
    const normalizedContent = (content || '').trim()

    if (!normalizedContent || normalizedContent.length > CONTENT_MAX) {
      throw createMemoirError('MEM-003-INVALID-INPUT', '수정 내용을 확인해주세요.')
    }

    patch.content = normalizedContent
  }

  try {
    await updateDoc(memoirRef, patch)
  } catch {
    throw createMemoirError(
      'MEM-003-UPDATE-FAILED',
      '회고록 수정에 실패했습니다.'
    )
  }

  return { memoirId }
}

// F-MEM-004: 나의 회고록 목록 조회 (작성자 본인, 최신순).
export async function getMyMemoirs(uid) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'MEM-004-UNAUTHENTICATED')

  const myMemoirsQuery = query(
    collection(db, 'memoirs'),
    where('created_by', '==', uid),
    orderBy('created_at', 'desc')
  )

  let snapshot
  try {
    snapshot = await getDocs(myMemoirsQuery)
  } catch {
    throw createMemoirError(
      'MEM-004-LOAD-FAILED',
      '나의 회고록을 불러오지 못했습니다.'
    )
  }

  return snapshot.docs.map((memoirSnapshot) =>
    toMemoir(memoirSnapshot.id, memoirSnapshot.data())
  )
}
