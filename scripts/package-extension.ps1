param(
  [string]$Version = "",
  [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$extensionDir = Join-Path $root "extension"
$manifestPath = Join-Path $extensionDir "manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $manifestPath"
}

if (-not (Test-Path (Join-Path $extensionDir "config.js"))) {
  Write-Warning "extension/config.js is missing. Packaging will continue with config.default.js fallback and leaderboard auth disabled."
}

$manifest = Get-Content $manifestPath | ConvertFrom-Json
$resolvedVersion = if ($Version) { $Version } else { $manifest.version }

$outDir = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$zipPath = Join-Path $outDir ("brainrot-blocker-v{0}.zip" -f $resolvedVersion)
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Push-Location $extensionDir
try {
  Compress-Archive -Path * -DestinationPath $zipPath -Force
}
finally {
  Pop-Location
}

Write-Host "Created package: $zipPath"

