import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";

const defaultOptions = [
  { text: "", correct: true },
  { text: "", correct: false },
  { text: "", correct: false },
  { text: "", correct: false },
  { text: "", correct: false },
];

function formatDateLabel(isoDate) {
  if (!isoDate) return "TBA";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString();
}

function formatAudienceLabel(targetFaculty) {
  const normalized = String(targetFaculty || "ALL").trim().toUpperCase();
  if (normalized === "ALL") return "All students";
  if (normalized === "IT") return "IT";
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function getTitlePresentation(title) {
  const rawTitle = String(title || "").trim();
  const looksLikeGeneratedId = /^\d{10,}$/.test(rawTitle);
  if (!rawTitle || looksLikeGeneratedId) {
    return {
      title: "Untitled Quiz",
      idHint: looksLikeGeneratedId ? `ID ${rawTitle}` : "",
    };
  }
  return { title: rawTitle, idHint: "" };
}

function normalizeQuestionType(type) {
  return type === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
}

function ensureFiveOptions(options) {
  const normalized = Array.isArray(options)
    ? options.map((option) => ({ text: String(option.text || ""), correct: Boolean(option.correct) }))
    : [];
  while (normalized.length < 5) {
    normalized.push({ text: "", correct: false });
  }
  return normalized.slice(0, 5);
}

export default function AdminAddedQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("ALL_FACULTIES");

  const [editorOpen, setEditorOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [editorBusy, setEditorBusy] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionType, setQuestionType] = useState("SINGLE");
  const [optionRows, setOptionRows] = useState(defaultOptions);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionError, setQuestionError] = useState("");

  const quizCountLabel = useMemo(
    () => `${questions.length} question${questions.length === 1 ? "" : "s"}`,
    [questions.length]
  );

  const facultyFilterOptions = useMemo(() => {
    const dynamicFaculties = Array.from(
      new Set(quizzes.map((quiz) => String(quiz.targetFaculty || "ALL").trim().toUpperCase()))
    )
      .filter(Boolean)
      .sort();

    const options = [
      { value: "ALL_FACULTIES", label: "All faculties" },
      { value: "IT", label: "IT" },
      { value: "BUSINESS", label: "Business" },
      { value: "ENGINEERING", label: "Engineering" },
      { value: "MEDICINE", label: "Medicine" },
      { value: "ALL", label: "All students" },
    ];

    dynamicFaculties.forEach((faculty) => {
      if (!options.some((option) => option.value === faculty)) {
        options.push({ value: faculty, label: formatAudienceLabel(faculty) });
      }
    });

    return options;
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const targetFaculty = String(quiz.targetFaculty || "ALL").trim().toUpperCase();
      if (facultyFilter !== "ALL_FACULTIES" && facultyFilter !== targetFaculty) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        quiz.title,
        quiz.module,
        quiz.category,
        quiz.examType,
        targetFaculty,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchableText.includes(query);
    });
  }, [quizzes, searchQuery, facultyFilter]);

  const hasActiveFilters = searchQuery.trim() !== "" || facultyFilter !== "ALL_FACULTIES";

  const resetQuestionForm = useCallback(() => {
    setQuestionText("");
    setQuestionExplanation("");
    setQuestionType("SINGLE");
    setOptionRows(defaultOptions);
    setEditingQuestionId("");
    setQuestionError("");
  }, []);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest("/api/quizzes");
      setQuizzes(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load quizzes from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  async function loadQuestionsForQuiz(quizId) {
    const payload = await apiRequest(`/api/quizzes/${quizId}/questions`);
    setQuestions(Array.isArray(payload) ? payload : []);
  }

  async function openEditor(quizId) {
    setEditorBusy(true);
    setQuestionError("");
    try {
      const [quizPayload, questionPayload] = await Promise.all([
        apiRequest(`/api/quizzes/${quizId}`),
        apiRequest(`/api/quizzes/${quizId}/questions`),
      ]);
      setCurrentQuiz(quizPayload || null);
      setQuestions(Array.isArray(questionPayload) ? questionPayload : []);
      setEditorOpen(true);
      resetQuestionForm();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (openError) {
      setQuestionError(openError.message || "Failed to open question editor for this quiz.");
    } finally {
      setEditorBusy(false);
    }
  }

  async function updatePublishStatus(quizId, shouldPublish) {
    try {
      await apiRequest(`/api/quizzes/${quizId}/${shouldPublish ? "publish" : "unpublish"}`, {
        method: "PUT",
      });
      await loadQuizzes();
    } catch (updateError) {
      setError(updateError.message || "Failed to update quiz publish status.");
    }
  }

  async function removeQuiz(quizId) {
    if (!window.confirm("Remove this quiz?")) return;
    try {
      await apiRequest(`/api/quizzes/${quizId}`, { method: "DELETE" });
      await loadQuizzes();

      if (String(currentQuiz?.id || "") === String(quizId)) {
        setEditorOpen(false);
        setCurrentQuiz(null);
        setQuestions([]);
        resetQuestionForm();
      }
    } catch (removeError) {
      setError(removeError.message || "Failed to remove quiz.");
    }
  }

  function handleQuestionTypeChange(nextType) {
    const normalized = normalizeQuestionType(nextType);
    setQuestionType(normalized);
    if (normalized === "SINGLE") {
      let seenChecked = false;
      setOptionRows((prev) =>
        prev.map((option, index) => {
          if (option.correct && !seenChecked) {
            seenChecked = true;
            return option;
          }
          if (option.correct && seenChecked) {
            return { ...option, correct: false };
          }
          if (!seenChecked && index === 0) {
            return { ...option, correct: true };
          }
          return option;
        })
      );
    }
  }

  function updateOptionText(index, value) {
    setOptionRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, text: value } : row)));
  }

  function updateOptionCorrect(index, checked) {
    if (questionType === "SINGLE") {
      setOptionRows((prev) => prev.map((row, rowIndex) => ({ ...row, correct: rowIndex === index ? checked : false })));
      return;
    }

    setOptionRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, correct: checked } : row)));
  }

  function validateQuestionPayload() {
    const text = String(questionText || "").trim();
    if (!text) {
      setQuestionError("Question text is required.");
      return null;
    }

    if (optionRows.length !== 5) {
      setQuestionError("Exactly five options are required.");
      return null;
    }

    const options = optionRows.map((row, index) => ({
      text: String(row.text || "").trim(),
      correct: Boolean(row.correct),
      optionOrder: index + 1,
    }));

    if (options.some((option) => !option.text)) {
      setQuestionError("All option fields are required.");
      return null;
    }

    const correctCount = options.filter((option) => option.correct).length;
    if (questionType === "SINGLE" && correctCount !== 1) {
      setQuestionError("Single-answer MCQ must have exactly one correct option.");
      return null;
    }
    if (questionType === "MULTIPLE" && correctCount < 2) {
      setQuestionError("Multiple-answer MCQ must have at least two correct options.");
      return null;
    }

    return {
      text,
      explanation: String(questionExplanation || "").trim(),
      questionType,
      options,
    };
  }

  async function saveQuestion(event) {
    event.preventDefault();
    if (!currentQuiz?.id) {
      setQuestionError("Select a quiz first.");
      return;
    }

    const payload = validateQuestionPayload();
    if (!payload) return;

    setEditorBusy(true);
    setQuestionError("");
    try {
      const method = editingQuestionId ? "PUT" : "POST";
      const endpoint = `/api/quizzes/${currentQuiz.id}/questions${editingQuestionId ? `/${editingQuestionId}` : ""}`;
      await apiRequest(endpoint, { method, body: payload });
      await loadQuestionsForQuiz(currentQuiz.id);
      await loadQuizzes();
      resetQuestionForm();
    } catch (saveError) {
      setQuestionError(saveError.message || "Failed to save question. Ensure all fields are valid.");
    } finally {
      setEditorBusy(false);
    }
  }

  function beginEditQuestion(question) {
    const normalizedType = normalizeQuestionType(question.questionType);
    setEditingQuestionId(String(question.id));
    setQuestionText(question.text || "");
    setQuestionExplanation(question.explanation || "");
    setQuestionType(normalizedType);
    setOptionRows(ensureFiveOptions(question.options));
    setQuestionError("");
  }

  async function deleteQuestion(questionId) {
    if (!currentQuiz?.id) return;
    if (!window.confirm("Delete this question?")) return;

    setEditorBusy(true);
    setQuestionError("");
    try {
      await apiRequest(`/api/quizzes/${currentQuiz.id}/questions/${questionId}`, { method: "DELETE" });
      await loadQuestionsForQuiz(currentQuiz.id);
      await loadQuizzes();
      resetQuestionForm();
    } catch (deleteError) {
      setQuestionError(deleteError.message || "Failed to delete question.");
    } finally {
      setEditorBusy(false);
    }
  }

  return (
    <AdminShell title="Added Quizzes">
      <section className="admin-tools" aria-label="Admin quiz management">
        <article className="dash-card admin-tool-card" id="added-quizzes-section">
          <h2>Added Quizzes</h2>
          <p>
            Click <strong>Manage Questions</strong> on any quiz to add or edit its questions.
          </p>

          <div className="admin-quiz-toolbar" role="search" aria-label="Search and filter quizzes">
            <label className="admin-quiz-search-wrap" htmlFor="admin-quiz-search-react">
              <span className="admin-toolbar-label">Search</span>
              <input
                id="admin-quiz-search-react"
                type="search"
                className="admin-quiz-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by quiz, module, exam type..."
              />
            </label>

            <label className="admin-quiz-filter-wrap" htmlFor="admin-quiz-filter-react">
              <span className="admin-toolbar-label">Audience</span>
              <select
                id="admin-quiz-filter-react"
                className="admin-quiz-filter"
                value={facultyFilter}
                onChange={(event) => setFacultyFilter(event.target.value)}
              >
                {facultyFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Link className="btn-primary admin-toolbar-add" to="/admin/add-quiz">
              Add Quiz
            </Link>
          </div>

          {loading ? <p className="admin-empty">Loading quizzes...</p> : null}
          {!loading && error ? <p className="admin-empty">{error}</p> : null}
          {!loading && !error && filteredQuizzes.length === 0 ? (
            <p className="admin-empty">
              {hasActiveFilters ? "No quizzes match your current search/filter." : "No custom quizzes added yet."}
            </p>
          ) : null}

          {!loading && !error && filteredQuizzes.length > 0 ? (
            <div className="admin-quiz-table-wrap">
              <table className="admin-quiz-table" aria-label="Added quizzes table">
                <thead>
                  <tr>
                    <th scope="col">Quiz Title</th>
                    <th scope="col">Subject / Module</th>
                    <th scope="col">Stats</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.map((quiz) => {
                    const moduleName = quiz.module || quiz.category || "General";
                    const targetFaculty = String(quiz.targetFaculty || "ALL").toUpperCase();
                    const examType = quiz.examType || "General";
                    const totalMarks = quiz.totalMarks || 100;
                    const questionCount = quiz.questions || 0;
                    const titlePresentation = getTitlePresentation(quiz.title);
                    return (
                      <tr key={quiz.id} className={`admin-quiz-row ${quiz.published ? "is-published" : ""}`}>
                        <td className="admin-quiz-title-cell" data-label="Quiz Title">
                          <p className="admin-quiz-title">{titlePresentation.title}</p>
                          {titlePresentation.idHint ? (
                            <p className="admin-quiz-id">{titlePresentation.idHint}</p>
                          ) : null}
                          <p className="admin-quiz-meta">
                            {formatAudienceLabel(targetFaculty)} audience | {examType}
                          </p>
                        </td>
                        <td className="admin-quiz-module-cell" data-label="Subject / Module">{moduleName}</td>
                        <td className="admin-quiz-stats-cell" data-label="Stats">
                          <p className="admin-quiz-stats">
                            {totalMarks} marks / {questionCount} questions
                          </p>
                        </td>
                        <td className="admin-quiz-date-cell" data-label="Date">{formatDateLabel(quiz.scheduledDate)}</td>
                        <td className={`admin-quiz-status-cell ${quiz.published ? "is-published" : "is-draft"}`} data-label="Status">
                          {quiz.published ? "Published" : "Draft"}
                        </td>
                        <td className="admin-quiz-actions-cell" data-label="Actions">
                          <div className="admin-quiz-actions">
                            <button
                              type="button"
                              className="btn-primary btn-sm admin-action-primary"
                              onClick={() => void openEditor(quiz.id)}
                            >
                              Manage Questions
                            </button>
                            <button
                              type="button"
                              className={
                                quiz.published
                                  ? "btn-muted btn-sm admin-action-secondary admin-publish-btn is-unpublish"
                                  : "btn-primary btn-sm admin-action-secondary admin-publish-btn is-publish"
                              }
                              onClick={() => void updatePublishStatus(quiz.id, !quiz.published)}
                            >
                              {quiz.published ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              type="button"
                              className="btn-danger-ghost btn-sm"
                              onClick={() => void removeQuiz(quiz.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </section>

      {editorOpen ? (
        <section className="question-editor-section" aria-label="Question editor">
          <article className="dash-card">
            <div className="question-editor-header">
              <div>
                <h2>
                  Questions for: <span>{currentQuiz?.title || ""}</span>
                </h2>
                <p className="question-editor-sub">{quizCountLabel}</p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditorOpen(false);
                  setCurrentQuiz(null);
                  setQuestions([]);
                  resetQuestionForm();
                }}
              >
                X Close
              </button>
            </div>

            <ul className="question-list">
              {questions.map((question, questionIndex) => {
                const typeLabel = question.questionType === "MULTIPLE" ? "Multiple-answer" : "Single-answer";
                const questionNumber = String(questionIndex + 1).padStart(2, "0");
                return (
                  <li key={question.id} className="question-item">
                    <div className="question-item-head">
                      <span className="question-item-index-badge">Question {questionNumber}</span>
                      <div className="question-item-actions">
                        <button type="button" className="btn-outline btn-xs question-action-btn" onClick={() => beginEditQuestion(question)}>
                          <span className="question-action-icon" aria-hidden="true">{"\u270e"}</span>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-danger btn-xs question-action-btn"
                          onClick={() => void deleteQuestion(question.id)}
                        >
                          <span className="question-action-icon" aria-hidden="true">{"\ud83d\uddd1"}</span>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="question-item-title">{question.text}</p>
                    <p className="question-item-type">{typeLabel}</p>
                    <ul className="question-item-options">
                      {(question.options || []).map((option) => {
                        const optionKey = option.id || `${question.id}-${option.optionOrder}`;
                        return (
                          <li key={optionKey} className={`question-item-option-row${option.correct ? " is-correct" : ""}`}>
                            <span className="question-item-option-text">{option.text}</span>
                            {option.correct ? (
                              <span className="question-item-correct-badge">
                                <span className="question-item-correct-icon" aria-hidden="true">{"\u2713"}</span>
                                Correct Answer
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {String(question.explanation || "").trim() ? (
                      <div className="question-item-explanation">
                        <span className="question-item-explanation-icon" aria-hidden="true">💡</span>
                        <p className="question-item-explanation-text">
                          <strong>Explanation:</strong> {String(question.explanation || "").trim()}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {questions.length === 0 ? <p className="admin-empty">No questions yet. Add the first one below.</p> : null}

            <div className="question-form-wrap">
              <h3 className="question-form-title">{editingQuestionId ? "Edit Question" : "Add a Question"}</h3>

              <form className="question-form" onSubmit={saveQuestion}>
                {questionError ? (
                  <div className="form-alert form-alert-error" role="alert">
                    <span className="alert-icon">⚠️</span>
                    <span className="alert-message">{questionError}</span>
                  </div>
                ) : null}
                <label htmlFor="q-text">Question Text</label>
                <textarea
                  id="q-text"
                  name="text"
                  rows="2"
                  placeholder="Type the question here..."
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  required
                />

                <label htmlFor="q-type">Question Type</label>
                <select
                  id="q-type"
                  value={questionType}
                  onChange={(event) => handleQuestionTypeChange(event.target.value)}
                  required
                >
                  <option value="SINGLE">Single-answer MCQ (one correct)</option>
                  <option value="MULTIPLE">Multiple-answer MCQ (multiple correct)</option>
                </select>

                <p className="options-label">
                  Answer Options <span className="options-hint">(exactly 5 options)</span>
                </p>
                <div className="options-builder">
                  {optionRows.map((row, index) => {
                    const isThisOptionCorrect = Boolean(row.correct);
                    const optionLabel = isThisOptionCorrect ? "Correct Answer" : "Distractor";
                    return (
                      <div key={`opt-${index + 1}`} className="option-row">
                        <input
                          type="text"
                          className="option-input"
                          placeholder="Option text"
                          value={row.text}
                          onChange={(event) => updateOptionText(index, event.target.value)}
                        />
                        <label className="option-correct-wrap">
                          <input
                            className="option-correct"
                            type={questionType === "MULTIPLE" ? "checkbox" : "radio"}
                            name="correct-option"
                            checked={Boolean(row.correct)}
                            onChange={(event) => updateOptionCorrect(index, event.target.checked)}
                          />
                          <span className="option-label-text">{optionLabel}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="options-hint">
                  Single-answer: mark exactly one correct option. Multiple-answer: mark two or more correct options.
                </p>

                <div className="explanation-field-wrap">
                  <label htmlFor="q-explanation-react" className="explanation-label">
                    <span className="explanation-icon">💡</span>
                    Why is this the answer?
                  </label>
                  <textarea
                    id="q-explanation-react"
                    name="explanation"
                    rows="3"
                    placeholder="Explain why the correct option(s) are correct and why common wrong choices are incorrect."
                    value={questionExplanation}
                    onChange={(event) => setQuestionExplanation(event.target.value)}
                  />
                </div>

                <div className="question-form-actions">
                  <button type="submit" className="btn-primary" disabled={editorBusy}>
                    {editorBusy ? "Saving..." : editingQuestionId ? "Update Question" : "Add Question"}
                  </button>
                  <button type="button" className="btn-outline" onClick={resetQuestionForm}>
                    Cancel Edit
                  </button>
                </div>
              </form>
            </div>
          </article>
        </section>
      ) : null}
    </AdminShell>
  );
}
