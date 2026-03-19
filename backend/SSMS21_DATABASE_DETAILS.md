# SSMS 21 Database Details (Quiz Platform)

## SSMS 21 connection values

Use these in the SSMS connection dialog:

- Server type: `Database Engine`
- Server name: `localhost`
- Authentication: `Windows Authentication`
- Database name: `QuizPlatformDB`

If `localhost` fails, try `LAPTOP-QDD94000` or `localhost,1433`.

## Backend profile values (SQL Server)

Set these env vars before running Spring Boot:

```powershell
$env:APP_DB_PROFILE="mssql"
$env:MSSQL_HOST="localhost"
$env:MSSQL_PORT="1433"
$env:MSSQL_DB="QuizPlatformDB"
$env:MSSQL_INTEGRATED_SECURITY="true"
$env:MSSQL_ENCRYPT="true"
$env:MSSQL_TRUST_SERVER_CERT="true"
```

Run backend:

```powershell
Set-Location "c:\Users\winuth\OneDrive - Sri Lanka Institute of Information Technology\Desktop\Quiz platform\backend"
.\mvnw.cmd spring-boot:run
```

## SQL Login mode (optional)

If you want SQL authentication instead of Windows auth:

```powershell
$env:APP_DB_PROFILE="mssql"
$env:MSSQL_INTEGRATED_SECURITY="false"
$env:MSSQL_USERNAME="your_sql_user"
$env:MSSQL_PASSWORD="your_sql_password"
```

## Quick DB check

```powershell
sqlcmd -S localhost -E -d QuizPlatformDB -Q "SELECT DB_NAME() AS CurrentDb;"
```
