@echo off
echo 🌸 Setting up EmoAtlas for Emotional Analysis
echo =============================================

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.7+ first.
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment
echo 📦 Creating Python virtual environment...
python -m venv emoatlas_env

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call emoatlas_env\Scripts\activate.bat

REM Verify virtual environment is active
echo 🔍 Verifying virtual environment...
python -c "import sys; print('Python path:', sys.executable)"
if not "%VIRTUAL_ENV%"=="" (
    echo ✅ Virtual environment active: %VIRTUAL_ENV%
) else (
    echo ⚠️ Virtual environment may not be active
)

REM Install requirements
echo ⬇️ Installing Python packages...
python -m pip install --upgrade pip

REM Install pandas first (critical dependency)
echo 📊 Installing pandas...
pip install pandas

REM Install other requirements
echo 📦 Installing remaining packages...
pip install -r requirements-python.txt

REM Verify EmoAtlas installation
echo 🔍 Verifying EmoAtlas installation...
python -c "import emoatlas; print('✅ EmoAtlas imported successfully')" || echo "❌ EmoAtlas import failed"

REM Install spaCy Italian model
echo 🇮🇹 Installing spaCy Italian language model...
python -m spacy download it_core_news_lg

REM Install NLTK data
echo 📚 Installing NLTK resources...
python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')"

REM Test installation
echo 🧪 Testing EmoAtlas installation...
python scripts\test-emoatlas.py
if %errorlevel% neq 0 (
    echo ❌ EmoAtlas test failed. Check the errors above.
    echo 🔧 Try running the setup script again or install dependencies manually.
    pause
    exit /b 1
)

echo.
echo ✅ EmoAtlas setup complete!
echo.
echo 📝 Next steps:
echo 1. Activate the virtual environment when running the Next.js app:
echo    emoatlas_env\Scripts\activate.bat
echo.
echo 2. Set the EMOATLAS_PYTHON_PATH environment variable:
echo    set EMOATLAS_PYTHON_PATH=C:\Users\andre\OneDrive - Politecnico di Milano\Desktop\Projects\TalksFromTherapy\TalksFromTherapy\emoatlas_env\Scripts\python.exe
echo.
echo 3. Start your Next.js development server:
echo    npm run dev
echo.
echo 🌸 Emotional analysis is now ready!
pause
