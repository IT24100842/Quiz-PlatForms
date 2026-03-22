-- =============================================================
-- Quiz Platform – Manual Database Setup Script
-- Run this ONCE in SQL Server Management Studio (SSMS) if the
-- database does not exist. The Spring Boot app (ddl-auto=update)
-- creates the tables automatically on first startup.
-- =============================================================

-- 1. Create the database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'QuizPlatformDB')
BEGIN
    CREATE DATABASE QuizPlatformDB;
    PRINT 'QuizPlatformDB created.';
END
GO

USE QuizPlatformDB;
GO

-- The following tables are created automatically by Hibernate.
-- This script is provided only as a reference.

-- users table
-- CREATE TABLE users (
--     id            BIGINT IDENTITY(1,1) PRIMARY KEY,
--     name          NVARCHAR(100)  NOT NULL,
--     email         NVARCHAR(150)  NOT NULL UNIQUE,
--     password_hash NVARCHAR(255)  NOT NULL,
--     role          NVARCHAR(10)   NOT NULL DEFAULT 'STUDENT',
--     faculty       NVARCHAR(30)   NULL
-- );

-- quizzes table (admin-created quizzes)
-- CREATE TABLE quizzes (
--     id               BIGINT IDENTITY(1,1) PRIMARY KEY,
--     title            NVARCHAR(200) NOT NULL,
--     category         NVARCHAR(100) NOT NULL,
--     faculty_id       NVARCHAR(30)  NULL DEFAULT 'ALL',
--     target_faculty   NVARCHAR(30)  NULL DEFAULT 'ALL',
--     questions_count  INT           NOT NULL DEFAULT 0,
--     duration_minutes INT           NOT NULL DEFAULT 0,
--     exam_type        NVARCHAR(80)  NULL,
--     total_marks      INT           NULL,
--     scheduled_date   DATE          NULL,
--     url              NVARCHAR(500) NULL,
--     is_published     BIT           NOT NULL DEFAULT 0,
--     created_at       DATETIME2     DEFAULT GETDATE()
-- );

-- submissions table (student quiz results)
-- CREATE TABLE submissions (
--     id            BIGINT IDENTITY(1,1) PRIMARY KEY,
--     student_email NVARCHAR(150),
--     student_name  NVARCHAR(100),
--     quiz_title    NVARCHAR(200) NOT NULL,
--     score         INT           NOT NULL DEFAULT 0,
--     total         INT           NOT NULL DEFAULT 0,
--     submitted_at  DATETIME2     DEFAULT GETDATE()
-- );

PRINT 'Setup script complete. Start the Spring Boot server to auto-create tables.';
GO
