-- ========================================================================
-- Quiz Platform - Complete MySQL Setup Script
-- Database: quiz_platform
-- User credentials: root / Login@123456
-- ========================================================================

-- Step 1: Create Database
DROP DATABASE IF EXISTS quiz_platform;
CREATE DATABASE quiz_platform 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE quiz_platform;

-- ========================================================================
-- Step 2: Create Tables
-- ========================================================================

-- Users Table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
    faculty VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quizzes Table
CREATE TABLE quizzes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    exam_type VARCHAR(50),
    target_faculty VARCHAR(50) DEFAULT 'ALL',
    questions INT DEFAULT 0,
    total_marks INT DEFAULT 100,
    minutes INT DEFAULT 30,
    is_published BOOLEAN DEFAULT FALSE,
    scheduled_date DATE,
    url VARCHAR(500),
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_published (is_published),
    INDEX idx_module (module),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions Table
CREATE TABLE questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    text VARCHAR(2000) NOT NULL,
    explanation VARCHAR(2000),
    question_type ENUM('SINGLE', 'MULTIPLE') DEFAULT 'SINGLE',
    question_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_question_order (quiz_id, question_order),
    UNIQUE KEY uk_quiz_question_order (quiz_id, question_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Question Options Table
CREATE TABLE question_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    text VARCHAR(1000) NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    option_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id),
    INDEX idx_option_order (question_id, option_order),
    UNIQUE KEY uk_question_option_order (question_id, option_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Submissions Table
CREATE TABLE submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    student_email VARCHAR(150) NOT NULL,
    student_name VARCHAR(100),
    quiz_title VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    total INT DEFAULT 100,
    status ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED') DEFAULT 'IN_PROGRESS',
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_email (student_email),
    INDEX idx_student_id (student_id),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Answers Table
CREATE TABLE student_answers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT,
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id) ON DELETE SET NULL,
    INDEX idx_submission_id (submission_id),
    UNIQUE KEY uk_submission_question (submission_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- Step 3: Insert Sample Data
-- ========================================================================

-- Insert Admin User
INSERT INTO users (name, email, password_hash, role, faculty, active) VALUES
('Admin User', 'admin@quizplatform.com', '$2a$10$p3tklYiCh7lplKpzrk1OXO2Qe5gLjWlPgNH0v9eLWgXB7bFDfQQEi', 'ADMIN', NULL, TRUE),
('Student User', 'student@quizplatform.com', '$2a$10$p3tklYiCh7lplKpzrk1OXO2Qe5gLjWlPgNH0v9eLWgXB7bFDfQQEi', 'STUDENT', 'IT', TRUE);

-- Insert Sample Quiz
INSERT INTO quizzes (title, module, category, exam_type, target_faculty, questions, total_marks, minutes, is_published, created_by, created_at) VALUES
('Introduction to Business - Quiz 1', 'Introduction to Business', 'General', 'General', 'ALL', 5, 50, 30, TRUE, 1, NOW());

-- Insert Sample Questions
INSERT INTO questions (quiz_id, text, explanation, question_type, question_order, created_at) VALUES
(1, 'What is the primary goal of a business?', 'The primary goal is to create value and generate profit.', 'SINGLE', 1, NOW()),
(1, 'Which of the following are types of business structures?', 'Sole proprietorship, partnership, corporation, and LLC are main types.', 'MULTIPLE', 2, NOW());

-- Insert Sample Options
INSERT INTO question_options (question_id, text, is_correct, option_order, created_at) VALUES
-- Question 1 options
(1, 'To maximize profit', TRUE, 1, NOW()),
(1, 'To minimize costs', FALSE, 2, NOW()),
(1, 'To increase employee count', FALSE, 3, NOW()),
(1, 'To reduce competition', FALSE, 4, NOW()),
-- Question 2 options
(2, 'Sole Proprietorship', TRUE, 1, NOW()),
(2, 'Partnership', TRUE, 2, NOW()),
(2, 'Corporation', TRUE, 3, NOW()),
(2, 'Freelancer', FALSE, 4, NOW());

-- ========================================================================
-- Step 4: Verification
-- ========================================================================
SELECT 'MySQL Database Setup Complete!' AS status;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_quizzes FROM quizzes;
SELECT COUNT(*) AS total_questions FROM questions;
SELECT COUNT(*) AS total_options FROM question_options;
