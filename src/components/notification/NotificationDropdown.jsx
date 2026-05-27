import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
import "./NotificationDropdown.scss";

export default function NotificationDropdown({ onClose }) {
  const { recentNotifications, unreadCount, markAllAsRead, loading } =
    useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="notif-dropdown" ref={dropdownRef}>
      <div className="notif-header">
        <h3>알림</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-mark-read"
            onClick={markAllAsRead}
          >
            모두 읽음
          </button>
        )}
      </div>

      <div className="notif-body">
        {loading ? (
          <div className="notif-empty">로딩 중...</div>
        ) : recentNotifications.length === 0 ? (
          <div className="notif-empty">새로운 알림이 없습니다</div>
        ) : (
          recentNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`notif-item ${!notif.read ? "unread" : ""}`}
            >
              <div className="notif-dot" />
              <div className="notif-content">
                <p className="notif-title">{notif.title}</p>
                <p className="notif-message">{notif.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <Link to="/notifications" className="notif-footer" onClick={onClose}>
        모든 알림 보기
      </Link>
    </div>
  );
}
