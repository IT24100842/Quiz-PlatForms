-- ========================================================================
-- Quiz Platform - Complete MSSQL/SQL Server Setup Script
-- Database: Quiz Platform
-- Authentication: Windows Authentication (integrated security)
-- ========================================================================

USE [Quiz Platform];
GO

-- ========================================================================
-- Step 2: Create Tables
-- ========================================================================

-- Users Table
CREATE TABLE [dbo].[Users] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(150) NOT NULL UNIQUE,
    [password_hash] NVARCHAR(MAX) NOT NULL,
    [role] NVARCHAR(50) NOT NULL DEFAULT 'STUDENT' CHECK ([role] IN ('ADMIN', 'STUDENT')),
    [faculty] NVARCHAR(50) NULL,
    [active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX [IX_Users_Email] ON [dbo].[Users]([email]);
CREATE INDEX [IX_Users_Role] ON [dbo].[Users]([role]);
GO

-- Quizzes Table
CREATE TABLE [dbo].[Quizzes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [module] NVARCHAR(100) NOT NULL,
    [category] NVARCHAR(100) NULL,
    [exam_type] NVARCHAR(50) NULL,
    [target_faculty] NVARCHAR(50) DEFAULT 'ALL',
    [questions] INT DEFAULT 0,
    [total_marks] INT DEFAULT 100,
    [minutes] INT DEFAULT 30,
    [is_published] BIT NOT NULL DEFAULT 0,
    [scheduled_date] DATE NULL,
    [url] NVARCHAR(500) NULL,
    [created_by] BIGINT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Quizzes_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL
);

CREATE INDEX [IX_Quizzes_Published] ON [dbo].[Quizzes]([is_published]);
CREATE INDEX [IX_Quizzes_Module] ON [dbo].[Quizzes]([module]);
GO

-- Questions Table
CREATE TABLE [dbo].[Questions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [quiz_id] BIGINT NOT NULL,
    [text] NVARCHAR(MAX) NOT NULL,
    [explanation] NVARCHAR(MAX) NULL,
    [question_type] NVARCHAR(50) DEFAULT 'SINGLE' CHECK ([question_type] IN ('SINGLE', 'MULTIPLE')),
    [question_order] INT NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Questions_QuizId] FOREIGN KEY ([quiz_id]) REFERENCES [dbo].[Quizzes]([id]) ON DELETE CASCADE,
    CONSTRAINT [UK_Questions_QuizOrder] UNIQUE([quiz_id], [question_order])
);

CREATE INDEX [IX_Questions_QuizId] ON [dbo].[Questions]([quiz_id]);
GO

-- Question Options Table
CREATE TABLE [dbo].[QuestionOptions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [question_id] BIGINT NOT NULL,
    [text] NVARCHAR(MAX) NOT NULL,
    [is_correct] BIT NOT NULL DEFAULT 0,
    [option_order] INT NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_QuestionOptions_QuestionId] FOREIGN KEY ([question_id]) REFERENCES [dbo].[Questions]([id]) ON DELETE CASCADE,
    CONSTRAINT [UK_QuestionOptions_Order] UNIQUE([question_id], [option_order])
);

CREATE INDEX [IX_QuestionOptions_QuestionId] ON [dbo].[QuestionOptions]([question_id]);
GO

-- Submissions Table
CREATE TABLE [dbo].[Submissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [quiz_id] BIGINT NOT NULL,
    [student_id] BIGINT NOT NULL,
    [student_email] NVARCHAR(150) NOT NULL,
    [student_name] NVARCHAR(100) NULL,
    [quiz_title] NVARCHAR(255) NOT NULL,
    [score] INT DEFAULT 0,
    [total] INT DEFAULT 100,
    [status] NVARCHAR(50) DEFAULT 'IN_PROGRESS' CHECK ([status] IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    [submitted_at] DATETIME NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Submissions_QuizId] FOREIGN KEY ([quiz_id]) REFERENCES [dbo].[Quizzes]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Submissions_StudentId] FOREIGN KEY ([student_id]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE
);

