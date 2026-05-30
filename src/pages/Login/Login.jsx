import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.scss";

const DEFAULT_REDIRECT_PATH = "/togethers";

function getLoginErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
    return "로그인이 취소되었어요. 다시 시도해주세요.";
  }

  if (code.includes("popup-blocked")) {
    return "팝업이 차단되었어요. 브라우저 팝업 허용 후 다시 시도해주세요.";
  }

  return error?.message || "GitHub 로그인 설정 후 사용할 수 있어요.";
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isAuthenticated = Boolean(auth?.isAuthenticated || auth?.user);
  const isAuthLoading = Boolean(auth?.loading);
  const signIn = auth?.signIn;

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate(DEFAULT_REDIRECT_PATH, { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  async function handleGithubLogin() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (typeof signIn !== "function") {
        throw new Error("GitHub 로그인 설정 후 사용할 수 있어요.");
      }

      await signIn();
      navigate(DEFAULT_REDIRECT_PATH, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="login-eyebrow">HalleMalle</p>
          <h1 id="login-title">GitHub 계정으로 시작하기</h1>
          <p className="login-description">
            프로젝트 모집과 포트폴리오 확인을 위해 GitHub 계정으로 로그인합니다.
          </p>
        </div>

        {errorMessage && (
          <div className="login-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          className="github-login-button"
          onClick={handleGithubLogin}
          disabled={isSubmitting || isAuthLoading}
        >
          <span className="github-login-mark" aria-hidden="true">
            GH
          </span>
          <span>{isSubmitting ? "로그인 중..." : "Continue with GitHub"}</span>
        </button>

        <p className="login-note">
          로그인하면 서비스 이용 목적에 맞는 GitHub 기본 프로필 정보가 연결됩니다.
        </p>
      </section>
    </main>
  );
}
