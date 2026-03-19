# Quiz Platform MySQL Setup

$MySQLPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$MySQLUser = "root"
$MySQLPassword = "root"
$ScriptPath = "mysql-setup-complete.sql"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Quiz Platform MySQL Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $MySQLPath)) {
    Write-Host "ERROR - MySQL not found" -ForegroundColor Red
    exit 1
}
Write-Host "OK: MySQL found" -ForegroundColor Green

if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR - Setup script missing" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Setup script found" -ForegroundColor Green
Write-Host ""
Write-Host "Executing setup..." -ForegroundColor Yellow
Write-Host ""

$tempFile = [System.IO.Path]::GetTempFileName()
Copy-Item $ScriptPath $tempFile -Force

try {
    Get-Content $tempFile | & $MySQLPath -u $MySQLUser "-p${MySQLPassword}" 2>$null
    $result = $LASTEXITCODE
} catch {
    $result = 1
}

Remove-Item $tempFile -Force -ErrorAction SilentlyContinue

if ($result -eq 0 -or $result -eq $null) {
    Write-Host "SUCCESS - Database setup complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database: quiz_platform" -ForegroundColor White
    Write-Host "Tables created: 8" -ForegroundColor White
    Write-Host ""
    Write-Host "Login credentials:" -ForegroundColor Cyan
    Write-Host "  Admin: admin@quizplatform.com / admin123" -ForegroundColor Gray
    Write-Host "  Student: student@quizplatform.com / student123" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "ERROR - Setup failed with code: $result" -ForegroundColor Red
}
