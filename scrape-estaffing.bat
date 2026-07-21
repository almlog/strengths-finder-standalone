@echo off
cd /d "%~dp0"
echo.
echo ============================================
echo  e-staffing scraper  (scrape-estaffing.js)
echo ============================================
echo.
npm run scrape:estaffing %*
echo.
if %ERRORLEVEL% == 0 (
  echo [OK] Done. Check docs/e-staffing/ for the CSV.
) else (
  echo [ERROR] Script failed. See log above.
)
echo.
pause
