# Implementazione EmoAtlas - Analisi del Sentiment Emotivo 🌸

## 🎯 Obiettivo
✅ **Integrare EmoAtlas per l'analisi del sentiment emotivo nelle trascrizioni delle sessioni terapeutiche**

## 🌟 Cos'è EmoAtlas?

### Descrizione
EmoAtlas è una libreria Python avanzata per l'analisi emotiva dei testi che combina:
- **Lessici psicologici** (NRC Emotion Lexicon)
- **Intelligenza artificiale** (spaCy, NLTK)
- **Scienza delle reti** (Textual Forma Mentis Networks)
- **Visualizzazioni statistiche** (Emotional Flowers)

### Caratteristiche Uniche
- 🌸 **Emotional Flowers**: Visualizzazioni a "petali" delle 8 emozioni di Plutchik
- 📊 **Z-scores statistici**: Analisi statistica significativa (p < 0.05)
- 🧠 **Reti cognitive**: Strutture di associazione semantico-emotiva
- 🌍 **Multilingue**: Supporto italiano ed inglese
- 🔬 **Base scientifica**: Pubblicato su Behavior Research Methods (2025)

### 8 Emozioni di Plutchik Analizzate
1. **Joy** (Gioia) - Giallo
2. **Trust** (Fiducia) - Verde
3. **Fear** (Paura) - Nero
4. **Surprise** (Sorpresa) - Arancione
5. **Sadness** (Tristezza) - Blu
6. **Disgust** (Disgusto) - Viola
7. **Anger** (Rabbia) - Rosso
8. **Anticipation** (Anticipazione) - Ciano

## 🎨 Come Può Aiutare TalksFromTherapy

### Vantaggi per Terapeuti
- 📈 **Trend Emotivi**: Tracciare l'evoluzione emotiva del paziente nel tempo
- 🎯 **Focus Terapeutico**: Identificare emozioni dominanti e sottorappresentate
- 📊 **Obiettività**: Analisi quantitativa complementare all'osservazione clinica
- 🔍 **Pattern Recognition**: Riconoscere schemi emotivi ricorrenti
- 📝 **Report Visuali**: Grafici chiari per pazienti e supervisori

### Casi d'Uso Specifici
1. **Monitoraggio Depressione**: Tracciare sadness vs joy nel tempo
2. **Gestione Ansia**: Monitorare fear e anticipation
3. **Sviluppo Fiducia**: Osservare crescita di trust
4. **Elaborazione Trauma**: Analizzare anger e disgust
5. **Progressi Terapeutici**: Visualizzare cambiamenti emotivi

### Esempi Pratici
```python
# Sessione iniziale - paziente depresso
"Mi sento sempre triste, tutto è difficile, non ho speranza"
# EmoAtlas Output: Sadness Z-score: +3.2 (molto significativo)
#                  Joy Z-score: -2.1 (sottorappresentata)

# Sessione dopo 3 mesi
"Oggi ho avuto un momento di gioia, mi sento più fiducioso"  
# EmoAtlas Output: Joy Z-score: +2.4 (miglioramento significativo)
#                  Trust Z-score: +1.8 (crescita positiva)
```

## 🏗️ Architettura di Integrazione

### Struttura Proposta
```
TalksFromTherapy/
├── lib/
│   ├── emoatlas.ts          # Service wrapper TypeScript
│   └── emotion-analysis.ts   # Utility functions
├── scripts/
│   └── emotion-processor.py # Python script per EmoAtlas
├── app/api/
│   └── emotion-analysis/
│       └── route.ts         # API endpoint per analisi
├── components/
│   └── emotion-visualizer.tsx # Componenti UI
└── requirements-python.txt   # Dipendenze Python
```

### Flusso di Analisi
```
Transcript Text
      ↓
Python EmoAtlas Script
      ↓  
JSON Emotion Data
      ↓
Database Storage
      ↓
React Visualization Components
```

## 🔧 Piano di Implementazione Completo

