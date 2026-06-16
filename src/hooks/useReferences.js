import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getLikedReferenceIds,
  toggleLike as requestToggleLike,
} from '@/api/likes'
import { getReferences } from '@/api/references'
import {
  getScrappedReferenceIds,
  toggleScrap as requestToggleScrap,
} from '@/api/scraps'
import { useAuth } from '@/contexts/AuthContext'

// 화면 탭 → 조회 정렬 매핑. SCRAPPED는 최신 정렬로 불러온 뒤 찜한 항목만 거른다.
const VIEW_TO_SORT = {
  LATEST: 'LATEST',
  POPULAR: 'POPULAR',
  SCRAPPED: 'LATEST',
}

// F-REF-001/002/008: 참고 주제 목록 + 현재 사용자의 찜·추천 상태를 함께 관리한다.
// 목록 조회는 인증과 무관하게 동작하고(라우트/Rules가 접근 차단),
// 찜·추천 상태는 로그인 사용자에 한해 병합한다.
export default function useReferences() {
  const { user } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()

  const [view, setView] = useState('LATEST')
  const [references, setReferences] = useState([])
  const [scrappedIds, setScrappedIds] = useState(() => new Set())
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [likeCounts, setLikeCounts] = useState(() => new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [scrapError, setScrapError] = useState('')
  const [likeError, setLikeError] = useState('')

  const load = useCallback(async () => {
    const sort = VIEW_TO_SORT[view] || 'LATEST'

    try {
      const [nextReferences, nextScrappedIds, nextLikedIds] = await Promise.all(
        [
          getReferences({ sort }),
          getScrappedReferenceIds(uid),
          getLikedReferenceIds(uid),
        ]
      )

      return { nextReferences, nextScrappedIds, nextLikedIds, error: null }
    } catch (error) {
      return {
        nextReferences: [],
        nextScrappedIds: new Set(),
        nextLikedIds: new Set(),
        error,
      }
    }
  }, [uid, view])

  const applyResult = useCallback((result) => {
    if (result.error) {
      setErrorMessage(
        result.error?.message || '참고 주제를 불러오지 못했습니다.'
      )
      setReferences([])
      setScrappedIds(new Set())
      setLikedIds(new Set())
      setLikeCounts(new Map())

      return
    }

    setReferences(result.nextReferences)
    setScrappedIds(result.nextScrappedIds)
    setLikedIds(result.nextLikedIds)
    setLikeCounts(
      new Map(
        result.nextReferences.map((reference) => [
          reference.referenceId,
          reference.likesCount ?? 0,
        ])
      )
    )
  }, [])

  // 작성·수정·삭제 후 목록을 다시 불러오기 위한 사용자 트리거용 로더.
  const reload = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const result = await load()
    applyResult(result)
    setIsLoading(false)
  }, [load, applyResult])

  useEffect(() => {
    let isMounted = true

    async function loadReferences() {
      setIsLoading(true)
      setErrorMessage('')

      const result = await load()

      if (!isMounted) {
        return
      }

      applyResult(result)
      setIsLoading(false)
    }

    loadReferences()

    return () => {
      isMounted = false
    }
  }, [load, applyResult])

  // 찜 토글: 낙관적으로 UI를 갱신하고, 실패 시 이전 상태로 되돌린다.
  const toggleScrap = useCallback(
    async (referenceId) => {
      if (!referenceId) {
        return
      }

      if (!uid) {
        navigate('/login')
        return
      }

      setScrapError('')

      const wasScrapped = scrappedIds.has(referenceId)
      const action = wasScrapped ? 'UNSCRAP' : 'SCRAP'

      setScrappedIds((prev) => {
        const next = new Set(prev)

        if (wasScrapped) {
          next.delete(referenceId)
        } else {
          next.add(referenceId)
        }

        return next
      })

      try {
        const result = await requestToggleScrap({
          uid,
          targetType: 'reference',
          targetId: referenceId,
          action,
        })

        setScrappedIds((prev) => {
          const next = new Set(prev)

          if (result.isScrapped) {
            next.add(referenceId)
          } else {
            next.delete(referenceId)
          }

          return next
        })
      } catch (error) {
        setScrappedIds((prev) => {
          const next = new Set(prev)

          if (wasScrapped) {
            next.add(referenceId)
          } else {
            next.delete(referenceId)
          }

          return next
        })

        setScrapError(error?.message || '찜 처리에 실패했습니다.')
      }
    },
    [uid, scrappedIds, navigate]
  )

  // 추천(Like) 토글: 추천 여부와 추천 수를 낙관적으로 갱신하고, 실패 시 되돌린다.
  const toggleLike = useCallback(
    async (referenceId) => {
      if (!referenceId) {
        return
      }

      if (!uid) {
        navigate('/login')
        return
      }

      setLikeError('')

      const wasLiked = likedIds.has(referenceId)
      const delta = wasLiked ? -1 : 1

      setLikedIds((prev) => {
        const next = new Set(prev)

        if (wasLiked) {
          next.delete(referenceId)
        } else {
          next.add(referenceId)
        }

        return next
      })
      setLikeCounts((prev) => {
        const next = new Map(prev)
        const current = next.get(referenceId) ?? 0
        next.set(referenceId, Math.max(0, current + delta))

        return next
      })

      try {
        const result = await requestToggleLike({ uid, referenceId })

        setLikedIds((prev) => {
          const next = new Set(prev)

          if (result.isLiked) {
            next.add(referenceId)
          } else {
            next.delete(referenceId)
          }

          return next
        })
        setLikeCounts((prev) => {
          const next = new Map(prev)
          next.set(referenceId, result.likesCount)

          return next
        })
      } catch (error) {
        setLikedIds((prev) => {
          const next = new Set(prev)

          if (wasLiked) {
            next.add(referenceId)
          } else {
            next.delete(referenceId)
          }

          return next
        })
        setLikeCounts((prev) => {
          const next = new Map(prev)
          const current = next.get(referenceId) ?? 0
          next.set(referenceId, Math.max(0, current - delta))

          return next
        })

        setLikeError(error?.message || '추천 처리에 실패했습니다.')
      }
    },
    [uid, likedIds, navigate]
  )

  const referencesWithMeta = useMemo(() => {
    const merged = references.map((reference) => ({
      ...reference,
      isScrapped: scrappedIds.has(reference.referenceId),
      isLiked: likedIds.has(reference.referenceId),
      likesCount:
        likeCounts.get(reference.referenceId) ?? reference.likesCount ?? 0,
    }))

    if (view === 'SCRAPPED') {
      return merged.filter((reference) => reference.isScrapped)
    }

    return merged
  }, [references, scrappedIds, likedIds, likeCounts, view])

  return {
    references: referencesWithMeta,
    isLoading,
    errorMessage,
    scrapError,
    likeError,
    view,
    setView,
    toggleScrap,
    toggleLike,
    reload,
  }
}
