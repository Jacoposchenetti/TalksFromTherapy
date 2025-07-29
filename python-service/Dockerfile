# Use Python slim image instead of full
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download and initialize EmoAtlas data (this is the key!)
RUN echo "🔧 Initializing EmoAtlas data..." && \
    python -c "
import sys
try:
    print('📥 Importing EmoAtlas...')
    from emoatlas import EmoScores
    print('✅ EmoAtlas imported successfully')
    
    print('🇮🇹 Initializing Italian language model...')
    emo = EmoScores(language='italian')
    print('✅ Italian EmoAtlas initialized')
    
    print('🧪 Testing with sample text...')
    result = emo.zscores('Test di inizializzazione EmoAtlas.')
    print(f'✅ Test successful: {result}')
    
    print('🌸 EmoAtlas fully initialized and ready!')
except Exception as e:
    print(f'❌ EmoAtlas initialization failed: {e}')
    sys.exit(1)
"

# Download minimal Spacy model
RUN python -m spacy download it_core_news_sm

# Copy application code
COPY . .

# Remove unnecessary files to reduce size
RUN find /usr/local/lib/python3.11/site-packages -name "*.pyc" -delete && \
    find /usr/local/lib/python3.11/site-packages -name "__pycache__" -delete

# Expose port
EXPOSE 8001

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