### Fase 1: Setup Ambiente Python (1 giorno)

#### 1.1 Installazione EmoAtlas
```bash
# Creazione environment Python dedicato
python -m venv emoatlas_env
emoatlas_env\Scripts\activate  # Windows

# Installazione EmoAtlas
pip install git+https://github.com/MassimoStel/emoatlas

# Installazione dipendenze spaCy per italiano
python -m spacy download it_core_news_lg

# Installazione NLTK resources  
pip install nltk
python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')"
```

#### 1.2 File Requirements
```python
# requirements-python.txt - Nuovo file
emoatlas>=1.1.0
spacy>=3.4.0
nltk>=3.8.0
pandas>=1.5.0
matplotlib>=3.6.0
numpy>=1.24.0
networkx>=2.8.0
```

#### 1.3 Script di Test
```python
# scripts/test-emoatlas.py - Nuovo file
from emoatlas import EmoScores
import json

def test_emoatlas():
    """Test basic EmoAtlas functionality"""
    try:
        # Initialize for Italian
        emo = EmoScores(language="italian")
        
        # Test text
        text = "Mi sento triste e arrabbiato per quello che è successo oggi."
        
        # Get emotions
        emotions = emo.emotions(text)
        z_scores = emo.zscores(text)
        
        print("✅ EmoAtlas Test Successful!")
        print(f"Emotions: {emotions}")
        print(f"Z-scores: {z_scores}")
        
        return True
    except Exception as e:
        print(f"❌ EmoAtlas Test Failed: {e}")
        return False

if __name__ == "__main__":
    test_emoatlas()
```

### Fase 2: Processore Python per Analisi (1-2 giorni)

#### 2.1 Script Principale di Analisi
```python
# scripts/emotion-processor.py - Nuovo file
import sys
import json
from emoatlas import EmoScores
import argparse
from pathlib import Path

class EmotionProcessor:
    def __init__(self, language="italian"):
        """Initialize EmoAtlas for emotion processing"""
        self.emo = EmoScores(language=language)
        self.language = language
    
    def analyze_text(self, text: str) -> dict:
        """
        Analyze text and return comprehensive emotion data
        
        Args:
            text: Input text to analyze
            
        Returns:
            dict: Complete emotion analysis results
        """
        try:
            # Basic emotion analysis
            emotions = self.emo.emotions(text)
            z_scores = self.emo.zscores(text)
            
            # Statistical significance (|z| > 1.96 = p < 0.05)
            significant_emotions = {
                emotion: score for emotion, score in z_scores.items() 
                if abs(score) > 1.96
            }
            
            # Dominant emotions (top 3 by z-score)
            dominant_emotions = sorted(
                z_scores.items(), 
                key=lambda x: abs(x[1]), 
                reverse=True
            )[:3]
            
            # Emotional valence (positive vs negative)
            positive_emotions = ['joy', 'trust', 'anticipation', 'surprise']
            negative_emotions = ['sadness', 'fear', 'anger', 'disgust']
            
            positive_score = sum(z_scores.get(e, 0) for e in positive_emotions)
            negative_score = sum(abs(z_scores.get(e, 0)) for e in negative_emotions)
            
            valence = positive_score - negative_score
            
            # Build forma mentis network (optional, computationally intensive)
            # network = self.emo.formamentis_network(text)
            
            return {
                'success': True,
                'analysis': {
                    'emotions': emotions,
                    'z_scores': z_scores,
                    'significant_emotions': significant_emotions,
                    'dominant_emotions': dominant_emotions,
                    'emotional_valence': valence,
                    'positive_score': positive_score,
                    'negative_score': negative_score,
                    'language': self.language,
                    'text_length': len(text.split()),
                    'analysis_timestamp': str(pd.Timestamp.now())
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'analysis': None
            }
    
    def analyze_session_transcript(self, transcript: str, session_id: str) -> dict:
        """Analyze a complete therapy session transcript"""
        result = self.analyze_text(transcript)
        
        if result['success']:
            result['session_id'] = session_id
            result['analysis']['session_metadata'] = {
                'word_count': len(transcript.split()),
                'char_count': len(transcript),
                'estimated_duration': len(transcript.split()) / 150  # ~150 words/min speech
            }
        
        return result

def main():
    parser = argparse.ArgumentParser(description='Analyze text emotions with EmoAtlas')
    parser.add_argument('--text', type=str, help='Text to analyze')
    parser.add_argument('--file', type=str, help='File containing text to analyze')
    parser.add_argument('--session-id', type=str, help='Session ID for transcript analysis')
    parser.add_argument('--language', type=str, default='italian', help='Language (italian/english)')
    parser.add_argument('--output', type=str, help='Output file for JSON results')
    
    args = parser.parse_args()
    
    if not args.text and not args.file:
        print("Error: Must provide either --text or --file")
        sys.exit(1)
    
    # Initialize processor
    processor = EmotionProcessor(language=args.language)
    
    # Get text
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        text = args.text
    
    # Analyze
    if args.session_id:
        result = processor.analyze_session_transcript(text, args.session_id)
    else:
        result = processor.analyze_text(text)
    
    # Output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
```

