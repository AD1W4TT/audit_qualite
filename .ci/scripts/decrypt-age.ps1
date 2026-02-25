[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [string]$KeyFile = $env:AGE_KEY_FILE,
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

# Fallback si la variable process n'est pas injectee dans le service runner.
if ([string]::IsNullOrWhiteSpace($KeyFile)) {
  $KeyFile = [Environment]::GetEnvironmentVariable('AGE_KEY_FILE', 'Machine')
}

if ([string]::IsNullOrWhiteSpace($KeyFile)) {
  throw "AGE_KEY_FILE est vide (process + machine). Definir la variable machine ou vars.AGE_KEY_FILE."
}
if (-not (Test-Path $KeyFile)) { throw "AGE key introuvable: $KeyFile" }
if (-not (Test-Path $InputFile)) { throw "Input introuvable: $InputFile" }

New-Item -ItemType Directory -Force -Path (Split-Path $OutputFile) | Out-Null
& "$AgeExe" --decrypt --identity $KeyFile --output $OutputFile $InputFile
if ($LASTEXITCODE -ne 0) { throw "Echec decrypt: $InputFile" }
