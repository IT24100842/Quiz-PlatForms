# MySQL Setup Guide (Quiz Platform)

This project supports MySQL via profile `mysql`.

## 1. Start MySQL service (Windows)

Use PowerShell:

```powershell
Get-Service *mysql*
Start-Service MySQL80
```

If your service name is different, use that one instead of `MySQL80`.

## 2. Create database/user in MySQL

Open MySQL CLI or MySQL Workbench and run:

```sql
CREATE DATABASE IF NOT EXISTS quiz_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'quiz_user'@'localhost' IDENTIFIED BY 'quiz_password';
GRANT ALL PRIVILEGES ON quiz_platform.* TO 'quiz_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Create tables

Option A (recommended): run provided schema file.

PowerShell:

```powershell
Set-Location "c:\Users\winuth\OneDrive - Sri Lanka Institute of Information Technology\Desktop\Quiz platform\backend"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h localhost -P 3306 -u quiz_user -p quiz_platform < .\mysql-schema.sql
```

If `mysql` is already in your PATH, you can use:

```powershell
mysql -h localhost -P 3306 -u quiz_user -p quiz_platform < .\mysql-schema.sql
```

Option B: start backend with `spring.jpa.hibernate.ddl-auto=update` and Hibernate will create missing tables.

## 4. Backend env vars (MySQL profile)

PowerShell:

```powershell
$env:APP_DB_PROFILE="mysql"
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="quiz_platform"
$env:DB_USERNAME="quiz_user"
$env:DB_PASSWORD="quiz_password"
```

## 5. Run backend

```powershell
Set-Location "c:\Users\winuth\OneDrive - Sri Lanka Institute of Information Technology\Desktop\Quiz platform\backend"
.\mvnw.cmd spring-boot:run
```

Or use helper script:

```powershell
Set-Location "c:\Users\winuth\OneDrive - Sri Lanka Institute of Information Technology\Desktop\Quiz platform\backend"
.\start-mysql.cmd
```

## 6. Quick verification

After backend starts, test login API:

```powershell
$body = @{ email='student@quizplatform.com'; password='student123'; role='STUDENT' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -ContentType 'application/json' -Body $body
```

If `users` table is empty, default accounts are auto-seeded at startup.
