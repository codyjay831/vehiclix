#Requires -Version 5.1
<#
.SYNOPSIS
  Run Prisma migrations against production Postgres via Cloud SQL Auth Proxy (private IP).

.PREREQUISITES
  1. Google Cloud SDK installed and Application Default Credentials:
       gcloud auth application-default login
  2. Your Google account must have Cloud SQL Client on the project.
  3. Cloud SQL Auth Proxy v2 binary at tools/cloud-sql-proxy.exe (script can download it).

.PARAMETER DatabaseUrl
  Full postgresql:// URL aimed at 127.0.0.1:<ProxyPort>/vehiclix?schema=public
  If omitted, uses environment variable MIGRATE_DATABASE_URL.

.EXAMPLE
  $env:MIGRATE_DATABASE_URL = "postgresql://postgres:YOUR_PASS@127.0.0.1:6543/vehiclix?schema=public"
  .\scripts\run-production-migrate.ps1
#>
param(
  [string]$DatabaseUrl,
  [int]$ProxyPort = 6543,
  [string]$InstanceConnectionName = "vehiclix-f8be6:us-east4:vehiclix-db"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

$url = if ($DatabaseUrl) { $DatabaseUrl } else { $env:MIGRATE_DATABASE_URL }
if (-not $url) {
  Write-Error "Set MIGRATE_DATABASE_URL or pass -DatabaseUrl (postgresql://...@127.0.0.1:${ProxyPort}/vehiclix?schema=public)"
}

$proxyExe = Join-Path $projectRoot "tools\cloud-sql-proxy.exe"
if (-not (Test-Path $proxyExe)) {
  New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot "tools") | Out-Null
  Write-Host "Downloading Cloud SQL Auth Proxy..."
  Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.x64.exe" -OutFile $proxyExe -UseBasicParsing
}

$proxyProc = $null
$prevDatabaseUrl = $env:DATABASE_URL
try {
  Write-Host "Starting Cloud SQL Auth Proxy (--private-ip) on port $ProxyPort for $InstanceConnectionName ..."
  $proxyProc = Start-Process -FilePath $proxyExe -ArgumentList @("--private-ip", "--port", "$ProxyPort", $InstanceConnectionName) -PassThru -NoNewWindow

  $deadline = (Get-Date).AddSeconds(45)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    if (-not $proxyProc.HasExited) {
      $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $ProxyPort -WarningAction SilentlyContinue
      if ($tcp.TcpTestSucceeded) {
        $ready = $true
        break
      }
    } else {
      throw "Cloud SQL proxy exited early (exit $($proxyProc.ExitCode)). Run: gcloud auth application-default login"
    }
    Start-Sleep -Milliseconds 400
  }
  if (-not $ready) {
    throw "Proxy did not open 127.0.0.1:${ProxyPort} in time. Check ADC and network."
  }

  $env:DATABASE_URL = $url
  Write-Host "Running: npx prisma migrate deploy"
  Write-Host "Datasource should show vehiclix @ 127.0.0.1:${ProxyPort}"
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npx prisma migrate status
}
finally {
  if ($proxyProc -and -not $proxyProc.HasExited) {
    Stop-Process -Id $proxyProc.Id -Force -ErrorAction SilentlyContinue
  }
  if ($null -ne $prevDatabaseUrl) {
    $env:DATABASE_URL = $prevDatabaseUrl
  } else {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  }
}
