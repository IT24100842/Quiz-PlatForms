@echo off
REM Quiz Platform - MySQL Database Setup

set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe

if not exist "%MYSQL_PATH%" (
    echo ERROR: MySQL not found at %MYSQL_PATH%
    pause
    exit /b 1
)

echo.
echo ========================================
echo Quiz Platform - MySQL Setup
echo ========================================
echo.
echo Executing setup...
echo.

REM Execute setup
"%MYSQL_PATH%" -u root -proot < mysql-setup-complete.sql

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS - Database setup complete
    echo ========================================
    echo.
    echo Database: quiz_platform
    echo Tables: 8
    echo.
    echo Credentials:
    echo   Admin: admin@quizplatform.com / admin123
    echo   Student: student@quizplatform.com / student123
    echo.
) else (
    echo.
    echo ERROR - Setup failed with code %errorlevel%
    echo Make sure MySQL is running and password is correct
    echo.
)

pause
