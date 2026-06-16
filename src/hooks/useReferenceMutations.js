import { useCallback, useState } from 'react'

import {
  createReference,
  deleteReference,
  updateReference,
} from '@/api/references'
import { useAuth } from '@/contexts/AuthContext'

// F-REF-005/006/007: 참고 주제 작성·수정·삭제 변경 작업을 담당하는 훅.
// 제출 상태(isSubmitting)와 에러 메시지를 노출하고, 호출 측이 후처리(목록 reload 등)할 수
// 있도록 성공 결과는 반환하고 실패는 그대로 throw 한다.
export default function useReferenceMutations() {
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
    ({ title, description, tags }) =>
      runMutation(
        () => createReference({ uid, title, description, tags }),
        '참고 주제 작성에 실패했습니다.'
      ),
    [uid, runMutation]
  )

  const update = useCallback(
    ({ referenceId, title, description, tags }) =>
      runMutation(
        () => updateReference({ uid, referenceId, title, description, tags }),
        '참고 주제 수정에 실패했습니다.'
      ),
    [uid, runMutation]
  )

  const remove = useCallback(
    ({ referenceId }) =>
      runMutation(
        () => deleteReference({ uid, referenceId }),
        '참고 주제 삭제에 실패했습니다.'
      ),
    [uid, runMutation]
  )

  return {
    create,
    update,
    remove,
    isSubmitting,
    errorMessage,
    resetError,
  }
}
