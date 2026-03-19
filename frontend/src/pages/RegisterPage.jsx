import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { apiRequest } from "../lib/apiClient";
import { setAuthNotice } from "../lib/authStorage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await apiRequest("/api/auth/register", {
        method: "POST",
        includeAuth: false,
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        },
      });

      if (!payload?.success) {
        setMessage(payload?.message || "Registration failed.");
        return;
      }

      setAuthNotice(payload.message || "Registration successful. You can now sign in.");
      navigate("/student-login", { replace: true });
    } catch (error) {
      setMessage(error.message || "Unable to complete registration right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Student Registration"
      title="Create Student Account"
      lead="Register once to start quizzes, track your scores, and access upcoming assessments from your dashboard."
      statusTitle="Registration Access"
      statusText="New student accounts are added immediately and become visible to administrators."
    >
      <h2>Create Your Account</h2>
      <p className="form-note">Use a valid email address so your quiz records stay linked to your profile.</p>

      <form className="login-form register-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Nimal Perera"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
        />

        <label htmlFor="email">Student Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="student@quizplatform.com"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          required
        />

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
          required
        />

        {message ? <p className="login-error">{message}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Student Account"}
        </button>

        <p className="switch-auth">
          Already registered? <Link to="/student-login" className="link">Student login</Link>
        </p>
        <p className="switch-auth">
          Need admin access? <Link to="/admin-login" className="link">Admin login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
