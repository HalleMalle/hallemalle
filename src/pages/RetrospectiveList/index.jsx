import { Link } from "react-router-dom";

import RetrospectiveCard from "@/components/RetrospectiveCard";
import { useAuth } from "@/contexts/AuthContext";
import useRetrospectives from "@/hooks/useRetrospectives";

import "./RetrospectiveList.scss";

export default function RetrospectiveList() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { memoirs, isLoading, errorMessage } = useRetrospectives();

  return (
    <main className="retrospective-list-page">
      <div className="container">
        <header className="retrospective-list-header">
          <p className="retrospective-list-eyebrow">회고록</p>
          <h1 className="retrospective-list-title">협업 회고 둘러보기</h1>
          <p className="retrospective-list-subtitle">
            다른 사용자가 공유한 프로젝트 협업 경험을 읽어보세요. 자세한 내용은
            로그인 후 확인할 수 있습니다.
          </p>
          {uid && (
            <Link to="/memoirs/write" className="retrospective-list-add">
              + 회고록 작성
            </Link>
          )}
        </header>

        {isLoading ? (
          <div className="retrospective-list-status" role="status">
            회고록을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className="retrospective-list-status retrospective-list-status-error"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : memoirs.length === 0 ? (
          <div className="retrospective-list-empty">
            <p className="retrospective-list-empty-title">
              아직 작성된 회고록이 없어요.
            </p>
            <p className="retrospective-list-empty-description">
              첫 협업 회고를 공유해보세요.
            </p>
          </div>
        ) : (
          <ul className="retrospective-list-grid">
            {memoirs.map((memoir) => (
              <li key={memoir.memoirId}>
                <RetrospectiveCard memoir={memoir} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
