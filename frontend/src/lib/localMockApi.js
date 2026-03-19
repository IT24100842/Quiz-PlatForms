const LOCAL_DB_KEY = "quizPlatformFrontendMockDbV1";
const PASS_MARK_PERCENT = 50;

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function findUserByEmail(users, email) {
  const key = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user.email) === key) || null;
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

function toQuizType(value) {
  const normalized = String(value || "").trim();
  return normalized || "Quiz";
}

function toFaculty(value) {
  const normalized = String(value || "ALL").trim().toUpperCase();
  return normalized || "ALL";
}

function createDefaultQuestions(title, module) {
  const topic = String(title || module || "Quiz").trim() || "Quiz";

  return [
    {
      id: createId("question"),
      text: `${topic}: Which statement is correct for this topic?`,
      explanation: "This option reflects the core concept introduced in this quiz.",
      questionType: "SINGLE",
      options: [
        { id: createId("option"), text: "The first concept is the correct one", correct: true, optionOrder: 1 },
        { id: createId("option"), text: "The second concept is always correct", correct: false, optionOrder: 2 },
        { id: createId("option"), text: "All concepts are incorrect", correct: false, optionOrder: 3 },
        { id: createId("option"), text: "None of the concepts are used", correct: false, optionOrder: 4 },
        { id: createId("option"), text: "It depends only on the date", correct: false, optionOrder: 5 },
      ],
    },
    {
      id: createId("question"),
      text: `${topic}: Select all valid practices.`,
      explanation: "Multiple choices are expected because more than one practice is valid.",
      questionType: "MULTIPLE",
      options: [
        { id: createId("option"), text: "Plan before implementation", correct: true, optionOrder: 1 },
        { id: createId("option"), text: "Ignore requirements", correct: false, optionOrder: 2 },
        { id: createId("option"), text: "Validate results", correct: true, optionOrder: 3 },
        { id: createId("option"), text: "Skip testing always", correct: false, optionOrder: 4 },
        { id: createId("option"), text: "Review outcomes", correct: true, optionOrder: 5 },
      ],
    },
    {
      id: createId("question"),
      text: `${topic}: Which choice best describes the expected result?`,
      explanation: "The expected result aligns with the standard definition used in this quiz.",
      questionType: "SINGLE",
      options: [
        { id: createId("option"), text: "A clear measurable result", correct: true, optionOrder: 1 },
        { id: createId("option"), text: "No result is needed", correct: false, optionOrder: 2 },
        { id: createId("option"), text: "Random output each time", correct: false, optionOrder: 3 },
        { id: createId("option"), text: "Only visual output matters", correct: false, optionOrder: 4 },
        { id: createId("option"), text: "Result cannot be validated", correct: false, optionOrder: 5 },
      ],
    },
  ];
}

