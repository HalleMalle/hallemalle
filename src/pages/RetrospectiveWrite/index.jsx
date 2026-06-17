import { Link, useNavigate } from 'react-router-dom'

import RetrospectiveForm from '@/components/RetrospectiveForm'
import useRetrospectiveMutations from '@/hooks/useRetrospectiveMutations'

import './RetrospectiveWrite.scss'

export default function RetrospectiveWrite() {
  const navigate = useNavigate()
  const { create, isSubmitting, errorMessage } = useRetrospectiveMutations()

  const handleSubmit = async (values) => {
    try {
      const { memoirId } = await create(values)
      navigate(`/memoirs/${memoirId}`)
    } catch {
      // 실패 메시지는 폼의 errorMessage로 표시되고 화면은 유지된다.
    }
  }

  return (
    <main className='retrospective-write-page'>
      <div className='container'>
        <header className='retrospective-write-header'>
          <Link to='/memoirs' className='retrospective-write-back'>
            &lt; 회고록 목록으로
          </Link>
          <h1 className='retrospective-write-title'>회고록 작성</h1>
        </header>

        <RetrospectiveForm
          mode='create'
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/memoirs')}
        />
      </div>
    </main>
  )
}
