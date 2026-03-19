import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";

const PASS_MARK_PERCENT = 50;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeScore(submission) {
  const score = Number(submission?.score || 0);
  const total = Number(submission?.total || 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const percent = safeTotal > 0 ? (safeScore / safeTotal) * 100 : 0;
  return { safeScore, safeTotal, percent };
}

function getSubmissionDate(submission) {
  const submittedAt = new Date(submission?.submittedAt || "");
  return Number.isNaN(submittedAt.getTime()) ? null : submittedAt;
}

function isSubmissionInRange(submission, rangeFilter) {
  if (rangeFilter === "overall") return true;

  const submittedAt = getSubmissionDate(submission);
  if (!submittedAt) return false;

  const now = Date.now();
  const ageMs = now - submittedAt.getTime();
  if (ageMs < 0) return false;

  const limitDays = rangeFilter === "weekly" ? 7 : 30;
  return ageMs <= limitDays * DAY_IN_MS;
}

function getQuizLabel(submission, index) {
  const label = String(submission?.quizTitle || "").trim();
  if (label) return label;

  const quizId = String(submission?.quizId || submission?.quiz || "").trim();
  if (quizId) return `Quiz ${quizId}`;

  return `Quiz ${index + 1}`;
}

function buildQuizScoreSeries(submissions) {
  const grouped = new Map();

  submissions.forEach((submission, index) => {
    const label = getQuizLabel(submission, index);
    const { percent } = normalizeScore(submission);

    if (!grouped.has(label)) {
      grouped.set(label, { sum: 0, count: 0 });
    }

    const bucket = grouped.get(label);
    bucket.sum += percent;
    bucket.count += 1;
  });

  const rows = Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      score: value.count > 0 ? Math.round(value.sum / value.count) : 0,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  return rows;
}

function buildPassFail(submissions) {
  let pass = 0;
  let fail = 0;

  submissions.forEach((submission) => {
    const { percent } = normalizeScore(submission);
    if (percent >= PASS_MARK_PERCENT) {
      pass += 1;
    } else {
      fail += 1;
    }
  });

  if (pass === 0 && fail === 0) {
    return { pass: 0, fail: 0 };
  }

  return { pass, fail };
}

function buildWeeklyTrend(submissions) {
  const labels = [];
  const now = new Date();
  const buckets = new Map();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    labels.push({ key, label: date.toLocaleDateString(undefined, { weekday: "short" }) });
    buckets.set(key, { sum: 0, count: 0 });
  }

  submissions.forEach((submission) => {
    const date = getSubmissionDate(submission);
    if (!date) return;

    const key = date.toISOString().slice(0, 10);
    if (!buckets.has(key)) return;

    const bucket = buckets.get(key);
    bucket.sum += normalizeScore(submission).percent;
    bucket.count += 1;
  });

  return labels.map((item) => {
    const bucket = buckets.get(item.key);
    return {
      label: item.label,
      score: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
    };
  });
}

function buildMonthlyTrend(submissions) {
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const buckets = labels.map(() => ({ sum: 0, count: 0 }));
  const now = Date.now();

  submissions.forEach((submission) => {
    const date = getSubmissionDate(submission);
    if (!date) return;

    const ageDays = Math.floor((now - date.getTime()) / DAY_IN_MS);
    if (ageDays < 0 || ageDays > 29) return;

    const bucketIndex = Math.floor(ageDays / 6);
    const index = Math.max(0, Math.min(4, 4 - bucketIndex));
    buckets[index].sum += normalizeScore(submission).percent;
    buckets[index].count += 1;
  });

  return labels.map((label, index) => ({
    label,
    score: buckets[index].count > 0 ? Math.round(buckets[index].sum / buckets[index].count) : 0,
  }));
}

function buildOverallTrend(submissions) {
  const now = new Date();
  const labels = [];
  const buckets = new Map();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString(undefined, { month: "short" });
    labels.push({ key, label });
    buckets.set(key, { sum: 0, count: 0 });
  }

  submissions.forEach((submission) => {
    const date = getSubmissionDate(submission);
    if (!date) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) return;

    const bucket = buckets.get(key);
    bucket.sum += normalizeScore(submission).percent;
    bucket.count += 1;
  });

  return labels.map((item) => {
    const bucket = buckets.get(item.key);
    return {
      label: item.label,
      score: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
    };
  });
}

