import { Link } from 'react-router-dom'

import useReferences from '@/hooks/useReferences'

import './ReferenceList.scss'

// Firestore Timestamp 또는 일반 값을 한국어 날짜 문자열로 안전하게 변환한다.
function formatCreatedAt(createdAt) {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleDateString('ko-KR')
  }

  return ''
}

function ReferenceCard({ reference, onToggleScrap }) {
  const { referenceId, title, description, tags, createdAt, isScrapped } =
    reference
  const createdAtLabel = formatCreatedAt(createdAt)

  return (
    <article className='reference-card'>
      <div className='reference-card-head'>
        <h2 className='reference-card-title'>{title || '제목 없음'}</h2>
        <button
          type='button'
          className='reference-card-scrap'
          aria-pressed={isScrapped}
          aria-label={isScrapped ? '찜 해제' : '찜하기'}
          onClick={() => onToggleScrap(referenceId)}
        >
          <span className='reference-card-scrap-icon' aria-hidden='true'>
            {isScrapped ? '♥' : '♡'}
          </span>
          <span>{isScrapped ? '찜함' : '찜'}</span>
        </button>
      </div>

      {description && (
        <p className='reference-card-description'>{description}</p>
      )}

      {tags?.length > 0 && (
        <ul className='reference-card-tags'>
          {tags.map((tag) => (
            <li className='reference-card-tag' key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}

      {createdAtLabel && (
        <p className='reference-card-meta'>{createdAtLabel}</p>
      )}
    </article>
  )
}

export default function ReferenceList() {
  const { references, isLoading, errorMessage, scrapError, toggleScrap } =
    useReferences()

  return (
    <main className='reference-list-page'>
      <div className='container'>
        <header className='reference-list-header'>
          <p className='reference-list-eyebrow'>참고 주제</p>
          <h1 className='reference-list-title'>프로젝트 아이디어 둘러보기</h1>
          <p className='reference-list-subtitle'>
            외부 대회 주제와 사용자 주제를 모아 프로젝트 아이디어를 탐색할 수
            있어요. 관심 있는 주제는 찜해 두세요.
          </p>
        </header>

        {scrapError && (
          <p className='reference-list-alert' role='alert'>
            {scrapError}
          </p>
        )}

        {isLoading ? (
          <div className='reference-list-status' role='status'>
            참고 주제를 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='reference-list-status reference-list-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : references.length === 0 ? (
          <div className='reference-list-empty'>
            <p className='reference-list-empty-title'>
              아직 등록된 참고 주제가 없어요.
            </p>
            <p className='reference-list-empty-description'>
              구인 글을 둘러보며 협업 아이디어를 찾아보세요.
            </p>
            <Link to='/togethers' className='reference-list-empty-link'>
              구인 둘러보기
            </Link>
          </div>
        ) : (
          <ul className='reference-list-grid'>
            {references.map((reference) => (
              <li key={reference.referenceId}>
                <ReferenceCard
                  reference={reference}
                  onToggleScrap={toggleScrap}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
