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

$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$prs = Invoke-RestMethod -Headers $headers -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo/commits/$Sha/pulls"
if (-not $prs -or $prs.Count -eq 0) { throw "Commit $Sha sur main non lie a une PR. Deploiement refuse." }

$pr = $prs | Where-Object { $_.merged_at } | Select-Object -First 1
if (-not $pr) { throw "Aucune PR mergee associee au commit $Sha." }

$reviews = Invoke-RestMethod -Headers $headers -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo/pulls/$($pr.number)/reviews"

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
