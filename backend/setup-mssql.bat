@echo off
REM ========================================
REM Quiz Platform - MSSQL Database Setup
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Quiz Platform - MSSQL Setup
echo ========================================
echo.

REM Check if sqlcmd is available
sqlcmd -? >nul 2>&1
if errorlevel 1 (
    echo ERROR: sqlcmd not found - is SQL Server Client Tools installed?
    pause
    exit /b 1
)

echo [OK] SQL Server Client Tools found
echo.
echo [*] Executing database setup...
echo     Connection: localhost (Windows Auth)
echo     Database: QuizPlatformDB
echo.

REM Execute the setup script
sqlcmd -S localhost -E -i mssql-setup-complete.sql

if errorlevel 1 (
    echo.
    echo ERROR - Setup failed
    echo Make sure SQL Server is running and accessible via localhost
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS - Database setup complete!
echo ========================================
echo.
echo Database: QuizPlatformDB created
echo Tables: 8 tables with indexes
echo Sample data: 2 users, 1 quiz, 2 questions, 8 options
echo.
echo Configuration for Spring Boot:
echo   APP_DB_PROFILE=mssql
echo   MSSQL_HOST=localhost
echo   MSSQL_PORT=1433
echo   MSSQL_DB=QuizPlatformDB
echo   MSSQL_INTEGRATED_SECURITY=true
echo.
echo Next: Start backend with:
echo   .\start-mssql.cmd
echo   or
echo   mvn spring-boot:run
echo.
pause
