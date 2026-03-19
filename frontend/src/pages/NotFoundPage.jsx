import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="page">
      <section className="panel panel-form" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="form-wrap">
          <h2>Page not found</h2>
          <p className="form-note">The page you requested does not exist in the React UI.</p>
          <p className="switch-auth">
            <Link to="/student-login" className="link">
              Go to Student Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
