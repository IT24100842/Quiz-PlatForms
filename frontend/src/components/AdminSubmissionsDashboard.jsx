import React from "react";

const NAV_ITEMS = [
  { key: "added-quizzes", label: "Added Quizzes", icon: "\uE900" },
  { key: "registered-students", label: "Registered Students", icon: "\uE901" },
  { key: "student-submissions", label: "Student Submissions", icon: "menu" },
];

export default function AdminSubmissionsDashboard({
  submissions = [],
  activeTab = "student-submissions",
  onTabChange,
  onClearSubmissions,
}) {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900">
      <header className="sticky top-0 z-20 bg-[#F3F4F6] border-b border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">Admin Panel</p>
            <h1 className="text-xl font-bold text-slate-900">Student Submissions</h1>
          </div>
        </div>
        <nav
          className="scrollbar-none flex w-full gap-2 overflow-x-auto px-4 pb-3 pt-2"
          role="tablist"
          aria-label="Admin navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange?.(item.key)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A4F] ${
                  isActive
                    ? "bg-[#2D6A4F] text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.key === "student-submissions" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-700">
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5">
        <section className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Student Submissions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review recent quiz attempts and clear data when required.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClearSubmissions?.()}
              className="min-h-[44px] rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              Clear Submissions
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="relative rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-slate-900">{submission.studentName}</p>
                <p className="text-sm text-slate-500">{submission.quizTitle}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700"
                  style={{ backgroundColor: submission.status === "Passed" ? "#DCFCE7" : submission.status === "Review" ? "#FEF3C7" : "#E0F2FE" }}
                >
                  {submission.score} • {submission.status}
                </span>
                <span className="text-xs font-medium text-slate-500">{submission.date}</span>
              </div>
            </article>
          ))}
          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              No submissions available.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
