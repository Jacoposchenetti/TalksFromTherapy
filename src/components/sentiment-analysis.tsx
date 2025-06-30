'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Brain, Heart, TrendingUp, AlertCircle } from 'lucide-react'
import { EmotionVisualizer } from './emotion-visualizer'

interface Session {
  id: string
  title: string
  transcript?: string
  sessionDate: string
}

interface SentimentAnalysisProps {
  selectedSessions: Session[]
  onAnalysisComplete?: (result: any) => void
}

interface EmotionAnalysisResult {
  success: boolean
  analysis: {
    individual_sessions: Array<{
      session_id: string
      session_title: string
      analysis: {
        emotions: Record<string, number>
        z_scores: Record<string, number>
        significant_emotions: Record<string, number>
        dominant_emotions: [string, number][]
        emotional_valence: number
        positive_score: number
        negative_score: number
        text_length: number
      }
      flower_plot?: string // Base64 image from EmoAtlas
    }>
    combined_analysis: {
      analysis: {
        emotions: Record<string, number>
        z_scores: Record<string, number>
        significant_emotions: Record<string, number>
        dominant_emotions: [string, number][]
        emotional_valence: number
        positive_score: number
        negative_score: number
        text_length: number
      }
      flower_plot?: string // Base64 image from EmoAtlas
    } | null
    total_sessions: number
  }
  processed_sessions: number
  error?: string
}

