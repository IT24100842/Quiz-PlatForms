import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearStoredUser, getStoredUser } from "../lib/authStorage";
import { apiRequest } from "../lib/apiClient";
import {
  clearNotifications,
  formatNotificationTime,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "../lib/notifications";

export default function DashboardHeader({
  title,
  navItems = [],
  logoutRole = "student",
  showUserActions = true,
  displayNameOverride,
  showMobileMenuButton = false,
  onMobileMenuToggle,
  mobileMenuLabel = "Open menu",
}) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const hasNameOverride = typeof displayNameOverride === "string";
  const notificationRole = useMemo(() => (logoutRole === "admin" ? "admin" : "student"), [logoutRole]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationPanelRef = useRef(null);

  const displayName = hasNameOverride
    ? displayNameOverride || (logoutRole === "admin" ? "Admin" : "Student")
    : user?.name || (logoutRole === "admin" ? "Admin" : "Student");
  const userInitials = String(displayName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getNotifications(notificationRole));
      setUnreadCount(getUnreadCount(notificationRole));
    }

    refreshNotifications();
    return subscribeNotifications(refreshNotifications);
  }, [notificationRole]);

  useEffect(() => {
    if (!isNotificationOpen) return undefined;

    function handleDocumentClick(event) {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isNotificationOpen]);

  function handleNotificationItemClick(notification) {
    if (!notification?.id || notification.read) return;
    markNotificationRead(notificationRole, notification.id);
  }

  function handleMarkAllRead() {
    markAllNotificationsRead(notificationRole);
  }

  function handleClearNotifications() {
    clearNotifications(notificationRole);
  }

  async function handleLogout(event) {
    event.preventDefault();
    const token = user ? user.token : "";
    clearStoredUser();
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        headers: { "X-Auth-Token": token || "" },
        includeAuth: false,
      });
    } catch (error) {
      // Ignore server-side logout failure and continue local logout.
    }
    navigate(logoutRole === "admin" ? "/admin-login" : "/student-login", { replace: true });
  }

  return (
    <header className="dashboard-header">
      {showMobileMenuButton ? (
        <button
          type="button"
          className="dashboard-mobile-menu-btn"
          aria-label={mobileMenuLabel}
          onClick={onMobileMenuToggle}
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      ) : null}

      <div className="dashboard-header-title">
        <p className="eyebrow dark">Quiz Platform</p>
        <h1>{title}</h1>
      </div>
      {navItems.length > 0 || showUserActions ? (
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.length > 0 ? (
            <div className="dashboard-nav-links">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `dashboard-nav-link${isActive ? " active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
          {showUserActions ? (
            <div className="dashboard-nav-user">
              {logoutRole === "student" ? (
                <Link className="dashboard-user-avatar" to="/student/settings" aria-label="Open Profile and Preferences">
                  {user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : <span>{userInitials || "ST"}</span>}
                </Link>
              ) : null}

              <div className="dashboard-notifications" ref={notificationPanelRef}>
                <button
                  type="button"
                  className="dashboard-notification-btn"
                  aria-label="Open notifications"
                  aria-expanded={isNotificationOpen ? "true" : "false"}
                  onClick={() => setIsNotificationOpen((open) => !open)}
                >
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M15 18H9a2 2 0 0 0 6 0z" />
                    <path d="M18 16H6a1 1 0 0 1-.8-1.6l1.2-1.6V10a5.6 5.6 0 0 1 11.2 0v2.8l1.2 1.6A1 1 0 0 1 18 16z" />
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="dashboard-notification-badge" aria-hidden="true">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                {isNotificationOpen ? (
                  <section className="dashboard-notification-panel" aria-label="Notification panel">
                    <div className="dashboard-notification-panel-head">
                      <h3>Notifications</h3>
                      <div className="dashboard-notification-actions">
                        <button type="button" onClick={handleMarkAllRead}>
                          Mark all read
                        </button>
                        <button type="button" onClick={handleClearNotifications}>
                          Clear all
                        </button>
                      </div>
                    </div>

                    {notifications.length > 0 ? (
                      <ul className="dashboard-notification-list">
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={`dashboard-notification-item${notification.read ? "" : " is-unread"}`}
                          >
                            <button
                              type="button"
                              className="dashboard-notification-item-btn"
                              onClick={() => handleNotificationItemClick(notification)}
                            >
                              <p>{notification.message}</p>
                              <time>{formatNotificationTime(notification.createdAt)}</time>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="dashboard-notification-empty">No notifications yet.</p>
                    )}
                  </section>
                ) : null}
              </div>

              <span className="dashboard-user-chip">{displayName}</span>
              <Link
                className="dashboard-logout"
                to={logoutRole === "admin" ? "/admin-login" : "/student-login"}
                onClick={handleLogout}
              >
                Logout
              </Link>
            </div>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
