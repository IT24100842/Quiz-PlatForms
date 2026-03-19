import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";
import { clearStoredUser, getStoredUser, getStudentProfilePrefs, setStoredUser } from "../lib/authStorage";

export default function ProtectedRoute({ requiredRole, loginPath, children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !user.token) {
      setStatus("blocked");
      return;
    }

    apiRequest("/api/auth/me")
      .then((payload) => {
        if (!payload?.success || payload.role !== requiredRole) {
          clearStoredUser();
          setStatus("blocked");
          return;
        }

        const savedStudentProfile =
          payload.role === "STUDENT" ? getStudentProfilePrefs(payload.email) : null;
        setStoredUser({
          ...user,
          name: savedStudentProfile?.savedName || user?.name || payload.name,
          email: payload.email,
          role: payload.role,
          token: user.token,
          profilePhoto: savedStudentProfile?.profilePhoto || user?.profilePhoto || "",
        });
        setStatus("ok");
      })
      .catch(() => {
        clearStoredUser();
        setStatus("blocked");
      });
  }, [requiredRole]);

  if (status === "checking") {
    return (
      <main className="page">
        <section className="panel panel-form" style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div className="form-wrap">
            <h2>Checking access...</h2>
          </div>
        </section>
      </main>
    );
  }

  if (status === "blocked") {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}
