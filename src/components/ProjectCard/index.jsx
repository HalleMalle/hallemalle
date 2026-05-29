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

  return <></>
}
