# Use Python slim image instead of full
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download Spacy model (only if needed)
RUN python -m spacy download it_core_news_sm

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
