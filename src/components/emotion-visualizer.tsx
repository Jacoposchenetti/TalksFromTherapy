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

const EMOTION_COLORS = {
  joy: '#FFD700',      // Gold
  trust: '#32CD32',    // LimeGreen  
  fear: '#808080',     // Gray
  surprise: '#FF8C00', // DarkOrange
  sadness: '#4169E1',  // RoyalBlue
  disgust: '#8A2BE2',  // BlueViolet
  anger: '#FF6347',    // Tomato/Coral
  anticipation: '#20B2AA' // LightSeaGreen
}

const EMOTION_LABELS = {
  joy: 'gioia',
  trust: 'fiducia',
  fear: 'paura', 
  surprise: 'sorpresa',
  sadness: 'tristezza',
  disgust: 'disgusto',
  anger: 'rabbia',
  anticipation: 'anticipazione'
}

// Function to create SVG path for a petal
const createPetalPath = (centerX: number, centerY: number, angle: number, radius: number, maxRadius: number): string => {
  const angleRad = (angle * Math.PI) / 180
  
  // Calculate petal tip position
  const tipX = centerX + Math.cos(angleRad) * radius
  const tipY = centerY + Math.sin(angleRad) * radius
  
  // Calculate control points for smooth petal shape
  const controlRadius = radius * 0.3
  const leftControlAngle = angleRad - 0.5
  const rightControlAngle = angleRad + 0.5
  
  const leftControlX = centerX + Math.cos(leftControlAngle) * controlRadius
  const leftControlY = centerY + Math.sin(leftControlAngle) * controlRadius
  
  const rightControlX = centerX + Math.cos(rightControlAngle) * controlRadius
  const rightControlY = centerY + Math.sin(rightControlAngle) * controlRadius
  
  return `M ${centerX} ${centerY} 
          Q ${leftControlX} ${leftControlY} ${tipX} ${tipY}
          Q ${rightControlX} ${rightControlY} ${centerX} ${centerY}`
}

export function EmotionVisualizer({ data, title, showDetails = false, flowerPlot }: EmotionVisualizerProps) {
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
      {/* Summary */}
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">{title}</h4>
          <Badge variant={data.emotional_valence > 0 ? 'default' : 'destructive'}>
            {getValenceLabel(data.emotional_valence)}
          </Badge>
        </div>
      )}

      {/* EmoAtlas Native Flower Plot */}
      {flowerPlot && (
        <div className="bg-white p-6 rounded-lg border">
          <h5 className="text-sm font-medium mb-4 text-center">Fiore Emotivo (EmoAtlas)</h5>
          <div className="flex justify-center">
            <img 
              src={flowerPlot} 
              alt="Emotional Flower Plot" 
              className="max-w-full h-auto rounded-lg shadow-sm"
              style={{ maxHeight: '400px' }}
            />
          </div>
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>Visualizzazione generata da EmoAtlas</p>
            <p>Petali colorati rappresentano emozioni statisticamente significative</p>
          </div>
        </div>      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-green-600">
            {data.positive_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Positivo</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-600">
            {data.negative_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Negativo</div>
        </div>
        <div>
          <div className={`text-lg font-bold ${getValenceColor(data.emotional_valence)}`}>
            {data.emotional_valence.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Valenza</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-600">
            {Object.keys(data.significant_emotions).length}
          </div>
          <div className="text-xs text-gray-600">Significative</div>
        </div>
      </div>

      {/* Emotion Flower Visualization */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="text-sm font-medium mb-3 text-center">Fiore Emotivo</h5>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(EMOTION_LABELS).map(([emotion, label]) => {
            const z_score = data.z_scores[emotion] || 0
            const intensity = getEmotionIntensity(emotion)
            const isSignificant = Math.abs(z_score) > 1.96
            const color = EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS]
            
            return (
              <div key={emotion} className="text-center">
                <div 
                  className="mx-auto mb-1 rounded-full border-2 flex items-center justify-center text-white font-bold text-xs"
                  style={{
                    backgroundColor: isSignificant ? color : '#E5E7EB',
                    borderColor: color,
                    width: `${Math.max(30, Math.min(50, Math.abs(z_score) * 15))}px`,
                    height: `${Math.max(30, Math.min(50, Math.abs(z_score) * 15))}px`,
                    opacity: isSignificant ? 1 : 0.3
                  }}
                >
                  {z_score > 0 ? '+' : ''}{z_score.toFixed(1)}
                </div>
                <div className="text-xs font-medium">{label}</div>
                {isSignificant && (
                  <div className="text-xs text-gray-500">
                    {intensity}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dominant Emotions */}
      <div>
        <h5 className="text-sm font-medium mb-2">Top 3 Emozioni</h5>
        <div className="space-y-1">
          {data.dominant_emotions.slice(0, 3).map(([emotion, score], index) => (
            <div key={emotion} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="text-xs font-semibold text-gray-700">
                  #{index + 1}
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
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
