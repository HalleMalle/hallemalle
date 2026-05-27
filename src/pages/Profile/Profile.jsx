import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import CollaborationScore from "../../components/common/CollaborationScore";
import ReviewList from "../../components/review/ReviewList";
import ProfileEdit from "./ProfileEdit";
import { getReviewsByUser } from "../../api/reviews";
import "./Profile.scss";

const ROLE_LABELS = {
  FE: "프론트엔드",
  BE: "백엔드",
  Design: "디자인",
  Android: "안드로이드",
  iOS: "iOS",
  PM: "기획/PM",
  QA: "QA",
  AI: "AI/ML",
};

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      getReviewsByUser(user.uid).then(setReviews).catch(console.error);
    }
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-layout container">
        {/* Left: Profile Card */}
        <aside className="profile-card">
          <div className="profile-avatar-wrap">
            <img
              src={user.photoURL || "/default-avatar.png"}
              alt="avatar"
              className="profile-avatar"
            />
          </div>

          <h1 className="profile-name">{user.displayName || "사용자"}</h1>
          <p className="profile-username">@{user.username}</p>

          <div className="profile-score-section">
            <CollaborationScore score={user.collaborationScore} size="md" />
          </div>

          <button
            type="button"
            className="profile-edit-btn"
            onClick={() => setShowEdit(true)}
          >
            프로필 수정
          </button>

          <div className="profile-links">
            <Link to="/profile/portfolio" className="profile-link">
              <span className="link-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
                </svg>
              </span>
              GitHub 포트폴리오
            </Link>
            <Link to="/my-projects" className="profile-link">
              <span className="link-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
              </span>
              내 프로젝트
            </Link>
          </div>

          <button type="button" className="logout-btn" onClick={logout}>
            로그아웃
          </button>
        </aside>

        {/* Right: Profile Details */}
        <div className="profile-details">
          <section className="detail-section">
            <h2>소개</h2>
            <p className="bio-text">
              {user.bio || "아직 소개를 작성하지 않았습니다."}
            </p>
          </section>

          <section className="detail-section">
            <h2>협업 상태</h2>
            <div className="detail-tags">
              <span className={`tag tag--role tag--${user.role}`}>
                {user.role === "individual" ? "팀을 찾는 중" : "팀 모집 중"}
              </span>
              {user.availableRoles?.length > 0 && (
                <span className="tag tag--info">
                  {user.availableRoles
                    .map((r) => ROLE_LABELS[r] || r)
                    .join(", ")}
                </span>
              )}
            </div>
          </section>

          {user.techStack?.length > 0 && (
            <section className="detail-section">
              <h2>기술 스택</h2>
              <div className="detail-tags">
                {user.techStack.map((tech) => (
                  <span key={tech} className="tag tag--skill">
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section">
            <h2>참여 가능</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">기간</span>
                <span className="detail-value">
                  {user.availablePeriod || "미정"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">시간대</span>
                <span className="detail-value">
                  {user.availableHours || "미정"}
                </span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h2>계정 정보</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">이메일</span>
                <span className="detail-value">{user.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">GitHub</span>
                <span className="detail-value">@{user.githubUsername}</span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <ReviewList reviews={reviews} title="받은 리뷰" />
          </section>
        </div>
      </div>

      {showEdit && (
        <ProfileEdit user={user} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
