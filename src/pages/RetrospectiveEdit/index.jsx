import { Link, useNavigate, useParams } from 'react-router-dom'

import RetrospectiveForm from '@/components/RetrospectiveForm'
import { useAuth } from '@/contexts/AuthContext'
import useRetrospective from '@/hooks/useRetrospective'
import useRetrospectiveMutations from '@/hooks/useRetrospectiveMutations'

import './RetrospectiveEdit.scss'

export default function RetrospectiveEdit() {
  const { memoirId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user?.uid

  const { memoir, isLoading, errorMessage } = useRetrospective(memoirId)
  const {
    update,
    isSubmitting,
    errorMessage: mutationError,
  } = useRetrospectiveMutations()

  const handleSubmit = async (values) => {
    try {
      await update({ memoirId, ...values })
      navigate(`/memoirs/${memoirId}`)
    } catch {
      // 실패 메시지는 폼의 mutationError로 표시되고 화면은 유지된다.
    }
  }

  const isAuthor = Boolean(uid) && memoir?.createdBy === uid

  return (
    <main className='retrospective-edit-page'>
      <div className='container'>
        <header className='retrospective-edit-header'>
          <Link to={`/memoirs/${memoirId}`} className='retrospective-edit-back'>
            &lt; 회고록으로
          </Link>
          <h1 className='retrospective-edit-title'>회고록 수정</h1>
        </header>

        {isLoading ? (
          <div className='retrospective-edit-status' role='status'>
            회고록을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='retrospective-edit-status retrospective-edit-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : !memoir ? (
          <div className='retrospective-edit-status'>
            회고록을 찾을 수 없습니다.
          </div>
        ) : !isAuthor ? (
          <div
            className='retrospective-edit-status retrospective-edit-status-error'
            role='alert'
          >
            회고록 수정 권한이 없습니다.
          </div>
        ) : (
          <RetrospectiveForm
            mode='edit'
            initialValues={memoir}
            isSubmitting={isSubmitting}
            errorMessage={mutationError}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/memoirs/${memoirId}`)}
          />
        )}
      </div>
    </main>
  )
}
