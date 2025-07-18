@echo off
REM =====================================================
REM Doctorate Grading Database Setup Script (Windows)
REM Cross-platform setup automation
REM =====================================================

echo 🎓 Doctorate Grading Database Setup
echo ====================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Run the main setup script
echo 🚀 Starting database setup...
node scripts\setup.js

REM Check if setup was successful
if %errorlevel% equ 0 (
    echo.
    echo 🎉 Setup completed successfully!
    echo.
    echo Next steps:
    echo 1. Open index.html in VS Code Live Server
    echo 2. The database is ready at: db\doctorate.sqlite
    echo 3. Check db\README.md for usage documentation
    echo.
) else (
    echo.
    echo ❌ Setup failed. Please check the error messages above.
    pause
    exit /b 1
)

pause