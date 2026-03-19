import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import { apiRequest } from "../lib/apiClient";
import { getStoredUser, getStudentProfilePrefs, setStoredUser, setStudentProfilePrefs } from "../lib/authStorage";
import useBodyClass from "../lib/useBodyClass";

const MODULE_OPTIONS = ["AI", "Cyber Security", "Data Science", "Software Engineering", "Cloud Computing"];
const DEFAULT_BIO = "Curious learner focused on improving outcomes across core and elective modules.";
const DEFAULT_MODULES = ["AI", "Cyber Security"];

export default function StudentSettingsPage() {
  useBodyClass("dashboard-page");

  const user = getStoredUser();
  const profileOwnerEmail = user?.email || "";
  const storedProfile = getStudentProfilePrefs(profileOwnerEmail);
  const defaultName = storedProfile?.savedName || user?.name || "Student";
  const defaultEmail = user?.email || "student@quizplatform.com";
  const defaultEmailOrId = storedProfile?.savedEmailOrId || defaultEmail;
  const defaultMotherName = storedProfile?.savedMotherName || "";
  const defaultFatherName = storedProfile?.savedFatherName || "";
  const defaultBio = storedProfile?.savedBio || DEFAULT_BIO;
  const defaultFavoriteModules =
    Array.isArray(storedProfile?.savedFavoriteModules) && storedProfile.savedFavoriteModules.length > 0
      ? storedProfile.savedFavoriteModules
      : [...DEFAULT_MODULES];
  const defaultPhoto = storedProfile?.profilePhoto || user?.profilePhoto || "";
  const [savedName, setSavedName] = useState(defaultName);
  const [savedEmailOrId, setSavedEmailOrId] = useState(defaultEmailOrId);
  const [savedMotherName, setSavedMotherName] = useState(defaultMotherName);
  const [savedFatherName, setSavedFatherName] = useState(defaultFatherName);
  const [savedBio, setSavedBio] = useState(defaultBio);
  const [savedFavoriteModules, setSavedFavoriteModules] = useState([...defaultFavoriteModules]);
  const [savedAvatar, setSavedAvatar] = useState(defaultPhoto);
  const [userName, setUserName] = useState(defaultName);
  const [emailOrId, setEmailOrId] = useState(defaultEmailOrId);
  const [motherName, setMotherName] = useState(defaultMotherName);
  const [fatherName, setFatherName] = useState(defaultFatherName);
  const [bio, setBio] = useState(defaultBio);
  const [favoriteModules, setFavoriteModules] = useState([...defaultFavoriteModules]);
  const [avatarPreview, setAvatarPreview] = useState(defaultPhoto);
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toastTimerRef = useRef(0);
  const bioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const initials = useMemo(() => {
    const parts = String(userName || defaultName)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) {
      return "ST";
    }
    return parts.map((part) => part[0].toUpperCase()).join("");
  }, [defaultName, userName]);

  function handleNameChange(event) {
    const nextName = event.target.value;
    setUserName(nextName);
  }

  function showToast(message, type = "success") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((currentToast) => ({ ...currentToast, visible: false }));
    }, 3000);
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextPhoto = typeof reader.result === "string" ? reader.result : "";
      setAvatarPreview(nextPhoto);
      const currentUser = getStoredUser();
      if (currentUser && currentUser.role === "STUDENT") {
        setStoredUser({
          ...currentUser,
          profilePhoto: nextPhoto,
        });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();

    const normalizedMotherName = motherName.trim();
    const normalizedFatherName = fatherName.trim();

    try {
      await apiRequest("/api/auth/student-profile", {
        method: "PUT",
        body: {
          name: userName,
          motherName: normalizedMotherName,
          fatherName: normalizedFatherName,
        },
      });
    } catch (error) {
      // Keep profile preferences available offline even if profile API sync fails.
    }

    setSavedName(userName);
    setSavedEmailOrId(emailOrId);
    setSavedMotherName(normalizedMotherName);
    setSavedFatherName(normalizedFatherName);
    setSavedBio(bio);
    setSavedFavoriteModules([...favoriteModules]);
    setSavedAvatar(avatarPreview);

    const currentUser = getStoredUser();
    if (currentUser && currentUser.role === "STUDENT") {
      setStoredUser({
        ...currentUser,
        name: userName,
        profilePhoto: avatarPreview,
      });
    }

    setStudentProfilePrefs(profileOwnerEmail, {
      savedName: userName,
      savedEmailOrId: emailOrId,
      savedMotherName: normalizedMotherName,
      savedFatherName: normalizedFatherName,
      savedBio: bio,
      savedFavoriteModules: [...favoriteModules],
      profilePhoto: avatarPreview,
    });
    showToast("Profile details saved.", "success");
  }

  function handleCancel() {
    setUserName(savedName);
    setEmailOrId(savedEmailOrId);
    setMotherName(savedMotherName);
    setFatherName(savedFatherName);
    setBio(savedBio);
    setFavoriteModules([...savedFavoriteModules]);
    setAvatarPreview(savedAvatar);
    const currentUser = getStoredUser();
    if (currentUser && currentUser.role === "STUDENT") {
      setStoredUser({
        ...currentUser,
        name: savedName,
        profilePhoto: savedAvatar,
      });
    }
    showToast("Changes discarded.", "error");
  }

  function handleBioFocus() {
    if (!bioRef.current) return;
    bioRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function toggleFavoriteModule(moduleName) {
    setFavoriteModules((current) => {
      if (current.includes(moduleName)) {
        return current.filter((moduleItem) => moduleItem !== moduleName);
      }
      return [...current, moduleName];
    });
  }

  return (
    <div className="dashboard-shell">
      <DashboardHeader
        title="Student Dashboard"
        navItems={[]}
        logoutRole="student"
        displayNameOverride={savedName}
        showMobileMenuButton
        onMobileMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        mobileMenuLabel="Open student navigation"
      />

      <div className={`student-mobile-drawer ${isMobileMenuOpen ? "open" : ""}`} aria-hidden={!isMobileMenuOpen}>
        <button
          type="button"
          className="student-mobile-drawer-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        />
        <aside className="student-mobile-drawer-panel" aria-label="Student navigation drawer">
          <div className="student-mobile-drawer-head">
            <p>Student Sections</p>
            <button
              type="button"
              className="student-mobile-drawer-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav className="admin-sidebar-nav" aria-label="Student drawer links">
            <Link className="admin-sidebar-link" to="/student-dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 13.5 12 6l8 7.5" />
                  <path d="M6 12.5V19h12v-6.5" />
                </svg>
              </span>
              <span>Overview</span>
            </Link>
            <Link className="admin-sidebar-link active" to="/student/settings" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                  <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.7 1.7 0 0 1 0 2.4 1.7 1.7 0 0 1-2.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.7 1.7 0 0 1-3.4 0v-.1a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1.7 1.7 0 0 1-2.4 0 1.7 1.7 0 0 1 0-2.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.7 1.7 0 0 1 0-3.4h.1a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1.7 1.7 0 0 1 0-2.4 1.7 1.7 0 0 1 2.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.7 1.7 0 0 1 3.4 0v.1a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1.7 1.7 0 0 1 2.4 0 1.7 1.7 0 0 1 0 2.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.7 1.7 0 0 1 0 3.4h-.1a1 1 0 0 0-.9.7z" />
                </svg>
              </span>
              <span>Profile</span>
            </Link>
          </nav>
        </aside>
      </div>

      <main className="dashboard-main student-layout student-layout-settings">
        <aside className="admin-sidebar student-sidebar-nav" aria-label="Student sections">
          <h2 className="sidebar-title">Student Sections</h2>
          <nav className="admin-sidebar-nav" aria-label="Student dashboard sections">
            <Link className="admin-sidebar-link active" to="/student-dashboard">
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 13.5 12 6l8 7.5" />
                  <path d="M6 12.5V19h12v-6.5" />
                </svg>
              </span>
              <span>Overview</span>
            </Link>
          </nav>
        </aside>

        <section className="student-content">
          <section className="admin-settings-page" aria-label="Student profile settings">
            <article className="dash-card admin-settings-shell student-profile-card">
              <div className="admin-settings-header">
                <h2>My Profile</h2>
                <p>Manage your personal information and presence.</p>
              </div>

              <div className="admin-settings-grid">
                <aside className="admin-settings-profile" aria-label="Profile quick panel">
                  <div className="admin-avatar-panel">
                    <label className="admin-avatar-trigger" htmlFor="student-avatar-upload" aria-label="Change profile picture">
                      <div className="admin-avatar" aria-hidden="true">
                        {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span className="admin-avatar-initials">{initials}</span>}
                        <span className="admin-avatar-fab">
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M4.5 8.5h3l1.2-2h6.6l1.2 2h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18v-8A1.5 1.5 0 0 1 4.5 8.5z" />
                            <path d="M12 15.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z" />
                          </svg>
                        </span>
                      </div>
                    </label>
                    <span className="admin-profile-badge">Student</span>
                    <input
                      id="student-avatar-upload"
                      className="admin-avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />

                    <div className="admin-quick-info">
                      <h3>Quick Info</h3>
                      <dl>
                        <div>
                          <dt>Email</dt>
                          <dd>{defaultEmail}</dd>
                        </div>
                        <div>
                          <dt>Role</dt>
                          <dd>STUDENT</dd>
                        </div>
                        <div>
                          <dt>Workspace</dt>
                          <dd>Quiz Platform</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="admin-social-presence" aria-label="Social presence">
                      <h3>Social Presence</h3>
                      <div className="admin-social-links">
                        <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="admin-social-link">
                          <span className="admin-social-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <path d="M7.2 8.4v8.4" />
                              <circle cx="7.2" cy="5.9" r="1" />
                              <path d="M11.3 8.4v8.4" />
                              <path d="M11.3 12.1c0-2 1.3-3.7 3.1-3.7s2.8 1.2 2.8 3.5v4.9" />
                            </svg>
                          </span>
                          <span>LinkedIn</span>
                        </a>
                        <a href="https://example.com" target="_blank" rel="noreferrer" className="admin-social-link">
                          <span className="admin-social-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <circle cx="12" cy="12" r="8" />
                              <path d="M4 12h16" />
                              <path d="M12 4a14 14 0 0 1 0 16" />
                              <path d="M12 4a14 14 0 0 0 0 16" />
                            </svg>
                          </span>
                          <span>Website</span>
                        </a>
                      </div>
                    </div>

                    <div className="admin-identity-footer">
                      <p>Account Created: March 2026</p>
                    </div>
                  </div>
                </aside>

                <form id="student-profile-form" className="admin-settings-form" onSubmit={handleSave}>
                  <div className="admin-settings-inline-grid">
                    <div className="quiz-form-field">
                      <label htmlFor="student-name">Full Name</label>
                      <input id="student-name" type="text" value={userName} onChange={handleNameChange} />
                    </div>

                    <div className="quiz-form-field">
                      <label htmlFor="student-email-id">Email / ID</label>
                      <input
                        id="student-email-id"
                        type="text"
                        value={emailOrId}
                        onChange={(event) => setEmailOrId(event.target.value)}
                      />
                    </div>

                    <div className="quiz-form-field">
                      <label htmlFor="student-mother-name">Mother's Full Name</label>
                      <input
                        id="student-mother-name"
                        type="text"
                        value={motherName}
                        onChange={(event) => setMotherName(event.target.value)}
                        placeholder="Enter mother's full name"
                      />
                    </div>

                    <div className="quiz-form-field">
                      <label htmlFor="student-father-name">Father's Full Name</label>
                      <input
                        id="student-father-name"
                        type="text"
                        value={fatherName}
                        onChange={(event) => setFatherName(event.target.value)}
                        placeholder="Enter father's full name"
                      />
                    </div>
                  </div>

                  <div className="quiz-form-field admin-bio-wrap">
                    <label htmlFor="student-bio">About Me</label>
                    <span className="admin-bio-hint" aria-hidden="true">💡 Write a short bio to introduce yourself</span>
                    <textarea
                      id="student-bio"
                      ref={bioRef}
                      rows={6}
                      maxLength={250}
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      onFocus={handleBioFocus}
                      placeholder="Tell us about your academic goals..."
                    />
                    <span className="admin-bio-counter" aria-live="polite">
                      {bio.length}/250
                    </span>
                  </div>

                  <div className="quiz-form-field">
                    <label>Module Preferences</label>
                    <div className="admin-module-tags" role="group" aria-label="Select favorite modules">
                      {MODULE_OPTIONS.map((moduleName) => {
                        const isSelected = favoriteModules.includes(moduleName);
                        return (
                          <button
                            key={moduleName}
                            type="button"
                            className={`admin-module-tag${isSelected ? " is-selected" : ""}`}
                            aria-pressed={isSelected}
                            onClick={() => toggleFavoriteModule(moduleName)}
                          >
                            <span>{moduleName}</span>
                            {isSelected ? <span className="admin-module-tag-remove" aria-hidden="true">x</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>

              <div className="student-profile-actions">
                <div className="admin-settings-action-buttons">
                  <button type="button" className="profile-cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" form="student-profile-form" className="profile-save-btn">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M5 20h14a1 1 0 0 0 1-1V8.5L15.5 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" />
                      <path d="M8 4v5h7V4" />
                      <path d="M8.5 20v-6h7v6" />
                    </svg>
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </article>
          </section>
        </section>
      </main>

      <div className="admin-toast-stack student-toast-stack" aria-live="polite" aria-atomic="true">
        {toast.message ? (
          <p className={`admin-toast ${toast.type} ${toast.visible ? "show" : ""}`}>{toast.message}</p>
        ) : null}
      </div>
    </div>
  );
}
