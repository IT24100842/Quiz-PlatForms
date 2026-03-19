@echo off
setlocal

echo ============================================
echo   Quiz Platform Backend - MySQL Mode
echo ============================================
echo.

if "%APP_DB_PROFILE%"=="" set APP_DB_PROFILE=mysql
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=3306
if "%DB_NAME%"=="" set DB_NAME=quiz_platform
if "%DB_USERNAME%"=="" set DB_USERNAME=root
if "%DB_PASSWORD%"=="" set DB_PASSWORD=root

echo Using DB settings:
echo   APP_DB_PROFILE=%APP_DB_PROFILE%
echo   DB_HOST=%DB_HOST%
echo   DB_PORT=%DB_PORT%
echo   DB_NAME=%DB_NAME%
echo   DB_USERNAME=%DB_USERNAME%
echo.
echo NOTE: Import mysql-schema.sql once before first run.
echo.

cd /d "%~dp0"
call mvnw.cmd spring-boot:run
pause
