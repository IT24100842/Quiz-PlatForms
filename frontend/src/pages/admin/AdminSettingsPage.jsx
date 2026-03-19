import AdminShell from "../../components/AdminShell";
import { getStoredUser } from "../../lib/authStorage";

export default function AdminSettingsPage() {
  const user = getStoredUser();

  return (
    <AdminShell title="Admin Settings">
      <section className="admin-tools" aria-label="Administrative settings">
        <article className="dash-card admin-tool-card">
          <h2>Admin Settings</h2>
          <p>Administrative controls and account-level system preferences.</p>

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
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
