import { Link } from "react-router-dom";
import "./ProjectCard.scss";

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

function timeAgo(date) {
  if (!date) return "";
  const now = Date.now();
  const then = date.toDate ? date.toDate().getTime() : new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function ProjectCard({ project }) {
  const totalSlots = project.positions?.reduce((s, p) => s + p.total, 0) || 0;
  const filledSlots =
    project.positions?.reduce((s, p) => s + (p.current || 0), 0) || 0;

  return (
    <Link to={`/project-list/${project.id}`} className="project-card">
      <div className="card-top">
        <span className={`card-status ${project.status}`}>
          {project.status === "recruiting"
            ? "모집중"
            : project.status === "completed"
              ? "✅ 완료"
              : "모집마감"}
        </span>
        <span className="card-stage">
          {STAGE_LABELS[project.participationStage] ||
            project.participationStage}
        </span>
      </div>

      <h3 className="card-title">{project.title}</h3>
      <p className="card-desc">{project.description}</p>

      <div className="card-positions">
        {project.positions?.map((pos) => (
          <span key={pos.role} className="card-pos-tag">
            {ROLE_LABELS[pos.role] || pos.role}{" "}
            <span className="pos-count">
              {pos.current || 0}/{pos.total}
            </span>
          </span>
        ))}
      </div>

      <div className="card-footer">
        <span className="card-time">{timeAgo(project.createdAt)}</span>
        <span className="card-slots">
          {filledSlots}/{totalSlots} 모집
        </span>
      </div>
    </Link>
  );
}
