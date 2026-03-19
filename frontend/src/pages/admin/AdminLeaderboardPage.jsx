import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";
import { buildLeaderboardRows } from "../../lib/leaderboardUtils";

export default function AdminLeaderboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("overall");
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [studentsResult, submissionsResult] = await Promise.allSettled([
      apiRequest("/api/auth/students"),
      apiRequest("/api/submissions"),
    ]);

    const hasStudents = studentsResult.status === "fulfilled";
    const hasSubmissions = submissionsResult.status === "fulfilled";

    setStudents(hasStudents && Array.isArray(studentsResult.value) ? studentsResult.value : []);
    setSubmissions(hasSubmissions && Array.isArray(submissionsResult.value) ? submissionsResult.value : []);

    if (!hasStudents && !hasSubmissions) {
      setError("Unable to load leaderboard data right now.");
    } else if (!hasSubmissions) {
      setError("Showing registered students only. Submission scores are not available.");
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
    <AdminShell>
      <section className="admin-submissions leaderboard-page" aria-label="Leaderboard page">
        <article className="dash-card admin-submissions-card leaderboard-card" id="leaderboard-section">
          <div className="submission-head leaderboard-head">
            <div>
              <h2>Student Leaderboard</h2>
              <p>Rankings based on registered users and real quiz submissions.</p>
            </div>
          </div>

          <div className="leaderboard-toolbar" role="search" aria-label="Leaderboard filters">
            <label className="leaderboard-search" htmlFor="leaderboard-search-input">
              <span className="student-table-search-label">Search Students</span>
              <input
                id="leaderboard-search-input"
                type="search"
                placeholder="Search by student name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="leaderboard-filter" htmlFor="leaderboard-period-filter">
              <span className="student-table-search-label">View</span>
              <select
                id="leaderboard-period-filter"
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
          {rankedStudents.length === 0 ? <p className="admin-empty">No students found for your search.</p> : null}
        </article>
      </section>
    </AdminShell>
  );
}