CREATE INDEX [IX_Submissions_StudentEmail] ON [dbo].[Submissions]([student_email]);
CREATE INDEX [IX_Submissions_StudentId] ON [dbo].[Submissions]([student_id]);
CREATE INDEX [IX_Submissions_QuizId] ON [dbo].[Submissions]([quiz_id]);
CREATE INDEX [IX_Submissions_SubmittedAt] ON [dbo].[Submissions]([submitted_at]);
GO

-- Student Answers Table
CREATE TABLE [dbo].[StudentAnswers] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [question_id] BIGINT NOT NULL,
    [selected_option_id] BIGINT NULL,
    [is_correct] BIT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_StudentAnswers_SubmissionId] FOREIGN KEY ([submission_id]) REFERENCES [dbo].[Submissions]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_StudentAnswers_QuestionId] FOREIGN KEY ([question_id]) REFERENCES [dbo].[Questions]([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_StudentAnswers_OptionId] FOREIGN KEY ([selected_option_id]) REFERENCES [dbo].[QuestionOptions]([id]) ON DELETE NO ACTION,
    CONSTRAINT [UK_StudentAnswers_SubmissionQuestion] UNIQUE([submission_id], [question_id])
);

CREATE INDEX [IX_StudentAnswers_SubmissionId] ON [dbo].[StudentAnswers]([submission_id]);
GO

-- ========================================================================
-- Step 3: Insert Sample Data
-- ========================================================================

-- Insert Sample Users
INSERT INTO [dbo].[Users] ([name], [email], [password_hash], [role], [faculty], [active])
VALUES
    ('Admin User', 'admin@quizplatform.com', '$2a$10$p3tklYiCh7lplKpzrk1OXO2Qe5gLjWlPgNH0v9eLWgXB7bFDfQQEi', 'ADMIN', NULL, 1),
    ('Student User', 'student@quizplatform.com', '$2a$10$p3tklYiCh7lplKpzrk1OXO2Qe5gLjWlPgNH0v9eLWgXB7bFDfQQEi', 'STUDENT', 'IT', 1);
GO

-- Insert Sample Quiz
INSERT INTO [dbo].[Quizzes] ([title], [module], [category], [exam_type], [target_faculty], [questions], [total_marks], [minutes], [is_published], [created_by])
VALUES
    ('Introduction to Business - Quiz 1', 'Introduction to Business', 'General', 'General', 'ALL', 5, 50, 30, 1, 1);
GO

-- Insert Sample Questions
INSERT INTO [dbo].[Questions] ([quiz_id], [text], [explanation], [question_type], [question_order])
VALUES
    (1, 'What is the primary goal of a business?', 'The primary goal is to create value and generate profit.', 'SINGLE', 1),
    (1, 'Which of the following are types of business structures?', 'Sole proprietorship, partnership, corporation, and LLC are main types.', 'MULTIPLE', 2);
GO

-- Insert Sample Options
INSERT INTO [dbo].[QuestionOptions] ([question_id], [text], [is_correct], [option_order])
VALUES
    (1, 'To maximize profit', 1, 1),
    (1, 'To minimize costs', 0, 2),
    (1, 'To increase employee count', 0, 3),
    (1, 'To reduce competition', 0, 4),
    (2, 'Sole Proprietorship', 1, 1),
    (2, 'Partnership', 1, 2),
    (2, 'Corporation', 1, 3),
    (2, 'Freelancer', 0, 4);
GO

-- ========================================================================
-- Step 4: Verification
-- ========================================================================
PRINT '';
PRINT '========================================';
PRINT 'Database Setup Complete!';
PRINT '========================================';
PRINT '';

SELECT 'Users' AS [Table], COUNT(*) AS [Records] FROM [dbo].[Users]
UNION ALL
SELECT 'Quizzes', COUNT(*) FROM [dbo].[Quizzes]
UNION ALL
SELECT 'Questions', COUNT(*) FROM [dbo].[Questions]
UNION ALL
SELECT 'Options', COUNT(*) FROM [dbo].[QuestionOptions]
UNION ALL
SELECT 'Submissions', COUNT(*) FROM [dbo].[Submissions]
UNION ALL
SELECT 'Student Answers', COUNT(*) FROM [dbo].[StudentAnswers];

PRINT '';
PRINT 'Connection String for .NET Applications:';
PRINT 'Server=localhost;Database=Quiz Platform;Integrated Security=true;TrustServerCertificate=true;';
PRINT '';

