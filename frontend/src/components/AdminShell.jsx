import DashboardHeader from "./DashboardHeader";
import { adminPrimaryNavItems, adminSecondaryNavItems } from "../lib/navigation";
import useBodyClass from "../lib/useBodyClass";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";
import { clearStoredUser, getStoredUser } from "../lib/authStorage";

function SidebarIcon({ name }) {
  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6 6h12v12H6z" />
        <path d="M9 10h6M9 14h6" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 6h12M7 12h12M7 18h12" />
        <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.7 1.7 0 0 1 0 2.4 1.7 1.7 0 0 1-2.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.7 1.7 0 0 1-3.4 0v-.1a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1.7 1.7 0 0 1-2.4 0 1.7 1.7 0 0 1 0-2.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.7 1.7 0 0 1 0-3.4h.1a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1.7 1.7 0 0 1 0-2.4 1.7 1.7 0 0 1 2.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.7 1.7 0 0 1 3.4 0v.1a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1.7 1.7 0 0 1 2.4 0 1.7 1.7 0 0 1 0 2.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.7 1.7 0 0 1 0 3.4h-.1a1 1 0 0 0-.9.7z" />
      </svg>
    );
  }
  if (name === "trophy") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
        <path d="M6 6H4a2 2 0 0 0 2 3h2" />
        <path d="M18 6h2a2 2 0 0 1-2 3h-2" />
        <path d="M12 11v4" />
        <path d="M9 18h6" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M7 15v-4" />
        <path d="M12 15V9" />
        <path d="M17 15V6" />
      </svg>
    );
  }
  return null;
}

export default function AdminShell({ children }) {
  useBodyClass("dashboard-page");
  const navigate = useNavigate();
  const user = getStoredUser();
  const mobileMenuItems = [...adminPrimaryNavItems, ...adminSecondaryNavItems];

  async function handleSidebarLogout(event) {
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
    navigate("/admin-login", { replace: true });
  }

  return (
    <div className="dashboard-shell">
      <DashboardHeader
        title="Admin Dashboard"
        navItems={[]}
        logoutRole="admin"
        showUserActions
        displayNameOverride={user?.name || "Admin"}
      />
      <main className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin selectors">
          <p className="admin-sidebar-label">Primary Actions</p>
          <nav className="admin-sidebar-nav" aria-label="Primary admin sections">
            {adminPrimaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin-sidebar-link${isActive ? " active" : ""}`}
              >
                <span className="admin-sidebar-link-icon">
                  <SidebarIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar-spacer" aria-hidden="true" />

          <p className="admin-sidebar-label admin-sidebar-label-secondary">Administrative</p>
          <nav className="admin-sidebar-nav admin-sidebar-nav-secondary" aria-label="Administrative actions">
            {adminSecondaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin-sidebar-link${isActive ? " active" : ""}`}
              >
                <span className="admin-sidebar-link-icon">
                  <SidebarIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            <Link className="admin-sidebar-link admin-sidebar-link-logout" to="/admin-login" onClick={handleSidebarLogout}>
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M21 3H11v4M21 21H11v-4" />
                </svg>
              </span>
              <span>Logout</span>
            </Link>
          </nav>

          <div className="admin-sidebar-account">
            <span className="admin-sidebar-user">{user?.name || "Admin"}</span>
          </div>
        </aside>
        <section className="dashboard-main admin-content">
          <nav className="admin-mobile-menu" aria-label="Admin navigation menu">
            <div className="admin-mobile-menu-track">
              {mobileMenuItems.map((item) => (
                <NavLink
                  key={`mobile-${item.to}`}
                  to={item.to}
                  className={({ isActive }) => `admin-mobile-menu-link${isActive ? " active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                className="admin-mobile-menu-link admin-mobile-menu-link-logout"
                to="/admin-login"
                onClick={handleSidebarLogout}
              >
                Logout
              </Link>
            </div>
          </nav>
          <div className="admin-content-frame">{children}</div>
        </section>
      </main>
    </div>
  );
}
