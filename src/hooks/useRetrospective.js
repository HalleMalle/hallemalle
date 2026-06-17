import { useEffect, useState } from 'react'

import { getMemoirById } from '@/api/retrospectives'

// 단일 회고록(상세) 조회. memoir이 null이고 로딩/에러가 아니면 "찾을 수 없음" 상태.
export default function useRetrospective(memoirId) {
  const [memoir, setMemoir] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const next = await getMemoirById(memoirId)

        if (isMounted) {
          setMemoir(next)
        }
      } catch (error) {
        if (isMounted) {
          setMemoir(null)
          setErrorMessage(error?.message || '회고록을 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [memoirId])

  return {
    memoir,
    isLoading,
    errorMessage,
  }
}
