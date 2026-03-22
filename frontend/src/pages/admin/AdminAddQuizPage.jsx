import { useEffect, useRef, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiRequest } from "../../lib/apiClient";
import { ADMIN_TARGET_FACULTY_OPTIONS, formatFacultyLabel, normalizeFacultyId } from "../../lib/faculties";
import { addNotification } from "../../lib/notifications";

const initialForm = {
  title: "",
  module: "",
  targetFaculty: "",
  examType: "",
  minutes: "",
  scheduledDate: "",
  totalMarks: "",
};

const moduleOptions = [
  "Object Oriented Programming",
  "Database Systems",
  "Software Engineering",
  "Computer Networks",
  "Cyber Security",
  "Mathematics",
  "Physics",
  "English",
];
const examTypeOptions = ["Quiz", "Midterm", "Final", "Assignment", "Practical"];

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateField(field, values) {
  if (field === "title") {
    return String(values.title || "").trim() ? "" : "Quiz title is required.";
  }
  if (field === "module") {
    return String(values.module || "").trim() ? "" : "Please select a module.";
  }
  if (field === "examType") {
    return String(values.examType || "").trim() ? "" : "Please select an exam type.";
  }
  if (field === "targetFaculty") {
    return String(values.targetFaculty || "").trim() ? "" : "Please select a target faculty.";
  }
  if (field === "minutes") {
    const minutes = parseInt(values.minutes, 10);
    return Number.isFinite(minutes) && minutes > 0 ? "" : "Duration must be greater than 0.";
  }
  if (field === "totalMarks") {
    const total = parseInt(values.totalMarks, 10);
    return Number.isFinite(total) && total > 0 ? "" : "Total marks must be greater than 0.";
  }
  return "";
}

function validateForm(values) {
  const fields = ["title", "module", "targetFaculty", "examType", "minutes", "totalMarks"];
  const nextErrors = fields.reduce((acc, field) => {
    acc[field] = validateField(field, values);
    return acc;
  }, {});

  const today = getTodayDateInputValue();
  const selectedDate = String(values.scheduledDate || "").trim();
  if (selectedDate && selectedDate < today) {
    nextErrors.scheduledDate = "Scheduled date cannot be in the past.";
  }

  return nextErrors;
}