function createSeedState() {
  const adminUser = {
    id: "admin-1",
    name: "Platform Admin",
    email: "admin@quizplatform.com",
    password: "admin123",
    role: "ADMIN",
    faculty: "ALL",
    registeredAt: nowIso(),
  };

  // Example student with parent information for testing password recovery
  const exampleStudent = {
    id: "student-demo-1",
    name: "John Student",
    email: "student@quizplatform.com",
    password: "student123",
    role: "STUDENT",
    faculty: "ALL",
    motherName: "Sarah Johnson",
    fatherName: "Michael Johnson",
    registeredAt: nowIso(),
  };

  const seedQuizzes = [
    {
      id: "quiz-seed-1",
      title: "Object Oriented Programming Basics",
      module: "Object Oriented Programming",
      targetFaculty: "ALL",
      examType: "Quiz",
      totalMarks: 100,
      minutes: 15,
      scheduledDate: "",
      url: "",
      published: true,
      createdAt: nowIso(),
    },
    {
      id: "quiz-seed-2",
      title: "Database Systems Fundamentals",
      module: "Database Systems",
      targetFaculty: "ALL",
      examType: "Quiz",
      totalMarks: 100,
      minutes: 20,
      scheduledDate: "",
      url: "",
      published: true,
      createdAt: nowIso(),
    },
    {
      id: "quiz-seed-3",
      title: "Software Engineering Essentials",
      module: "Software Engineering",
      targetFaculty: "ALL",
      examType: "Quiz",
      totalMarks: 100,
      minutes: 20,
      scheduledDate: "",
      url: "",
      published: true,
      createdAt: nowIso(),
    },
  ];

  const questionsByQuiz = {};
  seedQuizzes.forEach((quiz) => {
    questionsByQuiz[quiz.id] = createDefaultQuestions(quiz.title, quiz.module);
  });

  return {
    users: [adminUser, exampleStudent],
    quizzes: seedQuizzes,
    questionsByQuiz,
    submissions: [],
    sessions: [],
    passwordResetCodes: [],
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
      const seeded = createSeedState();
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      const seeded = createSeedState();
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const safeState = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      questionsByQuiz: parsed.questionsByQuiz && typeof parsed.questionsByQuiz === "object" ? parsed.questionsByQuiz : {},
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      passwordResetCodes: Array.isArray(parsed.passwordResetCodes) ? parsed.passwordResetCodes : [],
    };

    if (!safeState.users.some((user) => String(user.role || "") === "ADMIN")) {
      safeState.users.push({
        id: "admin-1",
        name: "Platform Admin",
        email: "admin@quizplatform.com",
        password: "admin123",
        role: "ADMIN",
        faculty: "ALL",
        registeredAt: nowIso(),
      });
    }

    return safeState;
  } catch (error) {
    const seeded = createSeedState();
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeState(nextState) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(nextState));
}

function getCurrentUser(state, headers = {}) {
  const token =
    String(headers["X-Auth-Token"] || headers["x-auth-token"] || "").trim();
  if (!token) return null;

  const session = state.sessions.find((entry) => entry.token === token);
  if (!session) return null;

  const user = findUserByEmail(state.users, session.email);
  if (!user) return null;

  return {
    token,
    email: normalizeEmail(user.email),
    role: String(user.role || ""),
    name: String(user.name || "").trim(),
    user,
  };
}

function requireAuth(currentUser) {
  if (!currentUser) {
    throw new Error("Unauthorized request. Please log in.");
  }
}

function requireRole(currentUser, allowedRoles) {
  requireAuth(currentUser);
  const currentRole = String(currentUser.role || "").toUpperCase();
  if (!allowedRoles.includes(currentRole)) {
    throw new Error("You do not have permission for this action.");
  }
}

function withQuizQuestionCount(state, quiz) {
  const questionCount = Array.isArray(state.questionsByQuiz?.[quiz.id])
    ? state.questionsByQuiz[quiz.id].length
    : toInt(quiz.questions, 0);
  return {
    ...quiz,
    questions: questionCount,
  };
}

function scoreFeedback(score, total) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  if (percent >= 85) return "Excellent performance. Keep up the strong work.";
  if (percent >= PASS_MARK_PERCENT) return "Good attempt. Review key concepts to improve further.";
  return "More practice is recommended. Focus on the highlighted weak areas.";
}

function extractId(path, pattern) {
  const match = path.match(pattern);
  return match ? decodeURIComponent(match[1]) : "";
}

function cleanResetCodes(state) {
  const now = Date.now();
  state.passwordResetCodes = state.passwordResetCodes.filter((entry) => Number(entry.expiresAt || 0) > now);
}

function getStudentRows(state) {
  const activeStudents = new Set(
    state.sessions
      .filter((session) => String(session.role || "").toUpperCase() === "STUDENT")
      .map((session) => normalizeEmail(session.email))
  );

  return state.users
    .filter((user) => String(user.role || "").toUpperCase() === "STUDENT")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      faculty: user.faculty || "ALL",
      registeredAt: user.registeredAt,
      active: activeStudents.has(normalizeEmail(user.email)),
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.registeredAt || 0).getTime();
      const rightTime = new Date(right.registeredAt || 0).getTime();
      return rightTime - leftTime;
    });
}

