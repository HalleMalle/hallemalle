import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import NotificationDropdown from "@/components/NotificationDropdown";

import "./Header.scss";

const NAV_ITEMS = [
  { to: "/togethers", label: "프로젝트" },
  { to: "/references", label: "참고주제" },
  { to: "/memoirs", label: "회고록" },
];

export default function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const [showNotif, setShowNotif] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const notifRef = useRef(null);

  const toggleNotif = useCallback(() => {
    setShowMobileMenu(false);
    setShowNotif((v) => !v);
  }, []);
  const closeNotif = useCallback(() => setShowNotif(false), []);
  const closeMobileMenu = useCallback(() => setShowMobileMenu(false), []);
  const toggleMobileMenu = useCallback(() => {
    closeNotif();
    setShowMobileMenu((v) => !v);
  }, [closeNotif]);
  const handleSignOut = useCallback(async () => {
    await signOut();
    closeNotif();
    closeMobileMenu();
  }, [closeMobileMenu, closeNotif, signOut]);

  // 알림 드롭다운: 바깥 영역 클릭 시 닫기
  useEffect(() => {
    if (!showNotif) return undefined;

    const handlePointerDown = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        closeNotif();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showNotif, closeNotif]);

  // 모바일 메뉴: Esc 키로 닫기
  useEffect(() => {
    if (!showMobileMenu) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileMenu, showMobileMenu]);

  // 경로 변경 시 메뉴/드롭다운 닫기
  useEffect(() => {
    closeMobileMenu();
    closeNotif();
  }, [closeMobileMenu, closeNotif, location.pathname]);

  const profileImage = user?.photo_url || user?.photoURL || "";
  const profileLabel =
    user?.display_name || user?.displayName || user?.github_login || "프로필";

  return (
    <header
      className={`header${showMobileMenu ? " is-mobile-menu-open" : ""}`}
    >
      <div className="header-inner container">
        <Link to="/" className="header-logo">
          HalleMalle
        </Link>

        <nav className="header-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <div className="notif-wrapper" ref={notifRef}>
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
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={profileLabel}
                    className="avatar-xs"
                  />
                ) : (
                  <span
                    className="avatar-xs avatar-fallback"
                    aria-label={profileLabel}
                  >
                    {profileLabel.slice(0, 1)}
                  </span>
                )}
              </Link>
              <button
                type="button"
                className="logout-btn"
                onClick={handleSignOut}
              >
                로그아웃
              </button>
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={toggleMobileMenu}
                aria-label={showMobileMenu ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"}
                aria-expanded={showMobileMenu}
                aria-controls="mobile-navigation-drawer"
              >
                {showMobileMenu ? (
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
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
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary-sm">
              로그인
            </Link>
          )}
        </div>
      </div>

      {isAuthenticated && showMobileMenu && (
        <div className="mobile-menu-layer">
          <button
            type="button"
            className="mobile-menu-backdrop"
            onClick={closeMobileMenu}
            aria-label="모바일 메뉴 닫기"
          />
          <aside
            id="mobile-navigation-drawer"
            className="mobile-menu-drawer"
            aria-label="모바일 네비게이션"
          >
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">메뉴</span>
              <button
                type="button"
                className="action-btn"
                onClick={closeMobileMenu}
                aria-label="모바일 메뉴 닫기"
              >
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <nav className="mobile-menu-nav">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`mobile-menu-link${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="mobile-logout-btn"
              onClick={handleSignOut}
            >
              로그아웃
            </button>
          </aside>
        </div>
      )}
    </header>
  );
}
