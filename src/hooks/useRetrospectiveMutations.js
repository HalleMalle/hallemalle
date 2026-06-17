import { useCallback, useState } from 'react'

import { createMemoir, updateMemoir } from '@/api/retrospectives'
import { useAuth } from '@/contexts/AuthContext'

// F-MEM-002/003: 회고록 작성·수정 변경 작업을 담당하는 훅.
// 제출 상태(isSubmitting)와 에러 메시지를 노출하고, 성공 결과는 반환하고 실패는 그대로 throw 한다.
export default function useRetrospectiveMutations() {
  const { user } = useAuth()
  const uid = user?.uid

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetError = useCallback(() => {
    setErrorMessage('')
  }, [])

  const runMutation = useCallback(async (mutation, fallbackMessage) => {
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      return await mutation()
    } catch (error) {
      setErrorMessage(error?.message || fallbackMessage)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const create = useCallback(
    ({ title, content, relatedPostId }) =>
      runMutation(
        () => createMemoir({ uid, title, content, relatedPostId }),
        '회고록 작성에 실패했습니다.'
      ),
    [uid, runMutation]
  )

  const update = useCallback(
    ({ memoirId, title, content }) =>
      runMutation(
        () => updateMemoir({ uid, memoirId, title, content }),
        '회고록 수정에 실패했습니다.'
      ),
    [uid, runMutation]
  )

  return {
    create,
    update,
    isSubmitting,
    errorMessage,
    resetError,
  }
}
