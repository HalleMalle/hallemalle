import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getProject } from "@/api/project"; // project.js 저장 경로로 맞춰주세요.
import { useAuth } from "@/contexts/AuthContext";

import CalendarIcon from "@/assets/icons/calendar.svg";
import PencilIcon from "@/assets/icons/pencil.svg";
import DocumentIcon from "@/assets/icons/document.svg";
import HandIcon from "@/assets/icons/hand.svg";
import CodeIcon from "@/assets/icons/code.svg";
import DownloadIcon from "@/assets/icons/download.svg";
import InfoIcon from "@/assets/icons/info.svg";

import "./ProjectDetail.scss";

const ROLE_LABELS = {
  Frontend: "Frontend",
  Backend: "Backend",
  Android: "Android",
  iOS: "iOS",
  Design: "Design",
  "PM/PO": "PM/PO",
};

function PositionRow({ role, current, total }) {
  const label = ROLE_LABELS[role] || role;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="project-detail-page-position-row">
      <div className="project-detail-page-position-row__top">
        <span className="project-detail-page-position-row__label">{label}</span>
        <span className="project-detail-page-position-row__count">
          {current} / {total} 명
        </span>
      </div>
      <div className="project-detail-page-position-bar">
        <div
          className="project-detail-page-position-bar__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 1) 로그인 유저 상태 관찰
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // 2) Firestore 단건 데이터 로드 (Tech Stack 포함)
  useEffect(() => {
    if (!id) return;

    async function fetchProjectData() {
      try {
        setLoading(true);
        // getProject 함수가 내부에 together_tech_stack 서브컬렉션을
        // 가져와 project.techStack 배열로 맵핑해 반환하고 있습니다.
        const data = await getProject(id);
        setProject(data);
      } catch (err) {
        console.error("프로젝트 조회 에러:", err);
        setError("프로젝트 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [id]);

  if (loading) {
    return <div className="project-detail-loading">데이터 로딩 중...</div>;
  }

  if (error || !project) {
    return (
      <div className="project-detail-error">
        <p>{error || "존재하지 않는 프로젝트입니다."}</p>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/togethers")}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const isOwner = currentUser && project.created_by === currentUser.uid;
  const descLines = project.description ? project.description.split("\n") : [];

  const handleApply = () => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (isOwner) {
      alert("본인이 작성한 공고에는 신청할 수 없습니다.");
      return;
    }
    alert("신청 기능은 준비 중입니다.");
  };

  const handleEdit = () => {
    navigate(`/togethers/${project.post_id}/edit`);
  };

  const handleDownload = (docItem) => {
    if (docItem.visibility === "approved_only" && !isOwner) {
      alert("승인된 팀원만 열람 가능한 첨부파일입니다.");
      return;
    }
    if (docItem.file_url) {
      window.open(docItem.file_url, "_blank");
    }
  };

  return (
    <div className="project-detail-page">
      <div className="project-detail-page-container">
        <button
          className="project-detail-page-back-btn"
          onClick={() => navigate("/togethers")}
        >
          ← 프로젝트 목록으로 돌아가기
        </button>

        <div className="project-detail-page-layout">
          <main className="project-detail-page-main">
            <div className="project-detail-page-badges">
              <span className="project-detail-page-badge project-detail-page-badge--status">
                {project.recruitment_status === "closed"
                  ? "모집완료"
                  : "모집중"}
              </span>
              {project.is_private && (
                <span className="project-detail-page-badge project-detail-page-badge--lock">
                  🔒 승인자만 공개
                </span>
              )}
            </div>

            <h1 className="project-detail-page-title">{project.title}</h1>

            <div className="project-detail-page-creator">
              <div className="project-detail-page-creator__avatar">
                {currentUser && currentUser.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.display_name}
                  />
                ) : (
                  <span className="project-detail-page-creator__avatar-placeholder">
                    {currentUser?.display_name
                      ? currentUser?.display_name[0]
                      : "U"}
                  </span>
                )}
              </div>
              <div className="project-detail-page-creator__info">
                <span className="project-detail-page-creator__name">
                  {currentUser && currentUser.display_name}
                </span>
                <span className="project-detail-page-creator__temp">
                  조회수 {project.view_count || 0}회
                </span>
              </div>
            </div>

            <div className="project-detail-page-divider" />

            <div className="project-detail-page-meta-row">
              <div className="project-detail-page-meta-card">
                <span className="project-detail-page-meta-card__icon">
                  <img
                    src={CalendarIcon}
                    alt="calendar"
                    width={16}
                    height={16}
                  />
                </span>
                <div>
                  <p className="project-detail-page-meta-card__label">
                    모집 기간
                  </p>
                  <p className="project-detail-page-meta-card__value">
                    {project.recruitment_start} ~ {project.recruitment_end}
                  </p>
                </div>
              </div>
              <div className="project-detail-page-meta-card">
                <span className="project-detail-page-meta-card__icon">
                  <img src={CodeIcon} alt="code" width={16} height={16} />
                </span>
                <div>
                  <p className="project-detail-page-meta-card__label">
                    필요 기술 스택
                  </p>
                  <div className="project-detail-page-tech-tags">
                    {/* 💡 together_tech_stack 테이블 연동 바인딩 */}
                    {project.techStack && project.techStack.length > 0 ? (
                      project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="project-detail-page-tech-tag"
                        >
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="project-detail-page-tech-tag">
                        등록된 스택 없음
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className="project-detail-page-section">
              <h2 className="project-detail-page-section__title">
                프로젝트 상세 설명
              </h2>
              <div className="project-detail-page-section__divider" />
              <div className="project-detail-page-description">
                {descLines.map((line, i) =>
                  line.trim() === "" ? (
                    <br key={i} />
                  ) : (
                    <p
                      key={i}
                      className="project-detail-page-description__para"
                    >
                      {line}
                    </p>
                  )
                )}
              </div>
            </section>

            {project.documents && project.documents.length > 0 && (
              <section className="project-detail-page-section">
                <h2 className="project-detail-page-section__title">
                  📎 첨부 파일 ({project.documents.length})
                </h2>
                <div className="project-detail-page-attachments">
                  {project.documents.map((att) => (
                    <div
                      key={att.id}
                      className="project-detail-page-attachment"
                    >
                      <span className="project-detail-page-attachment__icon">
                        <img
                          src={DocumentIcon}
                          alt="document"
                          width={16}
                          height={16}
                        />
                      </span>
                      <div className="project-detail-page-attachment__info">
                        <span className="project-detail-page-attachment__name">
                          {att.file_name}
                        </span>
                        {att.visibility === "approved_only" && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#e63946",
                              marginLeft: "6px",
                            }}
                          >
                            [승인자 전용]
                          </span>
                        )}
                      </div>
                      <button
                        className="project-detail-page-attachment__download"
                        onClick={() => handleDownload(att)}
                      >
                        <img
                          src={DownloadIcon}
                          alt="download"
                          width={16}
                          height={16}
                        />
                      </button>
                    </div>
                  ))}
                  {project.documents.some(
                    (d) => d.visibility === "approved_only"
                  ) && (
                    <p className="project-detail-page-attachment__notice">
                      <img src={InfoIcon} alt="info" width={16} height={16} />
                      <>
                        [승인자 전용] 표기 문서는 리더의 승인을 받으면
                        다운로드할 수 있습니다.
                      </>
                    </p>
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="project-detail-page-sidebar">
            <div className="project-detail-page-sidebar-card">
              <h3 className="project-detail-page-sidebar-card__title">
                신청 현황
              </h3>
              <div className="project-detail-page-positions">
                {project.roles &&
                  project.roles.map((pos) => (
                    <PositionRow
                      key={pos.id}
                      role={pos.role_type}
                      current={pos.filled_count}
                      total={pos.headcount}
                    />
                  ))}
              </div>

              <div className="project-detail-page-sidebar-actions">
                <button
                  className="project-detail-page-action-btn project-detail-page-action-btn--primary"
                  onClick={handleApply}
                  disabled={project.recruitment_status === "closed"}
                >
                  <img src={HandIcon} alt="hand" width={16} height={16} />{" "}
                  {project.recruitment_status === "closed"
                    ? "모집 마감됨"
                    : "팀원 신청하기"}
                </button>
                {isOwner && (
                  <button
                    className="project-detail-page-action-btn project-detail-page-action-btn--outline"
                    onClick={handleEdit}
                  >
                    <img src={PencilIcon} alt="pencil" width={16} height={16} />{" "}
                    프로젝트 수정하기
                  </button>
                )}
              </div>
            </div>

            <div className="project-detail-page-sidebar-card project-detail-page-sidebar-card--tip">
              <p className="project-detail-page-tip__title">
                💡 안전한 협업을 위한 팁
              </p>
              <p className="project-detail-page-tip__body">
                신청 전 작성자의 신뢰도 리포트를 확인하고, 나의 프로필 정보가
                충분히 작성되었는지 검토해보세요.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
