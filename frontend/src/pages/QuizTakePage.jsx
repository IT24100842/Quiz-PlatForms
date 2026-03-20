import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";
import { getStoredUser } from "../lib/authStorage";
import { addNotification } from "../lib/notifications";
import useBodyClass from "../lib/useBodyClass";


function toDisplayTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getFirstName(fullName) {
  const normalized = String(fullName || "").trim();
  if (!normalized) return "Student";
  return normalized.split(/\s+/)[0] || "Student";
}

function toSortedIds(values) {
  return (Array.isArray(values) ? values : []).map((value) => String(value)).sort();
}

function buildQuestionExplanation(question, correctOptions) {
  const explicit = String(question?.explanation || "").trim();
  if (explicit) return explicit;

  if (!correctOptions.length) {
    return "The correct answer is determined by the option marked as valid in this quiz configuration.";
  }

  if (correctOptions.length === 1) {
    return `The correct answer is \"${correctOptions[0]}\" because it is the option marked as correct for this question.`;
  }

  return `The correct answers are ${correctOptions.map((label) => `\"${label}\"`).join(", ")} because this question expects multiple valid selections.`;
}

function toModuleLabel(subject) {
  const base = String(subject || "Quiz").trim();
  if (!base) return "Quiz Platform";
  return /module$/i.test(base) ? base : `${base} Module`;
}

