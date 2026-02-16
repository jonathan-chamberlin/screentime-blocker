#!/usr/bin/bash

# Manual testing script for all three phases using existing browser scripts

echo "==================================================================="
echo "MANUAL VERIFICATION: Phases 8, 9, 10"
echo "==================================================================="
echo ""

# Phase 8: Check constants.js directly
echo "Phase 8: Expanded Site Lists"
echo "-------------------------------------------------------------------"
cd /c/Repositories\ for\ Git/screen-time-blocker/screentime-blocker-phase8

echo "✓ Checking blocked sites count..."
blocked_count=$(grep -A200 "rewardSites:" extension/constants.js | grep -o "\.com" | wc -l)
echo "  Found $blocked_count blocked sites (target: 50+)"

echo "✓ Checking for specific new sites..."
for site in "cnn.com" "amazon.com" "steampowered.com" "netflix.com"; do
  if grep -q "$site" extension/constants.js; then
    echo "  ✓ $site found"
  else
    echo "  ✗ $site MISSING"
  fi
done

echo "✓ Checking music/production sites..."
music_count=$(grep -A50 "Music & Production" extension/constants.js 2>/dev/null | grep -o "\.com" | wc -l)
echo "  Found $music_count music sites (target: 15+)"

for site in "ableton.com" "spotify.com" "soundcloud.com"; do
  if grep -q "$site" extension/constants.js; then
    echo "  ✓ $site found"
  else
    echo "  ✗ $site MISSING"
  fi
done

echo ""
echo "Phase 9: Application Blocking"
echo "-------------------------------------------------------------------"
cd /c/Repositories\ for\ Git/screen-time-blocker/screentime-blocker-phase9

echo "✓ Checking native host blocking code..."
if grep -q "closeApp" native-host/brainrot-native-host.js; then
  echo "  ✓ closeApp command handler found in native host"
else
  echo "  ✗ closeApp handler MISSING"
fi

echo "✓ Checking background.js message handler..."
if grep -q "blockedAppDetected" extension/background.js; then
  echo "  ✓ blockedAppDetected handler found"
else
  echo "  ✗ blockedAppDetected handler MISSING"
fi

echo "✓ Checking settings UI..."
if grep -q "Blocked Applications" extension/settings.html; then
  echo "  ✓ Blocked Applications section found"
else
  echo "  ✗ Blocked Applications section MISSING"
fi

if grep -q "Steam" extension/constants.js; then
  echo "  ✓ Steam in default apps list"
else
  echo "  ✗ Steam MISSING"
fi

echo ""
echo "Phase 10: Unified Settings Save"
echo "-------------------------------------------------------------------"
cd /c/Repositories\ for\ Git/screen-time-blocker/screentime-blocker-phase10

echo "✓ Checking save banner HTML..."
if grep -q 'id="save-banner"' extension/settings.html; then
  echo "  ✓ Save banner HTML found"
else
  echo "  ✗ Save banner MISSING"
fi

echo "✓ Checking banner CSS..."
if grep -q ".save-banner" extension/settings.css; then
  echo "  ✓ Save banner styles found"
else
  echo "  ✗ Save banner styles MISSING"
fi

echo "✓ Checking if individual save buttons removed..."
save_btn_count=$(grep -o 'class="save-btn"' extension/settings.html | wc -l)
echo "  Found $save_btn_count individual save buttons (should be 0)"

echo "✓ Checking change detection logic..."
if grep -q "hasUnsavedChanges" extension/settings.js; then
  echo "  ✓ Change detection logic found"
else
  echo "  ✗ Change detection logic MISSING"
fi

echo ""
echo "==================================================================="
echo "VERIFICATION COMPLETE"
echo "==================================================================="
