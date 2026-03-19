@echo off
setlocal

echo ============================================
echo   Quiz Platform Backend - Google Cloud Mode
echo ============================================
echo.
if "%GMAIL_CLIENT_ID%"=="" (
  echo GMAIL_CLIENT_ID is not set.
  echo Set these variables first:
  echo   set MAIL_ENABLED=true
  echo   set MAIL_PROVIDER=gmail-api
  echo   set GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
  echo   set GMAIL_CLIENT_SECRET=xxxxx
  echo   set GMAIL_REFRESH_TOKEN=xxxxx
  echo   set GMAIL_SENDER=yourgmail@gmail.com
  pause
  exit /b 1
)

if "%GMAIL_CLIENT_SECRET%"=="" (
  echo GMAIL_CLIENT_SECRET is not set.
  pause
  exit /b 1
)

if "%GMAIL_REFRESH_TOKEN%"=="" (
  echo GMAIL_REFRESH_TOKEN is not set.
  pause
  exit /b 1
)

if "%GMAIL_SENDER%"=="" (
  echo GMAIL_SENDER is not set.
  pause
  exit /b 1
)

if "%MAIL_ENABLED%"=="" set MAIL_ENABLED=true
if "%MAIL_PROVIDER%"=="" set MAIL_PROVIDER=gmail-api

cd /d "%~dp0"
call mvnw.cmd spring-boot:run
pause
