import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { apiRequest } from "../lib/apiClient";
import { getStudentProfilePrefs, popAuthNotice, setStoredUser } from "../lib/authStorage";

const loginContent = {
  STUDENT: {
    eyebrow: "Student Login",
    title: "Student Portal",
    lead: "Sign in to attempt quizzes, check marks, and view upcoming assessments.",
    statusTitle: "",
    statusText: "Your dashboard shows personal progress and quiz schedules.",
    showStatusCard: false,
    brandClassName: "panel-brand--student",
    heading: "Sign in to Continue",
    emailLabel: "Student Email",
    submitLabel: "Sign In",
  },
  ADMIN: {
    eyebrow: "Restricted Access",
    title: "Admin Control",
    lead: "Manage exams, monitor submissions, and keep your learning ecosystem secure.",
    statusTitle: "Security Status",
    statusText: "Two-factor verification enabled for administrator accounts.",
    showStatusCard: true,
    brandClassName: "",
    heading: "Sign in as Admin",
    emailLabel: "Admin Email",
    submitLabel: "Sign In",
  },
};

export default function LoginPage({ role }) {
  const navigate = useNavigate();
  const content = loginContent[role];
  const [initialNotice] = useState(() => popAuthNotice());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialNotice);
  const [isSuccessMessage, setIsSuccessMessage] = useState(Boolean(initialNotice));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const forgotLink = role === "STUDENT" ? "/student-password-recovery" : `/forgot-password?role=${role}`;

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsSuccessMessage(false);

    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        includeAuth: false,
        body: {
          email: email.trim(),
          password,
          role,
        },
      });

      if (!payload?.success) {
        setMessage(payload?.message || "Login failed. Please check your credentials.");
        setIsSuccessMessage(false);
        return;
      }

      const savedStudentProfile = payload.role === "STUDENT" ? getStudentProfilePrefs(payload.email) : null;

      setStoredUser({
        name: savedStudentProfile?.savedName || payload.name,
        email: payload.email,
        role: payload.role,
        token: payload.token,
        faculty: payload.facultyId || payload.faculty || "",
        profilePhoto: savedStudentProfile?.profilePhoto || "",
      });

      navigate(payload.role === "ADMIN" ? "/admin/add-quiz" : "/student-dashboard", {
        replace: true,
      });
    } catch (error) {
      setMessage(error.message || "Unable to complete sign in right now.");
      setIsSuccessMessage(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={content.eyebrow}
      title={content.title}
      lead={content.lead}
      statusTitle={content.statusTitle}
      statusText={content.statusText}
      showStatusCard={content.showStatusCard}
      brandClassName={content.brandClassName}
    >
      <h2>{content.heading}</h2>

      <form className="login-form login-form--floating" onSubmit={handleSubmit} noValidate>
        <div className="field-wrap">
          <span className="field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="m5 8 7 5 7-5" />
            </svg>
          </span>
          <input
            type="email"
            className="field-input peer"
            id="email"
            name="email"
            placeholder=" "
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="floating-label" htmlFor="email">
            {content.emailLabel}
          </label>
        </div>

        <div className="field-wrap">
          <span className="field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
            </svg>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            className="field-input field-input--password peer"
            id="password"
            name="password"
            placeholder=" "
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="field-icon-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
                <path d="M9.9 5.2A10.2 10.2 0 0 1 12 5c5.3 0 9.2 4.4 9.8 5-.4.5-2.4 2.9-5.2 4.2" />
                <path d="M6.2 6.2C3.8 7.6 2.2 9.4 2 10c.4.5 4.4 5 10 5 1 0 1.9-.1 2.8-.3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <label className="floating-label" htmlFor="password">
            Password
          </label>
        </div>

        <div className="form-row">
          <label className="check">
            <input type="checkbox" name="remember" />
            <span>{role === "ADMIN" ? "Keep me signed in" : "Remember me"}</span>
          </label>
          <Link to={forgotLink} className="link">
            Forgot password?
          </Link>
        </div>

        {message ? (
          <p className="login-error" style={{ color: isSuccessMessage ? "#1b6e42" : "#c0392b" }}>
            {message}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : content.submitLabel}
        </button>

        {role === "STUDENT" ? (
          <>
            <p className="switch-auth">
              New student? <Link to="/register" className="link link-emphasis">Create an account</Link>
            </p>
            <p className="switch-auth">
              Need admin access? <Link to="/admin-login" className="link link-emphasis">Admin login</Link>
            </p>
          </>
        ) : (
          <p className="switch-auth">
            Are you a student? <Link to="/student-login" className="link">Student login</Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
