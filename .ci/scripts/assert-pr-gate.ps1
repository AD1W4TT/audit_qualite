[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Owner,
  [Parameter(Mandatory=$true)][string]$Repo,
  [Parameter(Mandatory=$true)][string]$Sha,
  [Parameter(Mandatory=$true)][string]$Token,
  [int]$MinApprovals = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Harden TLS defaults for Windows PowerShell runners.
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
  "User-Agent" = "cicd-pr-gate"
}

function Invoke-GitHubApi {
  param(
    [Parameter(Mandatory=$true)][string]$Uri
  )

  $maxAttempts = 5
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      return Invoke-RestMethod -Headers $headers -Method GET -Uri $Uri -TimeoutSec 60
    }
    catch {
      $message = $_.Exception.Message
      if ($attempt -ge $maxAttempts) {
        throw "Echec appel GitHub API apres $maxAttempts tentatives sur $Uri : $message"
      }
      $delay = [Math]::Min(30, [Math]::Pow(2, $attempt))
      Write-Warning "Appel GitHub API en echec (tentative $attempt/$maxAttempts): $message"
      Start-Sleep -Seconds $delay
    }
  }
}

$prs = @(Invoke-GitHubApi -Uri "https://api.github.com/repos/$Owner/$Repo/commits/$Sha/pulls?per_page=100")
if (-not $prs -or $prs.Count -eq 0) { throw "Commit $Sha sur main non lie a une PR. Deploiement refuse." }

$pr = $prs | Where-Object { $_.merged_at } | Select-Object -First 1
if (-not $pr) { throw "Aucune PR mergee associee au commit $Sha." }

$reviews = @(Invoke-GitHubApi -Uri "https://api.github.com/repos/$Owner/$Repo/pulls/$($pr.number)/reviews?per_page=100")

$approvers = @{}
foreach ($review in $reviews) {
  if ($review.state -eq "APPROVED" -and $review.user.login -ne $pr.user.login) {
    $approvers[$review.user.login] = $true
  }
}

if ($approvers.Count -lt $MinApprovals) {
  throw "PR #$($pr.number) sans approbation externe suffisante (minimum=$MinApprovals)."
}

Write-Host "Gate OK: PR #$($pr.number), approbateurs: $($approvers.Keys -join ', ')"

