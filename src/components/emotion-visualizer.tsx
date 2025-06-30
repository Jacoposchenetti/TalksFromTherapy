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
  text_length: number
}

interface EmotionVisualizerProps {
  data: EmotionData
  title?: string
  showDetails?: boolean
  flowerPlot?: string // Base64 encoded image from EmoAtlas
}

export function EmotionVisualizer({ data, title, showDetails = false, flowerPlot }: EmotionVisualizerProps) {
  if (!data) return null

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
      {/* Summary */}
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">{title}</h4>
          <Badge variant={data.emotional_valence > 0 ? 'default' : 'destructive'}>
            {getValenceLabel(data.emotional_valence)}
          </Badge>
        </div>
      )}

      {/* EmoAtlas Native Flower Plot - The main and only visualization */}
      {flowerPlot && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-xl border-2 border-pink-200 shadow-lg">
          <h5 className="text-lg font-semibold mb-4 text-center text-purple-800">🌸 Fiore Emotivo (EmoAtlas)</h5>
          <div className="flex justify-center">
            <img 
              src={`data:image/png;base64,${flowerPlot}`}
              alt="Emotional Flower Plot" 
              className="max-w-full h-auto rounded-xl shadow-md border border-purple-200"
              style={{ maxHeight: '500px', minHeight: '300px' }}
            />
          </div>
          <div className="mt-4 text-center text-sm text-purple-700 bg-white/60 rounded-lg p-3">
            <p className="font-medium">Visualizzazione generata da EmoAtlas</p>
            <p className="text-xs mt-1">I petali colorati rappresentano le emozioni statisticamente significative rilevate nel testo</p>
          </div>
        </div>
      )}

      {/* Interpretazione Z-Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h6 className="font-semibold text-blue-800 mb-3 flex items-center">
          📊 Come Interpretare i Punteggi
        </h6>
        <div className="text-sm text-blue-900 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">🎯 Valori Z-Score:</p>
              <ul className="text-xs space-y-1 mt-1">
                <li><strong>0 a ±1:</strong> Intensità normale</li>
                <li><strong>±1 a ±2:</strong> Emozione presente</li>
                <li><strong>±2 a ±3:</strong> Emozione forte</li>
                <li><strong>oltre ±3:</strong> Emozione dominante</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">⭐ Significatività:</p>
              <ul className="text-xs space-y-1 mt-1">
                <li><strong>|Z| ≥ 2:</strong> Statisticamente rilevante</li>
                <li><strong>Positivo (+):</strong> Più intenso del normale</li>
                <li><strong>Negativo (−):</strong> Meno intenso del normale</li>
                <li><strong>Emozioni significative:</strong> {Object.keys(data.significant_emotions).length}/8</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <p className="text-xs text-blue-700">
              <strong>💡 Per il terapeuta:</strong> I valori Z misurano quanto un'emozione si discosta dalla norma. 
              Valori alti indicano che quella specifica emozione è particolarmente presente (o assente) nel discorso del paziente.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Scores */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Parole analizzate:</strong> {data.text_length}</div>
          <div><strong>Soglia significatività:</strong> |Z| &gt; 1.96 (p &lt; 0.05)</div>
          <div><strong>Emozioni significative:</strong> {Object.keys(data.significant_emotions).length}/8</div>
        </div>
      )}
    </div>
  )
}
