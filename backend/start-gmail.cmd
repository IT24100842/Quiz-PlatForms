@echo off
setlocal

echo ============================================
echo   Quiz Platform Backend - Gmail SMTP Mode
echo ============================================
echo.
if "%MAIL_USERNAME%"=="" (
  echo MAIL_USERNAME is not set.
  echo Set it first, for example:
  echo   set MAIL_ENABLED=true
  echo   set MAIL_PROVIDER=smtp
  echo   set MAIL_USERNAME=yourgmail@gmail.com
  echo   set MAIL_APP_PASSWORD=your_16_char_app_password
  echo   set MAIL_FROM=yourgmail@gmail.com
  echo.
  echo Then run this file again in the same terminal.
  pause
  exit /b 1
)

if "%MAIL_APP_PASSWORD%"=="" (
  echo MAIL_APP_PASSWORD is not set.
  echo Use your Gmail App Password (not your normal Gmail password).
  pause
  exit /b 1
)

if "%MAIL_ENABLED%"=="" set MAIL_ENABLED=true
if "%MAIL_PROVIDER%"=="" set MAIL_PROVIDER=smtp
if "%MAIL_FROM%"=="" set MAIL_FROM=%MAIL_USERNAME%

cd /d "%~dp0"
call mvnw.cmd spring-boot:run
pause
