@echo off
echo 🧪 Testing EmoAtlas Italian Language Support
echo ==========================================

REM Activate the virtual environment
set VENV_PATH=%~dp0emoatlas_env
if exist "%VENV_PATH%\Scripts\activate.bat" (
    echo ✅ Activating EmoAtlas virtual environment...
    call "%VENV_PATH%\Scripts\activate.bat"
) else (
    echo ❌ Virtual environment not found at %VENV_PATH%
    echo Please run setup-emoatlas.bat first
    pause
    exit /b 1
)

REM Check Python path
echo 🐍 Python executable: %VENV_PATH%\Scripts\python.exe

REM Run the Italian test script
echo 🇮🇹 Running Italian emotion analysis test...
echo.
"%VENV_PATH%\Scripts\python.exe" scripts\test-italian-emotions.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Italian language test PASSED!
    echo EmoAtlas is ready to analyze Italian therapy transcripts.
) else (
    echo.
    echo ❌ Italian language test FAILED!
    echo Please check the error messages above.
)

echo.
pause
