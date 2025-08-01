'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell } from 'recharts'
import { useState } from 'react'

interface EmotionData {
  emotions: Record<string, number>
  z_scores: Record<string, number>
  significant_emotions: Record<string, number>
  dominant_emotions: [string, number][]
  emotional_valence: number
  positive_score: number
  negative_score: number
  text_length: number
}

interface EmotionVisualizerProps {
  data: EmotionData
  title?: string
  showDetails?: boolean
  flowerPlot?: string // Base64 encoded image from EmoAtlas
}

export function EmotionVisualizer({ data, title, showDetails = false }: EmotionVisualizerProps) {
  const [zoomedChart, setZoomedChart] = useState<'scores' | 'valence' | null>(null)
  
  // Controllo di sicurezza per data
  if (!data || typeof data !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <span className="text-gray-500 font-medium">Nessun dato disponibile per la visualizzazione</span>
      </div>
    )
  }

  // Assicurati che tutte le proprietà necessarie esistano
  const safeData = {
    z_scores: data.z_scores || {},
    emotional_valence: data.emotional_valence || 0,
    text_length: data.text_length || 0,
    significant_emotions: data.significant_emotions || {}
  }

  // Prepare data for bar chart
  const emotionNames = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'
  ]
  const emotionLabels: Record<string, string> = {
    joy: 'Gioia', trust: 'Fiducia', fear: 'Paura', surprise: 'Sorpresa',
    sadness: 'Tristezza', disgust: 'Disgusto', anger: 'Rabbia', anticipation: 'Attesa'
  }
  const emotionColors: Record<string, string> = {
    joy: '#FFD600', trust: '#00C853', fear: '#304FFE', surprise: '#FF9100',
    sadness: '#2979FF', disgust: '#00B8D4', anger: '#D50000', anticipation: '#FFAB00'
  }
  const barData = emotionNames.map(emotion => ({
    emotion: emotionLabels[emotion],
    value: safeData.z_scores?.[emotion] ?? 0,
    color: emotionColors[emotion]
  }))

  // --- Valenza Emotiva: badge + termometro ---
  const valence = safeData.emotional_valence || 0;
  let valenceColor = '#B0BEC5';
  if (valence > 1) valenceColor = '#00C853';
  else if (valence < -1) valenceColor = '#D50000';
  // Termometro: da -8 a +8
  const minVal = -8, maxVal = 8;
  const percent = Math.max(0, Math.min(1, (valence - minVal) / (maxVal - minVal)));

  // Chart components
  const ScoresBarChart = ({ height = 220 }: { height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={barData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="emotion" tick={{ fontSize: 13, fontWeight: 500 }} />
        <YAxis domain={[-4, 4]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
        <Bar dataKey="value" isAnimationActive={false} fill="#8884d8">
          {barData.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.color} />
          ))}
          <LabelList dataKey="value" position="top" formatter={(v: number) => v.toFixed(2)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="space-y-6">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">{title}</h4>
        </div>
      )}
      {/* Z-Scores Bar Chart */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 cursor-zoom-in" onClick={() => setZoomedChart('scores')}>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-blue-800">Emozioni (Z-Scores)</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pb-4">
          <ScoresBarChart />
        </CardContent>
      </Card>
      {/* Color Legend */}
      <div className="flex flex-wrap gap-3 items-center justify-center my-2">
        {emotionNames.map(emotion => (
          <div key={emotion} className="flex items-center gap-1 text-xs">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: emotionColors[emotion] }}></span>
            <span>{emotionLabels[emotion]}</span>
          </div>
        ))}
      </div>
      {/* Valenza Emotiva: badge + termometro */}
      <Card className="bg-gradient-to-br from-green-50 to-lime-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-green-800">Valenza Emotiva</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-3xl font-bold px-4 py-1 rounded-full shadow"
              style={{ backgroundColor: valenceColor, color: '#fff', minWidth: 80, textAlign: 'center' }}
            >
              {valence.toFixed(2)}
            </span>
            <span className="text-gray-700 text-base font-medium">
              {valence > 1 ? 'Prevalentemente positiva' : valence < -1 ? 'Prevalentemente negativa' : 'Neutra'}
            </span>
          </div>
          {/* Termometro */}
          <div className="relative w-full max-w-xs h-4 bg-gray-200 rounded-full">
            <div
              className="absolute top-0 left-0 h-4 rounded-full transition-all"
              style={{
                width: `${percent * 100}%`,
                backgroundColor: valenceColor,
                zIndex: 1
              }}
            />
            {/* Indicatore */}
            <div
              className="absolute top-0 h-4 w-2 rounded bg-black"
              style={{
                left: `calc(${percent * 100}% - 4px)`,
                zIndex: 2
              }}
            />
            {/* Etichette min/max */}
            <span className="absolute left-0 -top-6 text-xs text-gray-500">-8</span>
            <span className="absolute right-0 -top-6 text-xs text-gray-500">+8</span>
          </div>
        </CardContent>
      </Card>
      {/* Zoom Modal */}
      {zoomedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setZoomedChart(null)}>
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full relative cursor-pointer" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500" onClick={() => setZoomedChart(null)}>&#10005;</button>
            {zoomedChart === 'scores' ? (
              <div className="w-full h-[400px]">
                <ScoresBarChart height={350} />
              </div>
            ) : (
              <div className="w-full h-[250px]">
                {/* The ValenceBarChart component was removed, so this block is now empty */}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Details */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Parole analizzate:</strong> {safeData.text_length || 0}</div>
          <div><strong>Soglia significatività:</strong> |Z| &gt; 1.96 (p &lt; 0.05)</div>
          <div><strong>Emozioni significative:</strong> {Object.keys(safeData.significant_emotions || {}).length}/8</div>
        </div>
      )}
    </div>
  )
}
