const NOTIFICATION_STORE_KEY = "quizPlatformNotifications";
const NOTIFICATION_EVENT = "quiz-platform-notifications-updated";

function normalizeRole(role) {
  return role === "admin" ? "admin" : "student";
}

function createEmptyStore() {
  return {
    student: [],
    admin: [],
  };
}

function toSafeNotificationList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      id: String(item?.id || `${Date.now()}-${Math.random()}`),
      message: String(item?.message || "Notification"),
      createdAt: Number(item?.createdAt || Date.now()),
      read: Boolean(item?.read),
    }))
    .filter((item) => !item.id.startsWith("seed-"))
    .sort((left, right) => right.createdAt - left.createdAt);
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_STORE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return createEmptyStore();
    }

    return {
      student: toSafeNotificationList(parsed.student),
      admin: toSafeNotificationList(parsed.admin),
    };
  } catch (error) {
    return createEmptyStore();
  }
}

function writeStore(nextStore) {
  localStorage.setItem(NOTIFICATION_STORE_KEY, JSON.stringify(nextStore));
}

function dispatchUpdateEvent() {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
}

export function getNotifications(role) {
  const current = readStore();
  return current[normalizeRole(role)];
}

export function getUnreadCount(role) {
  return getNotifications(role).filter((item) => !item.read).length;
}

export function addNotification(role, message) {
  const roleKey = normalizeRole(role);
  const current = readStore();
  const nextNotification = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message: String(message || "Notification").trim() || "Notification",
    createdAt: Date.now(),
    read: false,
  };

  const nextStore = {
    ...current,
    [roleKey]: [nextNotification, ...current[roleKey]],
  };

  writeStore(nextStore);
  dispatchUpdateEvent();
}

export function markNotificationRead(role, id) {
  const roleKey = normalizeRole(role);
  const current = readStore();
  const targetId = String(id || "");

  const nextStore = {
    ...current,
    [roleKey]: current[roleKey].map((item) =>
      item.id === targetId ? { ...item, read: true } : item
    ),
  };

  writeStore(nextStore);
  dispatchUpdateEvent();
}

export function markAllNotificationsRead(role) {
  const roleKey = normalizeRole(role);
  const current = readStore();

  const nextStore = {
    ...current,
    [roleKey]: current[roleKey].map((item) => ({ ...item, read: true })),
  };

  writeStore(nextStore);
  dispatchUpdateEvent();
}

export function clearNotifications(role) {
  const roleKey = normalizeRole(role);
  const current = readStore();

  const nextStore = {
    ...current,
    [roleKey]: [],
  };

  writeStore(nextStore);
  dispatchUpdateEvent();
}

export function subscribeNotifications(onChange) {
  const callback = () => {
    if (typeof onChange === "function") {
      onChange();
    }
  };

  window.addEventListener(NOTIFICATION_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function formatNotificationTime(createdAt) {
  const time = Number(createdAt || 0);
  if (!Number.isFinite(time) || time <= 0) return "Just now";

  const diffMs = Date.now() - time;
  if (diffMs < 30 * 1000) return "Just now";

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
