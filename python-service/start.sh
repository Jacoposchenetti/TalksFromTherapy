#!/bin/bash
# Startup script for BERTopic Python service

echo "🐍 Starting BERTopic Analysis Service..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    exit 1
fi

# Navigate to python service directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing requirements..."
pip install -r requirements.txt

# Start the service
echo "🚀 Starting BERTopic service on http://localhost:8000"
echo "📊 Service will be available for topic modeling analysis"
echo "⏹️  Press Ctrl+C to stop the service"
echo ""

python main.py
