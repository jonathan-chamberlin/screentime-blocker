@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Brainrot Blocker - Native Host Installer
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "DETECT_SCRIPT=%SCRIPT_DIR%detect-extension-ids.ps1"
set "MANIFEST_PATH=%SCRIPT_DIR%com.brainrotblocker.native.json"
set "WRAPPER_PATH=%SCRIPT_DIR%host_wrapper.bat"
set "WRAPPER_PATH_JSON=%WRAPPER_PATH:\=\\%"

set "EXTENSION_IDS="
set "ORIGIN_JSON="
set "DETECTED_COUNT=0"

if exist "%DETECT_SCRIPT%" (
    echo Detecting installed Brainrot Blocker extension ID...
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%DETECT_SCRIPT%"`) do (
        set /a DETECTED_COUNT+=1
        if defined EXTENSION_IDS (
            set "EXTENSION_IDS=!EXTENSION_IDS! %%I"
        ) else (
            set "EXTENSION_IDS=%%I"
        )
        if defined ORIGIN_JSON (
            set "ORIGIN_JSON=!ORIGIN_JSON!, ""chrome-extension://%%I/"""
        ) else (
            set "ORIGIN_JSON=""chrome-extension://%%I/"""
        )
    )
)

if not defined EXTENSION_IDS (
    echo.
    echo Could not auto-detect extension ID.
    set /p MANUAL_EXTENSION_ID="Paste your extension ID (from chrome://extensions): "
    if "!MANUAL_EXTENSION_ID!"=="" (
        echo Error: Extension ID cannot be empty
        pause
        exit /b 1
    )
    set "EXTENSION_IDS=!MANUAL_EXTENSION_ID!"
    set "ORIGIN_JSON=""chrome-extension://!MANUAL_EXTENSION_ID!/"""
) else (
    echo Found !DETECTED_COUNT! extension ID(s): !EXTENSION_IDS!
)

echo.
echo Creating manifest file...

(
echo {
echo   "name": "com.brainrotblocker.native",
echo   "description": "Brainrot Blocker - Desktop App Detection",
echo   "path": "!WRAPPER_PATH_JSON!",
echo   "type": "stdio",
echo   "allowed_origins": [!ORIGIN_JSON!]
echo }
) > "%MANIFEST_PATH%"

echo.
echo Adding registry keys for Chromium-based browsers...

set "REG_SUCCESS=0"

REM Register for Chrome
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.brainrotblocker.native" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Chrome: registered
    set "REG_SUCCESS=1"
)

REM Register for Comet (Perplexity)
REG ADD "HKCU\Software\Comet\NativeMessagingHosts\com.brainrotblocker.native" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Comet: registered
    set "REG_SUCCESS=1"
)

REM Register for Chromium
REG ADD "HKCU\Software\Chromium\NativeMessagingHosts\com.brainrotblocker.native" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Chromium: registered
    set "REG_SUCCESS=1"
)

REM Register for Edge
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.brainrotblocker.native" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Edge: registered
    set "REG_SUCCESS=1"
)

REM Register for Brave
REG ADD "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.brainrotblocker.native" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Brave: registered
    set "REG_SUCCESS=1"
)

if "!REG_SUCCESS!"=="1" (
    echo.
    echo ========================================
    echo Installation successful!
    echo ========================================
    echo Allowed extension IDs: !EXTENSION_IDS!
    echo Manifest path: %MANIFEST_PATH%
    echo.
    echo The native messaging host is now registered.
    echo Restart your browser to use the extension.
    echo ========================================
) else (
    echo.
    echo Error: Failed to add registry keys
    pause
    exit /b 1
)

echo.
pause