### Fase 3: API Endpoint TypeScript (1 giorno)

#### 3.1 Servizio EmoAtlas Wrapper
```typescript
// lib/emoatlas.ts - Nuovo file
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export interface EmotionAnalysis {
  success: boolean
  analysis?: {
    emotions: Record<string, number>
    z_scores: Record<string, number>
    significant_emotions: Record<string, number>
    dominant_emotions: [string, number][]
    emotional_valence: number
    positive_score: number
    negative_score: number
    language: string
    text_length: number
    analysis_timestamp: string
    session_metadata?: {
      word_count: number
      char_count: number
      estimated_duration: number
    }
  }
  session_id?: string
  error?: string
}

export class EmoAtlasService {
  private pythonEnvPath: string
  private scriptPath: string

  constructor() {
    // Adjust paths based on your setup
    this.pythonEnvPath = process.env.EMOATLAS_PYTHON_PATH || 'python'
    this.scriptPath = path.join(process.cwd(), 'scripts', 'emotion-processor.py')
  }

  async analyzeText(text: string, language: 'italian' | 'english' = 'italian'): Promise<EmotionAnalysis> {
    try {
      // Create temporary file for text (safer than command line args)
      const tempFile = path.join('/tmp', `emotion-text-${Date.now()}.txt`)
      await fs.writeFile(tempFile, text, 'utf-8')

      const command = `${this.pythonEnvPath} ${this.scriptPath} --file "${tempFile}" --language ${language}`
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {}) // Ignore cleanup errors

      if (stderr && !stdout) {
        throw new Error(`Python script error: ${stderr}`)
      }

      const result: EmotionAnalysis = JSON.parse(stdout)
      return result

    } catch (error) {
      console.error('EmoAtlas analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async analyzeSessionTranscript(
    transcript: string, 
    sessionId: string, 
    language: 'italian' | 'english' = 'italian'
  ): Promise<EmotionAnalysis> {
    try {
      const tempFile = path.join('/tmp', `session-${sessionId}-${Date.now()}.txt`)
      await fs.writeFile(tempFile, transcript, 'utf-8')

      const command = `${this.pythonEnvPath} ${this.scriptPath} --file "${tempFile}" --session-id "${sessionId}" --language ${language}`
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 seconds for longer transcripts
        maxBuffer: 1024 * 1024 * 10
      })

      await fs.unlink(tempFile).catch(() => {})

      if (stderr && !stdout) {
        throw new Error(`Python script error: ${stderr}`)
      }

      const result: EmotionAnalysis = JSON.parse(stdout)
      return result

    } catch (error) {
      console.error('EmoAtlas session analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const testText = "Questo è un test."
      const result = await this.analyzeText(testText)
      return result.success
    } catch {
      return false
    }
  }
}

export const emoatlasService = new EmoAtlasService()
```

