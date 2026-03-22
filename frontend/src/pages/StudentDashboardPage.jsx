import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import { apiRequest } from "../lib/apiClient";
import { getStoredUser } from "../lib/authStorage";
import { normalizeFacultyId } from "../lib/faculties";
import useBodyClass from "../lib/useBodyClass";

function normalizeBusinessLabel(value) {
  return String(value || "").replace(/itroduction to business/gi, "Introduction to Business");
}

function getQuizTagTone(moduleName) {
  const normalized = String(moduleName || "").toLowerCase();
  if (normalized.includes("account")) return "quiz-tag--accounting";
  if (normalized.includes("general")) return "quiz-tag--general";
  if (normalized.includes("business") || normalized.includes("management")) return "quiz-tag--business";
  if (normalized.includes("ict") || normalized.includes("computer") || normalized.includes("program")) {
    return "quiz-tag--technology";
  }
  if (normalized.includes("math") || normalized.includes("stats")) return "quiz-tag--math";
  return "quiz-tag--default";
}

function getReadableQuizTitle(rawTitle, moduleName) {
  const normalizedTitle = normalizeBusinessLabel(rawTitle || "").trim();
  const fallbackTitle = `${moduleName} Quiz`;
  if (!normalizedTitle) return fallbackTitle;

  const cleaned = normalizedTitle
    .replace(/^\s*\d{6,}\s*[-_:|]?\s*/i, "")
    .replace(/^\s*quiz\s*#?\s*\d{6,}\s*[-_:|]?\s*/i, "")
    .replace(/\s*[-_:|]?\s*\d{6,}\s*$/i, "")
    .trim();

  if (!cleaned || /^\d{4,}$/.test(cleaned)) return fallbackTitle;
  return cleaned;
}

function quizHref(quizId) {
  return `/quiz-take?id=${encodeURIComponent(String(quizId))}`;
}

function toPercent(score, total) {
  const safeScore = Number(score || 0);
  const safeTotal = Number(total || 0);
  if (!Number.isFinite(safeScore) || !Number.isFinite(safeTotal) || safeTotal <= 0) return 0;
  return Math.max(0, Math.round((safeScore / safeTotal) * 100));
}

function getResultStatus(score, total) {
  return toPercent(score, total) >= 50 ? "Pass" : "Fail";
}

function formatSubmittedDate(isoDate) {
  const value = new Date(isoDate || "");
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getResultFeedback(score, total) {
  const percent = toPercent(score, total);
  if (percent >= 85) return "Excellent performance. Keep up the strong work.";
  if (percent >= 50) return "Good attempt. Review key concepts to improve further.";
  return "More practice is recommended. Focus on the weak areas and retry.";
}

export default function StudentDashboardPage() {
  useBodyClass("dashboard-page");

  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [resultSearch, setResultSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [openResultId, setOpenResultId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const myResults = useMemo(
    () =>
      [...submissions].sort(
        (left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime()
      ),
    [submissions]
  );

  function navigateToSection(sectionKey) {
    setActiveSection(sectionKey);
    setIsMobileMenuOpen(false);
    setOpenResultId("");
  }

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const [quizData, submissionData] = await Promise.all([
          apiRequest("/api/quizzes/published/me"),
          apiRequest("/api/submissions/me"),
        ]);

        if (cancelled) return;
        const studentFacultyId = normalizeFacultyId(getStoredUser()?.faculty);
        const scopedQuizzes = (Array.isArray(quizData) ? quizData : []).filter((quiz) => {
          const quizFacultyId = normalizeFacultyId(quiz?.facultyId || quiz?.targetFaculty || "ALL") || "ALL";
          if (!studentFacultyId) {
            return true;
          }
          return quizFacultyId === "ALL" || quizFacultyId === studentFacultyId;
        });
        setQuizzes(scopedQuizzes);
        setSubmissions(Array.isArray(submissionData) ? submissionData : []);
        setError("");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || "Failed to load student dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboardData();

    const intervalId = window.setInterval(() => {
      void loadDashboardData();
    }, 15000);

    const handleFocus = () => {
      void loadDashboardData();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const categories = useMemo(() => {
    const values = quizzes
      .map((quiz) => normalizeBusinessLabel(quiz.module || quiz.category || "General"))
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort();
    return ["All", ...values];
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const moduleName = normalizeBusinessLabel(quiz.module || quiz.category || "General");
      const examType = quiz.examType || "General";
      const quizTitle = normalizeBusinessLabel(quiz.title || "");
      const matchCategory = activeCategory === "All" || moduleName === activeCategory;
      const matchSearch =
        !term ||
        quizTitle.toLowerCase().includes(term) ||
        moduleName.toLowerCase().includes(term) ||
        examType.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, quizzes, searchTerm]);

  const stats = useMemo(() => {
    const attempted = myResults.length;
    const totalScored = myResults.reduce((sum, entry) => sum + Number(entry.score || 0), 0);
    const totalPossible = myResults.reduce((sum, entry) => sum + Number(entry.total || 0), 0);
    const average = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
    const highest = myResults.reduce((max, entry) => {
      const score = Number(entry.score || 0);
      const total = Number(entry.total || 0);
      if (total <= 0) return max;
      return Math.max(max, Math.round((score / total) * 100));
    }, 0);
    return { attempted, average: Math.max(0, Math.min(100, average)), highest };
  }, [myResults]);

  const filteredResults = useMemo(() => {
    const term = resultSearch.trim().toLowerCase();
    return myResults.filter((result) => {
      const status = getResultStatus(result.score, result.total).toLowerCase();
      const statusMatches = resultFilter === "all" || status === resultFilter;
      const searchMatches = !term || String(result.quizTitle || "").toLowerCase().includes(term);
      return statusMatches && searchMatches;
    });
  }, [myResults, resultFilter, resultSearch]);

  const analytics = useMemo(() => {
    const passCount = myResults.filter((result) => getResultStatus(result.score, result.total) === "Pass").length;
    const failCount = Math.max(0, myResults.length - passCount);
    const passRate = myResults.length > 0 ? Math.round((passCount / myResults.length) * 100) : 0;
    const recentFive = myResults.slice(0, 5);
    const recentAverage =
      recentFive.length > 0
        ? Math.round(
            recentFive.reduce((sum, entry) => sum + toPercent(entry.score, entry.total), 0) / recentFive.length
          )
        : 0;

    return {
      passCount,
      failCount,
      passRate,
      recentAverage,
    };
  }, [myResults]);

  const recentPerformance = useMemo(
    () =>
      myResults.slice(0, 5).map((result) => ({
        id: result.id || `${result.quizTitle}-${result.submittedAt}`,
        title: result.quizTitle || "Quiz",
        submittedAt: formatSubmittedDate(result.submittedAt),
        percent: toPercent(result.score, result.total),
      })),
    [myResults]
  );

  const renderSubmissionsTable = (title, subtitle) => (
    <section className="quiz-section student-results-section" aria-label={title}>
      <div className="submission-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="student-results-toolbar">
          <label className="student-table-search" htmlFor="student-results-search">
            <span className="student-table-search-label">Search</span>
            <input
              id="student-results-search"
              type="search"
              placeholder="Search by quiz title"
              value={resultSearch}
              onChange={(event) => setResultSearch(event.target.value)}
            />
          </label>

          <label className="leaderboard-filter student-results-filter" htmlFor="student-results-filter">
            <span className="student-table-search-label">Status</span>
            <select id="student-results-filter" value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </label>
        </div>
      </div>

      <div className="submission-table-wrap">
        <table className="submission-table student-results-table">
          <thead>
            <tr>
              <th>Quiz Title</th>
              <th>Date Submitted</th>
              <th>Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result) => {
              const percent = toPercent(result.score, result.total);
              const status = getResultStatus(result.score, result.total);
              const isHighScore = percent >= 85;
              const rowKey = String(result.id || `${result.quizTitle}-${result.submittedAt}`);
              const isOpen = openResultId === rowKey;

              return [
                <tr key={`${rowKey}-row`} className={`student-result-row${isHighScore ? " is-high-score" : ""}`}>
                  <td data-label="Quiz Title">{result.quizTitle}</td>
                  <td data-label="Date Submitted">{formatSubmittedDate(result.submittedAt)}</td>
                  <td data-label="Score" className="student-result-score">
                    {result.score}/{result.total} ({percent}%)
                  </td>
                  <td data-label="Status">
                    <span className={`quiz-result-status-badge ${status === "Pass" ? "is-pass" : "is-fail"}`}>{status}</span>
                  </td>
                  <td data-label="Actions">
                    <button
                      type="button"
                      className="button-secondary student-result-toggle"
                      onClick={() => setOpenResultId((current) => (current === rowKey ? "" : rowKey))}
                    >
                      {isOpen ? "Hide Details" : "View Details"}
                    </button>
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`${rowKey}-detail`} className="student-result-detail-row">
                    <td colSpan={5} data-label="Details">
                      <div className="student-result-detail">
                        <p>
                          <strong>Correct Answers:</strong> {result.score || 0} out of {result.total || 0}.
                        </p>
                        <p className="student-result-feedback">
                          <strong>Feedback:</strong> {result.feedback || getResultFeedback(result.score, result.total)}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>

      {filteredResults.length === 0 ? (
        <p className="admin-empty">
          {myResults.length === 0
            ? "No quiz history yet. Complete a quiz to see your results here."
            : "No submissions match your filter."}
        </p>
      ) : null}
    </section>
  );

  const averageBand =
    stats.average >= 75 ? "High performance" : stats.average >= 45 ? "Steady progress" : "Needs practice";
  const averageTone = stats.average >= 75 ? "is-high" : stats.average >= 45 ? "is-medium" : "is-low";
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - stats.average / 100);

  return (
    <div className="dashboard-shell">
      <DashboardHeader
        title="Student Dashboard"
        navItems={[]}
        logoutRole="student"
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
            <a
              className={`admin-sidebar-link ${activeSection === "overview" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("overview");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 13.5 12 6l8 7.5" />
                  <path d="M6 12.5V19h12v-6.5" />
                </svg>
              </span>
              <span>Overview</span>
            </a>
            <a
              className={`admin-sidebar-link ${activeSection === "browse" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("browse");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7 6h12M7 12h12M7 18h12" />
                  <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
                </svg>
              </span>
              <span>Browse</span>
            </a>
            <a
              className={`admin-sidebar-link ${activeSection === "results" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("results");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6 4h12a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
                  <path d="M9 9h6M9 12h6" />
                </svg>
              </span>
              <span>My Results</span>
            </a>
            <Link className="admin-sidebar-link" to="/student/leaderboard" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
                  <path d="M6 6H4a2 2 0 0 0 2 3h2" />
                  <path d="M18 6h2a2 2 0 0 1-2 3h-2" />
                  <path d="M12 11v4" />
                  <path d="M9 18h6" />
                </svg>
              </span>
              <span>Leaderboard</span>
            </Link>
          </nav>
        </aside>
      </div>

      <main className="dashboard-main student-layout student-layout-dashboard">
        <aside className="admin-sidebar student-sidebar-nav" aria-label="Student sections">
          <h2 className="sidebar-title">Student Sections</h2>
          <nav className="admin-sidebar-nav" aria-label="Student dashboard sections">
            <a
              className={`admin-sidebar-link ${activeSection === "overview" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("overview");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 13.5 12 6l8 7.5" />
                  <path d="M6 12.5V19h12v-6.5" />
                </svg>
              </span>
              <span>Overview</span>
            </a>
            <a
              className={`admin-sidebar-link ${activeSection === "browse" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("browse");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7 6h12M7 12h12M7 18h12" />
                  <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
                </svg>
              </span>
              <span>Browse Quizzes</span>
            </a>
            <a
              className={`admin-sidebar-link ${activeSection === "results" ? "active" : ""}`}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("results");
              }}
            >
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6 4h12a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
                  <path d="M9 9h6M9 12h6" />
                </svg>
              </span>
              <span>My Results</span>
            </a>
            <Link className="admin-sidebar-link" to="/student/leaderboard">
              <span className="admin-sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
                  <path d="M6 6H4a2 2 0 0 0 2 3h2" />
                  <path d="M18 6h2a2 2 0 0 1-2 3h-2" />
                  <path d="M12 11v4" />
                  <path d="M9 18h6" />
                </svg>
              </span>
              <span>Leaderboard</span>
            </Link>
          </nav>
        </aside>

        <section className="student-content">
          <div key={activeSection} className="student-section-panel">
            {activeSection === "overview" ? (
              <>
                <section className="dashboard-grid student-stats-grid" aria-label="Student overview cards">
                  <article className="dash-card metric-card">
                    <h2>Attempted Quizzes</h2>
                    <div className="metric-value-row">
                      <span className="metric-icon metric-icon-success" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                          <path d="m8.2 12.3 2.4 2.4 5-5" />
                        </svg>
                      </span>
                      <span className="dash-value">{stats.attempted}</span>
                    </div>
                    <p>Total quiz attempts recorded for your account.</p>
                  </article>

                  <article className="dash-card metric-card metric-average-card">
                    <h2>Average Score</h2>
                    <div className="metric-average-wrap">
                      <div className="metric-ring">
                        <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
                          <circle className="metric-ring-track" cx="36" cy="36" r="28" />
                          <circle
                            className={`metric-ring-progress ${averageTone}`}
                            cx="36"
                            cy="36"
                            r="28"
                            style={{
                              strokeDasharray: ringCircumference,
                              strokeDashoffset: ringOffset,
                            }}
                          />
                        </svg>
                        <span className="metric-ring-value">{stats.average}%</span>
                      </div>
                      <p className="metric-average-label">{averageBand}</p>
                    </div>
                    <p>Average based on your submitted quiz scores.</p>
                  </article>

                  <article className="dash-card metric-card">
                    <h2>Highest Score</h2>
                    <div className="metric-value-row">
                      <span className="metric-icon metric-icon-accent" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
                          <path d="M6 6H4a2 2 0 0 0 2 3h2" />
                          <path d="M18 6h2a2 2 0 0 1-2 3h-2" />
                          <path d="M12 11v4" />
                          <path d="M9 18h6" />
                        </svg>
                      </span>
                      <span className="dash-value">{stats.highest}%</span>
                    </div>
                    <p>Your best single quiz score so far.</p>
                  </article>
                </section>
                {renderSubmissionsTable("My Submissions", "Your quiz history and personal results.")}
              </>
            ) : null}

            {activeSection === "browse" ? (
              <section className="quiz-section" aria-label="Browse available quizzes">
                <div className="quiz-section-header">
                  <h2>Browse Quizzes</h2>
                  <span className="quiz-count-badge">
                    {quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"}
                  </span>
                </div>

                <div className="quiz-browse-controls">
                  <div className="quiz-search-wrap">
                    <span className="quiz-search-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <circle cx="11" cy="11" r="6" />
                        <path d="m16 16 4.2 4.2" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      className="quiz-search-input"
                      placeholder="Search quizzes..."
                      aria-label="Search quizzes"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <div className="quiz-filter-chips">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`quiz-filter-chip ${activeCategory === category ? "active" : ""}`}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="quiz-grid">
                  {loading ? <p className="quiz-loading">Loading quizzes...</p> : null}
                  {!loading && error ? <p className="quiz-loading">{error}</p> : null}
                  {!loading && !error && filteredQuizzes.length === 0 ? (
                    <p className="quiz-empty">
                      {quizzes.length === 0
                        ? "No quizzes have been published yet. Check back later."
                        : "No quizzes match your search."}
                    </p>
                  ) : null}
                  {!loading && !error
                    ? filteredQuizzes.map((quiz) => {
                        const moduleName = normalizeBusinessLabel(quiz.module || quiz.category || "General");
                        const totalMarks = Number(quiz.totalMarks) > 0 ? Number(quiz.totalMarks) : 100;
                        const questionCount = Number(quiz.questions) >= 0 ? Number(quiz.questions) : 0;
                        const minutes = Number(quiz.minutes) >= 0 ? Number(quiz.minutes) : 0;
                        return (
                          <article key={quiz.id} className="quiz-card">
                            <p className={`quiz-tag ${getQuizTagTone(moduleName)}`}>{moduleName}</p>
                            <h3>{getReadableQuizTitle(quiz.title, moduleName)}</h3>
                            <ul className="quiz-meta-list" aria-label="Quiz details">
                              <li className="quiz-meta-item">
                                <span className="quiz-meta-icon" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" focusable="false">
                                    <circle cx="12" cy="12" r="8" />
                                    <path d="M12 8v5l3 2" />
                                  </svg>
                                </span>
                                <span className="quiz-meta-text">{minutes} min</span>
                              </li>
                              <li className="quiz-meta-item">
                                <span className="quiz-meta-icon" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" focusable="false">
                                    <path d="M7.5 9.5a4.5 4.5 0 0 1 9 0c0 2.5-2.4 3.3-3.4 4.4-.4.4-.6.8-.6 1.6" />
                                    <circle cx="12" cy="18" r="1" />
                                  </svg>
                                </span>
                                <span className="quiz-meta-text">{questionCount} questions</span>
                              </li>
                              <li className="quiz-meta-item">
                                <span className="quiz-meta-icon" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" focusable="false">
                                    <path d="M6 7.5h12" />
                                    <path d="M9 4.5h6" />
                                    <path d="M8 11.5h8" />
                                    <rect x="7" y="3.5" width="10" height="17" rx="2" />
                                  </svg>
                                </span>
                                <span className="quiz-meta-text">{totalMarks} marks</span>
                              </li>
                            </ul>
                            <Link className="quiz-action" to={quizHref(quiz.id)}>
                              Start Quiz
                            </Link>
                          </article>
                        );
                      })
                    : null}
                </div>
              </section>
            ) : null}

            {activeSection === "results" ? (
              <>
                <section className="quiz-section student-analytics-section" aria-label="Detailed results analytics">
                  <div className="quiz-section-header">
                    <h2>Detailed Analytics</h2>
                    <span className="quiz-count-badge">
                      {myResults.length} attempt{myResults.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="student-results-metrics">
                    <article className="dash-card student-results-metric-card">
                      <h3>Pass Rate</h3>
                      <p className="student-results-metric-value">{analytics.passRate}%</p>
                      <p>{analytics.passCount} pass, {analytics.failCount} fail</p>
                    </article>
                    <article className="dash-card student-results-metric-card">
                      <h3>Recent Average</h3>
                      <p className="student-results-metric-value">{analytics.recentAverage}%</p>
                      <p>Based on your latest 5 quizzes.</p>
                    </article>
                    <article className="dash-card student-results-metric-card">
                      <h3>Overall Average</h3>
                      <p className="student-results-metric-value">{stats.average}%</p>
                      <p>All submitted quizzes combined.</p>
                    </article>
                    <article className="dash-card student-results-metric-card">
                      <h3>Best Performance</h3>
                      <p className="student-results-metric-value">{stats.highest}%</p>
                      <p>Highest score achieved so far.</p>
                    </article>
                  </div>

                  <div className="student-analytics-trend">
                    <h3>Recent Performance Trend</h3>
                    {recentPerformance.length === 0 ? (
                      <p className="admin-empty">No quiz attempts yet. Start a quiz to generate analytics.</p>
                    ) : (
                      <ul className="student-analytics-list">
                        {recentPerformance.map((entry) => (
                          <li key={entry.id}>
                            <span>{entry.title}</span>
                            <span>{entry.percent}%</span>
                            <span>{entry.submittedAt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
                {renderSubmissionsTable("Result Breakdown", "Detailed score and feedback for every attempt.")}
              </>
            ) : null}
          </div>
        </section>
      </main>

      <nav className="student-bottom-nav" aria-label="Student quick navigation">
        <a
          href="#"
          className={`student-bottom-nav-link ${activeSection === "overview" ? "active" : ""}`}
          onClick={(event) => {
            event.preventDefault();
            navigateToSection("overview");
          }}
        >
          <span className="student-bottom-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 13.5 12 6l8 7.5" />
              <path d="M6 12.5V19h12v-6.5" />
            </svg>
          </span>
          <span>Home</span>
        </a>
        <a
          href="#"
          className={`student-bottom-nav-link ${activeSection === "browse" ? "active" : ""}`}
          onClick={(event) => {
            event.preventDefault();
            navigateToSection("browse");
          }}
        >
          <span className="student-bottom-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M7 6h12M7 12h12M7 18h12" />
              <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
            </svg>
          </span>
          <span>Browse</span>
        </a>
        <a
          href="#"
          className={`student-bottom-nav-link ${activeSection === "results" ? "active" : ""}`}
          onClick={(event) => {
            event.preventDefault();
            navigateToSection("results");
          }}
        >
          <span className="student-bottom-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M6 4h12a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
              <path d="M9 9h6M9 12h6" />
            </svg>
          </span>
          <span>Results</span>
        </a>
        <Link className="student-bottom-nav-link" to="/student/settings">
          <span className="student-bottom-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
              <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.7 1.7 0 0 1 0 2.4 1.7 1.7 0 0 1-2.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.7 1.7 0 0 1-3.4 0v-.1a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1.7 1.7 0 0 1-2.4 0 1.7 1.7 0 0 1 0-2.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.7 1.7 0 0 1 0-3.4h.1a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1.7 1.7 0 0 1 0-2.4 1.7 1.7 0 0 1 2.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.7 1.7 0 0 1 3.4 0v.1a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1.7 1.7 0 0 1 2.4 0 1.7 1.7 0 0 1 0 2.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.7 1.7 0 0 1 0 3.4h-.1a1 1 0 0 0-.9.7z" />
            </svg>
          </span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
