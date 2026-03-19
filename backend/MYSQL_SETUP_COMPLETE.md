# Quiz Platform - Complete MySQL Database Setup Guide

## 📋 Overview
This guide provides step-by-step instructions to set up the MySQL database for the Quiz Platform application.

**Setup Files Provided:**
- `mysql-setup-complete.sql` - Complete database schema with sample data
- `.env` - Environment configuration with MySQL credentials

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Verify MySQL is Running
```powershell
# Windows: Check MySQL service
Get-Service MySQL80  # or your MySQL version

# Should show: Status: Running
```

### Step 2: Connect to MySQL
```powershell
# Open MySQL Command Line
mysql -u root -p

# When prompted for password, enter: Login@123456
```

### Step 3: Execute Setup Script
```sql
-- Paste the entire contents of mysql-setup-complete.sql into MySQL command line
-- Or run from command line:
```

```powershell
mysql -u root -p < mysql-setup-complete.sql
# Enter password: Login@123456
```

### Step 4: Verify Database Creation
```powershell
mysql -u root -p quiz_platform

# Run these verification queries:
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM quizzes;
```

Expected output should show:
- **8 tables**: users, quizzes, questions, question_options, submissions, student_answers
- **2 users**: 1 admin, 1 student
- **1 quiz**: With 2 questions and 8 options

---

## 🔧 Detailed Setup Steps

### Prerequisites
- **MySQL Server 5.7+** (MySQL 8.0 recommended)
- **MySQL Install Location**: `C:\Program Files\MySQL\MySQL Server 8.0`
- **MySQL Command Line Client** installed

### Step-by-Step Setup

#### 1. **Install/Start MySQL** (if not already done)

```powershell
# Windows PowerShell (as Administrator)

# Download MySQL Community Server from mysql.com/downloads/

# After installation, verify MySQL service is running:
Get-Service MySQL80 | Start-Service

# Verify connection:
mysql --version
```

#### 2. **Connect to MySQL Server**

```powershell
# Open MySQL Command Line
mysql -u root -p

# Enter password: Login@123456
```

#### 3. **Create Database and Tables**

**Option A: Execute SQL File (Recommended)**

```powershell
# In PowerShell, navigate to backend directory:
cd backend

# Run the complete setup script:
mysql -u root -p < mysql-setup-complete.sql

# Enter password when prompted: Login@123456
```

**Option B: Manual SQL Execution**

```powershell
# Open MySQL interactive mode
mysql -u root -p

# In MySQL console, paste all SQL from mysql-setup-complete.sql
```

#### 4. **Verify Setup Completed Successfully**

```powershell
# Connect to database
mysql -u root -p quiz_platform

# Run verification queries:
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM quizzes;
```

Expected Results:
```
Tables:
- users (2 rows)
- quizzes (1 row)
- questions (2 rows)
- question_options (8 rows)
- submissions (0 rows)
- student_answers (0 rows)

Users:
- admin@quizplatform.com (ADMIN)
- student@quizplatform.com (STUDENT)
```

---

## 📁 Database Schema Summary

### Tables Created:

1. **users** - User accounts (admin/student)
   - 2 sample records included

2. **quizzes** - Quiz metadata
   - 1 sample "Introduction to Business" quiz

3. **questions** - Quiz questions
   - 2 sample questions included

4. **question_options** - Multiple choice options
   - 8 sample options (4 per question)

5. **submissions** - Student quiz attempts
   - Empty (populates when students submit quizzes)

6. **student_answers** - Individual answers per question
   - Empty (populates when submissions are graded)

7. **Additional tables** included for full schema support

### Default Credentials:

```
Admin User:
  Email: admin@quizplatform.com
  Password: admin123 (login with this, hashed as: $2a$10$p3tklYiCh7lplKpzrk1OXO2Qe5gLjWlPgNH0v9eLWgXB7bFDfQQEi)
  Role: ADMIN

Student User:
  Email: student@quizplatform.com
  Password: student123 (same hash)
  Role: STUDENT
```

---

## 🔌 Connect Backend Application

### Step 1: Environment Variables Already Set

The `.env` file has been created with these values:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=quiz_platform
DB_USERNAME=root
DB_PASSWORD=Login@123456
APP_DB_PROFILE=mysql
```

### Step 2: Start Backend Service

```powershell
# Navigate to backend directory
cd backend

# Option A: Using Maven directly
mvn clean spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=mysql"

# Option B: Using provided startup script
./start-mysql.cmd

# Option C: Build and run JAR
mvn clean package
java -Dspring.profiles.active=mysql -jar target/quiz-platform-*.jar
```

### Step 3: Test Connection

The backend will:
1. Read `.env` file automatically
2. Load MySQL connection properties
3. Create connection pool
4. Initialize Spring Data JPA entities

Check backend logs for:
```
Hibernate: Hibernate initialized
MySQL connection pool initialized
Starting Quiz Platform API...
Server started on http://localhost:8080
```

---

## ✅ Troubleshooting

### Issue: "Access denied for user 'root'"
**Solution:**
```powershell
# Verify password is correct
mysql -u root -p
# Try password: Login@123456

# Or reset root password (if needed):
# Windows: Use MySQL Workbench
```

### Issue: "Can't connect to MySQL server"
**Solution:**
```powershell
# Check if MySQL service is running
Get-Service MySQL80

# Start MySQL if stopped
Start-Service MySQL80

# Verify MySQL is listening on port 3306
netstat -ano | findstr :3306
```

### Issue: "Database 'quiz_platform' doesn't exist"
**Solution:**
```powershell
# Run the setup script again:
mysql -u root -p < mysql-setup-complete.sql

# Or manually create:
mysql -u root -p
CREATE DATABASE quiz_platform;
```

### Issue: Backend can't connect to MySQL
**Solution:**
1. Verify `.env` file exists in `backend/` directory
2. Verify credentials in `.env` match MySQL
3. Ensure MySQL is running: `Get-Service MySQL80`
4. Check firewall allows port 3306

---

## 📊 Database Performance Notes

- **Character Set**: UTF8MB4 (supports emojis/unicode)
- **Collation**: utf8mb4_unicode_ci (case-insensitive)
- **Indexes**: Created on frequently queried fields (email, quiz_id, student_id, submitted_at)
- **Foreign Keys**: Cascade delete enabled for data consistency
- **AutoIncrement**: BIGINT for future scalability

---

## 🔄 Common Operations

### Add New Quiz
```sql
INSERT INTO quizzes (title, module, category, total_marks, minutes, created_by, is_published) 
VALUES ('New Quiz Title', 'Module Name', 'Category', 100, 30, 1, TRUE);
```

### Add New Student
```sql
INSERT INTO users (name, email, password_hash, role, faculty, active) 
VALUES ('Student Name', 'email@example.com', 'hashed_password', 'STUDENT', 'Faculty', TRUE);
```

### View All Submissions
```sql
SELECT * FROM submissions WHERE quiz_id = 1;
```

### Reset Database
```powershell
# Drop and recreate database:
mysql -u root -p < mysql-setup-complete.sql
```

---

## 📝 Next Steps

1. ✅ Create MySQL database (completed)
2. ✅ Configure `.env` credentials (completed)
3. ⏳ Start backend with MySQL profile
4. ⏳ Access API on `http://localhost:8080`
5. ⏳ Test quiz functionality with sample data

---

## 📞 Support

For issues, check:
- MySQL logs: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\`
- Backend logs: Spring Boot console output
- Database integrity: Run verification queries above
