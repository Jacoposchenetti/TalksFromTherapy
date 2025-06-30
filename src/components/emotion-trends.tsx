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
  joy: 'Joy',
  trust: 'Trust',
  fear: 'Fear',
  surprise: 'Surprise',
  sadness: 'Sadness',
  disgust: 'Disgust',
  anger: 'Anger',
  anticipation: 'Anticipation',
  emotional_valence: 'Emotional Valence',
  positive_score: 'Positive Score',
  negative_score: 'Negative Score'
}

export function EmotionTrends({ analysisData }: EmotionTrendsProps) {
  // Debug: Log detailed data structure
  if (analysisData?.individual_sessions) {
    analysisData.individual_sessions.forEach((session, index) => {
      // Log structure if needed for debugging
    })
  }
    if (!analysisData?.individual_sessions || analysisData.individual_sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            📈 Sentiment History - Emotion Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Select more sessions to view the trend over time</p>
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
            📈 Sentiment History - Emotion Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">📊 Single Session Analyzed</p>
            <p className="text-sm mb-4">
              You analyzed 1 session: <strong>{analysisData.individual_sessions[0].session_title}</strong>
            </p>
            <p className="text-sm">
              To view the trend over time, select and analyze at least 2 sessions
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> Go back to the "Sentiment Analysis" tab, select multiple sessions with the checkboxes and click "Analyze Sentiment"
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
          <p className="font-semibold mb-2">{`Session ${label}: ${data.sessionTitle}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${EMOTION_LABELS[entry.dataKey as keyof typeof EMOTION_LABELS]}: ${entry.value.toFixed(2)}`}
              {entry.dataKey !== 'emotional_valence' && entry.dataKey !== 'positive_score' && entry.dataKey !== 'negative_score' && (
                <span className="text-xs ml-1">
                  {Math.abs(entry.value) > 1.96 ? ' (🔴 significant)' : ' (not signif.)'}
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
          📈 Sentiment History - Emotion Trends Over Time
        </CardTitle>
        <p className="text-sm text-gray-600">
          Evolution of emotions across {trendData.length} analyzed sessions
          {trendData.length < 3 && (
            <span className="ml-2 text-amber-600">
              (select more sessions for a more meaningful trend)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-8 w-full overflow-hidden">          {/* Grafico Emozioni Principali */}
          <div className="w-full">
            <h4 className="text-md font-medium mb-3">🎭 Primary Emotions (Z-scores)</h4>            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData} margin={{ top: 20, right: 40, left: 40, bottom: 80 }}>                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Session', position: 'insideBottom', offset: -5 }}
                  stroke="#666"
                  tickFormatter={(value) => `Session ${value}`}
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
                  name="Joy"
                  dot={{ fill: EMOTION_COLORS.joy, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trust" 
                  stroke={EMOTION_COLORS.trust} 
                  strokeWidth={2}
                  name="Trust"
                  dot={{ fill: EMOTION_COLORS.trust, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anticipation" 
                  stroke={EMOTION_COLORS.anticipation} 
                  strokeWidth={2}
                  name="Anticipation"
                  dot={{ fill: EMOTION_COLORS.anticipation, strokeWidth: 2, r: 4 }}
                />
                
                {/* Emozioni negative */}
                <Line 
                  type="monotone" 
                  dataKey="sadness" 
                  stroke={EMOTION_COLORS.sadness} 
                  strokeWidth={2}
                  name="Sadness"
                  dot={{ fill: EMOTION_COLORS.sadness, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="fear" 
                  stroke={EMOTION_COLORS.fear} 
                  strokeWidth={2}
                  name="Fear"
                  dot={{ fill: EMOTION_COLORS.fear, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anger" 
                  stroke={EMOTION_COLORS.anger} 
                  strokeWidth={2}
                  name="Anger"
                  dot={{ fill: EMOTION_COLORS.anger, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="disgust" 
                  stroke={EMOTION_COLORS.disgust} 
                  strokeWidth={2}
                  name="Disgust"
                  dot={{ fill: EMOTION_COLORS.disgust, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="surprise" 
                  stroke={EMOTION_COLORS.surprise} 
                  strokeWidth={2}
                  name="Surprise"
                  dot={{ fill: EMOTION_COLORS.surprise, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Grafico Valenza Emotiva */}
          <div className="w-full">
            <h4 className="text-md font-medium mb-3">⚖️ Emotional Valence and Scores</h4>            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 20, right: 40, left: 40, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />                <XAxis 
                  dataKey="sessionIndex" 
                  label={{ value: 'Session', position: 'insideBottom', offset: -5 }}
                  stroke="#666"
                  tickFormatter={(value) => `Session ${value}`}
                  height={60}
                />
                <YAxis 
                  label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
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
                  name="Emotional Valence"
                  dot={{ fill: EMOTION_COLORS.emotional_valence, strokeWidth: 2, r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="positive_score" 
                  stroke={EMOTION_COLORS.positive_score} 
                  strokeWidth={2}
                  name="Positive Score"
                  dot={{ fill: EMOTION_COLORS.positive_score, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="negative_score" 
                  stroke={EMOTION_COLORS.negative_score} 
                  strokeWidth={2}
                  name="Negative Score"
                  dot={{ fill: EMOTION_COLORS.negative_score, strokeWidth: 2, r: 4 }}
                />              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>          {/* Legenda informativa */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium mb-2">📊 How to interpret the chart:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>• <span className="inline-block w-3 h-0.5 bg-red-400 mx-1"></span><strong>Red lines (±1.96):</strong> Statistical significance threshold (p &lt; 0.05)</div>
              <div>• <strong>Emotional Valence &gt; 0:</strong> Overall positive tone</div>
              <div>• <strong>Ascending lines:</strong> Increase in emotional intensity over time</div>
              <div>• <strong>Sharp changes:</strong> Significant changes between sessions</div>
            </div>
          </div>

          {/* Riepilogo trend (solo se abbiamo almeno 2 sessioni) */}
          {trendData.length >= 2 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-2">📈 Trend Summary:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Emotional Valence:</strong><br />
                  <span className="text-gray-600">
                    Start: {trendData[0].emotional_valence.toFixed(2)} → 
                    End: {trendData[trendData.length - 1].emotional_valence.toFixed(2)}
                    <span className={trendData[trendData.length - 1].emotional_valence > trendData[0].emotional_valence ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                      ({trendData[trendData.length - 1].emotional_valence > trendData[0].emotional_valence ? 'Improvement' : 'Worsening'})
                    </span>
                  </span>
                </div>
                <div>
                  <strong>Positive Emotions:</strong><br />
                  <span className="text-gray-600">
                    Start: {trendData[0].positive_score.toFixed(1)} → 
                    End: {trendData[trendData.length - 1].positive_score.toFixed(1)}
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