function normalizeQuestionInput(input, fallbackOrderStart = 1) {
  const type = String(input?.questionType || "SINGLE").toUpperCase() === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
  const options = Array.isArray(input?.options) ? input.options : [];

  const normalizedOptions = options.slice(0, 5).map((option, index) => ({
    id: String(option?.id || createId("option")),
    text: String(option?.text || "").trim(),
    correct: Boolean(option?.correct),
    optionOrder: toInt(option?.optionOrder, fallbackOrderStart + index),
  }));

  while (normalizedOptions.length < 5) {
    normalizedOptions.push({
      id: createId("option"),
      text: `Option ${normalizedOptions.length + 1}`,
      correct: normalizedOptions.length === 0,
      optionOrder: fallbackOrderStart + normalizedOptions.length,
    });
  }

  if (type === "SINGLE") {
    let selected = false;
    normalizedOptions.forEach((option, index) => {
      if (option.correct && !selected) {
        selected = true;
        return;
      }
      option.correct = false;
      if (!selected && index === 0) {
        option.correct = true;
        selected = true;
      }
    });
  }

  return {
    id: String(input?.id || createId("question")),
    text: String(input?.text || "").trim() || "Untitled question",
    explanation: String(input?.explanation || "").trim(),
    questionType: type,
    options: normalizedOptions,
  };
}