export function SentimentAnalysis({ selectedSessions, onAnalysisComplete }: SentimentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<EmotionAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add logging to understand what's happening
  console.log('🔍 SentimentAnalysis render:', {
    selectedSessionsCount: selectedSessions.length,
    hasAnalysisResult: !!analysisResult,
    isAnalyzing,
    error: !!error
  })

  // Filter sessions with transcripts
  const validSessions = selectedSessions.filter(session => 
    session.transcript && 
    typeof session.transcript === 'string' && 
    session.transcript.trim().length > 0
  )

  const runEmotionAnalysis = async () => {
    if (validSessions.length === 0) {
      setError('Nessuna trascrizione disponibile per le sessioni selezionate')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    
    try {
      const sessionIds = validSessions.map(s => s.id)
      
      const response = await fetch('/api/emotion-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionIds,
          language: 'italian'
        }),
      })

      if (!response.ok) {
        throw new Error(`Analisi emotiva fallita: ${response.status}`)
      }      const result = await response.json()
        console.log('🎯 API Response received:', result)
      console.log('🎯 Response success:', result.success)
      console.log('🎯 Individual sessions count:', result.individual_sessions?.length)
      console.log('🎯 Analysis structure available:', !!result.analysis)
      if (result.analysis) {
        console.log('🎯 Analysis individual sessions:', result.analysis.individual_sessions?.length)
        console.log('🎯 First session example:', result.analysis.individual_sessions?.[0])
      }
      
      if (result.success) {
        console.log('✅ Setting analysis result:', result)
        console.log('🔍 Full result structure:', JSON.stringify(result, null, 2))
        console.log('🔍 Analysis object:', result.analysis)
        console.log('🔍 Individual sessions:', result.analysis?.individual_sessions)
        setAnalysisResult(result)
        console.log('📞 Calling onAnalysisComplete callback')
        onAnalysisComplete?.(result)
      } else {
        throw new Error(result.error || 'Errore sconosciuto')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto'
      setError(errorMessage)
      console.error('Emotion analysis error:', err)    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearAnalysis = () => {
    console.log('🧹 clearAnalysis called - clearing results')
    setAnalysisResult(null)
    setError(null)
  }
  // Clear analysis only when the actual session selection changes meaningfully
  useEffect(() => {
    console.log('🔄 useEffect triggered - checking if analysis should be cleared')
    
    // Only clear if we have an analysis result and the sessions have actually changed
    if (analysisResult) {
      const currentSessionIds = new Set(validSessions.map(s => s.id))
      const analyzedSessionIds = new Set(
        analysisResult.analysis?.individual_sessions?.map(s => s.session_id) || []
      )
      
      // Check if the sets are different
      const sessionSetChanged = currentSessionIds.size !== analyzedSessionIds.size || 
        [...currentSessionIds].some(id => !analyzedSessionIds.has(id))
      
      console.log('🔄 Session comparison:', {
        currentIds: [...currentSessionIds].sort(),
        analyzedIds: [...analyzedSessionIds].sort(),
        changed: sessionSetChanged
      })
      
      if (sessionSetChanged) {
        console.log('🔄 Session selection changed, clearing analysis')
        clearAnalysis()
      } else {
        console.log('✅ Session selection unchanged, keeping analysis')
      }
    } else {
      console.log('ℹ️ No analysis result to clear')
    }
  }, [validSessions.map(s => s.id).join(','), analysisResult?.analysis?.individual_sessions?.map(s => s.session_id)?.join(',') || ''])

  // Function to transform EmoAtlas data to EmotionVisualizer format
  function transformEmoAtlasData(sessionAnalysis: any) {
    const { z_scores, significant_emotions, emotional_valence, positive_score, negative_score, word_count } = sessionAnalysis

    // Convert z_scores to emotions (using absolute values for intensity)
    const emotions = Object.fromEntries(
      Object.entries(z_scores).map(([emotion, score]) => [emotion, Math.abs(score as number)])
    )

    // Create dominant_emotions array from z_scores, sorted by absolute value
    const dominant_emotions: [string, number][] = Object.entries(z_scores)
      .map(([emotion, score]) => [emotion, Math.abs(score as number)] as [string, number])
      .sort((a, b) => b[1] - a[1])

    return {
      emotions,
      z_scores,
      significant_emotions: significant_emotions || {},
      dominant_emotions,
      emotional_valence: emotional_valence || 0,
      positive_score: positive_score || 0,
      negative_score: negative_score || 0,
      text_length: word_count || 0
    }
  }

  if (validSessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">Nessuna Trascrizione Disponibile</p>
          <p className="text-sm">
            Seleziona sessioni con trascrizioni per analizzare le emozioni
          </p>
        </div>
      </div>
    )
  }
  if (analysisResult) {
    const { analysis } = analysisResult
    
    console.log('🎨 Rendering analysis result:', {
      hasAnalysis: !!analysis,
      hasCombinedAnalysis: !!analysis?.combined_analysis,
      hasIndividualSessions: !!analysis?.individual_sessions,
      individualSessionsCount: analysis?.individual_sessions?.length,
      individualSessions: analysis?.individual_sessions
    })
    
    return (
      <div className="h-full overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Analisi Emotiva Completata
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAnalysis}
          >
            Nuova Analisi
          </Button>
        </div>        {/* Combined Analysis */}
        {analysis.combined_analysis && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <EmotionVisualizer 
                data={transformEmoAtlasData(analysis.combined_analysis.analysis)}
                showDetails={false}
                flowerPlot={analysis.combined_analysis.flower_plot}
              />
            </CardContent>
          </Card>
        )}

        {/* Individual Sessions - Commented out to remove redundant boxes */}
        {/* 
        {analysis.individual_sessions && analysis.individual_sessions.length > 0 && (          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-300 flex-1"></div>
              <h4 className="text-md font-medium text-gray-700">
                {analysis.individual_sessions.length > 1 ? '📊 Analisi per Sessione' : '📊 Analisi Emotiva'}
                <span className="text-sm text-gray-500 ml-2">
                  ({analysis.individual_sessions.length} sessioni)
                </span>
              </h4>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            <div className="space-y-3">
              {(() => {
                console.log('🎨 Rendering individual sessions:', analysis.individual_sessions.length)
                analysis.individual_sessions.forEach((sessionAnalysis, index) => {
                  console.log(`🎨 Session ${index + 1}:`, {
                    id: sessionAnalysis.session_id,
                    title: sessionAnalysis.session_title,
                    hasAnalysis: !!sessionAnalysis.analysis,
                    hasFlowerPlot: !!sessionAnalysis.flower_plot
                  })
                })
                return analysis.individual_sessions.map((sessionAnalysis) => (
                  <Card key={sessionAnalysis.session_id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <EmotionVisualizer 
                        data={transformEmoAtlasData(sessionAnalysis.analysis)}
                        title={sessionAnalysis.session_title}
                        showDetails={false}
                        flowerPlot={sessionAnalysis.flower_plot}
                      />
                    </CardContent>
                  </Card>
                ))
              })()}
            </div>
          </div>
        )}
        */}

        {/* Statistics - Commented out to clean up the interface */}
        {/*
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <div><strong>Sessioni processate:</strong> {analysis.total_sessions}</div>
          <div><strong>Parole totali analizzate:</strong> {
            analysis.combined_analysis?.analysis.text_length || 
            analysis.individual_sessions.reduce((sum, s) => sum + s.analysis.text_length, 0)
          }</div>
          <div><strong>Metodo:</strong> EmoAtlas con Z-score statistico</div>
        </div>
        */}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="text-center space-y-4">
        <Heart className="w-16 h-16 mx-auto text-pink-500" />
        
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Analisi del Sentiment Emotivo
          </h3>
          <p className="text-gray-600 mb-4">
            Analizza le 8 emozioni fondamentali nelle {validSessions.length} sessioni selezionate
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-blue-50 p-3 rounded-md text-sm">
          <h4 className="font-medium mb-2">Sessioni da Analizzare:</h4>
          <div className="space-y-1">
            {validSessions.map(session => (
              <div key={session.id} className="flex justify-between text-xs">
                <span>{session.title}</span>
                <span className="text-gray-500">
                  {session.transcript?.split(' ').length} parole
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
        
        <Button 
          onClick={runEmotionAnalysis}
          disabled={isAnalyzing}
          className="w-full max-w-xs"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analizzando Emozioni...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5 mr-2" />
              Avvia Analisi Emotiva
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-gray-500 max-w-md mx-auto">
          <p>
            L&apos;analisi utilizza EmoAtlas per identificare gioia, fiducia, paura, 
            sorpresa, tristezza, disgusto, rabbia e anticipazione con significatività statistica.
          </p>
        </div>
      </div>
    </div>
  )
}
