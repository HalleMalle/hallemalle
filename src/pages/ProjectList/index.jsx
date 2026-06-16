import { useState } from "react";
import { useNavigate } from "react-router-dom";

import CalendarIcon from "@/assets/icons/calendar.svg";
import PeopleIcon from "@/assets/icons/people.svg";

import "./ProjectList.scss";

const ROLE_FILTERS = [
  { value: "", label: "전체" },
  { value: "FE", label: "Frontend" },
  { value: "BE", label: "Backend" },
  { value: "Design", label: "Design" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "PM", label: "PM" },
];

const STATUS_FILTERS = [{ value: "recruiting", label: "모집중", icon: "✓" }];

// 목업 데이터 (API 연동 전)
const MOCK_PROJECTS = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  title: "Low Code 해커톤 모집",
  thumbnail: null,
  status: "recruiting",
  roles: ["Design", "BE", "FE"],
  currentCount: 2,
  totalCount: 5,
  deadline: "Sept 15",
  createdAt: "Aug 24",
}));

// 서브 컴포넌트: 카드
function ProjectCard({ project, onClick }) {
  const {
    title,
    thumbnail,
    status,
    roles,
    currentCount,
    totalCount,
    deadline,
    createdAt,
  } = project;

  return (
    <article className="project-card" onClick={onClick}>
      <div className="project-card__thumb">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="project-card__thumb-img"
          />
        ) : (
          <div className="project-card__thumb-placeholder" />
        )}
        {status === "recruiting" && (
          <span className="project-card__badge project-card__badge--recruiting">
            모집중
          </span>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__top">
          <h3 className="project-card__title">{title}</h3>
          <span className="project-card__date">{createdAt}</span>
        </div>

        <div className="project-card__roles">
          {roles.map((role) => (
            <span key={role} className="project-card__role-tag">
              {role.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="project-card__footer">
          <span className="project-card__headcount">
            <span className="project-card__icon">
              <img src={PeopleIcon} alt="people" />
            </span>
            {currentCount} / {totalCount}
          </span>
          <span className="project-card__deadline">
            <span className="project-card__icon">
              <img src={CalendarIcon} alt="calendar" />
            </span>
            Due {deadline}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function ProjectList() {
  const navigate = useNavigate();

  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projects] = useState(MOCK_PROJECTS);

  const filtered = projects.filter((p) => {
    const matchRole = roleFilter === "" || p.roles.includes(roleFilter);
    const matchStatus = statusFilter === "" || p.status === statusFilter;
    return matchRole && matchStatus;
  });

  const handleStatusToggle = (value) => {
    setStatusFilter((prev) => (prev === value ? "" : value));
  };

  return (
    <div className="project-list-page">
      <div className="project-list-page-container">
        <div className="project-list-page-header">
          <div className="project-list-page-header__text">
            <h1 className="project-list-page-header__title">TOGETHER</h1>
            <p className="project-list-page-header__desc">
              프로젝트를 탐색하고 함께할 팀원을 찾아보세요! 관심있는 프로젝트에
              참여 신청을 하고, 리더의 승인을 기다려보세요.
            </p>
          </div>
          <button
            className="project-list-page-create-btn"
            onClick={() => navigate("/togethers/write")}
          >
            + Create New Post
          </button>
        </div>

        <div className="project-list-page-filters">
          <div className="project-list-page-filters__status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`project-list-page-filter-btn project-list-page-filter-btn--status${statusFilter === f.value ? " project-list-page-filter-btn--status-active" : ""}`}
                onClick={() => handleStatusToggle(f.value)}
              >
                {statusFilter === f.value && (
                  <span className="project-list-page-filter-btn__check">✓</span>
                )}
                {f.label}
              </button>
            ))}
          </div>

          <div className="project-list-page-filters__divider" />

          <div className="project-list-page-filters__roles">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`project-list-page-filter-btn${roleFilter === f.value ? " project-list-page-filter-btn--active" : ""}`}
                onClick={() => setRoleFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="project-list-page-grid">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/togethers/${project.id}`)}
            />
          ))}
        </div>

        {/* TODO: 무한 스크롤링 */}
      </div>
    </div>
  );
}
