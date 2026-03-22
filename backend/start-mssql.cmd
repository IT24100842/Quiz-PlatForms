@echo off
REM ============================================
REM Quiz Platform Backend - Start with MSSQL
REM ============================================

setlocal
cd /d "%~dp0"

if "%APP_DB_PROFILE%"=="" set APP_DB_PROFILE=mssql
if "%MSSQL_HOST%"=="" set MSSQL_HOST=localhost
if "%MSSQL_PORT%"=="" set MSSQL_PORT=1434
if "%MSSQL_DB%"=="" set "MSSQL_DB=Quiz Platform"
if "%MSSQL_USERNAME%"=="" set MSSQL_USERNAME=quiz_app_user
if "%MSSQL_PASSWORD%"=="" set MSSQL_PASSWORD=QuizApp@12345
if "%MSSQL_ENCRYPT%"=="" set MSSQL_ENCRYPT=true
if "%MSSQL_TRUST_SERVER_CERT%"=="" set MSSQL_TRUST_SERVER_CERT=true

echo ============================================
echo Starting backend with MSSQL profile
echo APP_DB_PROFILE=%APP_DB_PROFILE%
echo MSSQL_HOST=%MSSQL_HOST%
echo MSSQL_PORT=%MSSQL_PORT%
echo MSSQL_DB=%MSSQL_DB%
echo MSSQL_USERNAME=%MSSQL_USERNAME%
echo ============================================
echo.

call mvnw.cmd spring-boot:run
