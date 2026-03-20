import { useEffect, useRef, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { getStoredUser } from "../../lib/authStorage";
import { apiRequest } from "../../lib/apiClient";

const LAST_BACKUP_DATE_KEY = "quizPlatformLastTextBackupDate";
const BACKUP_REMINDER_DISMISS_DATE_KEY = "quizPlatformBackupReminderDismissedDate";

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value) {
  if (!value) return "Not backed up yet";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function AdminSettingsPage() {
  const user = getStoredUser();
  const importInputRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [lastBackupDate, setLastBackupDate] = useState("");
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const today = getTodayDateOnly();
    const savedLastBackupDate = String(localStorage.getItem(LAST_BACKUP_DATE_KEY) || "");
    const savedDismissDate = String(localStorage.getItem(BACKUP_REMINDER_DISMISS_DATE_KEY) || "");

    setLastBackupDate(savedLastBackupDate);
    setShowReminder(savedLastBackupDate !== today && savedDismissDate !== today);
  }, []);

  const markBackupAsCompleted = () => {
    const today = getTodayDateOnly();
    localStorage.setItem(LAST_BACKUP_DATE_KEY, today);
    localStorage.removeItem(BACKUP_REMINDER_DISMISS_DATE_KEY);
    setLastBackupDate(today);
    setShowReminder(false);
  };

  const handleRemindTomorrow = () => {
    const today = getTodayDateOnly();
    localStorage.setItem(BACKUP_REMINDER_DISMISS_DATE_KEY, today);
    setShowReminder(false);
  };

  const downloadTextFile = (textContent, fileName) => {
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await apiRequest("/api/admin/storage/export-text");
      const text = String(response?.text || "");
      const fileName = String(response?.fileName || "quiz-platform-backup.txt");
      if (!text) {
        throw new Error("Could not generate text backup.");
      }

      downloadTextFile(text, fileName);
      markBackupAsCompleted();
      setStatus({ type: "success", message: `Backup downloaded: ${fileName}` });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to download backup." });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePickBackupFile = () => {
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const text = await file.text();
      const response = await apiRequest("/api/admin/storage/import-text", {
        method: "POST",
        body: { text },
      });

      const counts = response?.counts || {};
      const summary = `Users: ${counts.users ?? 0}, Quizzes: ${counts.quizzes ?? 0}, Submissions: ${counts.submissions ?? 0}`;
      setStatus({
        type: "success",
        message: `${response?.message || "Backup restored."} ${summary}`,
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to restore backup." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AdminShell title="Admin Settings">
      <section className="admin-tools" aria-label="Administrative settings">
        <article className="dash-card admin-tool-card">
          <h2>Admin Settings</h2>
          <p>Administrative controls and account-level system preferences.</p>

          {showReminder ? (
            <div className="admin-backup-reminder" role="status" aria-live="polite">
              <p>
                Daily backup reminder: no text backup recorded for today. Download one now to keep your data safe
                without a database.
              </p>
              <div className="admin-backup-reminder-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleExportBackup}
                  disabled={isExporting || isImporting}
                >
                  {isExporting ? "Preparing Backup..." : "Download Now"}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleRemindTomorrow}
                  disabled={isExporting || isImporting}
                >
                  Remind Me Tomorrow
                </button>
              </div>
            </div>
          ) : null}

          <div className="module-grid" style={{ marginTop: "0.9rem" }}>
            <article className="module-card">
              <h3>Account Name</h3>
              <p>{user?.name || "Admin"}</p>
            </article>
            <article className="module-card">
              <h3>Account Email</h3>
              <p>{user?.email || "admin@quizplatform.com"}</p>
            </article>
            <article className="module-card">
              <h3>Role</h3>
              <p>ADMIN</p>
            </article>
            <article className="module-card">
              <h3>Profile Editor</h3>
              <p>Moved to student workspace under Profile & Preferences.</p>
            </article>
            <article className="module-card">
              <h3>Last Text Backup</h3>
              <p>{toDisplayDate(lastBackupDate)}</p>
            </article>
          </div>

          <div className="admin-backup-actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExportBackup}
              disabled={isExporting || isImporting}
            >
              {isExporting ? "Preparing Backup..." : "Download Backup (.txt)"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={handlePickBackupFile}
              disabled={isExporting || isImporting}
            >
              {isImporting ? "Restoring..." : "Restore From Text File"}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              onChange={handleImportBackup}
              hidden
            />
          </div>

          {status.message ? (
            <p
              className={`admin-backup-status ${status.type === "error" ? "is-error" : "is-success"}`}
              role="status"
            >
              {status.message}
            </p>
          ) : null}

          <p className="admin-backup-note">
            This saves all users, quizzes, questions, and results in a text file so you can keep data without a
            database.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}
