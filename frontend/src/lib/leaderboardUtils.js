const WEEKLY_WINDOW_DAYS = 7;

function isWithinWeeklyWindow(isoDate) {
  if (!isoDate) return false;
  const submittedAt = new Date(isoDate);
  if (Number.isNaN(submittedAt.getTime())) return false;

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(now.getDate() - WEEKLY_WINDOW_DAYS);
  return submittedAt >= windowStart;
}

function getSubmissionScoreParts(submission) {
  const rawScore = Number(submission?.score || 0);
  const rawTotal = Number(submission?.total || 0);
  const score = Number.isFinite(rawScore) ? Math.max(0, rawScore) : 0;
  const total = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;
  return { score, total };
}

function toSubmissionKey(email, fallbackName) {
  if (email) return `email:${email}`;
  if (fallbackName) return `name:${fallbackName.toLowerCase()}`;
  return "";
}

export function buildLeaderboardRows(students, submissions, periodFilter) {
  const rowsByKey = new Map();

  (Array.isArray(students) ? students : []).forEach((student) => {
    const email = String(student?.email || "").trim().toLowerCase();
    if (!email) return;

    const preferredName = String(student?.name || "").trim();
    rowsByKey.set(email, {
      key: email,
      name: preferredName || String(student?.email || "").trim(),
      email,
      quizzesAttempted: 0,
      totalScore: 0,
      totalPossible: 0,
    });
  });

  (Array.isArray(submissions) ? submissions : []).forEach((submission) => {
    if (periodFilter === "weekly" && !isWithinWeeklyWindow(submission?.submittedAt)) {
      return;
    }

    const email = String(submission?.studentEmail || "").trim().toLowerCase();
    const fallbackName = String(submission?.studentName || submission?.studentEmail || "").trim();
    const key = toSubmissionKey(email, fallbackName);
    if (!key) return;

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        key,
        name: fallbackName || email,
        email,
        quizzesAttempted: 0,
        totalScore: 0,
        totalPossible: 0,
      });
    }

    const row = rowsByKey.get(key);
    const { score, total } = getSubmissionScoreParts(submission);
    row.quizzesAttempted += 1;
    row.totalScore += score;
    row.totalPossible += total;

    if (!row.name && fallbackName) {
      row.name = fallbackName;
    }
  });

  return Array.from(rowsByKey.values())
    .filter((row) => row.quizzesAttempted > 0)
    .map((row) => ({
      ...row,
      score: row.totalPossible > 0 ? Math.round((row.totalScore / row.totalPossible) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.quizzesAttempted !== left.quizzesAttempted) {
        return right.quizzesAttempted - left.quizzesAttempted;
      }
      return left.name.localeCompare(right.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
