import { Link } from 'react-router-dom'

import RetrospectiveCard from '@/components/RetrospectiveCard'
import useMyRetrospectives from '@/hooks/useMyRetrospectives'

import './MyRetrospectives.scss'

export default function MyRetrospectives() {
  const { memoirs, isLoading, errorMessage } = useMyRetrospectives()

  return (
    <main className='my-retrospective-page'>
      <div className='container'>
        <header className='my-retrospective-header'>
          <Link to='/profile' className='my-retrospective-back'>
            &lt; 프로필로 돌아가기
          </Link>
          <p className='my-retrospective-eyebrow'>회고록</p>
          <h1 className='my-retrospective-title'>내가 작성한 회고록</h1>
          <p className='my-retrospective-subtitle'>
            내가 공유한 협업 회고를 모아봅니다.
          </p>
        </header>

        {isLoading ? (
          <div className='my-retrospective-status' role='status'>
            회고록을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='my-retrospective-status my-retrospective-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : memoirs.length === 0 ? (
          <div className='my-retrospective-empty'>
            <p className='my-retrospective-empty-title'>
              아직 작성한 회고록이 없어요.
            </p>
            <p className='my-retrospective-empty-description'>
              협업 경험을 회고록으로 남겨보세요.
            </p>
            <Link to='/memoirs/write' className='my-retrospective-empty-link'>
              회고록 작성하기
            </Link>
          </div>
        ) : (
          <ul className='my-retrospective-grid'>
            {memoirs.map((memoir) => (
              <li key={memoir.memoirId}>
                <RetrospectiveCard memoir={memoir} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
