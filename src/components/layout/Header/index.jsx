import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

import NotificationDropdown from "@/components/NotificationDropdown";

import "./Header.scss";

export default function Header() {
  // TODO: const { unreadCount } = useNotifications();
  const unreadCount = 0; // 임시값
  const [showNotif, setShowNotif] = useState(false);

  const toggleNotif = useCallback(() => setShowNotif((v) => !v), []);
  const closeNotif = useCallback(() => setShowNotif(false), []);

  return (
    <header className="header">
      <div className="header-inner container">
        <Link to="/" className="header-logo">
          HalleMalle
        </Link>

        <nav className="header-nav">
          <Link to="/togethers" className="nav-link">
            프로젝트
          </Link>
          <Link to="/references" className="nav-link">
            참고주제
          </Link>
          <Link to="/memoirs" className="nav-link">
            회고록
          </Link>
        </nav>

        <div className="header-actions">
          {/* TODO: isAuthenticated */}
          {false ? (
            <>
              <div className="notif-wrapper">
                <button
                  type="button"
                  className="action-btn"
                  onClick={toggleNotif}
                  aria-label="알림"
                >
                  <span className="bell-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notif-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                </button>
                {showNotif && <NotificationDropdown onClose={closeNotif} />}
              </div>
              <Link to="/profile" className="action-btn">
                <img
                  src={user?.photoURL || "/default-avatar.png"}
                  alt="profile"
                  className="avatar-xs"
                />
              </Link>
            </>
          ) : (
            <Link to="/login" className="btn-primary-sm">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
