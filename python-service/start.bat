@echo off
REM Startup script for Topic Analysis Python service on Windows

echo 🐍 Starting Topic Analysis Service (TF-IDF + NMF)...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Navigate to python service directory
cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo 📥 Installing requirements...
pip install -r requirements.txt

# Start the service
echo 🚀 Starting Topic Analysis service on http://localhost:8001
echo 📊 Service will be available for single-document analysis
echo ⏹️  Press Ctrl+C to stop the service
echo.

python main.py

pause
