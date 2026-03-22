import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { apiRequest } from "../lib/apiClient";
import { setAuthNotice } from "../lib/authStorage";
import { STUDENT_FACULTY_OPTIONS } from "../lib/faculties";

export default function StudentPasswordRecoveryPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [motherName, setMotherName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState("email"); // "email" | "parent-verification" | "reset-password"

  // Password strength validation
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { text: "", color: "" },
      { text: "Weak", color: "#c74949" },
      { text: "Fair", color: "#e8941f" },
      { text: "Good", color: "#2f9c66" },
      { text: "Strong", color: "#1f5638" },
    ];
    return levels[Math.min(score, 4)];
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Step 1: Verify email exists
  async function verifyEmail(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsSuccessMessage(false);

    if (!facultyId) {
      setMessage("Please select your faculty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = await apiRequest("/api/auth/verify-email", {
        method: "POST",
        includeAuth: false,
        body: { email: email.trim(), facultyId, faculty: facultyId },
      });

      if (!payload?.success) {
        setMessage(payload?.message || "Email not found or error occurred.");
        return;
      }

      setStep("parent-verification");
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to verify email right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: Verify parent information and reset password
  async function resetPassword(event) {
    event.preventDefault();
    setMessage("");
    setIsSuccessMessage(false);

    if (!motherName.trim() || !fatherName.trim()) {
      setMessage("Please enter both mother's and father's names.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setMessage("Password must contain both uppercase letters and numbers.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await apiRequest("/api/auth/forgot-password/reset", {
        method: "POST",
        includeAuth: false,
        body: {
          email: email.trim(),
          role: "STUDENT",
          facultyId,
          faculty: facultyId,
          motherName: motherName.trim(),
          fatherName: fatherName.trim(),
          newPassword,
        },
      });

      if (!payload?.success) {
        setMessage(payload?.message || "Could not reset password.");
        return;
      }

      setIsSuccessMessage(true);
      setMessage(payload.message || "Password reset successful. Redirecting to login...");
      setTimeout(() => {
        setAuthNotice(payload.message || "Password reset successful. Please sign in.");
        navigate("/student-login", { replace: true });
      }, 1500);
    } catch (error) {
      setMessage(error.message || "Unable to reset password right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="STUDENT RECOVERY"
      title="Reset Your Password"
      lead="Secure password recovery with parent/guardian verification."
      statusTitle="Secure Reset"
      statusText="Parent verification ensures only authorized users can reset passwords."
    >
      <h2>Reset Your Password</h2>

      {step === "email" && (
        <form className="login-form forgot-request-form" onSubmit={verifyEmail} noValidate>
          <label htmlFor="recovery-email">Account Email</label>
          <input
            type="email"
            id="recovery-email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="recovery-faculty">Faculty</label>
          <select
            id="recovery-faculty"
            name="facultyId"
            value={facultyId}
            onChange={(event) => setFacultyId(event.target.value)}
            required
          >
            <option value="" disabled>
              Select your faculty
            </option>
            {STUDENT_FACULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {message ? (
            <p className="login-error" style={{ color: isSuccessMessage ? "#1b6e42" : "" }}>
              {message}
            </p>
          ) : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Continue to Verification"}
          </button>
          <p className="switch-auth">
            Back to login: <Link className="link" to="/student-login">Sign in</Link>
          </p>
        </form>
      )}

      {step === "parent-verification" && (
        <form className="login-form forgot-reset-form" onSubmit={resetPassword} noValidate>
          {/* Parent Verification Section */}
          <fieldset className="student-recovery-fieldset">
            <legend className="student-recovery-legend">Parent/Guardian Verification (Required)</legend>
            <p className="student-recovery-note">
              Enter your parents' names as registered in your student profile. These can only be updated by authorized personnel in the admin panel.
            </p>

            <label htmlFor="mother-name">Mother's Full Name</label>
            <input
              type="text"
              id="mother-name"
              name="motherName"
              placeholder="Enter mother's full name"
              value={motherName}
              onChange={(event) => setMotherName(event.target.value)}
              required
            />

            <label htmlFor="father-name">Father's Full Name</label>
            <input
              type="text"
              id="father-name"
              name="fatherName"
              placeholder="Enter father's full name"
              value={fatherName}
              onChange={(event) => setFatherName(event.target.value)}
              required
            />
          </fieldset>

          {/* New Password Section */}
          <label htmlFor="new-password">New Password</label>
          <input
            type="password"
            id="new-password"
            name="newPassword"
            placeholder="Create a strong password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          {newPassword && (
            <p
              className="password-strength"
              style={{
                color: passwordStrength.color,
              }}
            >
              Strength: {passwordStrength.text}
            </p>
          )}

          <label htmlFor="confirm-new-password">Confirm New Password</label>
          <input
            type="password"
            id="confirm-new-password"
            name="confirmNewPassword"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          <p className="password-requirements">
            Password must have at least 8 characters, including uppercase letters and numbers.
          </p>

          {message ? (
            <p className="login-error" style={{ color: isSuccessMessage ? "#1b6e42" : "" }}>
              {message}
            </p>
          ) : null}

          <div className="recovery-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating password..." : "Verify & Update Password"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setStep("email");
                setMotherName("");
                setFatherName("");
                setNewPassword("");
                setConfirmPassword("");
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>

          <p className="switch-auth">
            Back to login: <Link className="link" to="/student-login">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
