import { useCallback, useEffect, useState } from 'react'

import { getMyMemoirs } from '@/api/retrospectives'
import { useAuth } from '@/contexts/AuthContext'

// F-MEM-004: 본인이 작성한 회고록 목록을 관리한다.
// 본 화면은 ProtectedRoute로 보호되므로 uid는 항상 존재한다.
export default function useMyRetrospectives() {
  const { user } = useAuth()
  const uid = user?.uid

  const [memoirs, setMemoirs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const next = await getMyMemoirs(uid)
      setMemoirs(next)
    } catch (error) {
      setMemoirs([])
      setErrorMessage(error?.message || '나의 회고록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [uid])

  useEffect(() => {
    let isMounted = true

    async function loadMyMemoirs() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const next = await getMyMemoirs(uid)

        if (isMounted) {
          setMemoirs(next)
        }
      } catch (error) {
        if (isMounted) {
          setMemoirs([])
          setErrorMessage(error?.message || '나의 회고록을 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMyMemoirs()

    return () => {
      isMounted = false
    }
  }, [uid])

  return {
    memoirs,
    isLoading,
    errorMessage,
    reload: load,
  }
}
