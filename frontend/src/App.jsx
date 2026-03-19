import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/AdminLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import QuizTakePage from "./pages/QuizTakePage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import StudentLeaderboardPage from "./pages/StudentLeaderboardPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentPasswordRecoveryPage from "./pages/StudentPasswordRecoveryPage";
import StudentSettingsPage from "./pages/StudentSettingsPage";
import AdminAddQuizPage from "./pages/admin/AdminAddQuizPage";
import AdminAddedQuizzesPage from "./pages/admin/AdminAddedQuizzesPage";
import AdminRegisteredStudentsPage from "./pages/admin/AdminRegisteredStudentsPage";
import AdminStudentSubmissionsPage from "./pages/admin/AdminStudentSubmissionsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminLeaderboardPage from "./pages/admin/AdminLeaderboardPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/student-login" replace />} />

        <Route path="/student-login" element={<StudentLoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/student-password-recovery" element={<StudentPasswordRecoveryPage />} />

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute requiredRole="STUDENT" loginPath="/student-login">
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz-take"
          element={
            <ProtectedRoute requiredRole="STUDENT" loginPath="/student-login">
              <QuizTakePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/leaderboard"
          element={
            <ProtectedRoute requiredRole="STUDENT" loginPath="/student-login">
              <StudentLeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings"
          element={
            <ProtectedRoute requiredRole="STUDENT" loginPath="/student-login">
              <StudentSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/add-quiz"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminAddQuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/added-quizzes"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminAddedQuizzesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/registered-students"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminRegisteredStudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/student-submissions"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminStudentSubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leaderboard"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminLeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole="ADMIN" loginPath="/admin-login">
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/student-login.html" element={<Navigate to="/student-login" replace />} />
        <Route path="/admin-login.html" element={<Navigate to="/admin-login" replace />} />
        <Route path="/register.html" element={<Navigate to="/register" replace />} />
        <Route path="/forgot-password.html" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/student-dashboard.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/student-leaderboard.html" element={<Navigate to="/student/leaderboard" replace />} />
        <Route path="/student-settings.html" element={<Navigate to="/student/settings" replace />} />
        <Route
          path="/quiz-take.html"
          element={
            <ProtectedRoute requiredRole="STUDENT" loginPath="/student-login">
              <QuizTakePage />
            </ProtectedRoute>
          }
        />
        <Route path="/quiz-math.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/quiz-physics.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/quiz-programming.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/quiz-english.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/quiz-database.html" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/admin-dashboard.html" element={<Navigate to="/admin/add-quiz" replace />} />
        <Route path="/admin-added-quizzes.html" element={<Navigate to="/admin/added-quizzes" replace />} />
        <Route
          path="/admin-registered-students.html"
          element={<Navigate to="/admin/registered-students" replace />}
        />
        <Route
          path="/admin-student-submissions.html"
          element={<Navigate to="/admin/student-submissions" replace />}
        />
        <Route path="/admin-leaderboard.html" element={<Navigate to="/admin/leaderboard" replace />} />
        <Route path="/admin-analytics.html" element={<Navigate to="/admin/analytics" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
