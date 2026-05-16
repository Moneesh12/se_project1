param(
  [int]$Port = 4000
)

$ErrorActionPreference = "Stop"

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) {
  exit 0
}

$ownerPid = $listener.OwningProcess
$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
if (-not $proc) {
  exit 0
}

$commandLine = [string]$proc.CommandLine
$parentProc = $null
if ($proc.ParentProcessId) {
  $parentProc = Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.ParentProcessId)" -ErrorAction SilentlyContinue
}
$parentCommandLine = if ($parentProc) { [string]$parentProc.CommandLine } else { "" }

$isWorkspaceApiServer =
  ($commandLine -match "tsx" -and $commandLine -match "src/index.ts") -or
  ($parentCommandLine -match "artifacts\\api-server")

if ($isWorkspaceApiServer) {
  Write-Host "Stopping stale api-server process on port $Port (PID $ownerPid)..."
  Stop-Process -Id $ownerPid -Force -ErrorAction Stop
  Start-Sleep -Milliseconds 500
  exit 0
}

Write-Error "Port $Port is in use by PID $ownerPid.`nCommand: $commandLine`nStop it or change PORT in artifacts/api-server/.env."
exit 1
