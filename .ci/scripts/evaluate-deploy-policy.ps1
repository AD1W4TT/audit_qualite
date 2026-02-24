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

$protocols = [System.Net.SecurityProtocolType]::Tls12
if ([Enum]::IsDefined([System.Net.SecurityProtocolType], "Tls13")) {
  $protocols = $protocols -bor [System.Net.SecurityProtocolType]::Tls13
}
[System.Net.ServicePointManager]::SecurityProtocol = $protocols
[System.Net.ServicePointManager]::Expect100Continue = $false

$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "cicd-manual-policy"
}

function Invoke-GitHubApi {
  param([Parameter(Mandatory=$true)][string]$Uri)
  $maxAttempts = 5
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      return Invoke-RestMethod -Headers $headers -Method GET -Uri $Uri -TimeoutSec 60
    }
    catch {
      if ($attempt -ge $maxAttempts) { throw }
      Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, $attempt)))
    }
  }
}

$commit = Invoke-GitHubApi -Uri "https://api.github.com/repos/$Owner/$Repo/commits/$Sha"
$authorLogin = "unknown"
if ($commit.author -and $commit.author.login) {
  $authorLogin = [string]$commit.author.login
}

$canDeployAuto = $false
$manualRequired = $true
$policy = "manual-all"

Write-Host "Policy=$policy | Author=$authorLogin | Auto=$canDeployAuto"

if ($env:GITHUB_OUTPUT) {
  "author_login=$authorLogin" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "policy=$policy" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "manual_required=$($manualRequired.ToString().ToLowerInvariant())" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
  "can_deploy_auto=$($canDeployAuto.ToString().ToLowerInvariant())" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
}
