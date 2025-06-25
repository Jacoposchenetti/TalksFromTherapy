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
      session_date: string
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
  console.log('🎭 EmotionTrends received data:', analysisData)
  console.log('🎭 Individual sessions:', analysisData?.individual_sessions)
  console.log('🎭 Sessions length:', analysisData?.individual_sessions?.length)
  
  // Debug: Log detailed data structure
  if (analysisData?.individual_sessions) {
    analysisData.individual_sessions.forEach((session, index) => {
      console.log(`🎭 Session ${index + 1}:`, {
        id: session.session_id,
        title: session.session_title,
        z_scores: session.analysis.z_scores,
        valence: session.analysis.emotional_valence,
        positive: session.analysis.positive_score,
        negative: session.analysis.negative_score
      })
    })
  }
    if (!analysisData?.individual_sessions || analysisData.individual_sessions.length === 0) {
    console.log('🎭 No data - showing placeholder')
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

  // Check if we have only one session
  if (analysisData.individual_sessions.length === 1) {
    console.log('🎭 Only one session - showing single session message')
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            📈 Storico Sentiment - Andamento Emozioni nel Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">📊 Sessione Singola Analizzata</p>
            <p className="text-sm mb-4">
              Hai analizzato 1 sessione: <strong>{analysisData.individual_sessions[0].session_title}</strong>
            </p>
            <p className="text-sm">
              Per visualizzare l'andamento nel tempo, seleziona e analizza almeno 2 sessioni
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Suggerimento:</strong> Torna al tab "Sentiment Analysis", seleziona più sessioni con i checkbox e clicca "Analizza Sentiment"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )  }

  // Ordina le sessioni cronologicamente (dalla più vecchia alla più recente)
  const sortedSessions = [...analysisData.individual_sessions].sort((a, b) => {
    const dateA = new Date(a.session_date).getTime()
    const dateB = new Date(b.session_date).getTime()
    return dateA - dateB
  })

  console.log('🎭 Sessions before sorting:', analysisData.individual_sessions.map(s => ({ title: s.session_title, date: s.session_date })))
  console.log('🎭 Sessions after sorting:', sortedSessions.map(s => ({ title: s.session_title, date: s.session_date })))

  // Prepara i dati per il grafico (ora ordinati cronologicamente)
  const trendData: EmotionTrendData[] = sortedSessions.map((session, index) => {
    const data = {
      sessionTitle: session.session_title,
      sessionDate: new Date(session.session_date).toLocaleDateString('it-IT'),
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
    }
    
    console.log(`🎭 Transformed data for session ${index + 1} (${data.sessionDate}):`, data)
    return data
  })

  console.log('🎭 Final trend data:', trendData)
  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{`Sessione ${label}: ${data.sessionTitle}`}</p>              {payload.map((entry: any, index: number) => (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                  {`${EMOTION_LABELS[entry.dataKey as keyof typeof EMOTION_LABELS]}: ${entry.value.toFixed(2)}`}
                  {entry.dataKey !== 'emotional_valence' && entry.dataKey !== 'positive_score' && entry.dataKey !== 'negative_score' && (
                    <span className="text-xs ml-1">
                      {Math.abs(entry.value) > 1.96 ? ' (🔴 significativo)' : ' (non signif.)'}
                    </span>
                  )}
                </p>
              ))}
        </div>
      )
    }
    return null
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          📈 Storico Sentiment - Andamento Emozioni nel Tempo
        </CardTitle>
        <p className="text-sm text-gray-600">
          Evoluzione delle emozioni attraverso {trendData.length} sessioni analizzate
          {trendData.length < 3 && (
            <span className="ml-2 text-amber-600">
              (seleziona più sessioni per un trend più significativo)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-8 w-full overflow-hidden">          {/* Grafico Emozioni Principali */}
          <div className="w-full">
            <h4 className="text-md font-medium mb-3">🎭 Emozioni Primarie (Z-scores)</h4>            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData} margin={{ top: 20, right: 40, left: 40, bottom: 80 }}>                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Sessione', position: 'insideBottom', offset: -5 }}
                  stroke="#666"
                  tickFormatter={(value) => `S${value}`}
                  height={60}
                />
                <YAxis 
                  label={{ value: 'Z-score', angle: -90, position: 'insideLeft' }}
                  stroke="#666"
                  domain={[-4, 4]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                  {/* Linee di riferimento per significatività statistica */}
                <ReferenceLine y={1.96} stroke="#FF6B6B" strokeWidth={1.5} />
                <ReferenceLine y={-1.96} stroke="#FF6B6B" strokeWidth={1.5} />
                
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
                />              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Grafico Valenza Emotiva */}
          <div className="w-full">
            <h4 className="text-md font-medium mb-3">⚖️ Valenza Emotiva e Punteggi</h4>            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 20, right: 40, left: 40, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Sessione', position: 'insideBottom', offset: -5 }}
                  stroke="#666"
                  tickFormatter={(value) => `S${value}`}
                  height={60}
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
                />              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>          {/* Legenda informativa */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium mb-2">📊 Come interpretare il grafico:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>• <span className="inline-block w-3 h-0.5 bg-red-400 mx-1"></span><strong>Linee rosse (±1.96):</strong> Soglia significatività statistica (p &lt; 0.05)</div>
              <div>• <strong>Valenza Emotiva &gt; 0:</strong> Tono complessivamente positivo</div>
              <div>• <strong>Linee ascendenti:</strong> Incremento dell'intensità emotiva nel tempo</div>
              <div>• <strong>Variazioni brusche:</strong> Cambiamenti significativi tra sessioni</div>
            </div>
          </div>

          {/* Riepilogo trend (solo se abbiamo almeno 2 sessioni) */}
          {trendData.length >= 2 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-2">📈 Riepilogo Trend:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Valenza Emotiva:</strong><br />
                  <span className="text-gray-600">
                    Inizio: {trendData[0].emotional_valence.toFixed(2)} → 
                    Fine: {trendData[trendData.length - 1].emotional_valence.toFixed(2)}
                    <span className={trendData[trendData.length - 1].emotional_valence > trendData[0].emotional_valence ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                      ({trendData[trendData.length - 1].emotional_valence > trendData[0].emotional_valence ? 'Miglioramento' : 'Peggioramento'})
                    </span>
                  </span>
                </div>
                <div>
                  <strong>Emozioni Positive:</strong><br />
                  <span className="text-gray-600">
                    Inizio: {trendData[0].positive_score.toFixed(1)} → 
                    Fine: {trendData[trendData.length - 1].positive_score.toFixed(1)}
                    <span className={trendData[trendData.length - 1].positive_score > trendData[0].positive_score ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                      ({trendData[trendData.length - 1].positive_score > trendData[0].positive_score ? '↑' : '↓'})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
