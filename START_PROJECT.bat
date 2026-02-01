@echo off
echo ========================================
echo    SplitEasy - Start Project
echo ========================================
echo.

REM Kill existing Node processes
echo Stopping existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done!
echo.

REM Check MongoDB
echo Checking MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo MongoDB service started!
) else (
    echo WARNING: MongoDB service might not be running
    echo If you see connection errors, start MongoDB manually:
    echo   net start MongoDB
)
echo.

REM Start Backend
echo Starting Backend Server...
start "SplitEasy Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Frontend Dev Server...
start "SplitEasy Frontend" cmd /k "cd /d %~dp0frontend-react && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    Servers Starting!
echo ========================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: Check the "SplitEasy Frontend" window for the URL
echo.
echo Check the two command windows for any errors.
echo.
echo Press any key to exit...
pause >nul
