@echo off
cd /d "%~dp0"
echo.
echo ============================================
echo  e-staffing Login Browser
echo ============================================
echo.
echo Chrome will open. Please log in manually.
echo The browser will close automatically after login.
echo.
npm run launch:estaffing
echo.
if %ERRORLEVEL% == 0 (
  echo [OK] Login session saved. You can now run scrape-estaffing.bat
) else (
  echo [ERROR] See log above.
)
echo.
pause
