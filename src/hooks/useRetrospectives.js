import { useCallback, useEffect, useState } from 'react'

import { getMemoirs } from '@/api/retrospectives'

// F-MEM-001: 공개 회고록 목록을 관리한다.
// 목록 조회는 인증과 무관하게 동작한다(접근 차단은 Firestore Rules/라우트가 담당).
export default function useRetrospectives() {
  const [memoirs, setMemoirs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const next = await getMemoirs()
      setMemoirs(next)
    } catch (error) {
      setMemoirs([])
      setErrorMessage(error?.message || '회고록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadMemoirs() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const next = await getMemoirs()

        if (isMounted) {
          setMemoirs(next)
        }
      } catch (error) {
        if (isMounted) {
          setMemoirs([])
          setErrorMessage(error?.message || '회고록을 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMemoirs()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    memoirs,
    isLoading,
    errorMessage,
    reload: load,
  }
}
