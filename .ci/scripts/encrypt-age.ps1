[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [string]$RecipientsFile = ".ci/age-recipients.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command age -ErrorAction SilentlyContinue)) {
  throw "age n'est pas installe ou non present dans le PATH"
}

if (-not (Test-Path $InputFile)) { throw "Input introuvable: $InputFile" }
if (-not (Test-Path $RecipientsFile)) { throw "Recipients file introuvable: $RecipientsFile" }

$recipients = Get-Content $RecipientsFile | Where-Object { $_ -and -not $_.StartsWith('#') }
if (-not $recipients -or $recipients.Count -eq 0) {
  throw "Aucun recipient age dans $RecipientsFile"
}

New-Item -ItemType Directory -Force -Path (Split-Path $OutputFile) | Out-Null
$args = @()
foreach ($r in $recipients) { $args += @('--recipient', $r) }
$args += @('--output', $OutputFile, $InputFile)
& age @args
if ($LASTEXITCODE -ne 0) { throw "Echec encrypt: $InputFile" }
