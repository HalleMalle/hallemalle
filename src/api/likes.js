import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase'

function createLikeError(code, message) {
  const error = new Error(message)
  error.code = code

  return error
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createLikeError(
      'REF-CONFIG-MISSING',
      'Firebase 설정 후 추천 기능을 사용할 수 있어요.'
    )
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createLikeError(code, '로그인이 필요한 기능입니다.')
  }
}

// reference_likes 문서 ID는 {uid}_{referenceId} 복합키 (사용자-주제 추천 1건 보장).
function buildLikeId(uid, referenceId) {
  return `${uid}_${referenceId}`
}

// F-REF-008: 참고 주제 추천(Like) 토글.
// 추천 문서 생성/삭제와 references.likes_count ±1을 트랜잭션으로 함께 커밋한다.
// (firestore.rules가 existsAfter로 두 변경의 동반을 검증하므로 카운트 위변조가 차단된다.)
export async function toggleLike({ uid, referenceId }) {
  assertFirebaseConfigured()
  assertAuthenticatedUser(uid, 'REF-008-UNAUTHENTICATED')

  if (!referenceId) {
    throw createLikeError('REF-008-NOT-FOUND', '참고 주제를 찾을 수 없습니다.')
  }

  const referenceRef = doc(db, 'references', referenceId)
  const likeRef = doc(db, 'reference_likes', buildLikeId(uid, referenceId))

  try {
    return await runTransaction(db, async (transaction) => {
      const referenceSnapshot = await transaction.get(referenceRef)

      if (!referenceSnapshot.exists()) {
        throw createLikeError(
          'REF-008-NOT-FOUND',
          '참고 주제를 찾을 수 없습니다.'
        )
      }

      const likeSnapshot = await transaction.get(likeRef)
      const currentCount = referenceSnapshot.data().likes_count || 0

      if (likeSnapshot.exists()) {
        transaction.delete(likeRef)
        transaction.update(referenceRef, { likes_count: increment(-1) })

        return {
          referenceId,
          isLiked: false,
          likesCount: Math.max(0, currentCount - 1),
          changed: true,
        }
      }

      transaction.set(likeRef, {
        uid,
        reference_id: referenceId,
        created_at: serverTimestamp(),
      })
      transaction.update(referenceRef, { likes_count: increment(1) })

      return {
        referenceId,
        isLiked: true,
        likesCount: currentCount + 1,
        changed: true,
      }
    })
  } catch (error) {
    if (error?.code === 'REF-008-NOT-FOUND') {
      throw error
    }

    throw createLikeError('REF-008-SAVE-FAILED', '추천 처리에 실패했습니다.')
  }
}

// 토글 상태 표시용: 현재 사용자가 추천한 참고 주제 ID 집합.
// 추천 상태 로딩 실패는 목록 조회를 막지 않도록 빈 Set을 반환한다.
export async function getLikedReferenceIds(uid) {
  assertFirebaseConfigured()

  if (!uid) {
    return new Set()
  }

  let snapshot
  try {
    snapshot = await getDocs(
      query(collection(db, 'reference_likes'), where('uid', '==', uid))
    )
  } catch {
    return new Set()
  }

  return new Set(
    snapshot.docs
      .map((likeSnapshot) => likeSnapshot.data().reference_id)
      .filter(Boolean)
  )
}
