import { Link } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
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
  const { notifications, loading, markAsRead, markAllAsRead } =
    useNotifications();

  if (loading) {
    return (
      <div className="notif-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="notif-page">
      <div className="container">
        <div className="notif-page-header">
          <h1>알림</h1>
          {notifications.length > 0 && (
            <button
              type="button"
              className="notif-mark-all"
              onClick={markAllAsRead}
            >
              모두 읽음
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="notif-empty-state">
            <p>알림이 없습니다.</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-list-item ${!notif.read ? "unread" : ""}`}
                onClick={() => !notif.read && markAsRead(notif.id)}
              >
                <span className="notif-list-icon">
                  {TYPE_ICONS[notif.type] || "🔔"}
                </span>
                <div className="notif-list-body">
                  <p className="notif-list-title">{notif.title}</p>
                  <p className="notif-list-message">{notif.message}</p>
                  <span className="notif-list-time">
                    {timeAgo(notif.createdAt)}
                  </span>
                </div>
                {notif.linkUrl && (
                  <Link
                    to={notif.linkUrl}
                    className="notif-list-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    보기 &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
