# Starts an isolated PostgreSQL cluster for local development.
# Does not touch any existing PostgreSQL installation or service.
#
#   powershell -ExecutionPolicy Bypass -File scripts/dev-db.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/dev-db.ps1 -Stop
#
# Then set in .env:
#   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/dalmg?schema=public"

param(
  [int]$Port = 5433,
  [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$bin = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_ctl.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $bin) {
  Write-Host "PostgreSQL binaries not found. Install PostgreSQL 16+ or use Docker / Neon." -ForegroundColor Yellow
  exit 1
}
$binDir = Split-Path $bin.FullName
$data = Join-Path $env:TEMP 'dalmg-pg'

if ($Stop) {
  & (Join-Path $binDir 'pg_ctl.exe') -D $data stop
  exit 0
}

if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
  Write-Host "Initializing cluster in $data ..."
  & (Join-Path $binDir 'initdb.exe') -D $data -U postgres --auth=trust --encoding=UTF8 --locale=C | Out-Null
}

& (Join-Path $binDir 'pg_ctl.exe') -D $data -o "-p $Port" -l (Join-Path $data 'server.log') start
Start-Sleep -Seconds 2

$exists = & (Join-Path $binDir 'psql.exe') -h 127.0.0.1 -p $Port -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dalmg'"
if ($exists -ne '1') {
  & (Join-Path $binDir 'createdb.exe') -h 127.0.0.1 -p $Port -U postgres dalmg
}

Write-Host ""
Write-Host "PostgreSQL is running on 127.0.0.1:$Port (db=dalmg, user=postgres, no password)" -ForegroundColor Green
Write-Host "DATABASE_URL=`"postgresql://postgres:postgres@127.0.0.1:$Port/dalmg?schema=public`""
Write-Host "Stop with: powershell -File scripts/dev-db.ps1 -Stop"