#### 3.2 API Endpoint
```typescript
// app/api/emotion-analysis/route.ts - Nuovo file
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emoatlasService } from "@/lib/emoatlas"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { sessionId, text, language = 'italian', saveToDb = true } = body

    if (!sessionId && !text) {
      return NextResponse.json(
        { error: "Must provide either sessionId or text" }, 
        { status: 400 }
      )
    }

    let transcript = text
    let sessionRecord = null

    // If sessionId provided, fetch transcript from database
    if (sessionId) {
      sessionRecord = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          isActive: true
        }
      })

      if (!sessionRecord) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }

      if (!sessionRecord.transcript) {
        return NextResponse.json({ error: "Session has no transcript" }, { status: 400 })
      }

      transcript = sessionRecord.transcript
    }

    // Perform emotion analysis
    const analysis = sessionId 
      ? await emoatlasService.analyzeSessionTranscript(transcript, sessionId, language)
      : await emoatlasService.analyzeText(transcript, language)

    if (!analysis.success) {
      return NextResponse.json({ 
        error: "Emotion analysis failed", 
        details: analysis.error 
      }, { status: 500 })
    }

    // Save to database if requested and sessionId provided
    if (saveToDb && sessionId && sessionRecord) {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          emotionAnalysis: JSON.stringify(analysis.analysis),
          emotionAnalysisDate: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      sessionId,
      analysis: analysis.analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Emotion analysis API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const isHealthy = await emoatlasService.checkHealth()
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'EmoAtlas',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

### Fase 4: Database Schema Updates (0.5 giorni)

#### 4.1 Migrazione Prisma
```prisma
// prisma/schema.prisma - Aggiungi campi
model Session {
  // ... existing fields ...
  
  // EmoAtlas integration
  emotionAnalysis      Json?     // Risultati completi analisi EmoAtlas
  emotionAnalysisDate  DateTime? // Quando è stata fatta l'analisi
  emotionSummary       String?   // Riassunto testuale delle emozioni dominanti
  emotionalValence     Float?    // Score di valenza emotiva (-/+)
  dominantEmotion      String?   // Emozione più significativa
  
  // ... rest of model
}

// Nuova tabella per tracking evoluzione emotiva
model EmotionAnalysis {
  id                   String   @id @default(cuid())
  sessionId            String
  userId               String
  patientId            String
  
  // EmoAtlas raw data
  emotionScores        Json     // emotions object
  zScores              Json     // z_scores object  
  significantEmotions  Json     // emotions with |z| > 1.96
  dominantEmotions     Json     // top 3 emotions by z-score
  
  // Derived metrics
  emotionalValence     Float    // positive_score - negative_score
  positiveScore        Float    // sum of positive emotions
  negativeScore        Float    // sum of negative emotions
  
  // Metadata
  language             String   @default("italian")
  wordCount            Int?
  analysisVersion      String   @default("1.0")
  createdAt            DateTime @default(now())
  
  // Relations
  session              Session  @relation(fields: [sessionId], references: [id])
  user                 User     @relation(fields: [userId], references: [id])
  patient              Patient  @relation(fields: [patientId], references: [id])
  
  @@index([sessionId])
  @@index([patientId, createdAt])
  @@index([userId, createdAt])
}
```

#### 4.2 Migrazione SQL
```sql
-- Aggiungi campi alla tabella Session
ALTER TABLE "Session" ADD COLUMN "emotionAnalysis" JSONB;
ALTER TABLE "Session" ADD COLUMN "emotionAnalysisDate" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "emotionSummary" TEXT;
ALTER TABLE "Session" ADD COLUMN "emotionalValence" DOUBLE PRECISION;
ALTER TABLE "Session" ADD COLUMN "dominantEmotion" TEXT;

