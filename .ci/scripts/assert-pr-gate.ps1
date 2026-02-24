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

function Get-PropValue {
  param(
    [Parameter(Mandatory=$true)][AllowNull()][object]$Object,
    [Parameter(Mandatory=$true)][string]$Name
  )

  if ($null -eq $Object) { return $null }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $null }
  return $prop.Value
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
if (-not $prs -or $prs.Count -eq 0) {
  throw "Commit $Sha sur main non lie a une PR. Deploiement refuse."
}

$pr = $prs | Where-Object { -not [string]::IsNullOrWhiteSpace((Get-PropValue -Object $_ -Name 'merged_at')) } | Select-Object -First 1
if (-not $pr) { throw "Aucune PR mergee associee au commit $Sha." }

$prNumber = Get-PropValue -Object $pr -Name 'number'
if ($null -eq $prNumber) { throw "Numero de PR introuvable dans la reponse GitHub." }

$prUser = Get-PropValue -Object $pr -Name 'user'
$prAuthor = Get-PropValue -Object $prUser -Name 'login'

$reviews = @(Invoke-GitHubApi -Uri "https://api.github.com/repos/$Owner/$Repo/pulls/$prNumber/reviews?per_page=100")

if ($reviews.Count -eq 1) {
  $msg = Get-PropValue -Object $reviews[0] -Name 'message'
  $stateProbe = Get-PropValue -Object $reviews[0] -Name 'state'
  if (-not [string]::IsNullOrWhiteSpace($msg) -and [string]::IsNullOrWhiteSpace($stateProbe)) {
    throw "Reponse reviews GitHub inattendue: $msg"
  }
}

$approvers = @{}
foreach ($review in $reviews) {
  $state = Get-PropValue -Object $review -Name 'state'
  $reviewUser = Get-PropValue -Object $review -Name 'user'
  $reviewer = Get-PropValue -Object $reviewUser -Name 'login'

  if ($state -eq "APPROVED" -and -not [string]::IsNullOrWhiteSpace($reviewer) -and $reviewer -ne $prAuthor) {
    $approvers[$reviewer] = $true
  }
}

if ($approvers.Count -lt $MinApprovals) {
  throw "PR #$prNumber sans approbation externe suffisante (minimum=$MinApprovals)."
}

Write-Host "Gate OK: PR #$prNumber, approbateurs: $($approvers.Keys -join ', ')"
