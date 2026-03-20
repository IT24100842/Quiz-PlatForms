import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";

function formatDate(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString();
}

function formatDateCompact(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getStudentInitials(student) {
  const name = String(student?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = String(student?.email || "").trim();
  return email ? email.slice(0, 2).toUpperCase() : "ST";
}

export default function AdminRegisteredStudentsPage() {
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentEmail, setSelectedStudentEmail] = useState("");
  const [busyStudentId, setBusyStudentId] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    setError("");
    try {
      const payload = await apiRequest("/api/auth/students");
      setStudents(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load registered students from server.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    setHistoryError("");
    try {
      const payload = await apiRequest("/api/submissions");
      setSubmissions(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setHistoryError(loadError.message || "Failed to load submission history.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
    void loadSubmissions();
  }, [loadStudents, loadSubmissions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadStudents();
      void loadSubmissions();
    }, 15000);

    const handleFocus = () => {
      void loadStudents();
      void loadSubmissions();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadStudents, loadSubmissions]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => {
      const haystack = [student.name, student.email, student.faculty]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(term);
    });
  }, [searchTerm, students]);

  const selectedStudent = useMemo(() => {
    const key = String(selectedStudentEmail || "").trim().toLowerCase();
    if (!key) return null;
    return (
      students.find((student) => String(student.email || "").trim().toLowerCase() === key) || null
    );
  }, [selectedStudentEmail, students]);

  const selectedHistory = useMemo(() => {
    const key = String(selectedStudent?.email || "").trim().toLowerCase();
    if (!key) return [];
    return submissions.filter(
      (submission) => String(submission.studentEmail || "").trim().toLowerCase() === key,
    );
  }, [selectedStudent, submissions]);

  useEffect(() => {
    if (selectedStudentEmail && !selectedStudent) {
      setSelectedStudentEmail("");
    }
  }, [selectedStudent, selectedStudentEmail]);

  async function handleDeleteStudent(student) {
    if (!student?.id) {
      window.alert("This student cannot be deleted right now.");
      return;
    }

    const label = student.name || student.email || "this student";
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) {
      return;
    }

    setBusyStudentId(student.id);
    try {
      await apiRequest(`/api/auth/students/${student.id}`, { method: "DELETE" });
      if (
        String(selectedStudentEmail || "").trim().toLowerCase() ===
        String(student.email || "").trim().toLowerCase()
      ) {
        setSelectedStudentEmail("");
      }
      await loadStudents();
    } catch (actionError) {
      window.alert(actionError.message || "Failed to delete student.");
    } finally {
      setBusyStudentId(null);
    }
  }

  return (
    <AdminShell title="Registered Students">
      <section className="admin-submissions" aria-label="Registered students">
        <article className="dash-card admin-submissions-card" id="registered-students-section">
          <div className="submission-head">
            <div>
              <h2 className="students-title">
                Registered Students <span className="student-total-count">({students.length})</span>
              </h2>
              <p>Students who created accounts on the platform.</p>
            </div>
            <label className="student-table-search" htmlFor="student-search-input">
              <span className="student-table-search-label">Search</span>
              <input
                id="student-search-input"
                type="search"
                placeholder="Find by name or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <div className="submission-table-wrap">
            <table className="submission-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="registered-at-col">Registered At</th>
                  <th className="student-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loadingStudents && !error
                  ? filteredStudents.map((student) => (
                      <tr key={student.id || student.email}>
                        <td className="student-name-cell" data-label="Name">
                          <div className="student-identity">
                            <span className="student-avatar" aria-hidden="true">
                              {getStudentInitials(student)}
                            </span>
                            <div className="student-identity-text">
                              <p className="student-name">{student.name || "Unnamed Student"}</p>
                              <p className={`student-presence ${student.active ? "active" : "inactive"}`}>
                                <span className="presence-dot" />
                                {student.active ? "Active" : "Inactive"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td data-label="Email">{student.email || "-"}</td>
                        <td className="registered-at-cell" data-label="Registered At" title={formatDate(student.registeredAt)}>
                          {formatDateCompact(student.registeredAt)}
                        </td>
                        <td className="student-actions-cell" data-label="Actions">
                          <div className="student-actions">
                            <button
                              type="button"
                              className="btn-outline btn-sm student-action-btn"
                              title="View profile"
                              onClick={() => setSelectedStudentEmail(student.email || "")}
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              className="student-icon-btn delete"
                              aria-label="Delete student"
                              title="Delete student"
                              onClick={() => void handleDeleteStudent(student)}
                              disabled={busyStudentId === student.id}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M6 7h12" />
                                <path d="M9 7V5h6v2" />
                                <path d="M8 7l1 12h6l1-12" />
                              </svg>
                              <span className="student-icon-btn-label">Delete Student</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          {selectedStudent ? (
            <section className="student-profile-panel" aria-label="Student profile history">
              <div className="student-profile-head">
                <div>
                  <h3>{selectedStudent.name || "Unnamed Student"}</h3>
                  <p>
                    {selectedStudent.email || "-"} | {selectedHistory.length} submission
                    {selectedHistory.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  onClick={() => setSelectedStudentEmail("")}
                >
                  Close
                </button>
              </div>

              <div className="submission-table-wrap">
                <table className="submission-table student-profile-history-table">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Score</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistory.map((submission, index) => (
                      <tr
                        key={
                          submission.id ||
                          `${submission.studentEmail || "student"}-${submission.submittedAt || "time"}-${index}`
                        }
                      >
                        <td data-label="Quiz">{submission.quizTitle || "Quiz"}</td>
                        <td data-label="Score">
                          {submission.score || 0}/{submission.total || 0}
                        </td>
                        <td data-label="Submitted At">{formatDate(submission.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {loadingSubmissions ? <p className="admin-empty">Loading profile history...</p> : null}
              {!loadingSubmissions && historyError ? <p className="admin-empty">{historyError}</p> : null}
              {!loadingSubmissions && !historyError && selectedHistory.length === 0 ? (
                <p className="admin-empty">No submissions for this student yet.</p>
              ) : null}
            </section>
          ) : null}

          {loadingStudents ? <p className="admin-empty">Loading students...</p> : null}
          {!loadingStudents && error ? <p className="admin-empty">{error}</p> : null}
          {!loadingStudents && !error && students.length === 0 ? (
            <p className="admin-empty">No students have registered yet.</p>
          ) : null}
          {!loadingStudents && !error && students.length > 0 && filteredStudents.length === 0 ? (
            <p className="admin-empty">No students match your search.</p>
          ) : null}
        </article>
      </section>
    </AdminShell>
  );
}
