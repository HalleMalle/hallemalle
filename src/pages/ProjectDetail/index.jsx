import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CalendarIcon from "@/assets/icons/calendar.svg";
import PencilIcon from "@/assets/icons/pencil.svg";
import DocumentIcon from "@/assets/icons/document.svg";
import HandIcon from "@/assets/icons/hand.svg";
import CodeIcon from "@/assets/icons/code.svg";
import DownloadIcon from "@/assets/icons/download.svg";
import InfoIcon from "@/assets/icons/info.svg";

import "./ProjectDetail.scss";

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

const MOCK_PROJECT = {
  id: "1",
  title: "차세대 AI 문서 분석 B2B SaaS 프론트엔드/백엔드 초기 멤버 모집",
  status: "recruiting",
  attachmentVisibility: "approved",
  creator: {
    name: "Alex.Dev",
    photo: null,
    temperature: 42.5,
    temperatureLabel: "Gold I",
  },
  startDate: "2023.10.25",
  endDate: "2023.11.15",
  techStack: ["node.js", "react"],
  stage: "planning",
  description: `안녕하세요. 현재 AI 기반의 기업용 문서 분석 SaaS를 기획 및 초기 개발 중인 팀입니다. 기존 수작업에 의존하던 법률/계약 문서 검토 과정을 LLM을 활용해 혁신하고자 합니다.
현재 기획은 80% 이상 완료되었으며, 주요 핵심 기능에 대한 PoC(개념 증명)는 마친 상태입니다. 본격적인 MVP 개발을 위해 열정적이고 책임감 있는 프론트엔드 및 백엔드 개발자 분들을 모십니다.

주요 업무
프론트엔드: React 기반의 복잡한 문서 뷰어 및 에디터 UI/UX 구현, 상태 관리 최적화
백엔드: Node.js 기반 API 서버 구축, AI 모델 서빙 아키텍처 설계 참여, 대용량 문서 처리 파이프라인 구축

이런 분을 찾습니다!

주 2회 이상 온라인 회의 및 비동기 커뮤니케이션이 원활하신 분
단순히 주어진 기획을 구현하는 것을 넘어, 프로덕트 방향성에 대해 함께 고민할 수 있는 분
초기 스타트업 혹은 사이드 프로젝트 완수 경험이 있으신 분 우대`,
  attachments: [
    { name: "initial_scope_v1.pdf", size: 2.4, visibility: "approved" },
  ],
  positions: [
    { role: "FE", total: 2, current: 1 },
    { role: "BE", total: 1, current: 0 },
  ],
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
  const { id } = useParams(); // api 호출 시 사용 예정

  const [project] = useState(MOCK_PROJECT);

  const isOwner = true; // TODO: 실제 user.uid === project.creatorId 비교
  const descLines = project.description.split("\n");

  const handleApply = () => {
    // TODO: 팀원 신청 API
    alert("신청 기능은 준비 중입니다.");
  };

  const handleEdit = () => {
    navigate(`/togethers/${project.id}/edit`);
  };

  const handleDownload = (attachment) => {
    // TODO: 파일 다운로드 API
    alert(`${attachment.name} 다운로드`);
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
                모집중
              </span>
              {project.attachmentVisibility === "approved" && (
                <span className="project-detail-page-badge project-detail-page-badge--lock">
                  🔒 승인자만 공개
                </span>
              )}
            </div>

            <h1 className="project-detail-page-title">{project.title}</h1>

            <div className="project-detail-page-creator">
              <div className="project-detail-page-creator__avatar">
                {project.creator.photo ? (
                  <img src={project.creator.photo} alt={project.creator.name} />
                ) : (
                  <span className="project-detail-page-creator__avatar-placeholder">
                    {project.creator.name[0]}
                  </span>
                )}
              </div>
              <div className="project-detail-page-creator__info">
                <span className="project-detail-page-creator__name">
                  {project.creator.name}
                </span>
                <span className="project-detail-page-creator__temp">
                  🔥 협업 온도: {project.creator.temperature}°C (
                  {project.creator.temperatureLabel})
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
                    {project.startDate} ~ {project.endDate}
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
                    {project.techStack.map((tech) => (
                      <span key={tech} className="project-detail-page-tech-tag">
                        {tech}
                      </span>
                    ))}
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

            {project.attachments?.length > 0 && (
              <section className="project-detail-page-section">
                <h2 className="project-detail-page-section__title">
                  📎 첨부 파일
                </h2>
                <div className="project-detail-page-attachments">
                  {project.attachments.map((att) => (
                    <div
                      key={att.name}
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
                          {att.name}
                        </span>
                        <span className="project-detail-page-attachment__size">
                          {att.size} MB
                        </span>
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
                  {project.attachmentVisibility === "approved" && (
                    <p className="project-detail-page-attachment__notice">
                      <img src={InfoIcon} alt="info" width={16} height={16} />
                      <>
                        이 문서는 액세스 권한이 있는 사용자만 열람 가능합니다.
                        참여 신청 후 리더의 승인을 받으면 다운로드할 수
                        있습니다.
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
                {project.positions.map((pos) => (
                  <PositionRow
                    key={pos.role}
                    role={pos.role}
                    current={pos.current}
                    total={pos.total}
                  />
                ))}
              </div>

              <div className="project-detail-page-sidebar-actions">
                <button
                  className="project-detail-page-action-btn project-detail-page-action-btn--primary"
                  onClick={handleApply}
                >
                  <img src={HandIcon} alt="hand" width={16} height={16} /> 팀원
                  신청하기
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

            {/* TODO: 추후 할래말래 운영 페이지 */}
            {/* <div className="project-detail-page-sidebar-links">
              <button className="project-detail-page-sidebar-link">
                💬 Help Center
              </button>
              <button className="project-detail-page-sidebar-link">
                🔒 Privacy
              </button>
            </div> */}
          </aside>
        </div>
      </div>
    </div>
  );
}
