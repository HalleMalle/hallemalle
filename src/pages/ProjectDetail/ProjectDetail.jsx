import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchProject,
  updateProject,
  incrementViews,
} from "../../hooks/useProjects";
import {
  applyToProject,
  fetchApplicationsByProject,
} from "../../hooks/useApplications";
import { getReviewsByReviewerAndProject } from "../../api/reviews";
import { doc, getDoc } from "../../api/firebase";
import "./ProjectDetail.scss";

const STAGE_LABELS = {
  planning: "기획부터",
  development: "개발부터",
  maintenance: "유지보수",
};

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

function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [myProjectReviews, setMyProjectReviews] = useState([]);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProject(id);
        setProject(data);
        if (data) {
          incrementViews(id);
          if (user?.uid) {
            loadTeamAndReviews(data, user.uid);
          }
        }
      } catch (error) {
        console.error("Failed to load project:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user?.uid]);

  async function loadTeamAndReviews(proj, currentUserId) {
    try {
      const apps = await fetchApplicationsByProject(proj.id);
      const approved = apps.filter((a) => a.status === "approved");
      setTeamMembers(approved);

      const profiles = {};
      await Promise.all(
        approved.map(async (app) => {
          if (app.applicantId === proj.creatorId) return;
          const snap = await getDoc(doc(db, "users", app.applicantId));
          if (snap.exists()) {
            profiles[app.applicantId] = { id: snap.id, ...snap.data() };
          }
        }),
      );
      setMemberProfiles(profiles);

      const myReviews = await getReviewsByReviewerAndProject(
        currentUserId,
        proj.id,
      );
      setMyProjectReviews(myReviews);
    } catch (error) {
      console.error("Failed to load team data:", error);
    }
  }

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await updateProject(id, { status: "completed" });
      setProject((prev) => ({ ...prev, status: "completed" }));
      setShowCompleteConfirm(false);
    } catch (error) {
      console.error("Failed to complete project:", error);
    } finally {
      setCompleting(false);
    }
  };

  const reviewedUserIds = new Set(myProjectReviews.map((r) => r.targetUserId));

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="pd-not-found">
          <h2>프로젝트를 찾을 수 없습니다</h2>
          <Link to="/project-list" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = user?.uid === project.creatorId;
  const totalSlots = project.positions?.reduce((s, p) => s + p.total, 0) || 0;
  const filledSlots =
    project.positions?.reduce((s, p) => s + (p.current || 0), 0) || 0;

  const handleOpenApply = () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: { pathname: `/project-list/${id}` } },
      });
      return;
    }
    setShowApplyModal(true);
  };

  const handleSubmitApply = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      await applyToProject({
        projectId: id,
        applicantId: user.uid,
        message: applyMessage,
      });
      setApplyResult("success");
    } catch (error) {
      setApplyResult(error.message || "신청에 실패했습니다.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="project-detail-page">
      <div className="container">
        <Link to="/project-list" className="pd-back">
          &larr; 목록으로
        </Link>

        <div className="pd-layout">
          <div className="pd-main">
            <div className="pd-header">
              <div className="pd-badges">
                <span className={`pd-status ${project.status}`}>
                  {project.status === "recruiting"
                    ? "모집중"
                    : project.status === "completed"
                      ? "✅ 완료"
                      : "모집마감"}
                </span>
                <span className="pd-stage">
                  {STAGE_LABELS[project.participationStage]}
                </span>
              </div>
              <h1 className="pd-title">{project.title}</h1>
            </div>

            <p className="pd-desc">{project.description}</p>

            <section className="pd-section">
              <h2>모집 포지션</h2>
              <div className="pd-positions">
                {project.positions?.map((pos) => (
                  <div key={pos.role} className="pd-pos-item">
                    <span className="pd-pos-role">
                      {ROLE_LABELS[pos.role] || pos.role}
                    </span>
                    <span className="pd-pos-count">
                      <strong>{pos.current || 0}</strong> / {pos.total}명
                    </span>
                    <div className="pd-pos-bar">
                      <div
                        className="pd-pos-fill"
                        style={{
                          width: `${Math.min(((pos.current || 0) / pos.total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pd-total-slots">
                전체 <strong>{filledSlots}</strong>/{totalSlots}명 모집 완료
              </div>
            </section>

            {project.attachments?.length > 0 && (
              <section className="pd-section">
                <h2>첨부 파일</h2>
                <div className="pd-attachments">
                  {project.attachments.map((att, i) => (
                    <div key={i} className="pd-att-item">
                      <span className="pd-att-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <span className="pd-att-name">{att.name}</span>
                      {att.visibility === "approved" && (
                        <span className="pd-att-badge">승인한 사람만</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="pd-section pd-info">
              <h2>상세 정보</h2>
              <div className="pd-info-item">
                <span className="pd-info-label">연락 수단</span>
                <span className="pd-info-value">
                  {project.contactMethod || "협의 후 결정"}
                </span>
              </div>
              {project.deadline && (
                <div className="pd-info-item">
                  <span className="pd-info-label">모집 마감</span>
                  <span className="pd-info-value">
                    {formatDate(project.deadline)}
                  </span>
                </div>
              )}
              <div className="pd-info-item">
                <span className="pd-info-label">조회수</span>
                <span className="pd-info-value">{project.views || 0}</span>
              </div>
              <div className="pd-info-item">
                <span className="pd-info-label">작성일</span>
                <span className="pd-info-value">
                  {formatDate(project.createdAt)}
                </span>
              </div>
            </section>
          </div>

          <aside className="pd-sidebar">
            <div className="pd-side-card">
              <div className="pd-creator">
                <img
                  src={project.creatorPhoto || "/default-avatar.png"}
                  alt="creator"
                  className="pd-creator-avatar"
                />
                <div>
                  <p className="pd-creator-name">
                    {project.creatorName || "알 수 없음"}
                  </p>
                  <p className="pd-creator-label">프로젝트 생성자</p>
                </div>
              </div>

              <div className="pd-side-actions">
                {isCreator ? (
                  <>
                    <Link
                      to={`/project/${project.id}/edit`}
                      className="pd-action-btn primary"
                    >
                      수정하기
                    </Link>
                    <Link
                      to={`/applications/manage/${project.id}`}
                      className="pd-action-btn secondary"
                    >
                      신청 관리
                    </Link>
                    {project.status !== "completed" && (
                      <>
                        {!showCompleteConfirm ? (
                          <button
                            type="button"
                            className="pd-complete-btn"
                            onClick={() => setShowCompleteConfirm(true)}
                          >
                            프로젝트 완료
                          </button>
                        ) : (
                          <div className="pd-complete-confirm">
                            <span className="pd-complete-warn">
                              완료 처리하면 되돌릴 수 없습니다.
                            </span>
                            <div className="pd-complete-actions">
                              <button
                                type="button"
                                className="pd-complete-yes"
                                onClick={handleComplete}
                                disabled={completing}
                              >
                                {completing ? "처리 중..." : "완료 처리"}
                              </button>
                              <button
                                type="button"
                                className="pd-complete-no"
                                onClick={() => setShowCompleteConfirm(false)}
                                disabled={completing}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className={`pd-action-btn primary ${project.status !== "recruiting" ? "disabled" : ""}`}
                    onClick={handleOpenApply}
                    disabled={project.status !== "recruiting"}
                  >
                    {project.status === "recruiting"
                      ? "신청하기"
                      : project.status === "completed"
                        ? "완료된 프로젝트"
                        : "모집 마감"}
                  </button>
                )}
              </div>

              {project.status === "recruiting" && !isCreator && (
                <p className="pd-side-hint">
                  신청 전 프로필과 GitHub 포트폴리오를 업데이트해주세요
                </p>
              )}

              {project.status === "completed" && teamMembers.length > 0 && (
                <div className="pd-side-team">
                  <h3 className="pd-team-title">팀원 평가</h3>
                  <div className="pd-team-list">
                    {teamMembers.map((member) => {
                      const profile = memberProfiles[member.applicantId];
                      const alreadyReviewed = reviewedUserIds.has(
                        member.applicantId,
                      );
                      return (
                        <div key={member.id} className="pd-team-member">
                          <img
                            src={profile?.photoURL || "/default-avatar.png"}
                            alt=""
                            className="pd-team-avatar"
                          />
                          <span className="pd-team-name">
                            {profile?.displayName || "알 수 없음"}
                          </span>
                          {alreadyReviewed ? (
                            <span className="pd-team-reviewed">
                              ✅ 평가완료
                            </span>
                          ) : (
                            <Link
                              to={`/write-review/${project.id}/${member.applicantId}`}
                              className="pd-team-review-btn"
                            >
                              평가하기
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div
            className="modal-content apply-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>프로젝트 신청</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowApplyModal(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {applyResult === "success" ? (
                <div className="apply-result success">
                  <p>✅ 신청이 완료되었습니다!</p>
                  <p className="apply-result-sub">
                    프로젝트 생성자의 승인을 기다려주세요.
                  </p>
                  <button
                    type="button"
                    className="pd-action-btn primary"
                    onClick={() => setShowApplyModal(false)}
                  >
                    확인
                  </button>
                </div>
              ) : (
                <>
                  <p className="apply-desc">
                    <strong>"{project.title}"</strong>에 신청합니다.
                  </p>
                  <label className="form-field">
                    <span>신청 메시지 (선택)</span>
                    <textarea
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      placeholder="간단한 자기소개와 함께 신청 이유를 적어주세요"
                      rows={4}
                    />
                  </label>
                  {applyResult && <p className="apply-error">{applyResult}</p>}
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setShowApplyModal(false)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="btn-save"
                      onClick={handleSubmitApply}
                      disabled={applying}
                    >
                      {applying ? "신청 중..." : "신청하기"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
