import { useCallback, useEffect, useState } from 'react'

import { getScrappedReferences, toggleScrap as requestToggleScrap } from '@/api/scraps'
import { useAuth } from '@/contexts/AuthContext'

// F-REF-003: 찜한 참고 주제 모아보기. 목록의 SCRAPPED 탭과 달리 전체 주제를 거르지 않고
// scraps(uid) → 해당 referenceId만 조회하는 전용 경로(getScrappedReferences)를 사용한다.
// 본 화면은 ProtectedRoute로 보호되므로 uid는 항상 존재한다.
export default function useScrappedReferences() {
  const { user } = useAuth()
  const uid = user?.uid

  const [references, setReferences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const next = await getScrappedReferences(uid)
      setReferences(next)
    } catch (error) {
      setReferences([])
      setErrorMessage(error?.message || '찜한 주제를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [uid])

  useEffect(() => {
    let isMounted = true

    async function loadScrapped() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const next = await getScrappedReferences(uid)

        if (isMounted) {
          setReferences(next)
        }
      } catch (error) {
        if (isMounted) {
          setReferences([])
          setErrorMessage(error?.message || '찜한 주제를 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadScrapped()

    return () => {
      isMounted = false
    }
  }, [uid])

  // 찜 해제: 낙관적으로 목록에서 제거하고, 실패 시 서버 기준으로 다시 불러와 복구한다.
  const unscrap = useCallback(
    async (referenceId) => {
      if (!referenceId || !uid) {
        return
      }

      setActionError('')
      setReferences((prev) =>
        prev.filter((reference) => reference.referenceId !== referenceId)
      )

      try {
        await requestToggleScrap({
          uid,
          targetType: 'reference',
          targetId: referenceId,
          action: 'UNSCRAP',
        })
      } catch (error) {
        setActionError(error?.message || '찜 해제에 실패했습니다.')
        await load()
      }
    },
    [uid, load]
  )

  return {
    references,
    isLoading,
    errorMessage,
    actionError,
    unscrap,
    reload: load,
  }
}
