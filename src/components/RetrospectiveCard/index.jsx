import { Link } from 'react-router-dom'

import './RetrospectiveCard.scss'

// Firestore Timestamp 또는 일반 값을 한국어 날짜 문자열로 안전하게 변환한다.
function formatCreatedAt(createdAt) {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleDateString('ko-KR')
  }

  return ''
}

// 회고록 목록 카드. 카드 전체가 상세 페이지로 이동하는 링크다.
// 상세 라우트는 ProtectedRoute라 비로그인 클릭 시 자동으로 /login으로 이동한다.
export default function RetrospectiveCard({ memoir }) {
  const { memoirId, title, content, createdAt } = memoir
  const createdAtLabel = formatCreatedAt(createdAt)

  return (
    <Link to={`/memoirs/${memoirId}`} className='retrospective-card'>
      <h2 className='retrospective-card-title'>{title || '제목 없음'}</h2>

      {content && <p className='retrospective-card-excerpt'>{content}</p>}

      {createdAtLabel && (
        <span className='retrospective-card-meta'>{createdAtLabel}</span>
      )}
    </Link>
  )
}
