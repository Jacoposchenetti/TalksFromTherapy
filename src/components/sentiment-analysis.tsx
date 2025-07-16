'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  cachedData?: any[]
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

export function SentimentAnalysis({ selectedSessions, onAnalysisComplete, cachedData }: SentimentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<EmotionAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Effect to load cached data when available
  useEffect(() => {
    if (cachedData && cachedData.length > 0) {
      console.log('🔄 Loading cached sentiment data:', cachedData)
      // Transform cached data to match the expected format
      const transformedResult: EmotionAnalysisResult = {
        success: true,
        analysis: {
          individual_sessions: cachedData,
          combined_analysis: null, // Could be computed if needed
          total_sessions: cachedData.length
        },
        processed_sessions: cachedData.length
      }
      setAnalysisResult(transformedResult)
      setError(null)
    }
  }, [cachedData])

  // Add logging to understand what's happening
  console.log('🔍 SentimentAnalysis render:', {
    selectedSessionsCount: selectedSessions.length,
    hasAnalysisResult: !!analysisResult,
    hasCachedData: !!(cachedData && cachedData.length > 0),
    isAnalyzing,
    error: !!error
  })

  // Filter sessions with transcripts using useMemo to prevent re-creation
  const validSessions = useMemo(() => 
    selectedSessions.filter(session => 
      session.transcript && 
      typeof session.transcript === 'string' && 
      session.transcript.trim().length > 0
    ), [selectedSessions]
  )

  const runEmotionAnalysis = async () => {
    if (validSessions.length === 0) {
      setError('Nessuna trascrizione disponibile per le sessioni selezionate')
      return
    }

    // Prevent multiple simultaneous requests
    if (isAnalyzing) {
      console.log('⚠️ Analysis already in progress, skipping request')
      return
    }

    // Prevent if we already have results for these sessions
    const currentSessionIds = validSessions.map(s => s.id).sort().join(',')
    const existingSessionIds = analysisResult?.analysis?.individual_sessions?.map(s => s.session_id)?.sort()?.join(',') || ''
    
    if (analysisResult && currentSessionIds === existingSessionIds) {
      console.log('⚠️ Analysis already exists for these sessions, skipping request')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    
    try {
      const sessionIds = validSessions.map(s => s.id)
      
      console.log('🚀 Starting emotion analysis for sessions:', sessionIds)
      
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionIds,
          language: 'italian'
        }),
      })

      console.log('🌐 Response status:', response.status)
      console.log('🌐 Response ok:', response.ok)

      if (!response.ok) {
        throw new Error(`Analisi emotiva fallita: ${response.status}`)
      }      const result = await response.json()
      console.log('🎯 API Response received:', result)
      console.log('🎯 Response success:', result.success)
      console.log('🎯 Result keys:', Object.keys(result))
      console.log('🎯 Individual sessions count:', result.individual_sessions?.length)
      console.log('🎯 Combined analysis available:', !!result.combined_analysis)
      console.log('🎯 Analysis structure available:', !!result.analysis)
      
      if (result.analysis) {
        console.log('🎯 Analysis individual sessions:', result.analysis.individual_sessions?.length)
        console.log('🎯 First session example:', result.analysis.individual_sessions?.[0])
      }
      
      if (result.success) {
        console.log('✅ Setting analysis result:', result)
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
  
  // Memoize session IDs to prevent infinite re-renders
  const validSessionIds = useMemo(() => 
    validSessions.map(s => s.id).sort().join(','), 
    [validSessions]
  )
  
  const analyzedSessionIds = useMemo(() => 
    analysisResult?.analysis?.individual_sessions?.map(s => s.session_id)?.sort()?.join(',') || '', 
    [analysisResult?.analysis?.individual_sessions]
  )

  // Clear analysis only when the actual session selection changes meaningfully
  useEffect(() => {
    console.log('🔄 useEffect triggered - checking if analysis should be cleared')
    
    // Only clear if we have an analysis result and the sessions have actually changed
    if (analysisResult && validSessionIds !== analyzedSessionIds) {
      console.log('🔄 Session selection changed, clearing analysis', {
        validIds: validSessionIds,
        analyzedIds: analyzedSessionIds
      })
      clearAnalysis()
    }
  }, [validSessionIds, analyzedSessionIds, analysisResult])

  // Function to transform EmoAtlas data to EmotionVisualizer format
  function transformEmoAtlasData(sessionAnalysis: any) {
    // Add safety checks for required properties
    if (!sessionAnalysis) {
      console.warn('⚠️ sessionAnalysis is undefined')
      return null
    }

    const { 
      z_scores = {}, 
      significant_emotions = {}, 
      emotional_valence = 0, 
      positive_score = 0, 
      negative_score = 0, 
      word_count = 0 
    } = sessionAnalysis

    // Ensure z_scores is an object
    if (!z_scores || typeof z_scores !== 'object') {
      console.warn('⚠️ z_scores is not valid:', z_scores)
      return null
    }

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
          <p className="text-lg mb-2">No Transcript Available</p>
          <p className="text-sm">
            Select sessions with transcripts to analyze emotions
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
            Emotional Analysis Completed
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAnalysis}
          >
            New Analysis
          </Button>
        </div>        {/* Combined Analysis */}
        {analysis && analysis.combined_analysis && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              {(() => {
                const transformedData = transformEmoAtlasData(analysis.combined_analysis.analysis)
                if (!transformedData) {
                  return (
                    <div className="text-center text-gray-500 py-4">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Invalid combined analysis data</p>
                    </div>
                  )
                }
                return (
                  <EmotionVisualizer 
                    data={transformedData}
                    title={`🌸 Combined Analysis (${analysis.total_sessions} sessions)`}
                    showDetails={false}
                    flowerPlot={analysis.combined_analysis.flower_plot}
                  />
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* Individual Sessions */}
        {analysis && analysis.individual_sessions && analysis.individual_sessions.length > 0 && (          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-300 flex-1"></div>
              <h4 className="text-md font-medium text-gray-700">
                {analysis.individual_sessions.length > 1 ? '📊 Analisi per Sessione' : '📊 Analisi Emotiva'}
                <span className="text-sm text-gray-500 ml-2">
                  ({analysis.individual_sessions.length} sessions)
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
                return analysis.individual_sessions.map((sessionAnalysis) => {
                  const transformedData = transformEmoAtlasData(sessionAnalysis.analysis)
                  if (!transformedData) {
                    return (
                      <Card key={sessionAnalysis.session_id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-3">
                          <div className="text-center text-gray-500 py-4">
                            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                            <p className="font-medium">{sessionAnalysis.session_title}</p>
                            <p className="text-sm">Invalid analysis data</p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }
                  return (
                    <Card key={sessionAnalysis.session_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-3">
                        <EmotionVisualizer 
                          data={transformedData}
                          showDetails={false}
                          flowerPlot={sessionAnalysis.flower_plot}
                        />
                      </CardContent>
                    </Card>
                  )
                })
              })()}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="text-center space-y-4">
        <Heart className="w-16 h-16 mx-auto text-pink-500" />
        
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Emotional Sentiment Analysis
          </h3>
          <p className="text-gray-600 mb-4">
            Analyze the 8 core emotions in the {validSessions.length} selected sessions
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-blue-50 p-3 rounded-md text-sm">
          <h4 className="font-medium mb-2">Sessions to Analyze:</h4>
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
              Analyzing Emotions...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5 mr-2" />
              Start Emotional Analysis
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-gray-500 max-w-md mx-auto">
          <p>
              The analysis uses EmoAtlas to identify joy, trust, fear, 
              surprise, sadness, disgust, anger, and anticipation with statistical significance.
          </p>
        </div>
      </div>
    </div>
  )
}
