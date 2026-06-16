import { Link } from 'react-router-dom'

import useScrappedReferences from '@/hooks/useScrappedReferences'

import './MyScrappedReferences.scss'

// Firestore Timestamp 또는 일반 값을 한국어 날짜 문자열로 안전하게 변환한다.
function formatCreatedAt(createdAt) {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleDateString('ko-KR')
  }

  return ''
}

function ScrappedReferenceCard({ reference, onUnscrap }) {
  const { referenceId, title, description, tags, likesCount, createdAt } =
    reference
  const createdAtLabel = formatCreatedAt(createdAt)

  return (
    <article className='my-scrap-card'>
      <div className='my-scrap-card-head'>
        <h2 className='my-scrap-card-title'>{title || '제목 없음'}</h2>
        <button
          type='button'
          className='my-scrap-card-unscrap'
          aria-label='찜 해제'
          onClick={() => onUnscrap(referenceId)}
        >
          <span className='my-scrap-card-unscrap-icon' aria-hidden='true'>
            ♥
          </span>
          <span>찜 해제</span>
        </button>
      </div>

      {description && (
        <p className='my-scrap-card-description'>{description}</p>
      )}

      {tags?.length > 0 && (
        <ul className='my-scrap-card-tags'>
          {tags.map((tag) => (
            <li className='my-scrap-card-tag' key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <div className='my-scrap-card-footer'>
        <span className='my-scrap-card-likes'>추천 {likesCount}</span>
        {createdAtLabel && (
          <span className='my-scrap-card-meta'>{createdAtLabel}</span>
        )}
      </div>
    </article>
  )
}

export default function MyScrappedReferences() {
  const { references, isLoading, errorMessage, actionError, unscrap } =
    useScrappedReferences()

  return (
    <main className='my-scrap-page'>
      <div className='container'>
        <header className='my-scrap-header'>
          <Link to='/profile' className='my-scrap-back'>
            &lt; 프로필로 돌아가기
          </Link>
          <p className='my-scrap-eyebrow'>참고 주제</p>
          <h1 className='my-scrap-title'>내가 찜한 참고 주제</h1>
          <p className='my-scrap-subtitle'>
            찜해 둔 프로젝트 주제를 모아봅니다. 찜을 해제하면 목록에서 사라집니다.
          </p>
        </header>

        {actionError && (
          <p className='my-scrap-alert' role='alert'>
            {actionError}
          </p>
        )}

        {isLoading ? (
          <div className='my-scrap-status' role='status'>
            찜한 주제를 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='my-scrap-status my-scrap-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : references.length === 0 ? (
          <div className='my-scrap-empty'>
            <p className='my-scrap-empty-title'>찜한 주제가 없어요.</p>
            <p className='my-scrap-empty-description'>
              마음에 드는 주제를 찜하면 여기에 모여요.
            </p>
            <Link to='/references' className='my-scrap-empty-link'>
              참고 주제 둘러보기
            </Link>
          </div>
        ) : (
          <ul className='my-scrap-grid'>
            {references.map((reference) => (
              <li key={reference.referenceId}>
                <ScrappedReferenceCard
                  reference={reference}
                  onUnscrap={unscrap}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
