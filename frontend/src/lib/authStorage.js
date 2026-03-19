const USER_KEY = "quizUser";
const NOTICE_KEY = "authNotice";
const STUDENT_PROFILE_KEY = "studentProfilePrefs";

function normalizeStudentProfileOwner(ownerEmail) {
  return String(ownerEmail || "")
    .trim()
    .toLowerCase();
}

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    return null;
  }
}

export function setStoredUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  sessionStorage.removeItem(USER_KEY);
}

export function getToken() {
  const user = getStoredUser();
  return user ? String(user.token || "") : "";
}

export function setAuthNotice(message) {
  sessionStorage.setItem(NOTICE_KEY, message);
}

export function popAuthNotice() {
  const value = sessionStorage.getItem(NOTICE_KEY);
  if (value) {
    sessionStorage.removeItem(NOTICE_KEY);
  }
  return value || "";
}

export function getStudentProfilePrefs(ownerEmail) {
  const ownerKey = normalizeStudentProfileOwner(ownerEmail);
  if (!ownerKey) {
    return null;
  }

  try {
    const allProfiles = JSON.parse(localStorage.getItem(STUDENT_PROFILE_KEY) || "{}");
    return allProfiles && typeof allProfiles === "object" ? allProfiles[ownerKey] || null : null;
  } catch (error) {
    return null;
  }
}

export function setStudentProfilePrefs(ownerEmail, prefs) {
  const ownerKey = normalizeStudentProfileOwner(ownerEmail);
  if (!ownerKey) {
    return;
  }

  try {
    const allProfiles = JSON.parse(localStorage.getItem(STUDENT_PROFILE_KEY) || "{}");
    const nextProfiles = allProfiles && typeof allProfiles === "object" ? { ...allProfiles } : {};
    nextProfiles[ownerKey] = {
      ...(nextProfiles[ownerKey] || {}),
      ...(prefs || {}),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(nextProfiles));
  } catch (error) {
    // Ignore storage failures.
  }
}
