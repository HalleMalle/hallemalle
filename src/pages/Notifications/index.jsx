import { useNavigate } from "react-router-dom";

import { useNotifications } from "@/contexts/NotificationContext";

import "./Notifications.scss";

const TYPE_ICONS = {
  APPLICATION_RECEIVED: "📩",
  APPLICATION_APPROVED: "✅",
  APPLICATION_REJECTED: "❌",
  REVIEW_RECEIVED: "⭐",
};

function iconFor(type) {
  return TYPE_ICONS[type] || "🔔";
}

function timeAgo(createdAt) {
  if (!createdAt?.toDate) {
    return "";
  }

  const diff = Date.now() - createdAt.toDate().getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  return `${Math.floor(days / 30)}개월 전`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  // 클릭 시에만 읽음 처리. 관련 구인이 있으면 해당 상세로 이동한다.
  const handleClick = (notification) => {
    markAsRead(notification.notificationId);

    if (notification.refProjectId) {
      navigate(`/togethers/${notification.refProjectId}`);
    }
  };

  return (
    <main className="notifications-page">
      <div className="container">
        <header className="notifications-header">
          <h1 className="notifications-title">알림</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notifications-readall"
              onClick={markAllAsRead}
            >
              모두 읽음
            </button>
          )}
        </header>

        {loading ? (
          <div className="notifications-status" role="status">
            알림을 불러오는 중입니다.
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <p className="notifications-empty-title">새 소식이 없어요.</p>
            <p className="notifications-empty-description">
              신청·승인 등 새로운 활동이 생기면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <ul className="notifications-list">
            {notifications.map((notification) => (
              <li key={notification.notificationId}>
                <button
                  type="button"
                  className={
                    notification.isRead
                      ? "notifications-item notifications-item-read"
                      : "notifications-item"
                  }
                  onClick={() => handleClick(notification)}
                >
                  <span className="notifications-icon" aria-hidden="true">
                    {iconFor(notification.type)}
                  </span>
                  <span className="notifications-body">
                    <span className="notifications-message">
                      {notification.message || "새 알림"}
                    </span>
                    {timeAgo(notification.createdAt) && (
                      <span className="notifications-time">
                        {timeAgo(notification.createdAt)}
                      </span>
                    )}
                  </span>
                  {!notification.isRead && (
                    <span
                      className="notifications-unread-dot"
                      aria-label="읽지 않음"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
