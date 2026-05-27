import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDocument } from "../../api/firestore";
import ReviewForm from "../../components/review/ReviewForm";
import "./WriteReview.scss";

export default function WriteReview() {
  const { projectId, targetUserId } = useParams();
  const navigate = useNavigate();
  const [targetUser, setTargetUser] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!projectId || !targetUserId) return;

    Promise.all([
      getDocument("users", targetUserId),
      getDocument("projects", projectId),
    ])
      .then(([userDoc, projectDoc]) => {
        if (userDoc) setTargetUser(userDoc);
        if (projectDoc) setProjectTitle(projectDoc.title);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, targetUserId]);

  if (loading) {
    return (
      <div className="write-review-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="write-review-page">
        <div className="write-review-error">
          <h2>사용자를 찾을 수 없습니다.</h2>
          <button
            type="button"
            className="write-review-back-btn"
            onClick={() => navigate(-1)}
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="write-review-page">
        <div className="write-review-success">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2>리뷰 제출 완료!</h2>
          <p>소중한 평가 감사합니다.</p>
          <button
            type="button"
            className="write-review-back-btn"
            onClick={() => navigate("/profile")}
          >
            내 프로필로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="write-review-page">
      <div className="write-review-container">
        <h1 className="write-review-title">팀원 평가</h1>
        <ReviewForm
          targetUser={targetUser}
          projectTitle={projectTitle}
          projectId={projectId}
          onSuccess={() => setSubmitted(true)}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
