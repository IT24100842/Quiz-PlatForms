@echo off
setlocal enabledelayedexpansion

REM Change to script directory
cd /d "%~dp0"

REM Try to find mysql.exe
set "MYSQL_PATH="
for /F "tokens=*" %%A in ('dir /s /b "C:\Program Files\MySQL\*.exe" ^| findstr mysql.exe') do (
    set "MYSQL_PATH=%%A"
    goto :found
)

:found
if "!MYSQL_PATH!"=="" (
    echo ERROR: Cannot find mysql.exe
    exit /b 1
)

echo Found MySQL at: !MYSQL_PATH!
echo.
echo Running setup...
"!MYSQL_PATH!" -u root -proot < mysql-setup-complete.sql
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS - Database setup complete!
    echo.
    echo Database: quiz_platform created with 8 tables
    echo Sample data added
    echo.
) else (
    echo.
    echo ERROR - Setup failed (code: %errorlevel%)
    echo Possible issue: Wrong password or MySQL not running
    echo.
)
pause
