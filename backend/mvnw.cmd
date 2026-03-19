@echo off
setlocal

set "MAVEN_VER=3.9.6"
set "MAVEN_CACHE=%USERPROFILE%\.cache\quiz-platform-mvn"
set "MAVEN_HOME=%MAVEN_CACHE%\apache-maven-%MAVEN_VER%"

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo First run: downloading Apache Maven %MAVEN_VER%, please wait...
    if not exist "%MAVEN_CACHE%" mkdir "%MAVEN_CACHE%"
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VER%/apache-maven-%MAVEN_VER%-bin.zip' -OutFile '%MAVEN_CACHE%\maven.zip'"
    powershell -NoProfile -Command "Expand-Archive -Path '%MAVEN_CACHE%\maven.zip' -DestinationPath '%MAVEN_CACHE%' -Force"
    del "%MAVEN_CACHE%\maven.zip"
    echo Maven downloaded successfully.
    echo.
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
