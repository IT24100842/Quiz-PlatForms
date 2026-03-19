import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import { apiRequest } from "../lib/apiClient";
import { buildLeaderboardRows } from "../lib/leaderboardUtils";
import useBodyClass from "../lib/useBodyClass";

export default function StudentLeaderboardPage() {
  useBodyClass("dashboard-page");

  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("overall");
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    let studentPayload = [];
    let submissionPayload = [];
    let submissionLoadError = false;

    try {
      const studentsResponse = await apiRequest("/api/auth/students");
      studentPayload = Array.isArray(studentsResponse) ? studentsResponse : [];
    } catch (loadError) {
      // Ignore student endpoint errors for roles that cannot access the roster.
    }

    try {
      const submissionsResponse = await apiRequest("/api/submissions");
      submissionPayload = Array.isArray(submissionsResponse) ? submissionsResponse : [];
    } catch (allSubmissionsError) {
      try {
        const ownSubmissionResponse = await apiRequest("/api/submissions/me");
        submissionPayload = Array.isArray(ownSubmissionResponse) ? ownSubmissionResponse : [];
      } catch (ownSubmissionsError) {
        submissionLoadError = true;
      }
    }

    setStudents(studentPayload);
    setSubmissions(submissionPayload);

    if (submissionLoadError) {
      setError("Leaderboard data is not available right now.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLeaderboardData();
  }, [loadLeaderboardData]);

  const rankedStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return buildLeaderboardRows(students, submissions, periodFilter)
      .filter((student) => {
        if (!normalizedSearch) return true;
        return student.name.toLowerCase().includes(normalizedSearch);
      });
  }, [periodFilter, searchTerm, students, submissions]);

  return (
    <div className="dashboard-shell">
      <DashboardHeader
        title="Student Leaderboard"
        navItems={[
          { to: "/student-dashboard", label: "Dashboard" },
          { to: "/student/leaderboard", label: "Leaderboard" },
        ]}
        logoutRole="student"
      />

      <main className="dashboard-main student-leaderboard-main">
        <section className="admin-submissions leaderboard-page" aria-label="Student leaderboard page">
          <article className="dash-card admin-submissions-card leaderboard-card" id="student-leaderboard-section">
            <div className="submission-head leaderboard-head">
              <div>
                <h2>Class Leaderboard</h2>
                <p>Rankings based on real quiz attempts.</p>
              </div>
              <Link className="btn-outline" to="/student-dashboard">
                Back to Dashboard
              </Link>
            </div>

            <div className="leaderboard-toolbar" role="search" aria-label="Leaderboard filters">
              <label className="leaderboard-search" htmlFor="student-leaderboard-search-input">
                <span className="student-table-search-label">Search Students</span>
                <input
                  id="student-leaderboard-search-input"
                  type="search"
                  placeholder="Search by student name"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="leaderboard-filter" htmlFor="student-leaderboard-period-filter">
                <span className="student-table-search-label">View</span>
                <select
                  id="student-leaderboard-period-filter"
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value)}
                >
                  <option value="overall">Overall</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>

            <div className="submission-table-wrap">
              <table className="submission-table leaderboard-table" aria-label="Student leaderboard table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student Name</th>
                    <th>Score</th>
                    <th>Quizzes Attempted</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedStudents.map((student) => {
                    const topRankClass = student.rank <= 3 ? `rank-${student.rank}` : "rank-default";
                    return (
                      <tr key={student.key} className={`leaderboard-row ${topRankClass}`}>
                        <td className="leaderboard-rank-cell" data-label="Rank">
                          <span className={`leaderboard-rank-badge ${topRankClass}`}>#{student.rank}</span>
                        </td>
                        <td className="leaderboard-name-cell" data-label="Student Name">
                          {student.name}
                        </td>
                        <td className="leaderboard-score-cell" data-label="Score">
                          {student.score}%
                        </td>
                        <td data-label="Quizzes Attempted">{student.quizzesAttempted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {loading ? <p className="admin-empty">Loading leaderboard...</p> : null}
            {!loading && error ? <p className="admin-empty">{error}</p> : null}
            {rankedStudents.length === 0 ? (
              <p className="admin-empty">No students found for your search.</p>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