export default function AdminAddQuizPage() {
  const todayDate = getTodayDateInputValue();
  const [form, setForm] = useState(initialForm);
  const [studentCounts, setStudentCounts] = useState({ total: 0, byFaculty: {} });
  const [isLoadingStudentCounts, setIsLoadingStudentCounts] = useState(true);
  const [studentCountError, setStudentCountError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStudentCounts() {
      setIsLoadingStudentCounts(true);
      setStudentCountError("");
      try {
        const payload = await apiRequest("/api/auth/students");
        if (cancelled) return;

        const students = Array.isArray(payload) ? payload : [];
        const counts = students.reduce(
          (acc, student) => {
            const facultyId = normalizeFacultyId(student?.faculty);
            if (!facultyId) {
              return acc;
            }
            acc.byFaculty[facultyId] = (acc.byFaculty[facultyId] || 0) + 1;
            return acc;
          },
          { total: students.length, byFaculty: {} }
        );

        setStudentCounts(counts);
      } catch (error) {
        if (cancelled) return;
        setStudentCounts({ total: 0, byFaculty: {} });
        setStudentCountError(error.message || "Unable to load student count preview.");
      } finally {
        if (!cancelled) {
          setIsLoadingStudentCounts(false);
        }
      }
    }

    void loadStudentCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(text, type) {
    setToast({ text, type: type || "success" });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function updateField(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    setErrors((prev) => ({ ...prev, [field]: validateField(field, next) }));
  }

  function touchField(field) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form) }));
  }

  function handleClearForm() {
    if (isSubmitting) return;
    setForm(initialForm);
    setErrors({});
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const quizTitle = String(form.title || "").trim() || "Untitled Quiz";
      const selectedFacultyId = normalizeFacultyId(form.targetFaculty || "ALL") || "ALL";

      await apiRequest("/api/quizzes", {
        method: "POST",
        body: {
          title: quizTitle,
          module: String(form.module || "").trim(),
          facultyId: selectedFacultyId,
          targetFaculty: selectedFacultyId,
          examType: String(form.examType || "").trim(),
          totalMarks: parseInt(form.totalMarks, 10) || 100,
          questions: 0,
          minutes: parseInt(form.minutes, 10) || 0,
          scheduledDate: String(form.scheduledDate || "").trim(),
          url: "",
        },
      });

      addNotification("student", `New quiz available: ${quizTitle}`);

      setForm(initialForm);
      setErrors({});
      setMessage("");
      showToast("Quiz added successfully.", "success");
    } catch (error) {
      setMessage(error.message || "Failed to add quiz. Are you logged in as admin?");
      showToast(error.message || "Failed to add quiz.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedFacultyId = normalizeFacultyId(form.targetFaculty || "ALL") || "ALL";
  const targetStudentCount =
    selectedFacultyId === "ALL"
      ? studentCounts.total
      : studentCounts.byFaculty[selectedFacultyId] || 0;
  const visibilityPreviewMessage =
    selectedFacultyId === "ALL"
      ? `This quiz will be visible to ${targetStudentCount} students currently registered across all faculties.`
      : `This quiz will be visible to ${targetStudentCount} students currently registered in this faculty.`;

  return (
    <AdminShell title="Admin Dashboard">
      <section className="admin-tools" aria-label="Admin quiz management">
        <article className="dash-card admin-tool-card add-quiz-card" id="add-quiz-section">
          <h2>Add Quiz for Students</h2>
          <p>Create a quiz entry that appears on the student dashboard.</p>

          <form className="quiz-admin-form" onSubmit={handleSubmit}>
            <h3 className="quiz-form-section-title">Quiz Details</h3>
            <div className="quiz-form-grid">
              <div className="quiz-form-field quiz-form-field-full">
                <label htmlFor="quiz-title">Quiz Title</label>
                <input
                  id="quiz-title"
                  name="title"
                  type="text"
                  placeholder="Cyber Security Basics"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={() => touchField("title")}
                  className={errors.title ? "is-invalid" : ""}
                  required
                />
                {errors.title ? <p className="form-field-error">{errors.title}</p> : null}
              </div>

              <div className="quiz-form-field">
                <label htmlFor="quiz-module">Module</label>
                <select
                  id="quiz-module"
                  name="module"
                  value={form.module}
                  onChange={(event) => updateField("module", event.target.value)}
                  onBlur={() => touchField("module")}
                  className={errors.module ? "is-invalid" : ""}
                  required
                >
                  <option value="" disabled>
                    Select a module
                  </option>
                  {moduleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.module ? <p className="form-field-error">{errors.module}</p> : null}
              </div>

              <div className="quiz-form-field">
                <label htmlFor="quiz-target-faculty">Target Faculty</label>
                <select
                  id="quiz-target-faculty"
                  name="targetFaculty"
                  value={form.targetFaculty}
                  onChange={(event) => updateField("targetFaculty", event.target.value)}
                  onBlur={() => touchField("targetFaculty")}
                  className={errors.targetFaculty ? "is-invalid" : ""}
                  required
                >
                  <option value="" disabled>
                    Select target faculty
                  </option>
                  {ADMIN_TARGET_FACULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.targetFaculty ? <p className="form-field-error">{errors.targetFaculty}</p> : null}
                <p className="quiz-faculty-preview" aria-live="polite">
                  {isLoadingStudentCounts
                    ? "Checking current registered student count..."
                    : studentCountError
                    ? studentCountError
                    : `${visibilityPreviewMessage} (Selected: ${formatFacultyLabel(selectedFacultyId)})`}
                </p>
              </div>

              <div className="quiz-form-field">
                <label htmlFor="quiz-exam-type">Exam Type</label>
                <select
                  id="quiz-exam-type"
                  name="examType"
                  value={form.examType}
                  onChange={(event) => updateField("examType", event.target.value)}
                  onBlur={() => touchField("examType")}
                  className={errors.examType ? "is-invalid" : ""}
                  required
                >
                  <option value="" disabled>
                    Select exam type
                  </option>
                  {examTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.examType ? <p className="form-field-error">{errors.examType}</p> : null}
              </div>
            </div>

            <hr className="quiz-form-divider" />

            <h3 className="quiz-form-section-title">Scheduling</h3>
            <div className="quiz-form-grid quiz-form-grid-two">
              <div className="quiz-form-field">
                <label htmlFor="quiz-minutes">Duration (minutes)</label>
                <input
                  id="quiz-minutes"
                  name="minutes"
                  type="number"
                  min="1"
                  placeholder="15"
                  value={form.minutes}
                  onChange={(event) => updateField("minutes", event.target.value)}
                  onBlur={() => touchField("minutes")}
                  className={errors.minutes ? "is-invalid" : ""}
                  required
                />
                {errors.minutes ? <p className="form-field-error">{errors.minutes}</p> : null}
              </div>

              <div className="quiz-form-field">
                <label htmlFor="quiz-total-marks">Total Marks</label>
                <input
                  id="quiz-total-marks"
                  name="totalMarks"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={form.totalMarks}
                  onChange={(event) => updateField("totalMarks", event.target.value)}
                  onBlur={() => touchField("totalMarks")}
                  className={errors.totalMarks ? "is-invalid" : ""}
                  required
                />
                {errors.totalMarks ? <p className="form-field-error">{errors.totalMarks}</p> : null}
              </div>

              <div className="quiz-form-field quiz-form-field-full">
                <label htmlFor="quiz-scheduled-date">Scheduled Date</label>
                <input
                  id="quiz-scheduled-date"
                  name="scheduledDate"
                  type="date"
                  min={todayDate}
                  value={form.scheduledDate}
                  onChange={(event) => updateField("scheduledDate", event.target.value)}
                  className={errors.scheduledDate ? "is-invalid" : ""}
                />
                {errors.scheduledDate ? <p className="form-field-error">{errors.scheduledDate}</p> : null}
              </div>
            </div>

            {message ? (
              <p className="login-error" style={{ color: "#c0392b" }}>
                {message}
              </p>
            ) : null}

            <div className="quiz-submit-actions">
              <button type="button" className="btn-outline" onClick={handleClearForm} disabled={isSubmitting}>
                Clear Form
              </button>
              <button
                type="submit"
                className={`btn-primary${isSubmitting ? " is-loading" : ""}`}
                disabled={isSubmitting}
                aria-busy={isSubmitting ? "true" : "false"}
              >
                {isSubmitting ? "Adding Quiz..." : "Add Quiz"}
              </button>
            </div>
          </form>
        </article>
      </section>

      <div className="admin-toast-stack" aria-live="polite" aria-atomic="true">
        {toast ? <div className={`admin-toast ${toast.type} show`}>{toast.text}</div> : null}
      </div>
    </AdminShell>
  );
}
