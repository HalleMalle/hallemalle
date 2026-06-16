import { useCallback, useEffect, useMemo, useState } from 'react'

import { getReferences } from '@/api/references'
import {
  getScrappedReferenceIds,
  toggleScrap as requestToggleScrap,
} from '@/api/scraps'
import { useAuth } from '@/contexts/AuthContext'

// F-REF-001 + F-REF-002: 참고 주제 목록과 현재 사용자의 찜 상태를 함께 관리한다.
// 목록 조회는 인증과 무관하게 동작하고(라우트/Rules가 접근 차단),
// 찜 상태는 로그인 사용자에 한해 병합한다.
export default function useReferences() {
  const { user } = useAuth()
  const uid = user?.uid

  const [references, setReferences] = useState([])
  const [scrappedIds, setScrappedIds] = useState(() => new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [scrapError, setScrapError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextReferences, nextScrappedIds] = await Promise.all([
        getReferences(),
        getScrappedReferenceIds(uid),
      ])

      return { nextReferences, nextScrappedIds, error: null }
    } catch (error) {
      return { nextReferences: [], nextScrappedIds: new Set(), error }
    }
  }, [uid])

  useEffect(() => {
    let isMounted = true

    async function loadReferences() {
      const { nextReferences, nextScrappedIds, error } = await load()

      if (!isMounted) {
        return
      }

      if (error) {
        setErrorMessage(error?.message || '참고 주제를 불러오지 못했습니다.')
        setReferences([])
        setScrappedIds(new Set())
      } else {
        setReferences(nextReferences)
        setScrappedIds(nextScrappedIds)
      }

      setIsLoading(false)
    }

    loadReferences()

    return () => {
      isMounted = false
    }
  }, [load])

  // 찜 토글: 낙관적으로 UI를 갱신하고, 실패 시 이전 상태로 되돌린다.
  const toggleScrap = useCallback(
    async (referenceId) => {
      if (!referenceId) {
        return
      }

      if (!uid) {
        setScrapError('로그인이 필요한 기능입니다.')
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
    [uid, scrappedIds]
  )

  const referencesWithScrap = useMemo(
    () =>
      references.map((reference) => ({
        ...reference,
        isScrapped: scrappedIds.has(reference.referenceId),
      })),
    [references, scrappedIds]
  )

  return {
    references: referencesWithScrap,
    isLoading,
    errorMessage,
    scrapError,
    toggleScrap,
  }
}
