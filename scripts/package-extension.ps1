param(
  [string]$Version = "",
  [string]$OutputDir = "dist",
  [switch]$IncludeLocalConfig,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$extensionDir = Join-Path $root "extension"
$manifestPath = Join-Path $extensionDir "manifest.json"
$stagingDir = Join-Path $root ".build\extension-package"
$preflightScript = Join-Path $root "scripts\cws-preflight.ps1"

if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $manifestPath"
}

if ((-not $SkipPreflight.IsPresent) -and (Test-Path $preflightScript)) {
  Write-Host "Running CWS preflight..."
  & powershell -ExecutionPolicy Bypass -File $preflightScript
  if ($LASTEXITCODE -ne 0) {
    throw "Preflight failed. Fix issues before packaging."
  }
}

$manifest = Get-Content $manifestPath | ConvertFrom-Json
$resolvedVersion = if ($Version) { $Version } else { $manifest.version }

$outDir = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $stagingDir) | Out-Null

if (Test-Path $stagingDir) {
  Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

# Copy extension files to staging, excluding test/dev artifacts.
$excludePatterns = @(
  "tests",
  "test-*.html",
  "*.map"
)

Get-ChildItem $extensionDir -Force | Where-Object {
  $name = $_.Name
  foreach ($pattern in $excludePatterns) {
    if ($name -like $pattern) { return $false }
  }
  return $true
} | ForEach-Object {
  if ($_.PSIsContainer) {
    Copy-Item $_.FullName -Destination $stagingDir -Recurse -Force
  } else {
    Copy-Item $_.FullName -Destination $stagingDir -Force
  }
}

$stagedConfigPath = Join-Path $stagingDir "config.js"
$localConfigPath = Join-Path $extensionDir "config.js"

if ($IncludeLocalConfig.IsPresent -and (Test-Path $localConfigPath)) {
  Copy-Item $localConfigPath $stagedConfigPath -Force
  Write-Warning "Including local extension/config.js in release package."
} else {
  @"
// Generated at packaging time for Chrome Web Store safety.
// Set production values only if you intentionally ship leaderboard/auth.
window.CONFIG = {
  AUTH0_DOMAIN: '',
  AUTH0_CLIENT_ID: '',
  AUTH0_AUDIENCE: '',
  API_BASE_URL: '',
};
"@ | Set-Content -Path $stagedConfigPath -Encoding UTF8
}

$zipPath = Join-Path $outDir ("brainrot-blocker-v{0}.zip" -f $resolvedVersion)
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Push-Location $stagingDir
try {
  Compress-Archive -Path * -DestinationPath $zipPath -Force
}
finally {
  Pop-Location
}

Write-Host "Created package: $zipPath"
