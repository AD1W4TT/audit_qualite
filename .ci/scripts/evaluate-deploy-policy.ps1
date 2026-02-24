[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Owner,
  [Parameter(Mandatory=$true)][string]$Repo,
  [Parameter(Mandatory=$true)][string]$Sha,
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$OwnerLogin,
  [Parameter(Mandatory=$true)][string]$SecondDevLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Policy source moved to promote-to-main workflow."
Write-Host "For push on main, deployment is allowed only after pre-main manual promotion."

if ($env:GITHUB_OUTPUT) {
  "author_login=prevalidated" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "policy=pre-main-manual" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "manual_required=false" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "can_deploy_auto=true" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
}
