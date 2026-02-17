param(
  [string]$ExtensionDir = "extension",
  [string]$PrivacyPolicyPath = "PRIVACY_POLICY.md"
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
  $script:HasFail = $true
}

function Warn($msg) {
  Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Pass($msg) {
  Write-Host "[PASS] $msg" -ForegroundColor Green
}

$script:HasFail = $false
$root = Split-Path -Parent $PSScriptRoot
$extPath = Join-Path $root $ExtensionDir
$manifestPath = Join-Path $extPath "manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $manifestPath"
}

$manifest = Get-Content $manifestPath | ConvertFrom-Json

if ($manifest.manifest_version -ne 3) { Fail "Manifest version must be 3." } else { Pass "Manifest version is MV3." }
if (-not $manifest.name -or $manifest.name -match "\[phase|\[dev|test") { Fail "Manifest name looks like a dev/test name." } else { Pass "Manifest name looks production-ready." }
if (-not $manifest.version -or $manifest.version -notmatch "^\d+\.\d+\.\d+$") { Warn "Manifest version does not follow x.y.z format." } else { Pass "Manifest version format looks good." }

$iconPath128 = Join-Path $extPath "icon128.png"
if (-not (Test-Path $iconPath128)) {
  Fail "icon128.png is missing."
} else {
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromFile($iconPath128)
  try {
    if ($img.Width -eq 128 -and $img.Height -eq 128) {
      Pass "icon128.png is 128x128."
    } else {
      Fail "icon128.png must be 128x128. Found $($img.Width)x$($img.Height)."
    }
  } finally {
    $img.Dispose()
  }
}

$allFiles = Get-ChildItem $extPath -Recurse -File
$scanFiles = $allFiles | Where-Object {
  $_.FullName -notmatch '\\tests\\' -and
  $_.Name -ne 'config.js.example'
}
$mergeMarkers = $scanFiles | Select-String -Pattern '^(<<<<<<<|=======|>>>>>>>)' -SimpleMatch
if ($mergeMarkers) { Fail "Merge conflict markers found in extension files." } else { Pass "No merge conflict markers found." }

$remoteScriptRefs = $scanFiles | Where-Object { $_.Extension -eq ".html" } | Select-String -Pattern '<script[^>]+src\s*=\s*["'']https?://'
if ($remoteScriptRefs) { Fail "Remote JS script references found in extension HTML." } else { Pass "No remote JS script references found." }

$localhostRefs = $scanFiles | Select-String -Pattern 'http://localhost|127\.0\.0\.1'
if ($localhostRefs) { Warn "Localhost references found. Confirm they are not in release config." } else { Pass "No localhost references found in extension files." }

if (Test-Path (Join-Path $extPath "config.js")) {
  $configContent = Get-Content (Join-Path $extPath "config.js") -Raw
  if ($configContent -match "localhost") {
    Warn "extension/config.js contains localhost. package-extension.ps1 will sanitize unless -IncludeLocalConfig is used."
  } else {
    Pass "extension/config.js does not contain localhost."
  }
} else {
  Warn "extension/config.js is missing. Fallback config will be used."
}

$privacyPath = Join-Path $root $PrivacyPolicyPath
if (-not (Test-Path $privacyPath)) {
  Fail "Privacy policy file not found at $PrivacyPolicyPath."
} else {
  Pass "Privacy policy file exists at $PrivacyPolicyPath."
}

$requiredPerms = @("declarativeNetRequest", "storage", "tabs")
$missingPerms = @()
foreach ($perm in $requiredPerms) {
  if (-not ($manifest.permissions -contains $perm)) {
    $missingPerms += $perm
  }
}
if ($missingPerms.Count -gt 0) {
  Warn "Expected permissions not found: $($missingPerms -join ', ')"
} else {
  Pass "Core permissions are present."
}

if ($script:HasFail) {
  Write-Host ""
  Write-Host "Chrome Web Store preflight failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Chrome Web Store preflight passed (with warnings if shown)." -ForegroundColor Green
