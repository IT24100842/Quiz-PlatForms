import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { apiRequest } from "../lib/apiClient";
import { setAuthNotice } from "../lib/authStorage";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const role = useMemo(() => {
    const value = String(params.get("role") || "STUDENT").toUpperCase();
    return value === "ADMIN" ? "ADMIN" : "STUDENT";
  }, [params]);

  const roleLabel = role === "ADMIN" ? "Admin Recovery" : "Student Recovery";
  const loginPath = role === "ADMIN" ? "/admin-login" : "/student-login";

  async function requestCode(event) {
    event.preventDefault();
    setRequestBusy(true);
    setRequestMessage("");

    try {
      const payload = await apiRequest("/api/auth/forgot-password/request", {
        method: "POST",
        includeAuth: false,
        body: { email: email.trim(), role },
      });
      if (!payload?.success) {
        setRequestMessage(payload?.message || "Could not generate reset code.");
        return;
      }
      setRequestMessage(payload.message || "If the account exists, a reset code has been sent to your email.");
    } catch (error) {
      setRequestMessage(error.message || "Unable to generate a reset code right now.");
    } finally {
      setRequestBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setResetMessage("");

    if (newPassword !== confirmPassword) {
      setResetMessage("Passwords do not match.");
      return;
    }

    if (!email.trim()) {
      setResetMessage("Enter your account email and request a reset code first.");
      return;
    }

    setResetBusy(true);
    try {
      const payload = await apiRequest("/api/auth/forgot-password/reset", {
        method: "POST",
        includeAuth: false,
        body: {
          email: email.trim(),
          role,
          code: code.trim(),
          newPassword,
        },
      });

      if (!payload?.success) {
        setResetMessage(payload?.message || "Could not reset password.");
        return;
      }

      setAuthNotice(payload.message || "Password reset successful. Please sign in.");
      navigate(loginPath, { replace: true });
    } catch (error) {
      setResetMessage(error.message || "Unable to reset password right now.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={roleLabel}
      title="Password Recovery"
      lead="Request a reset code and set a new password for your account."
      statusTitle="Secure Reset"
      statusText="Reset codes are sent to your Gmail and expire in 10 minutes."
    >
      <h2>Reset Your Password</h2>

      <form className="login-form forgot-request-form" onSubmit={requestCode} noValidate>
        <label htmlFor="forgot-email">Account Email</label>
        <input
          type="email"
          id="forgot-email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {requestMessage ? <p className="login-error">{requestMessage}</p> : null}
        <button type="submit" disabled={requestBusy}>
          {requestBusy ? "Generating code..." : "Get Reset Code"}
        </button>
      </form>

      <form className="login-form forgot-reset-form" onSubmit={resetPassword} noValidate>
        <label htmlFor="reset-code">Reset Code</label>
        <input
          type="text"
          id="reset-code"
          name="code"
          placeholder="6 digit code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />

        <label htmlFor="new-password">New Password</label>
        <input
          type="password"
          id="new-password"
          name="newPassword"
          placeholder="At least 6 characters"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />

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

        {resetMessage ? <p className="login-error">{resetMessage}</p> : null}

        <button type="submit" disabled={resetBusy}>
          {resetBusy ? "Updating password..." : "Reset Password"}
        </button>
        <p className="switch-auth">
          Back to login: <Link className="link" to={loginPath}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
