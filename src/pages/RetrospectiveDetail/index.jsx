import { Link, useParams } from 'react-router-dom'

import useRetrospective from '@/hooks/useRetrospective'

import './RetrospectiveDetail.scss'

// Firestore Timestamp 또는 일반 값을 한국어 날짜 문자열로 안전하게 변환한다.
function formatCreatedAt(createdAt) {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleDateString('ko-KR')
  }

  return ''
}

export default function RetrospectiveDetail() {
  const { memoirId } = useParams()
  const { memoir, isLoading, errorMessage } = useRetrospective(memoirId)
  const createdAtLabel = memoir ? formatCreatedAt(memoir.createdAt) : ''

  return (
    <main className='retrospective-detail-page'>
      <div className='container'>
        <Link to='/memoirs' className='retrospective-detail-back'>
          &lt; 회고록 목록으로
        </Link>

        {isLoading ? (
          <div className='retrospective-detail-status' role='status'>
            회고록을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='retrospective-detail-status retrospective-detail-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : !memoir ? (
          <div className='retrospective-detail-status'>
            회고록을 찾을 수 없습니다.
          </div>
        ) : (
          <article className='retrospective-detail'>
            <header className='retrospective-detail-header'>
              <h1 className='retrospective-detail-title'>
                {memoir.title || '제목 없음'}
              </h1>
              {createdAtLabel && (
                <span className='retrospective-detail-meta'>
                  {createdAtLabel}
                </span>
              )}
            </header>

            <p className='retrospective-detail-content'>{memoir.content}</p>
          </article>
        )}
      </div>
    </main>
  )
}
