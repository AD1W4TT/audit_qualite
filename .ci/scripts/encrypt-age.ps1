[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [string]$RecipientsFile = ".ci/age-recipients.txt",
  [string]$AgeExe = $env:AGE_EXE
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($AgeExe)) {
  $fallback = "D:\CI\actions-runner\tools\age\age.exe"
  if (Test-Path $fallback) {
    $AgeExe = $fallback
  } else {
    $cmd = Get-Command age -ErrorAction SilentlyContinue
    if ($cmd) { $AgeExe = $cmd.Source }
  }
}

if ([string]::IsNullOrWhiteSpace($AgeExe) -or -not (Test-Path $AgeExe)) {
  throw "age.exe introuvable. Definir AGE_EXE ou installer age dans le PATH"
}

if (-not (Test-Path $InputFile)) { throw "Input introuvable: $InputFile" }
if (-not (Test-Path $RecipientsFile)) { throw "Recipients file introuvable: $RecipientsFile" }

$recipients = Get-Content $RecipientsFile |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -and -not $_.StartsWith('#') }
if (-not $recipients -or $recipients.Count -eq 0) {
  throw "Aucun recipient age dans $RecipientsFile"
}

New-Item -ItemType Directory -Force -Path (Split-Path $OutputFile) | Out-Null
$args = @()
foreach ($r in $recipients) { $args += @('--recipient', $r) }
$args += @('--output', $OutputFile, $InputFile)
& "$AgeExe" @args
if ($LASTEXITCODE -ne 0) { throw "Echec encrypt: $InputFile" }
