@echo off

echo ========================================
echo Brainrot Blocker - Native Host Uninstaller
echo ========================================
echo.

echo Removing registry keys from all browsers...

REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.brainrotblocker.native" /f >nul 2>&1 && echo   Chrome: removed
REG DELETE "HKCU\Software\Comet\NativeMessagingHosts\com.brainrotblocker.native" /f >nul 2>&1 && echo   Comet: removed
REG DELETE "HKCU\Software\Chromium\NativeMessagingHosts\com.brainrotblocker.native" /f >nul 2>&1 && echo   Chromium: removed
REG DELETE "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.brainrotblocker.native" /f >nul 2>&1 && echo   Edge: removed
REG DELETE "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.brainrotblocker.native" /f >nul 2>&1 && echo   Brave: removed

echo.
echo ========================================
echo Uninstallation complete!
echo ========================================
echo The native messaging host has been removed.
echo ========================================

echo.
pause
