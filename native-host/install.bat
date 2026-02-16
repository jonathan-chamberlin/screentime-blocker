@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Brainrot Blocker - Native Host Installer
echo ========================================
echo.

set /p EXTENSION_ID="Enter your Chrome extension ID (from chrome://extensions): "

if "%EXTENSION_ID%"=="" (
    echo Error: Extension ID cannot be empty
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "WRAPPER_PATH=%SCRIPT_DIR%host_wrapper.bat"
set "WRAPPER_PATH_JSON=%WRAPPER_PATH:\=\\%"
set "MANIFEST_PATH=%SCRIPT_DIR%com.brainrotblocker.native.json"

echo.
echo Creating manifest file...

(
echo {
echo   "name": "com.brainrotblocker.native",
echo   "description": "Brainrot Blocker - Desktop App Detection",
echo   "path": "!WRAPPER_PATH_JSON!",
echo   "type": "stdio",
echo   "allowed_origins": ["chrome-extension://%EXTENSION_ID%/"]
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
    echo Extension ID: %EXTENSION_ID%
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