-- Crea nuova tabella EmotionAnalysis
CREATE TABLE "EmotionAnalysis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "emotionScores" JSONB NOT NULL,
    "zScores" JSONB NOT NULL,
    "significantEmotions" JSONB NOT NULL,
    "dominantEmotions" JSONB NOT NULL,
    "emotionalValence" DOUBLE PRECISION NOT NULL,
    "positiveScore" DOUBLE PRECISION NOT NULL,
    "negativeScore" DOUBLE PRECISION NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'italian',
    "wordCount" INTEGER,
    "analysisVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionAnalysis_pkey" PRIMARY KEY ("id")
);

-- Indici per performance
CREATE INDEX "EmotionAnalysis_sessionId_idx" ON "EmotionAnalysis"("sessionId");
CREATE INDEX "EmotionAnalysis_patientId_createdAt_idx" ON "EmotionAnalysis"("patientId", "createdAt");
CREATE INDEX "EmotionAnalysis_userId_createdAt_idx" ON "EmotionAnalysis"("userId", "createdAt");

-- Relazioni
ALTER TABLE "EmotionAnalysis" ADD CONSTRAINT "EmotionAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmotionAnalysis" ADD CONSTRAINT "EmotionAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmotionAnalysis" ADD CONSTRAINT "EmotionAnalysis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Fase 5: Componenti UI React (2-3 giorni)

