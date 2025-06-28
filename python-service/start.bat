@echo off
REM SREM Check if emoatlas environment exists
if exist "..\\emoatlas_env\\Scripts\\python.exe" (
    echo 🔧 Using emoatlas virtual environment...
    set "PYTHON_EXE=..\emoatlas_env\Scripts\python.exe"
    set "PIP_EXE=..\emoatlas_env\Scripts\pip.exe"
) else if exist "..\\.venv\\Scripts\\python.exe" (
    echo 🔧 Using existing project virtual environment...
    set "PYTHON_EXE=..\.venv\Scripts\python.exe"
    set "PIP_EXE=..\.venv\Scripts\pip.exe"
) else if exist "venv\\Scripts\\python.exe" (
    echo 🔧 Using local virtual environment...
    set "PYTHON_EXE=venv\Scripts\python.exe"
    set "PIP_EXE=venv\Scripts\pip.exe"
) else (
    echo 📦 Creating local virtual environment...
    python -m venv venv
    set "PYTHON_EXE=venv\Scripts\python.exe"
    set "PIP_EXE=venv\Scripts\pip.exe"
    echo 📥 Installing requirements...
    %PIP_EXE% install -r requirements.txt
) Topic Analysis Python service on Windows

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

REM Check if project-level virtual environment exists
if exist "..\\.venv\\Scripts\\python.exe" (
    echo � Using existing project virtual environment...
    set "PYTHON_EXE=..\.venv\Scripts\python.exe"
    set "PIP_EXE=..\.venv\Scripts\pip.exe"
) else if exist "venv\\Scripts\\python.exe" (
    echo 🔧 Using local virtual environment...
    set "PYTHON_EXE=venv\Scripts\python.exe"
    set "PIP_EXE=venv\Scripts\pip.exe"
) else (
    echo 📦 Creating local virtual environment...
    python -m venv venv
    set "PYTHON_EXE=venv\Scripts\python.exe"
    set "PIP_EXE=venv\Scripts\pip.exe"
    echo 📥 Installing requirements...
    %PIP_EXE% install -r requirements.txt
)

REM Start the service
echo 🚀 Starting Topic Analysis service on http://localhost:8001
echo 📊 Service will be available for single-document analysis
echo ⏹️  Press Ctrl+C to stop the service
echo.

%PYTHON_EXE% main.py

pause