export async function localMockApiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const body = options.body;
  const headers = options.headers || {};

  const state = readState();
  cleanResetCodes(state);
  const currentUser = getCurrentUser(state, headers);

  if (path === "/api/auth/register" && method === "POST") {
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");
    const motherName = String(body?.motherName || "").trim();
    const fatherName = String(body?.fatherName || "").trim();

    if (!name || !email || !password) {
      return { success: false, message: "Name, email, and password are required." };
    }

    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters." };
    }

    if (findUserByEmail(state.users, email)) {
      return { success: false, message: "This email is already registered." };
    }

    const student = {
      id: createId("student"),
      name,
      email,
      password,
      role: "STUDENT",
      faculty: toFaculty(body?.faculty || "ALL"),
      motherName: motherName || "",
      fatherName: fatherName || "",
      registeredAt: nowIso(),
    };

    state.users.push(student);
    writeState(state);
    return { success: true, message: "Registration successful. You can now sign in." };
  }

  if (path === "/api/auth/login" && method === "POST") {
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");
    const role = String(body?.role || "STUDENT").toUpperCase();

    if (!email || !password) {
      return { success: false, message: "Email and password are required." };
    }

    const user = findUserByEmail(state.users, email);
    if (!user || String(user.role || "").toUpperCase() !== role || String(user.password || "") !== password) {
      return { success: false, message: "Login failed. Please check your credentials." };
    }

    const token = createId("token");
    state.sessions = state.sessions.filter((session) => normalizeEmail(session.email) !== normalizeEmail(email));
    state.sessions.push({
      token,
      email: user.email,
      role: user.role,
      issuedAt: nowIso(),
    });

    writeState(state);
    return {
      success: true,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    };
  }

  if (path === "/api/auth/me" && method === "GET") {
    requireAuth(currentUser);
    return {
      success: true,
      name: currentUser.user.name,
      email: currentUser.user.email,
      role: currentUser.user.role,
    };
  }

  if (path === "/api/auth/student-profile" && method === "PUT") {
    requireRole(currentUser, ["STUDENT"]);

    const nextName = String(body?.name || "").trim();
    const nextMotherName = String(body?.motherName || "").trim();
    const nextFatherName = String(body?.fatherName || "").trim();

    if (!nextName) {
      return { success: false, message: "Name is required." };
    }

    currentUser.user.name = nextName;
    currentUser.user.motherName = nextMotherName;
    currentUser.user.fatherName = nextFatherName;
    writeState(state);

    return {
      success: true,
      message: "Profile updated successfully.",
      name: currentUser.user.name,
      motherName: currentUser.user.motherName,
      fatherName: currentUser.user.fatherName,
    };
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const token = String(headers["X-Auth-Token"] || headers["x-auth-token"] || "").trim();
    if (token) {
      state.sessions = state.sessions.filter((session) => session.token !== token);
      writeState(state);
    }
    return { success: true, message: "Logged out successfully." };
  }

  if (path === "/api/auth/verify-email" && method === "POST") {
    const email = String(body?.email || "").trim();
    const user = findUserByEmail(state.users, email);

    if (!user || String(user.role || "").toUpperCase() !== "STUDENT") {
      return { success: false, message: "Student account not found." };
    }

    return { success: true, message: "Email verified. Please provide parent verification details." };
  }

  if (path === "/api/auth/forgot-password/request" && method === "POST") {
    const email = String(body?.email || "").trim();
    const role = String(body?.role || "STUDENT").toUpperCase();
    const user = findUserByEmail(state.users, email);

    if (user && String(user.role || "").toUpperCase() === role) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      state.passwordResetCodes = state.passwordResetCodes.filter(
        (entry) => !(normalizeEmail(entry.email) === normalizeEmail(email) && String(entry.role || "") === role)
      );
      state.passwordResetCodes.push({
        email,
        role,
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      writeState(state);
      return {
        success: true,
        message: `Reset code generated. Demo code: ${code}`,
      };
    }

    return {
      success: true,
      message: "If the account exists, a reset code has been generated.",
    };
  }

  if (path === "/api/auth/forgot-password/reset" && method === "POST") {
    const email = String(body?.email || "").trim();
    const role = String(body?.role || "STUDENT").toUpperCase();
    const newPassword = String(body?.newPassword || "");
    const motherName = String(body?.motherName || "").trim();
    const fatherName = String(body?.fatherName || "").trim();

    const user = findUserByEmail(state.users, email);
    if (!user || String(user.role || "").toUpperCase() !== role) {
      return { success: false, message: "Account not found for this role." };
    }

    // Verify parent information for students
    if (role === "STUDENT") {
      if (!motherName || !fatherName) {
        return { success: false, message: "Parent/Guardian names are required for verification." };
      }

      const storedMother = String(user.motherName || "").trim().toLowerCase();
      const storedFather = String(user.fatherName || "").trim().toLowerCase();
      const inputMother = motherName.toLowerCase();
      const inputFather = fatherName.toLowerCase();

      if (storedMother !== inputMother || storedFather !== inputFather) {
        return { success: false, message: "Parent/Guardian verification failed. Please enter the names as registered in your profile." };
      }
    }

    if (newPassword.length < 8) {
      return { success: false, message: "Password must be at least 8 characters." };
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return { success: false, message: "Password must contain both uppercase letters and numbers." };
    }

    // Update password and parent info
    user.password = newPassword;
    if (motherName) user.motherName = motherName;
    if (fatherName) user.fatherName = fatherName;
    
    writeState(state);
    return { success: true, message: "Password reset successful. Parent/Guardian information updated. Please sign in." };
  }

  if (path === "/api/auth/students" && method === "GET") {
    requireAuth(currentUser);
    return clone(getStudentRows(state));
  }

  if (/^\/api\/auth\/students\/[^/]+$/.test(path) && method === "PUT") {
    requireRole(currentUser, ["ADMIN"]);
    const studentId = extractId(path, /^\/api\/auth\/students\/([^/]+)$/);
    const student = state.users.find(
      (user) => String(user.id) === String(studentId) && String(user.role || "").toUpperCase() === "STUDENT"
    );
    if (!student) {
      throw new Error("Student not found.");
    }

    const nextName = String(body?.name || "").trim();
    if (!nextName) {
      throw new Error("Student name is required.");
    }

    student.name = nextName;
    writeState(state);
    return clone({ id: student.id, name: student.name, email: student.email });
  }

  if (/^\/api\/auth\/students\/[^/]+$/.test(path) && method === "DELETE") {
    requireRole(currentUser, ["ADMIN"]);
    const studentId = extractId(path, /^\/api\/auth\/students\/([^/]+)$/);
    const student = state.users.find(
      (user) => String(user.id) === String(studentId) && String(user.role || "").toUpperCase() === "STUDENT"
    );
    if (!student) {
      throw new Error("Student not found.");
    }

    const studentEmail = normalizeEmail(student.email);
    state.users = state.users.filter((user) => String(user.id) !== String(studentId));
    state.sessions = state.sessions.filter((session) => normalizeEmail(session.email) !== studentEmail);
    state.submissions = state.submissions.filter(
      (submission) => normalizeEmail(submission.studentEmail) !== studentEmail
    );
    writeState(state);
    return { success: true };
  }

  if (path === "/api/quizzes" && method === "GET") {
    requireAuth(currentUser);
    return clone(
      state.quizzes
        .map((quiz) => withQuizQuestionCount(state, quiz))
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    );
  }

  if (path === "/api/quizzes" && method === "POST") {
    requireRole(currentUser, ["ADMIN"]);

    const quiz = {
      id: createId("quiz"),
      title: String(body?.title || "").trim() || "Untitled Quiz",
      module: String(body?.module || "").trim() || "General",
      targetFaculty: toFaculty(body?.targetFaculty || "ALL"),
      examType: toQuizType(body?.examType),
      totalMarks: toInt(body?.totalMarks, 100),
      minutes: Math.max(1, toInt(body?.minutes, 20)),
      scheduledDate: String(body?.scheduledDate || "").trim(),
      url: String(body?.url || "").trim(),
      published: true,
      createdAt: nowIso(),
    };

    state.quizzes.push(quiz);
    state.questionsByQuiz[quiz.id] = createDefaultQuestions(quiz.title, quiz.module);
    writeState(state);

    return clone(withQuizQuestionCount(state, quiz));
  }

  if (path === "/api/quizzes/published" && method === "GET") {
    requireAuth(currentUser);
    const visible = state.quizzes
      .filter((quiz) => Boolean(quiz.published))
      .map((quiz) => withQuizQuestionCount(state, quiz))
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
    return clone(visible);
  }

  if (/^\/api\/quizzes\/published\/[^/]+$/.test(path) && method === "GET") {
    requireAuth(currentUser);
    const quizId = extractId(path, /^\/api\/quizzes\/published\/([^/]+)$/);
    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId) && Boolean(item.published));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }
    return clone(withQuizQuestionCount(state, quiz));
  }

  if (/^\/api\/quizzes\/[^/]+$/.test(path) && method === "GET") {
    requireAuth(currentUser);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)$/);
    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }
    return clone(withQuizQuestionCount(state, quiz));
  }

  if (/^\/api\/quizzes\/[^/]+\/publish$/.test(path) && method === "PUT") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/publish$/);
    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }
    quiz.published = true;
    writeState(state);
    return { success: true };
  }

  if (/^\/api\/quizzes\/[^/]+\/unpublish$/.test(path) && method === "PUT") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/unpublish$/);
    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }
    quiz.published = false;
    writeState(state);
    return { success: true };
  }

  if (/^\/api\/quizzes\/[^/]+$/.test(path) && method === "DELETE") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)$/);
    const exists = state.quizzes.some((item) => String(item.id) === String(quizId));
    if (!exists) {
      throw new Error("Quiz not found.");
    }

    state.quizzes = state.quizzes.filter((item) => String(item.id) !== String(quizId));
    delete state.questionsByQuiz[quizId];
    state.submissions = state.submissions.filter((submission) => String(submission.quizId || "") !== String(quizId));
    writeState(state);
    return { success: true };
  }

  if (/^\/api\/quizzes\/[^/]+\/questions$/.test(path) && method === "GET") {
    requireAuth(currentUser);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/questions$/);
    const rows = Array.isArray(state.questionsByQuiz[quizId]) ? state.questionsByQuiz[quizId] : [];
    return clone(rows);
  }

  if (/^\/api\/quizzes\/[^/]+\/questions$/.test(path) && method === "POST") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/questions$/);
    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }

    const nextQuestion = normalizeQuestionInput(body);
    const currentQuestions = Array.isArray(state.questionsByQuiz[quizId]) ? state.questionsByQuiz[quizId] : [];
    state.questionsByQuiz[quizId] = [...currentQuestions, nextQuestion];
    writeState(state);
    return clone(nextQuestion);
  }

  if (/^\/api\/quizzes\/[^/]+\/questions\/[^/]+$/.test(path) && method === "PUT") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/questions\/[^/]+$/);
    const questionId = extractId(path, /^\/api\/quizzes\/[^/]+\/questions\/([^/]+)$/);

    const quiz = state.quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz) {
      throw new Error("Quiz not found.");
    }

    const rows = Array.isArray(state.questionsByQuiz[quizId]) ? [...state.questionsByQuiz[quizId]] : [];
    const index = rows.findIndex((question) => String(question.id) === String(questionId));
    if (index < 0) {
      throw new Error("Question not found.");
    }

    const nextQuestion = normalizeQuestionInput({ ...body, id: questionId });
    rows[index] = nextQuestion;
    state.questionsByQuiz[quizId] = rows;
    writeState(state);
    return clone(nextQuestion);
  }

  if (/^\/api\/quizzes\/[^/]+\/questions\/[^/]+$/.test(path) && method === "DELETE") {
    requireRole(currentUser, ["ADMIN"]);
    const quizId = extractId(path, /^\/api\/quizzes\/([^/]+)\/questions\/[^/]+$/);
    const questionId = extractId(path, /^\/api\/quizzes\/[^/]+\/questions\/([^/]+)$/);

    const rows = Array.isArray(state.questionsByQuiz[quizId]) ? state.questionsByQuiz[quizId] : [];
    state.questionsByQuiz[quizId] = rows.filter((question) => String(question.id) !== String(questionId));
    writeState(state);
    return { success: true };
  }

  if (path === "/api/submissions" && method === "GET") {
    requireAuth(currentUser);
    return clone(
      [...state.submissions].sort(
        (left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime()
      )
    );
  }

  if (path === "/api/submissions/me" && method === "GET") {
    requireRole(currentUser, ["STUDENT"]);
    const mine = state.submissions
      .filter((submission) => normalizeEmail(submission.studentEmail) === normalizeEmail(currentUser.email))
      .sort((left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime());
    return clone(mine);
  }

  if (path === "/api/submissions" && method === "POST") {
    requireRole(currentUser, ["STUDENT"]);

    const quizTitle = String(body?.quizTitle || "").trim() || "Quiz";
    const score = Math.max(0, toInt(body?.score, 0));
    const total = Math.max(1, toInt(body?.total, 1));

    const matchingQuiz = state.quizzes.find((quiz) => String(quiz.title || "").trim() === quizTitle);
    const submission = {
      id: createId("submission"),
      studentEmail: currentUser.user.email,
      studentName: currentUser.user.name,
      quizId: matchingQuiz ? matchingQuiz.id : "",
      quizTitle,
      score,
      total,
      submittedAt: nowIso(),
      feedback: scoreFeedback(score, total),
      status: Math.round((score / total) * 100) >= PASS_MARK_PERCENT ? "Pass" : "Fail",
    };

    state.submissions.push(submission);
    writeState(state);
    return { success: true, submission: clone(submission) };
  }

  if (path === "/api/submissions" && method === "DELETE") {
    requireRole(currentUser, ["ADMIN"]);
    state.submissions = [];
    writeState(state);
    return { success: true };
  }

  throw new Error(`Unsupported local API endpoint: ${method} ${path}`);
}