#### 5.1 Emotional Flower Visualizer
```typescript
// components/emotion-visualizer.tsx - Nuovo file
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmotionData {
  emotions: Record<string, number>
  z_scores: Record<string, number>
  significant_emotions: Record<string, number>
  dominant_emotions: [string, number][]
  emotional_valence: number
  positive_score: number
  negative_score: number
}

interface EmotionVisualizerProps {
  data: EmotionData
  showDetails?: boolean
}

const EMOTION_COLORS = {
  joy: '#FFD700',      // Gold
  trust: '#32CD32',    // LimeGreen  
  fear: '#2F2F2F',     // DarkGray
  surprise: '#FF8C00', // DarkOrange
  sadness: '#4169E1',  // RoyalBlue
  disgust: '#8A2BE2',  // BlueViolet
  anger: '#DC143C',    // Crimson
  anticipation: '#00CED1' // DarkTurquoise
}

const EMOTION_LABELS = {
  joy: 'Gioia',
  trust: 'Fiducia',
  fear: 'Paura', 
  surprise: 'Sorpresa',
  sadness: 'Tristezza',
  disgust: 'Disgusto',
  anger: 'Rabbia',
  anticipation: 'Anticipazione'
}

export function EmotionVisualizer({ data, showDetails = true }: EmotionVisualizerProps) {
  if (!data) return null

  const getEmotionIntensity = (emotion: string): 'low' | 'medium' | 'high' => {
    const z_score = Math.abs(data.z_scores[emotion] || 0)
    if (z_score > 2.5) return 'high'
    if (z_score > 1.96) return 'medium'
    return 'low'
  }

  const getValenceColor = (valence: number): string => {
    if (valence > 1) return 'text-green-600'
    if (valence < -1) return 'text-red-600'  
    return 'text-gray-600'
  }

  const getValenceLabel = (valence: number): string => {
    if (valence > 1) return 'Positivo'
    if (valence < -1) return 'Negativo'
    return 'Neutro'
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Analisi Emotiva
            <Badge variant={data.emotional_valence > 0 ? 'default' : 'destructive'}>
              {getValenceLabel(data.emotional_valence)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.positive_score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Score Positivo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data.negative_score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Score Negativo</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getValenceColor(data.emotional_valence)}`}>
                {data.emotional_valence.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Valenza</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(data.significant_emotions).length}
              </div>
              <div className="text-sm text-gray-600">Emozioni Significative</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotion Flower Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Fiore Emotivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(EMOTION_LABELS).map(([emotion, label]) => {
              const z_score = data.z_scores[emotion] || 0
              const intensity = getEmotionIntensity(emotion)
              const isSignificant = Math.abs(z_score) > 1.96
              const color = EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS]
              
              return (
                <div key={emotion} className="text-center">
                  <div 
                    className="mx-auto mb-2 rounded-full border-2 flex items-center justify-center text-white font-bold"
                    style={{
                      backgroundColor: isSignificant ? color : '#E5E7EB',
                      borderColor: color,
                      width: `${Math.max(40, Math.min(80, Math.abs(z_score) * 20))}px`,
                      height: `${Math.max(40, Math.min(80, Math.abs(z_score) * 20))}px`,
                      opacity: isSignificant ? 1 : 0.3
                    }}
                  >
                    {z_score > 0 ? '+' : ''}{z_score.toFixed(1)}
                  </div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-gray-500">
                    {isSignificant ? `Significativo (${intensity})` : 'Non significativo'}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dominant Emotions */}
      <Card>
        <CardHeader>
          <CardTitle>Emozioni Dominanti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.dominant_emotions.slice(0, 3).map(([emotion, score], index) => (
              <div key={emotion} className="flex items-center justify-between p-2 rounded bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-semibold text-gray-700">
                    #{index + 1}
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS]
                    }}
                  />
                  <div className="font-medium">
                    {EMOTION_LABELS[emotion as keyof typeof EMOTION_LABELS]}
                  </div>
                </div>
                <div className="font-bold">
                  {score > 0 ? '+' : ''}{score.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scores */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Statistici</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Emozioni Significative:</strong> {Object.keys(data.significant_emotions).length}/8</div>
              <div><strong>Soglia Significatività:</strong> |Z| &gt; 1.96 (p &lt; 0.05)</div>
              <div><strong>Emozioni Rilevate:</strong></div>
              <div className="ml-4 grid grid-cols-2 gap-2">
                {Object.entries(data.emotions).map(([emotion, count]) => (
                  <div key={emotion} className="flex justify-between">
                    <span>{EMOTION_LABELS[emotion as keyof typeof EMOTION_LABELS]}:</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### 5.2 Session UI Integration
```typescript
// components/emotion-analysis-trigger.tsx - Nuovo file
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Brain, TrendingUp } from 'lucide-react'
import { EmotionVisualizer } from './emotion-visualizer'

interface EmotionAnalysisTriggerProps {
  sessionId: string
  hasExistingAnalysis?: boolean
  onAnalysisComplete?: (analysis: any) => void
}

export function EmotionAnalysisTrigger({ 
  sessionId, 
  hasExistingAnalysis = false, 
  onAnalysisComplete 
}: EmotionAnalysisTriggerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState<string | null>(null)

  const runEmotionAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/emotion-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          language: 'italian',
          saveToDb: true
        }),
      })

      if (!response.ok) {
        throw new Error('Analisi emotiva fallita')
      }

      const result = await response.json()
      
      if (result.success) {
        setAnalysis(result.analysis)
        onAnalysisComplete?.(result.analysis)
      } else {
        throw new Error(result.error || 'Errore sconosciuto')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (analysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmotionVisualizer data={analysis} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <Brain className="w-12 h-12 mx-auto text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Analisi Emotiva
            </h3>
            <p className="text-gray-600 mb-4">
              Analizza le emozioni presenti nella trascrizione usando EmoAtlas
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          
          <Button 
            onClick={runEmotionAnalysis}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizzando...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                {hasExistingAnalysis ? 'Rigenera Analisi' : 'Analizza Emozioni'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Fase 6: Dashboard e Analytics (2 giorni)

#### 6.1 Pagina Analisi Paziente
```typescript
// app/patients/[id]/emotions/page.tsx - Nuovo file
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EmotionTrendChart } from "@/components/emotion-trend-chart"
import { EmotionInsights } from "@/components/emotion-insights"

export default async function PatientEmotionsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      userId: user?.id,
      isActive: true,
    },
  })

  if (!patient) {
    notFound()
  }

  // Fetch emotion analyses for this patient
  const emotionAnalyses = await prisma.emotionAnalysis.findMany({
    where: {
      patientId: patient.id
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          sessionDate: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Analisi Emotiva - {patient.initials}
        </h1>
        <Badge variant="secondary">
          {emotionAnalyses.length} Analisi
        </Badge>
      </div>

      {emotionAnalyses.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              Nessuna analisi emotiva disponibile per questo paziente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EmotionTrendChart data={emotionAnalyses} />
          <EmotionInsights 
            patient={patient} 
            analyses={emotionAnalyses} 
          />
        </>
      )}
    </div>
  )
}
```

## 📊 Metriche e KPI

### Indicatori Clinici
- **Valenza Emotiva Trend**: Misura miglioramento nel tempo
- **Emozioni Significative**: Riduzione di fear, anger, sadness
- **Crescita Fiducia**: Aumento z-score di trust
- **Stabilità Emotiva**: Riduzione varianza tra sessioni
- **Recovery Rate**: Velocità di miglioramento emotivo

### Dashboard Analytics
```typescript
interface TherapyProgress {
  patient_id: string
  baseline_valence: number    // Prima sessione
  current_valence: number     // Ultima sessione  
  improvement_rate: number    // %/sessione
  dominant_emotion_shift: {
    from: string             // Emozione dominante iniziale
    to: string              // Emozione dominante attuale
  }
  significant_emotions_trend: number[] // Per sessione
  therapy_effectiveness: 'excellent' | 'good' | 'moderate' | 'poor'
}
```

## 🔮 Roadmap Futuro

### Features Avanzate (Fase 7-8)
1. **Comparative Analysis**: Confronti con popolazione normale
2. **Predictive Modeling**: ML per prevedere andamento terapeutico
3. **Real-time Feedback**: Analisi durante la sessione
4. **Custom Emotional Lexicons**: Terminologia specifica per terapia
5. **Multi-language Support**: Analisi in inglese per terapisti internazionali

### Integrazioni Cliniche
1. **DSM-5 Mapping**: Correlazione con criteri diagnostici
2. **Therapy Goal Tracking**: Monitoraggio obiettivi specifici
3. **Crisis Detection**: Alert per deterioramento emotivo rapido
4. **Outcome Prediction**: Modelli di successo terapeutico

## 🛠️ Testing e Validazione

### Test Suite
```bash
# Test EmoAtlas integration
npm run test:emoatlas