export default function QuizTakePage() {
  useBodyClass("quiz-page-body");

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const quizId = params.get("id");

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  const timerWarning = remainingSeconds < 60;
  const studentFirstName = useMemo(() => getFirstName(getStoredUser()?.name), []);

  const progressQuestion = useMemo(() => {
    if (!questions.length) return 0;
    const firstUnansweredIndex = questions.findIndex((question) => {
      const answers = selectedAnswers[question.id];
      return !Array.isArray(answers) || answers.length === 0;
    });
    return firstUnansweredIndex === -1 ? questions.length : firstUnansweredIndex + 1;
  }, [questions, selectedAnswers]);

  const progressPercent = useMemo(() => {
    if (!questions.length || !progressQuestion) return 0;
    return Math.round((progressQuestion / questions.length) * 100);
  }, [progressQuestion, questions.length]);

  useEffect(() => {
    if (!quizId) {
      setError("No quiz selected.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all([
      apiRequest(`/api/quizzes/published/${quizId}`),
      apiRequest(`/api/quizzes/${quizId}/questions`),
    ])
      .then(([quizData, questionData]) => {
        if (cancelled) return;
        setQuiz(quizData);
        setQuestions(Array.isArray(questionData) ? questionData : []);
        setRemainingSeconds(Math.max(1, Number(quizData?.minutes || 20) * 60));
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError.message || "Failed to load quiz. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const calculateScore = useCallback(() => {
    let score = 0;
    questions.forEach((question) => {
      const correctIds = (question.options || [])
        .filter((option) => option.correct)
        .map((option) => String(option.id))
        .sort();
      const chosenIds = Object.prototype.hasOwnProperty.call(selectedAnswers, question.id)
        ? [...selectedAnswers[question.id]].map(String).sort()
        : [];
      const sameLength = correctIds.length === chosenIds.length;
      const sameValues = sameLength && correctIds.every((value, index) => value === chosenIds[index]);
      if (sameValues) {
        score += 1;
      }
    });

    return { score, total: questions.length };
  }, [questions, selectedAnswers]);

  const submitQuiz = useCallback(
    async (wasAutoSubmitted) => {
      if (!quiz || submitting) return;

      setSubmitting(true);
      const result = calculateScore();
      const totalQuestions = Math.max(1, Number(result.total || 0));
      const percentage = Math.round((Number(result.score || 0) / totalQuestions) * 100);
      const passed = percentage >= 50;
      const allottedSeconds = Math.max(1, Number(quiz?.minutes || 20) * 60);
      const elapsedSeconds = Math.max(0, allottedSeconds - remainingSeconds);

      try {
        await apiRequest("/api/submissions", {
          method: "POST",
          body: {
            quizId: quiz.id,
            quizTitle: quiz.title,
            score: result.score,
            total: result.total,
          },
        });
      } catch (saveError) {
        // Ignore submission save failure for UI flow parity with previous implementation.
      }

      const studentName = String(getStoredUser()?.name || studentFirstName || "A student").trim() || "A student";
      const quizTitle = String(quiz?.title || quiz?.module || "a quiz").trim() || "a quiz";
      addNotification("admin", `${studentName} completed ${quizTitle}`);

      setResultSummary({
        score: Number(result.score || 0),
        total: Number(result.total || 0),
        percentage,
        passed,
        elapsedSeconds,
        allottedSeconds,
        wasAutoSubmitted,
        selectedAnswersSnapshot: Object.fromEntries(
          Object.entries(selectedAnswers).map(([key, values]) => [key, toSortedIds(values)])
        ),
      });
      setSubmitting(false);
    },
    [calculateScore, quiz, remainingSeconds, studentFirstName, submitting]
  );

  useEffect(() => {
    if (!quiz || loading || error || submitting || resultSummary) return undefined;

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          void submitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [error, loading, quiz, resultSummary, submitQuiz, submitting]);

  const quizMetaItems = useMemo(() => {
    if (!quiz) return [];
    const moduleName = quiz.module || quiz.category || "General";
    const examType = quiz.examType || "General";
    const totalMarks = quiz.totalMarks || 100;
    const minutes = Number(quiz.minutes || 0);
    return [
      { key: "module", icon: "📘", text: moduleName },
      { key: "type", icon: "🧪", text: examType },
      { key: "marks", icon: "🎯", text: `${totalMarks} marks` },
      { key: "questions", icon: "❓", text: `${questions.length} questions` },
      { key: "duration", icon: "⏱", text: `${minutes} min` },
    ];
  }, [questions.length, quiz]);

  const headerTitle = useMemo(() => {
    if (!quiz) return "Quiz";
    return quiz.title || quiz.module || quiz.category || "Quiz";
  }, [quiz]);

  const headerSubject = useMemo(() => {
    if (!quiz) return "Quiz Platform";
    return toModuleLabel(quiz.module || quiz.category || "Quiz Platform");
  }, [quiz]);

  function renderHeader(title, subject = "Quiz Platform") {
    return (
      <header className="page-header">
        <div className="quiz-header-top">
          <Link className="quiz-back-link" to="/student-dashboard">
            Back to Dashboard
          </Link>
          <p className="eyebrow dark">{subject}</p>
        </div>
        <h1 className="quiz-take-title">{title}</h1>
      </header>
    );
  }

  function renderShell(title, subject, content) {
    return (
      <div className="page-shell">
        {renderHeader(title, subject)}
        <main className="quiz-take-main">{content}</main>
      </div>
    );
  }

  function updateAnswer(question, optionId, checked) {
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      const key = question.id;
      const current = Array.isArray(next[key]) ? [...next[key]] : [];
      const questionType = question.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";

      if (questionType === "SINGLE") {
        next[key] = [String(optionId)];
        return next;
      }

      if (checked) {
        if (!current.includes(String(optionId))) {
          current.push(String(optionId));
        }
      } else {
        const idx = current.indexOf(String(optionId));
        if (idx >= 0) {
          current.splice(idx, 1);
        }
      }
      next[key] = current;
      return next;
    });
  }

  function handleCancelQuiz() {
    const confirmed = window.confirm("Cancel this quiz and return to your dashboard?");
    if (!confirmed) return;
    navigate("/student-dashboard", { replace: true });
  }

  if (loading) {
    return renderShell("Loading...", "Quiz Platform", <p className="quiz-loading">Loading quiz questions...</p>);
  }

  if (error || !quiz) {
    return renderShell(
      "Quiz",
      "Quiz Platform",
      <p className="quiz-loading">{error || "Failed to load quiz."}</p>
    );
  }

  if (!questions.length) {
    return renderShell(
      headerTitle,
      headerSubject,
      <p className="quiz-loading">This quiz has no questions yet.</p>
    );
  }

  if (resultSummary) {
    const questionReviews = questions.map((question, index) => {
      const correctIds = toSortedIds((question.options || []).filter((option) => option.correct).map((option) => option.id));
      const chosenIds = toSortedIds(resultSummary.selectedAnswersSnapshot?.[question.id] || []);
      const isUnanswered = chosenIds.length === 0;
      const isCorrect =
        correctIds.length === chosenIds.length &&
        correctIds.every((value, idx) => value === chosenIds[idx]);
      const reviewStatus = isUnanswered ? "unanswered" : isCorrect ? "correct" : "incorrect";
      const correctOptions = (question.options || [])
        .filter((option) => option.correct)
        .map((option) => option.text)
        .filter(Boolean);

      return {
        question,
        index,
        correctIds,
        chosenIds,
        isCorrect,
        reviewStatus,
        explanation: buildQuestionExplanation(question, correctOptions),
      };
    });

    const headline = resultSummary.passed
      ? `Great job, ${studentFirstName}!`
      : "Don't give up, try again!";
    const reviewHeaderTitle = /quiz$/i.test(headerTitle)
      ? `Review: ${headerTitle}`
      : `Review: ${headerTitle} Quiz`;

    return renderShell(
      reviewHeaderTitle,
      headerSubject,
      <>
        <section className={`quiz-result-hero ${resultSummary.passed ? "is-pass" : "is-fail"}`} aria-label="Quiz result summary">
            <div className="quiz-result-ring-wrap">
              <div
                className={`quiz-result-ring ${resultSummary.passed ? "is-pass" : "is-fail"}`}
                style={{ "--result-progress": `${resultSummary.percentage}%` }}
                role="img"
                aria-label={`Final score ${resultSummary.percentage} percent`}
              >
                <span className="quiz-result-ring-value">{resultSummary.percentage}%</span>
              </div>
            </div>

            <div className="quiz-result-copy">
              <p className="quiz-result-kicker">Quiz Complete</p>
              <h2 className="quiz-result-headline">{headline}</h2>
              <p className="quiz-result-subtext">
                {resultSummary.wasAutoSubmitted
                  ? "Time is up. Your answers were auto-submitted."
                  : "Your answers have been submitted successfully."}
              </p>
            </div>

            <div className="quiz-result-stats" role="list" aria-label="Result details">
              <article className="quiz-result-stat" role="listitem">
                <p className="quiz-result-stat-label">Score</p>
                <p className="quiz-result-stat-value">{resultSummary.score} / {resultSummary.total}</p>
              </article>
              <article className="quiz-result-stat" role="listitem">
                <p className="quiz-result-stat-label">Time</p>
                <p className="quiz-result-stat-value">{toDisplayTime(resultSummary.elapsedSeconds)}</p>
              </article>
              <article className="quiz-result-stat" role="listitem">
                <p className="quiz-result-stat-label">Accuracy</p>
                <p className="quiz-result-stat-value">{resultSummary.percentage}%</p>
              </article>
              <article className="quiz-result-stat" role="listitem">
                <p className="quiz-result-stat-label">Status</p>
                <span className={`quiz-result-status-badge ${resultSummary.passed ? "is-pass" : "is-fail"}`}>
                  {resultSummary.passed ? "Passed" : "Failed"}
                </span>
              </article>
            </div>

        </section>

        <section className="quiz-review-section" aria-label="Detailed review section">
          <h3 className="quiz-review-title">Detailed Review</h3>
          <section className="quiz-review-list" aria-label="Question review list">
            {questionReviews.map((item) => (
              <article key={item.question.id} className="quiz-review-card">
                <div className="quiz-review-head">
                  <p className="quiz-review-index">
                    Question {item.index + 1} of {questions.length}
                  </p>
                  <span className={`quiz-review-badge is-${item.reviewStatus}`}>
                    {item.reviewStatus === "correct" ? "Correct" : item.reviewStatus === "incorrect" ? "Incorrect" : "Unanswered"}
                  </span>
                </div>

                <p className="quiz-review-question">{item.question.text}</p>

                <ul className="quiz-review-options" aria-label={`Review options for question ${item.index + 1}`}>
                  {(item.question.options || []).map((option) => {
                    const optionId = String(option.id);
                    const isCorrectOption = item.correctIds.includes(optionId);
                    const wasChosen = item.chosenIds.includes(optionId);
                    const optionTone = isCorrectOption
                      ? "is-correct"
                      : wasChosen
                        ? "is-wrong-selected"
                        : "";

                    return (
                      <li key={option.id} className={`quiz-review-option ${optionTone}`.trim()}>
                        <span className="quiz-review-option-text">{option.text}</span>
                        {isCorrectOption ? <span className="quiz-review-option-icon is-correct" aria-hidden="true">{"\u2713"}</span> : null}
                        {!isCorrectOption && wasChosen ? (
                          <span className="quiz-review-option-icon is-incorrect" aria-hidden="true">{"\u2715"}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="quiz-learning-note" aria-label="Learning note">
                  <p className="quiz-learning-note-title">
                    <span className="quiz-learning-note-title-icon" aria-hidden="true">💡</span>
                    <span>Why is this correct?</span>
                  </p>
                  <p className="quiz-learning-note-text">{item.explanation}</p>
                </div>
              </article>
            ))}
          </section>
          <div className="quiz-review-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/student-dashboard", { replace: true })}
            >
              Go to Student Dashboard
            </button>
          </div>
        </section>
      </>
    );
  }

  return renderShell(
    headerTitle,
    headerSubject,
    <section className="quiz-live-shell">
        <section className="quiz-progress" aria-label="Quiz progress">
          <div
            className="quiz-progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-valuenow={progressQuestion}
            aria-valuetext={`Question ${progressQuestion} of ${questions.length}`}
          >
            <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="quiz-progress-text">
            Question {progressQuestion} of {questions.length}
          </p>
        </section>

        <div className={`timer-pill quiz-hud-timer ${timerWarning ? "warning" : ""}`}>
          <span className="timer-pill-icon" aria-hidden="true">⏳</span>
          <span>Time left: </span>
          <span>{toDisplayTime(remainingSeconds)}</span>
        </div>

        <div className="quiz-meta">
          <ul className="quiz-meta-list" aria-label="Quiz details">
            {quizMetaItems.map((item) => (
              <li key={item.key} className="quiz-meta-item">
                <span className="quiz-meta-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="quiz-page"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuiz(false);
          }}
        >
          {questions.map((question, questionIndex) => {
            const questionType = question.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
            return (
              <article key={question.id} className="question-card" data-question-id={question.id}>
                <p className="question-number">
                  Question {questionIndex + 1} of {questions.length}
                </p>
                <p className="question-text">{question.text}</p>
                <p className="quiz-instruction">
                  {questionType === "MULTIPLE" ? "Select all correct answers." : "Select one correct answer."}
                </p>

                <ul className="option-list">
                  {(question.options || []).map((option) => {
                    const selected = Array.isArray(selectedAnswers[question.id])
                      ? selectedAnswers[question.id].includes(String(option.id))
                      : false;
                    return (
                      <li key={option.id}>
                        <label className={`option-card ${selected ? "is-selected" : ""}`.trim()}>
                          <input
                            type={questionType === "MULTIPLE" ? "checkbox" : "radio"}
                            name={`q${question.id}`}
                            value={option.id}
                            checked={selected}
                            onChange={(event) => updateAnswer(question, option.id, event.target.checked)}
                          />
                          <span className="option-text">{option.text}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}

          <div className="quiz-actions">
            <button type="button" className="btn-ghost-cancel" onClick={handleCancelQuiz} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </form>
      </section>
  );
}
