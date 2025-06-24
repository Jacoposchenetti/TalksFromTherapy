# EmoAtlas Sentiment Analysis - Quick Start Guide 🌸

## ✅ Implementation Status
**COMPLETED** - EmoAtlas emotional analysis has been fully integrated into TalksFromTherapy!

## 🎯 What's New
- **Emotional Flower Visualization**: Interactive visualization of 8 core emotions with statistical significance
- **Multi-Session Analysis**: Analyze emotions across multiple selected sessions
- **Combined Analysis**: Aggregate emotion patterns across therapy sessions
- **Integrated UI**: Seamlessly integrated into the existing Analysis tab

## 🚀 Quick Setup

### 1. Install EmoAtlas Environment
Run the setup script for your platform:

**Windows:**
```bash
setup-emoatlas.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x setup-emoatlas.sh
./setup-emoatlas.sh
```

### 2. Set Environment Variable
Add to your `.env.local`:
```
EMOATLAS_PYTHON_PATH=emoatlas_env/Scripts/python.exe  # Windows
# or
EMOATLAS_PYTHON_PATH=emoatlas_env/bin/python          # Unix/Mac
```

### 3. Start Development Server
```bash
npm run dev
```

## 🌸 How to Use

### 1. Navigate to Patient Analysis
- Go to **Patients** → Select a patient → **Analysis**

### 2. Select Sessions
- In the sidebar, check the sessions you want to analyze
- Sessions must have transcripts to be analyzed

### 3. Access Sentiment Analysis
- Click on the **"Sentiment Analysis"** tab (Heart icon)
- The tab is the third slide in the analysis interface

### 4. Run Analysis
- Click **"Avvia Analisi Emotiva"** button
- Wait for processing (10-30 seconds depending on text length)

### 5. View Results
- **Emotional Flower**: Visual representation of 8 emotions with Z-scores
- **Combined Analysis**: Overall emotional pattern across all selected sessions
- **Individual Sessions**: Emotion breakdown per session (if multiple selected)
- **Statistics**: Word count, significance levels, and analysis metadata

## 📊 Understanding the Results

### Emotional Flower Visualization
Each "petal" represents one of Plutchik's 8 core emotions:
- 🟡 **Gioia** (Joy) - Happiness, pleasure, satisfaction
- 🟢 **Fiducia** (Trust) - Acceptance, confidence, security  
- ⚫ **Paura** (Fear) - Anxiety, worry, terror
- 🟠 **Sorpresa** (Surprise) - Amazement, wonder, astonishment
- 🔵 **Tristezza** (Sadness) - Grief, sorrow, melancholy
- 🟣 **Disgusto** (Disgust) - Revulsion, loathing, aversion
- 🔴 **Rabbia** (Anger) - Rage, irritation, fury
- 🟦 **Anticipazione** (Anticipation) - Expectation, hope, vigilance

### Z-Score Interpretation
- **|Z| > 1.96**: Statistically significant (p < 0.05) - shown in full color
- **|Z| < 1.96**: Not significant - shown in gray/faded
- **Positive Z**: Emotion is over-represented compared to baseline
- **Negative Z**: Emotion is under-represented compared to baseline

### Valence Score
- **Positive (+)**: Overall positive emotional tone
- **Negative (-)**: Overall negative emotional tone  
- **Neutral (0)**: Balanced emotional tone

## 🔧 Technical Architecture

### Components
- **`SentimentAnalysis`**: Main analysis interface component
- **`EmotionVisualizer`**: Emotional flower visualization component
- **`EmoAtlasService`**: Python integration service
- **`/api/emotion-analysis`**: Analysis API endpoint

### Python Backend
- **`emotion-processor.py`**: Core EmoAtlas integration script
- **`test-emoatlas.py`**: Installation verification script
- **Virtual Environment**: Isolated Python dependencies

### Integration Points
- **Analysis Page**: Tab 3 in patient analysis interface
- **Session Selection**: Works with existing session selection system
- **Multi-Session Support**: Analyzes individual and combined sessions

## 🛠️ Troubleshooting

### Python Environment Issues
```bash
# Test EmoAtlas installation
python scripts/test-emoatlas.py

# Reinstall dependencies
pip install -r requirements-python.txt

# Check spaCy model
python -c "import spacy; spacy.load('it_core_news_lg')"
```

### API Errors
- Check browser console for detailed error messages
- Verify sessions have transcripts
- Ensure Python environment is activated
- Check `EMOATLAS_PYTHON_PATH` environment variable

### Common Issues
1. **"No transcripts found"**: Select sessions with completed transcriptions
2. **"Python script error"**: Check Python path and virtual environment
3. **"Analysis timeout"**: Very long texts may need timeout adjustment

## 📈 Clinical Applications

### Therapy Progress Monitoring
- Track emotional evolution across sessions
- Identify dominant emotional patterns
- Monitor therapy effectiveness

### Crisis Detection
- Significant increases in fear, sadness, or anger
- Decreased trust or joy over time
- Rapid emotional pattern changes

### Treatment Planning
- Target specific emotional imbalances
- Measure intervention effectiveness
- Adjust therapeutic approach based on data

## 🔮 Future Enhancements

### Planned Features
- **Historical Trends**: Line charts showing emotion changes over time
- **Comparative Analysis**: Compare with population baselines
- **Export Reports**: PDF reports with emotional insights
- **Real-time Analysis**: Process transcripts as they're created

### Advanced Analytics
- **Correlation Analysis**: Link emotions to therapy outcomes
- **Predictive Modeling**: Predict therapy success based on emotional patterns
- **Custom Lexicons**: Domain-specific emotional vocabularies

## 📚 Resources

### Scientific Background
- **EmoAtlas Paper**: [Behavior Research Methods (2025)](https://doi.org/10.3758/s13428-024-02553-7)
- **Plutchik's Theory**: Foundation of 8 core emotions
- **Z-Score Analysis**: Statistical significance testing

### Technical Documentation
- **EmoAtlas GitHub**: https://github.com/MassimoStel/emoatlas
- **spaCy Documentation**: https://spacy.io/
- **NLTK Resources**: https://www.nltk.org/

---

**🌸 Emotional Analysis is now live in TalksFromTherapy!**

Ready to gain deeper insights into your therapy sessions with scientific-grade emotional analysis.