function buildTrend(rangeFilter, submissions) {
  if (rangeFilter === "weekly") return buildWeeklyTrend(submissions);
  if (rangeFilter === "monthly") return buildMonthlyTrend(submissions);
  return buildOverallTrend(submissions);
}

function buildAnalyticsFromData(rangeFilter, students, quizzes, submissions) {
  const filteredSubmissions = (Array.isArray(submissions) ? submissions : []).filter((submission) =>
    isSubmissionInRange(submission, rangeFilter)
  );

  const scoreSummary = filteredSubmissions.reduce(
    (acc, submission) => {
      const { safeScore, safeTotal } = normalizeScore(submission);
      acc.totalScore += safeScore;
      acc.totalPossible += safeTotal;
      return acc;
    },
    { totalScore: 0, totalPossible: 0 }
  );

  const uniqueStudentsInRange = new Set(
    filteredSubmissions
      .map((submission) => String(submission?.studentEmail || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const uniqueQuizzesInRange = new Set(
    filteredSubmissions.map((submission, index) => getQuizLabel(submission, index)).filter(Boolean)
  );

  const fallbackStudentCount = Array.isArray(students) ? students.length : 0;
  const fallbackQuizCount = Array.isArray(quizzes) ? quizzes.length : 0;

  return {
    totalStudents: Math.max(fallbackStudentCount, uniqueStudentsInRange.size),
    totalQuizzes: rangeFilter === "overall" ? Math.max(fallbackQuizCount, uniqueQuizzesInRange.size) : uniqueQuizzesInRange.size,
    averageScore:
      scoreSummary.totalPossible > 0 ? Math.round((scoreSummary.totalScore / scoreSummary.totalPossible) * 100) : 0,
    totalAttempts: filteredSubmissions.length,
    quizScores: buildQuizScoreSeries(filteredSubmissions),
    passFail: buildPassFail(filteredSubmissions),
    performanceTrend: buildTrend(rangeFilter, filteredSubmissions),
  };
}

export default function AdminAnalyticsPage() {
  const [rangeFilter, setRangeFilter] = useState("overall");
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const barCanvasRef = useRef(null);
  const pieCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);
  const chartRefs = useRef({ bar: null, pie: null, line: null });

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [studentsResult, quizzesResult, submissionsResult] = await Promise.allSettled([
      apiRequest("/api/auth/students"),
      apiRequest("/api/quizzes"),
      apiRequest("/api/submissions"),
    ]);

    const hasStudents = studentsResult.status === "fulfilled";
    const hasQuizzes = quizzesResult.status === "fulfilled";
    const hasSubmissions = submissionsResult.status === "fulfilled";

    setStudents(hasStudents && Array.isArray(studentsResult.value) ? studentsResult.value : []);
    setQuizzes(hasQuizzes && Array.isArray(quizzesResult.value) ? quizzesResult.value : []);
    setSubmissions(hasSubmissions && Array.isArray(submissionsResult.value) ? submissionsResult.value : []);

    if (!hasSubmissions) {
      setError("Submission results are unavailable. Charts may appear empty.");
    }

    if (!hasStudents && !hasQuizzes && !hasSubmissions) {
      setError("Unable to load analytics data from server.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAnalyticsData();
  }, [loadAnalyticsData]);

  const selectedAnalytics = useMemo(
    () => buildAnalyticsFromData(rangeFilter, students, quizzes, submissions),
    [rangeFilter, students, quizzes, submissions]
  );

  useEffect(() => {
    const barCanvas = barCanvasRef.current;
    const pieCanvas = pieCanvasRef.current;
    const lineCanvas = lineCanvasRef.current;
    if (!barCanvas || !pieCanvas || !lineCanvas) return undefined;

    if (chartRefs.current.bar) chartRefs.current.bar.destroy();
    if (chartRefs.current.pie) chartRefs.current.pie.destroy();
    if (chartRefs.current.line) chartRefs.current.line.destroy();

    chartRefs.current.bar = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: selectedAnalytics.quizScores.map((entry) => entry.label),
        datasets: [
          {
            label: "Average Quiz Score",
            data: selectedAnalytics.quizScores.map((entry) => entry.score),
            backgroundColor: "rgba(45, 106, 79, 0.82)",
            borderColor: "#2d6a4f",
            borderWidth: 1.5,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: "#4d6657" },
            grid: { color: "rgba(77, 102, 87, 0.14)" },
          },
          x: {
            ticks: { color: "#4d6657" },
            grid: { display: false },
          },
        },
      },
    });

    chartRefs.current.pie = new Chart(pieCanvas, {
      type: "pie",
      data: {
        labels: ["Pass", "Fail"],
        datasets: [
          {
            data: [selectedAnalytics.passFail.pass, selectedAnalytics.passFail.fail],
            backgroundColor: ["#2d6a4f", "#c74949"],
            borderColor: ["#2d6a4f", "#c74949"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#4d6657", boxWidth: 14 },
          },
        },
      },
    });

    chartRefs.current.line = new Chart(lineCanvas, {
      type: "line",
      data: {
        labels: selectedAnalytics.performanceTrend.map((entry) => entry.label),
        datasets: [
          {
            label: "Performance Trend",
            data: selectedAnalytics.performanceTrend.map((entry) => entry.score),
            borderColor: "#2f9c66",
            backgroundColor: "rgba(47, 156, 102, 0.14)",
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 4,
            tension: 0.34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: "#4d6657" },
            grid: { color: "rgba(77, 102, 87, 0.14)" },
          },
          x: {
            ticks: { color: "#4d6657" },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      if (chartRefs.current.bar) chartRefs.current.bar.destroy();
      if (chartRefs.current.pie) chartRefs.current.pie.destroy();
      if (chartRefs.current.line) chartRefs.current.line.destroy();
      chartRefs.current = { bar: null, pie: null, line: null };
    };
  }, [selectedAnalytics]);

  return (
    <AdminShell>
      <section className="admin-tools analytics-page" aria-label="Analytics dashboard">
        <article className="dash-card admin-tool-card analytics-card" id="admin-analytics-section">
          <div className="submission-head analytics-head">
            <div>
              <h2>Analytics Dashboard</h2>
              <p>Live analytics generated from actual student submissions.</p>
            </div>

            <label className="leaderboard-filter analytics-filter" htmlFor="analytics-range-filter">
              <span className="student-table-search-label">Range</span>
              <select
                id="analytics-range-filter"
                value={rangeFilter}
                onChange={(event) => setRangeFilter(event.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="overall">Overall</option>
              </select>
            </label>
          </div>

          <section className="analytics-stats-grid" aria-label="Analytics summary statistics">
            <article className="analytics-stat-card">
              <p className="analytics-stat-label">Total Students</p>
              <p className="analytics-stat-value">{selectedAnalytics.totalStudents}</p>
            </article>
            <article className="analytics-stat-card">
              <p className="analytics-stat-label">Total Quizzes</p>
              <p className="analytics-stat-value">{selectedAnalytics.totalQuizzes}</p>
            </article>
            <article className="analytics-stat-card">
              <p className="analytics-stat-label">Average Score</p>
              <p className="analytics-stat-value">{selectedAnalytics.averageScore}%</p>
            </article>
            <article className="analytics-stat-card">
              <p className="analytics-stat-label">Total Attempts</p>
              <p className="analytics-stat-value">{selectedAnalytics.totalAttempts}</p>
            </article>
          </section>

          {loading ? <p className="admin-empty">Loading analytics...</p> : null}
          {!loading && error ? <p className="admin-empty">{error}</p> : null}

          <section className="analytics-charts-grid" aria-label="Analytics charts">
            <article className="analytics-chart-panel">
              <h3>Quiz Score Distribution</h3>
              <div className="analytics-canvas-wrap">
                <canvas ref={barCanvasRef} aria-label="Bar chart of quiz scores" role="img" />
              </div>
            </article>

            <article className="analytics-chart-panel">
              <h3>Pass vs Fail Ratio</h3>
              <div className="analytics-canvas-wrap">
                <canvas ref={pieCanvasRef} aria-label="Pie chart of pass and fail ratio" role="img" />
              </div>
            </article>

            <article className="analytics-chart-panel analytics-chart-panel-wide">
              <h3>Performance Over Time</h3>
              <div className="analytics-canvas-wrap">
                <canvas ref={lineCanvasRef} aria-label="Line chart of performance trend" role="img" />
              </div>
            </article>
          </section>
        </article>
      </section>
    </AdminShell>
  );
}
