import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";

function formatDate(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString();
}

export default function AdminStudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest("/api/submissions");
      setSubmissions(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load submissions from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSubmissions();
    }, 15000);

    const handleFocus = () => {
      void loadSubmissions();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadSubmissions]);

  async function clearSubmissions() {
    if (!window.confirm("Clear all submissions?")) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/submissions", { method: "DELETE" });
      setSubmissions([]);
    } catch (clearError) {
      setError(clearError.message || "Failed to clear submissions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Student Submissions">
      <section className="admin-submissions" aria-label="Student submissions and scores">
        <article className="dash-card admin-submissions-card" id="student-submissions-section">
          <div className="submission-head">
            <div>
              <h2>Student Submissions</h2>
              <p>Submitted quizzes and scores from student attempts.</p>
            </div>
            <button type="button" className="button-danger" onClick={clearSubmissions} disabled={busy}>
              {busy ? "Clearing..." : "Clear Submissions"}
            </button>
          </div>

          <div className="submission-table-wrap">
            <table className="submission-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Quiz</th>
                  <th>Score</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !error
                  ? submissions.map((submission) => (
                      <tr key={submission.id || `${submission.studentEmail}-${submission.submittedAt}`}>
                        <td data-label="Student">{submission.studentName || submission.studentEmail || "-"}</td>
                        <td data-label="Quiz">{submission.quizTitle || "Quiz"}</td>
                        <td data-label="Score">
                          {submission.score || 0}/{submission.total || 0}
                        </td>
                        <td data-label="Submitted At">{formatDate(submission.submittedAt)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          {loading ? <p className="admin-empty">Loading submissions...</p> : null}
          {!loading && error ? <p className="admin-empty">{error}</p> : null}
          {!loading && !error && submissions.length === 0 ? (
            <p className="admin-empty">No submissions yet.</p>
          ) : null}
        </article>
      </section>
    </AdminShell>
  );
}
