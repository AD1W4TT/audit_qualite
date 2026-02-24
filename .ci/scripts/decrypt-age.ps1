[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [string]$KeyFile = $env:AGE_KEY_FILE
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command age -ErrorAction SilentlyContinue)) {
  throw "age n'est pas installe ou non present dans le PATH"
}

if ([string]::IsNullOrWhiteSpace($KeyFile)) { throw "AGE_KEY_FILE est vide" }
if (-not (Test-Path $KeyFile)) { throw "AGE key introuvable: $KeyFile" }
if (-not (Test-Path $InputFile)) { throw "Input introuvable: $InputFile" }

New-Item -ItemType Directory -Force -Path (Split-Path $OutputFile) | Out-Null
& age --decrypt --identity $KeyFile --output $OutputFile $InputFile
if ($LASTEXITCODE -ne 0) { throw "Echec decrypt: $InputFile" }
