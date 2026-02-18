param(
  [string]$TargetName = 'Brainrot Blocker'
)

$ErrorActionPreference = 'SilentlyContinue'

function Add-IfValidId {
  param(
    [System.Collections.Generic.HashSet[string]]$Set,
    [string]$Id
  )
  if ($Id -and $Id -match '^[a-z]{32}$') {
    $null = $Set.Add($Id)
  }
}

$ids = [System.Collections.Generic.HashSet[string]]::new()

$browserRoots = @(
  "$env:LOCALAPPDATA\Google\Chrome\User Data",
  "$env:LOCALAPPDATA\Comet\User Data",
  "$env:LOCALAPPDATA\Chromium\User Data",
  "$env:LOCALAPPDATA\Microsoft\Edge\User Data",
  "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"
)

foreach ($root in $browserRoots) {
  if (-not (Test-Path $root)) { continue }

  $profiles = Get-ChildItem -Path $root -Directory | Where-Object {
    $_.Name -eq 'Default' -or $_.Name -like 'Profile *'
  }

  foreach ($profile in $profiles) {
    $preferencesPath = Join-Path $profile.FullName 'Preferences'
    if (-not (Test-Path $preferencesPath)) { continue }

    try {
      $preferences = Get-Content $preferencesPath -Raw | ConvertFrom-Json -Depth 100
      $settings = $preferences.extensions.settings
      if (-not $settings) { continue }

      foreach ($prop in $settings.PSObject.Properties) {
        $id = $prop.Name
        $entry = $prop.Value

        $manifestName = ''
        $pathHint = ''

        try { $manifestName = [string]$entry.manifest.name } catch {}
        try { $pathHint = [string]$entry.path } catch {}

        if ($manifestName -like "*$TargetName*" -or
            $pathHint -match 'brainrot|screentime-blocker') {
          Add-IfValidId -Set $ids -Id $id
        }
      }
    } catch {
      # Ignore profile parse errors.
    }
  }
}

# Fallback: read bundled manifest if it already has allowed_origins
$hostManifest = Join-Path $PSScriptRoot 'com.brainrotblocker.native.json'
if (Test-Path $hostManifest) {
  try {
    $manifest = Get-Content $hostManifest -Raw | ConvertFrom-Json
    foreach ($origin in ($manifest.allowed_origins | ForEach-Object { [string]$_ })) {
      if ($origin -match '^chrome-extension://([a-z]{32})/$') {
        Add-IfValidId -Set $ids -Id $Matches[1]
      }
    }
  } catch {
    # Ignore manifest parse errors.
  }
}

$ids | Sort-Object | ForEach-Object { Write-Output $_ }

