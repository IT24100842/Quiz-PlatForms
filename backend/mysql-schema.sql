-- =============================================================
-- Quiz Platform - MySQL Schema (manual setup)
-- =============================================================
-- Usage:
--   1. Run this script once in MySQL.
--   2. Start backend with APP_DB_PROFILE=mysql.
--   3. If users table is empty, DataInitializer seeds:
--        admin@quizplatform.com / admin123
--        student@quizplatform.com / student123
-- =============================================================

CREATE DATABASE IF NOT EXISTS quiz_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quiz_platform;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'STUDENT',
    faculty VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB;

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    target_faculty VARCHAR(30) NULL DEFAULT 'ALL',
    questions_count INT NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 0,
    exam_type VARCHAR(80) NULL,
    total_marks INT NULL,
    scheduled_date DATE NULL,
    url VARCHAR(500) NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Questions
CREATE TABLE IF NOT EXISTS questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    text VARCHAR(1000) NOT NULL,
    explanation VARCHAR(2000) NULL,
    question_type VARCHAR(20) NULL,
    question_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_questions_quiz
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Question options
CREATE TABLE IF NOT EXISTS question_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    option_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_question_options_question
        FOREIGN KEY (question_id) REFERENCES questions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Student submissions
CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(150) NULL,
    student_name VARCHAR(100) NULL,
    quiz_title VARCHAR(200) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    submitted_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Helpful indexes for sorting/filtering used by repositories
CREATE INDEX idx_questions_quiz_order ON questions (quiz_id, question_order);
CREATE INDEX idx_question_options_order ON question_options (question_id, option_order);
CREATE INDEX idx_submissions_submitted_at ON submissions (submitted_at);
CREATE INDEX idx_submissions_student_email ON submissions (student_email);

SELECT 'MySQL schema ready for Quiz Platform.' AS status;
