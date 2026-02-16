@echo off

echo ========================================
echo Brainrot Blocker - Native Host Uninstaller
echo ========================================
echo.

echo Removing registry key...

REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.brainrotblocker.native" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Uninstallation successful!
    echo ========================================
    echo The native messaging host has been removed from Chrome.
    echo ========================================
) else (
    echo.
    echo Note: Registry key may not have existed or was already removed.
)

echo.
pause