# Test Python scripts
python -m pytest scripts/test_emotion_processor.py

# Test API endpoints
npm run test:api -- --grep "emotion-analysis"

# Test UI components
npm run test:ui -- --grep "EmotionVisualizer"
```

### Validazione Clinica
1. **Inter-rater Reliability**: Confronto con valutazioni manuali
2. **Test-retest**: Stabilità analisi stesso testo
3. **Convergent Validity**: Correlazione con scale validate (Beck, Hamilton)
4. **Discriminant Validity**: Distinzione tra condizioni cliniche

## 📚 Risorse e Riferimenti

### Documentazione Scientifica
- **Paper Originale**: [Semeraro et al., 2025 - Behavior Research Methods](https://doi.org/10.3758/s13428-024-02553-7)
- **EmoAtlas GitHub**: https://github.com/MassimoStel/emoatlas
- **Plutchik's Wheel**: Teoria delle 8 emozioni base
- **NRC Emotion Lexicon**: Lessico multilingue per emozioni

### Tools Complementari
- **PyPlutchik**: Visualizzazioni alternative
- **spaCy**: NLP avanzato
- **NetworkX**: Analisi reti semantiche
- **Matplotlib/Plotly**: Grafici scientifici avanzati

---

**Status**: 📋 Pianificazione Completata - Pronto per Implementazione
**Estimated Effort**: 7-10 giorni di sviluppo full-time
**Priority**: High (Unique feature, clinical value)
**Dependencies**: Python environment, spaCy models, database migration
