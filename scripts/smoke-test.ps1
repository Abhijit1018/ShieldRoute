param(
  [string]$ServerUrl = "http://localhost:4000",
  [string]$ApiBaseUrl = "http://localhost:4000/api",
  [string]$Phone = ""
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][hashtable]$Body,
    [hashtable]$Headers = @{}
  )

  return Invoke-RestMethod -Method Post -Uri $Uri -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8)
}

function Invoke-JsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{}
  )

  return Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers
}

if ([string]::IsNullOrWhiteSpace($Phone)) {
  $Phone = "9{0:D9}" -f (Get-Random -Minimum 0 -Maximum 1000000000)
}

Write-Host "[1/10] Health check..." -ForegroundColor Cyan
$health = Invoke-JsonGet -Uri "$ServerUrl/health"
Write-Host ("  Service: {0} ({1})" -f $health.service, $health.status) -ForegroundColor DarkGray

Write-Host "[2/10] Send OTP..." -ForegroundColor Cyan
$sendOtp = Invoke-JsonPost -Uri "$ApiBaseUrl/auth/send-otp" -Body @{ phone = $Phone }

if (-not $sendOtp.debug_otp) {
  throw "debug_otp not returned. Ensure NODE_ENV=development for OTP debug flow."
}

Write-Host "[3/10] Verify OTP..." -ForegroundColor Cyan
$verify = Invoke-JsonPost -Uri "$ApiBaseUrl/auth/verify-otp" -Body @{ phone = $Phone; otp = $sendOtp.debug_otp }
$token = $verify.data.token

if (-not $token) {
  throw "Token not received from /auth/verify-otp."
}

$authHeaders = @{ Authorization = "Bearer $token" }

Write-Host "[4/10] Assess onboarding..." -ForegroundColor Cyan
$assessment = Invoke-JsonPost -Uri "$ApiBaseUrl/onboarding/assess" -Headers $authHeaders -Body @{
  zone = "Andheri"
  weeklyHours = 48
  platform = "Zomato"
  yearsActive = 2
  weeklyEarnings = 9000
  peakHours = @("Morning", "Evening")
}

Write-Host "[5/10] Enroll rider + policy..." -ForegroundColor Cyan
$enroll = Invoke-JsonPost -Uri "$ApiBaseUrl/onboarding/enroll" -Headers $authHeaders -Body @{
  name = "Smoke Test Rider"
  platform = "Zomato"
  yearsActive = 2
  zone = "Andheri"
  weeklyHours = 48
  weeklyEarnings = 9000
  peakHours = @("Morning", "Evening")
  selectedPlan = "Standard"
}

Write-Host "[6/10] Read policy + claims..." -ForegroundColor Cyan
$policy = Invoke-JsonGet -Uri "$ApiBaseUrl/policy/mine" -Headers $authHeaders
$claimsBefore = Invoke-JsonGet -Uri "$ApiBaseUrl/claims/mine" -Headers $authHeaders

Write-Host "[7/10] Read public trigger endpoints..." -ForegroundColor Cyan
$live = Invoke-JsonGet -Uri "$ApiBaseUrl/triggers/live"
$feed = Invoke-JsonGet -Uri "$ApiBaseUrl/triggers/feed"

Write-Host "[8/10] Fire manual trigger event..." -ForegroundColor Cyan
$trigger = Invoke-JsonPost -Uri "$ApiBaseUrl/claims/trigger" -Body @{
  zone = "Andheri"
  triggerType = "HeavyRain"
  value = 18
  threshold = 15
  disruptionHours = 3.5
  source = "smoke-test"
}

Write-Host "[9/10] Read claims intelligence..." -ForegroundColor Cyan
$claimsAfter = Invoke-JsonGet -Uri "$ApiBaseUrl/claims/mine" -Headers $authHeaders
$intel = Invoke-JsonGet -Uri "$ApiBaseUrl/claims/intelligence" -Headers $authHeaders

Write-Host "[10/10] Read admin KPIs..." -ForegroundColor Cyan
$kpis = Invoke-JsonGet -Uri "$ApiBaseUrl/admin/kpis" -Headers $authHeaders

Write-Host "" 
Write-Host "Smoke test completed successfully." -ForegroundColor Green
Write-Host ("Phone used: {0}" -f $Phone) -ForegroundColor DarkGray
Write-Host ("Policy: {0}" -f $policy.data.policyNumber) -ForegroundColor DarkGray
Write-Host ("Claims before/after trigger: {0} -> {1}" -f $claimsBefore.data.Count, $claimsAfter.data.Count) -ForegroundColor DarkGray
Write-Host ("Trigger claims created: {0}" -f $trigger.data.claimsCreated) -ForegroundColor DarkGray
Write-Host ("Live zones returned: {0}" -f $live.data.Count) -ForegroundColor DarkGray
Write-Host ("Feed events returned: {0}" -f $feed.data.Count) -ForegroundColor DarkGray
Write-Host ("Intelligence score: {0}" -f $intel.data.personalSafetyScore) -ForegroundColor DarkGray
Write-Host ("Active policies KPI: {0}" -f $kpis.data.totalActivePolicies) -ForegroundColor DarkGray
