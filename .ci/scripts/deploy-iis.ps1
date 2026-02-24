[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Target,
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [switch]$UseAppOffline
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) { throw "Source introuvable: $Source" }

New-Item -ItemType Directory -Path $Target -Force | Out-Null
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupRoot $timestamp
$appOffline = Join-Path $Target "app_offline.htm"

function Invoke-Robocopy {
  param([string]$From, [string]$To)

  New-Item -ItemType Directory -Path $To -Force | Out-Null
  & robocopy $From $To /MIR /R:2 /W:2 /NFL /NDL /NP
  $code = $LASTEXITCODE
  if ($code -ge 8) { throw "Robocopy failed with exit code $code" }
  if ($code -ge 1) { Write-Host "Robocopy completed with warnings/code $code" }
  $global:LASTEXITCODE = 0
}

if (Test-Path $Target) {
  New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
  Invoke-Robocopy -From $Target -To $backupPath
}

try {
  if ($UseAppOffline) {
    "<html><body><h1>Maintenance</h1></body></html>" | Set-Content -Path $appOffline -Encoding UTF8
  }
  Invoke-Robocopy -From $Source -To $Target
}
catch {
  if (Test-Path $backupPath) {
    Invoke-Robocopy -From $backupPath -To $Target
  }
  throw
}
finally {
  if (Test-Path $appOffline) { Remove-Item $appOffline -Force }
}

