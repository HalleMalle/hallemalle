import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  // TODO: const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 인증 상태 확인 중이면 아무것도 렌더링하지 않음 (또는 로딩 스피너)
  // TODO: loading
  if (false) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // TODO: !isAuthenticated
  if (false) {
    // 로그인 페이지로 리다이렉트, 돌아올 경로 저장
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
