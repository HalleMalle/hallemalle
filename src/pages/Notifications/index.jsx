import "./Notifications.scss";

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

const TYPE_ICONS = {
  apply: "📩",
  approved: "✅",
  rejected: "❌",
  message: "💬",
  system: "🔔",
};

export default function Notifications() {
  return <></>
}
