@echo off
title SplitEasy Project Setup
color 0A

echo.
echo  ███████╗██████╗ ██╗     ██╗████████╗███████╗ █████╗ ███████╗██╗   ██╗
echo  ██╔════╝██╔══██╗██║     ██║╚══██╔══╝██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝
echo  ███████╗██████╔╝██║     ██║   ██║   █████╗  ███████║███████╗ ╚████╔╝ 
echo  ╚════██║██╔═══╝ ██║     ██║   ██║   ██╔══╝  ██╔══██║╚════██║  ╚██╔╝  
echo  ███████║██║     ███████╗██║   ██║   ███████╗██║  ██║███████║   ██║   
echo  ╚══════╝╚═╝     ╚══════╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   
echo.
echo                    Modern Expense Splitting Application
echo.
echo ================================================================================
echo.

REM Check Node.js
echo [1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Choose the LTS version and restart this script after installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js is installed: %NODE_VERSION%
echo.

REM Install dependencies
echo [2/3] Installing project dependencies...
echo.

echo Installing backend dependencies...
cd backend
if not exist "node_modules" (
    npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        echo Try running as Administrator or check your internet connection
        pause
        exit /b 1
    )
)
echo ✅ Backend dependencies installed
cd ..

echo.
echo Installing React frontend dependencies...
cd frontend-react
if not exist "node_modules" (
    npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install React dependencies  
        echo Try running as Administrator or check your internet connection
        pause
        exit /b 1
    )
)
echo ✅ React dependencies installed
cd ..

echo.
echo [3/3] Setup complete! 🎉
echo.
echo ================================================================================
echo                                NEXT STEPS
echo ================================================================================
echo.
echo You need to start TWO servers:
echo.
echo 📋 STEP 1: Start the Backend Server
echo    Open a NEW Command Prompt window and run:
echo    cd "%CD%\backend"
echo    npm start
echo.
echo 📋 STEP 2: Start the React Frontend  
echo    Open ANOTHER Command Prompt window and run:
echo    cd "%CD%\frontend-react"
echo    npm run dev
echo.
echo 🌐 STEP 3: Access the Application
echo    React App:    http://localhost:5173
echo    Backend API:  http://localhost:8000
echo.
echo ================================================================================
echo.
echo 💡 TIP: Keep both Command Prompt windows open while using the application
echo 💡 TIP: Press Ctrl+C in each window to stop the servers
echo.
echo Happy expense splitting! 💰
pause