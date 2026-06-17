import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getProjectList } from "@/api/project";

import CalendarIcon from "@/assets/icons/calendar.svg";
import PeopleIcon from "@/assets/icons/people.svg";

import "./ProjectList.scss";

const ROLE_FILTERS = [
  { value: "", label: "전체" },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "Design", label: "Design" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "PM/PO", label: "PM/PO" },
];

const STATUS_FILTERS = [{ value: "recruiting", label: "모집중", icon: "✓" }];

// 🛠 [수정] ProjectCard 컴포넌트 안정성 강화 및 SVG 바인딩 교정
function ProjectCard({ project, onClick }) {
  const {
    title,
    thumbnail_url,
    recruitment_status,
    techStack = [],
    total_headcount,
    current_member_count,
    recruitment_end,
  } = project;

  // 날짜 포맷팅 예외 처리 보완
  const formattedDate =
    recruitment_end && typeof recruitment_end === "string"
      ? recruitment_end.slice(5, 10).replace("-", "/")
      : "상시모집";

  return (
    <article
      className="project-card"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="project-card__thumb">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="project-card__thumb-img"
          />
        ) : (
          <div
            className="project-card__thumb-placeholder"
            style={{ backgroundColor: "#eaeaea", height: "140px" }}
          />
        )}
        {recruitment_status === "recruiting" && (
          <span className="project-card__badge project-card__badge--recruiting">
            모집중
          </span>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__top">
          <h3
            className="project-card__title"
            style={{ margin: "10px 0", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            {title || "제목 없음"}
          </h3>
        </div>

        {/* 기술 스택 렌더링 예외 처리 */}
        <div
          className="project-card__roles"
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            minHeight: "26px",
          }}
        >
          {Array.isArray(techStack) &&
            techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="project-card__role-tag"
                style={{
                  fontSize: "0.8rem",
                  padding: "2px 8px",
                  background: "#f1f3f5",
                  borderRadius: "4px",
                }}
              >
                {tech}
              </span>
            ))}
          {Array.isArray(techStack) && techStack.length > 4 && (
            <span className="project-card__role-tag project-card__role-tag--more">
              +{techStack.length - 4}
            </span>
          )}
        </div>

        <div
          className="project-card__footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "15px",
            fontSize: "0.85rem",
            color: "#666",
          }}
        >
          <span
            className="project-card__headcount"
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <img src={PeopleIcon} alt="people" width={14} height={14} />
            {current_member_count ?? 0} / {total_headcount ?? 2}명
          </span>
          <span
            className="project-card__deadline"
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <img src={CalendarIcon} alt="calendar" width={14} height={14} />
            마감: {formattedDate}
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

  const [projects, setProjects] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🛠 [수정] 무한루프 및 비동기 상태 레이스 컨디션 방지를 위해 종속성 주입 정리
  const fetchProjects = useCallback(
    async (isLoadMore = false, currentLastDoc = null) => {
      setLoading(true);
      try {
        const options = {
          roleFilter: roleFilter || undefined,
          statusFilter: statusFilter || undefined,
          lastDoc: isLoadMore ? currentLastDoc : null,
        };

        const result = await getProjectList(options);

        if (isLoadMore) {
          setProjects((prev) => [...prev, ...result.projects]);
        } else {
          setProjects(result.projects);
        }
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to fetch project list:", error);
      } finally {
        setLoading(false);
      }
    },
    [roleFilter, statusFilter]
  );

  // 필터가 변경될 때마다 첫 페이지 리셋 로드
  useEffect(() => {
    fetchProjects(false, null);
  }, [roleFilter, statusFilter]);

  const handleStatusToggle = (value) => {
    setStatusFilter((prev) => (prev === value ? "" : value));
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchProjects(true, lastDoc); // 현재 들고 있는 최신 스냅샷 전달
    }
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
                  <span className="project-list-page-filter-btn__check">
                    ✓{" "}
                  </span>
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

        {/* 🛠 [UX 보완] 로딩 표시 추가 및 컨텐츠 그리드 노출 */}
        {loading && projects.length === 0 ? (
          <div className="project-list-page-empty">
            데이터를 불러오는 중입니다...
          </div>
        ) : projects.length === 0 ? (
          <div className="project-list-page-empty">
            등록된 프로젝트가 없거나 조건에 맞는 공고가 없습니다.
          </div>
        ) : (
          <div
            className="project-list-page-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {projects.map((project) => (
              <ProjectCard
                key={project.post_id}
                project={project}
                onClick={() => navigate(`/togethers/${project.post_id}`)}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div
            className="project-list-page-more"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "30px",
            }}
          >
            <button
              className="project-list-page-more-btn"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? "로딩 중..." : "더보기 ∨"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
