#!/bin/bash

# EmoAtlas Setup Script for TalksFromTherapy
echo "🌸 Setting up EmoAtlas for Emotional Analysis"
echo "============================================="

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.7+ first."
    exit 1
fi

echo "✅ Python found: $(python --version)"

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python -m venv emoatlas_env

# Activate virtual environment (Windows)
echo "🔧 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source emoatlas_env/Scripts/activate
else
    source emoatlas_env/bin/activate
fi

# Install requirements
echo "⬇️ Installing Python packages..."
pip install --upgrade pip
pip install -r requirements-python.txt

# Install spaCy Italian model
echo "🇮🇹 Installing spaCy Italian language model..."
python -m spacy download it_core_news_lg

# Install NLTK data
echo "📚 Installing NLTK resources..."
python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')"

# Test installation
echo "🧪 Testing EmoAtlas installation..."
python scripts/test-emoatlas.py

echo ""
echo "✅ EmoAtlas setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure to activate the virtual environment when running the Next.js app:"
echo "   Windows: emoatlas_env\\Scripts\\activate"
echo "   Unix/Mac: source emoatlas_env/bin/activate"
echo ""
echo "2. Set the EMOATLAS_PYTHON_PATH environment variable:"
echo "   Windows: set EMOATLAS_PYTHON_PATH=emoatlas_env\\Scripts\\python.exe"
echo "   Unix/Mac: export EMOATLAS_PYTHON_PATH=emoatlas_env/bin/python"
echo ""
echo "3. Start your Next.js development server:"
echo "   npm run dev"
echo ""
echo "🌸 Emotional analysis is now ready!"
