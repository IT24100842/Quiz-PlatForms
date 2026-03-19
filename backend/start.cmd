@echo off
echo ============================================
echo   Quiz Platform Backend - Starting Server
echo ============================================
echo.
echo BEFORE STARTING:
echo   1. Choose a DB profile using APP_DB_PROFILE (mysql/h2/mssql)
echo   2. Default profile is mysql
echo   3. For MySQL, set DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
echo.
echo Default test accounts (created on first run):
echo   Admin   : admin@quizplatform.com  / admin123
echo   Student : student@quizplatform.com / student123
echo.
echo Press any key to start the server...
pause > nul

cd /d "%~dp0"
call mvnw.cmd spring-boot:run
pause
