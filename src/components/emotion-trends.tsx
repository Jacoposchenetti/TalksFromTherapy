'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface EmotionTrendData {
  sessionTitle: string
  sessionDate: string
  sessionIndex: number
  joy: number
  trust: number
  fear: number
  surprise: number
  sadness: number
  disgust: number
  anger: number
  anticipation: number
  emotional_valence: number
  positive_score: number
  negative_score: number
}

interface EmotionTrendsProps {
  analysisData: {
    individual_sessions: Array<{
      session_id: string
      session_title: string
      analysis: {
        z_scores: Record<string, number>
        emotional_valence: number
        positive_score: number
        negative_score: number
      }
    }>
  }
}

// Colori per le emozioni (stesso schema di EmoAtlas)
const EMOTION_COLORS = {
  joy: '#FFD700',           // Gold
  trust: '#32CD32',         // LimeGreen  
  fear: '#808080',          // Gray
  surprise: '#FF8C00',      // DarkOrange
  sadness: '#4169E1',       // RoyalBlue
  disgust: '#8A2BE2',       // BlueViolet
  anger: '#FF6347',         // Tomato
  anticipation: '#20B2AA',  // LightSeaGreen
  emotional_valence: '#9333EA', // Purple
  positive_score: '#10B981',    // Emerald
  negative_score: '#EF4444'     // Red
}

const EMOTION_LABELS = {
  joy: 'Gioia',
  trust: 'Fiducia',
  fear: 'Paura', 
  surprise: 'Sorpresa',
  sadness: 'Tristezza',
  disgust: 'Disgusto',
  anger: 'Rabbia',
  anticipation: 'Anticipazione',
  emotional_valence: 'Valenza Emotiva',
  positive_score: 'Punteggio Positivo',
  negative_score: 'Punteggio Negativo'
}

export function EmotionTrends({ analysisData }: EmotionTrendsProps) {
  if (!analysisData?.individual_sessions || analysisData.individual_sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            📈 Storico Sentiment - Andamento Emozioni nel Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">Nessun dato disponibile</p>
            <p className="text-sm">Seleziona più sessioni per visualizzare l'andamento nel tempo</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepara i dati per il grafico
  const trendData: EmotionTrendData[] = analysisData.individual_sessions.map((session, index) => ({
    sessionTitle: session.session_title,
    sessionDate: new Date().toLocaleDateString(), // Placeholder - potresti aggiungere la data reale
    sessionIndex: index + 1,
    joy: session.analysis.z_scores.joy || 0,
    trust: session.analysis.z_scores.trust || 0,
    fear: session.analysis.z_scores.fear || 0,
    surprise: session.analysis.z_scores.surprise || 0,
    sadness: session.analysis.z_scores.sadness || 0,
    disgust: session.analysis.z_scores.disgust || 0,
    anger: session.analysis.z_scores.anger || 0,
    anticipation: session.analysis.z_scores.anticipation || 0,
    emotional_valence: session.analysis.emotional_valence,
    positive_score: session.analysis.positive_score,
    negative_score: session.analysis.negative_score
  }))

  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{`Sessione ${label}: ${data.sessionTitle}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${EMOTION_LABELS[entry.dataKey as keyof typeof EMOTION_LABELS]}: ${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          📈 Storico Sentiment - Andamento Emozioni nel Tempo
        </CardTitle>
        <p className="text-sm text-gray-600">
          Evoluzione delle emozioni attraverso {trendData.length} sessioni analizzate
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Grafico Emozioni Principali */}
          <div>
            <h4 className="text-md font-medium mb-3">🎭 Emozioni Primarie (Z-scores)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Sessione', position: 'insideBottom', offset: -10 }}
                  stroke="#666"
                />
                <YAxis 
                  label={{ value: 'Z-score', angle: -90, position: 'insideLeft' }}
                  stroke="#666"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Linea di riferimento per significatività statistica */}
                <ReferenceLine y={1.96} stroke="#FF6B6B" strokeDasharray="5 5" label="Soglia significatività (+)" />
                <ReferenceLine y={-1.96} stroke="#FF6B6B" strokeDasharray="5 5" label="Soglia significatività (-)" />
                
                {/* Emozioni positive */}
                <Line 
                  type="monotone" 
                  dataKey="joy" 
                  stroke={EMOTION_COLORS.joy} 
                  strokeWidth={2}
                  name="Gioia"
                  dot={{ fill: EMOTION_COLORS.joy, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trust" 
                  stroke={EMOTION_COLORS.trust} 
                  strokeWidth={2}
                  name="Fiducia"
                  dot={{ fill: EMOTION_COLORS.trust, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anticipation" 
                  stroke={EMOTION_COLORS.anticipation} 
                  strokeWidth={2}
                  name="Anticipazione"
                  dot={{ fill: EMOTION_COLORS.anticipation, strokeWidth: 2, r: 4 }}
                />
                
                {/* Emozioni negative */}
                <Line 
                  type="monotone" 
                  dataKey="sadness" 
                  stroke={EMOTION_COLORS.sadness} 
                  strokeWidth={2}
                  name="Tristezza"
                  dot={{ fill: EMOTION_COLORS.sadness, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="fear" 
                  stroke={EMOTION_COLORS.fear} 
                  strokeWidth={2}
                  name="Paura"
                  dot={{ fill: EMOTION_COLORS.fear, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anger" 
                  stroke={EMOTION_COLORS.anger} 
                  strokeWidth={2}
                  name="Rabbia"
                  dot={{ fill: EMOTION_COLORS.anger, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Grafico Valenza Emotiva */}
          <div>
            <h4 className="text-md font-medium mb-3">⚖️ Valenza Emotiva e Punteggi</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Sessione', position: 'insideBottom', offset: -10 }}
                  stroke="#666"
                />
                <YAxis 
                  label={{ value: 'Punteggio', angle: -90, position: 'insideLeft' }}
                  stroke="#666"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                
                <Line 
                  type="monotone" 
                  dataKey="emotional_valence" 
                  stroke={EMOTION_COLORS.emotional_valence} 
                  strokeWidth={3}
                  name="Valenza Emotiva"
                  dot={{ fill: EMOTION_COLORS.emotional_valence, strokeWidth: 2, r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="positive_score" 
                  stroke={EMOTION_COLORS.positive_score} 
                  strokeWidth={2}
                  name="Punteggio Positivo"
                  dot={{ fill: EMOTION_COLORS.positive_score, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="negative_score" 
                  stroke={EMOTION_COLORS.negative_score} 
                  strokeWidth={2}
                  name="Punteggio Negativo"
                  dot={{ fill: EMOTION_COLORS.negative_score, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda informativa */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium mb-2">📊 Come interpretare il grafico:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>• <strong>Z-score &gt; 1.96:</strong> Emozione statisticamente significativa (p &lt; 0.05)</div>
              <div>• <strong>Valenza Emotiva &gt; 0:</strong> Tono complessivamente positivo</div>
              <div>• <strong>Linee ascendenti:</strong> Incremento dell'intensità emotiva</div>
              <div>• <strong>Variazioni brusche:</strong> Cambiamenti significativi tra sessioni</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
