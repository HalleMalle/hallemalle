import { Link, useNavigate } from "react-router-dom";

import { useNotifications } from "@/contexts/NotificationContext";

import "./NotificationDropdown.scss";

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

export default function NotificationDropdown({ onClose }) {
  const navigate = useNavigate();
  const { recentNotifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  // 클릭 시에만 읽음 처리. 관련 구인이 있으면 해당 상세로 이동한다.
  const handleItemClick = (notification) => {
    markAsRead(notification.notificationId);

    if (notification.refProjectId) {
      navigate(`/togethers/${notification.refProjectId}`);
    }

    onClose?.();
  };

  return (
    <div className="notification-dropdown" role="menu">
      <div className="notification-dropdown-head">
        <span className="notification-dropdown-title">알림</span>
        {unreadCount > 0 && (
          <button
            type="button"
            className="notification-dropdown-readall"
            onClick={markAllAsRead}
          >
            모두 읽음
          </button>
        )}
      </div>

      {recentNotifications.length === 0 ? (
        <p className="notification-dropdown-empty">새 소식이 없어요.</p>
      ) : (
        <ul className="notification-dropdown-list">
          {recentNotifications.map((notification) => (
            <li key={notification.notificationId}>
              <button
                type="button"
                className={
                  notification.isRead
                    ? "notification-dropdown-item notification-dropdown-item-read"
                    : "notification-dropdown-item"
                }
                onClick={() => handleItemClick(notification)}
              >
                <span className="notification-dropdown-icon" aria-hidden="true">
                  {iconFor(notification.type)}
                </span>
                <span className="notification-dropdown-body">
                  <span className="notification-dropdown-message">
                    {notification.message || "새 알림"}
                  </span>
                  {timeAgo(notification.createdAt) && (
                    <span className="notification-dropdown-time">
                      {timeAgo(notification.createdAt)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/profile/notifications"
        className="notification-dropdown-all"
        onClick={onClose}
      >
        전체 보기
      </Link>
    </div>
  );
}
