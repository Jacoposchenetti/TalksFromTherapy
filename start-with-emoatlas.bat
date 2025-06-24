@echo off
echo 🌸 Activating EmoAtlas Environment for TalksFromTherapy
echo ===================================================

cd "C:\Users\andre\OneDrive - Politecnico di Milano\Desktop\Projects\TalksFromTherapy\TalksFromTherapy"

echo 🔧 Activating virtual environment...
call emoatlas_env\Scripts\activate.bat

echo 🌍 Setting environment variable...
set EMOATLAS_PYTHON_PATH=C:\Users\andre\OneDrive - Politecnico di Milano\Desktop\Projects\TalksFromTherapy\TalksFromTherapy\emoatlas_env\Scripts\python.exe

echo ✅ Environment ready!
echo 📝 You can now run: npm run dev

echo.
echo 🧪 Quick test:
python -c "from emoatlas import EmoScores; print('✅ EmoAtlas is ready!')"

echo.
echo ⚡ Starting Next.js development server...
npm run dev
