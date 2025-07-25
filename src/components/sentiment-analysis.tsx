'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Brain, Heart, TrendingUp, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmotionVisualizer } from './emotion-visualizer'
import { EmotionTrends } from './emotion-trends'

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
  onRefreshResults?: () => void
}

interface EmotionAnalysisResult {
  success: boolean
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
  combined_analysis?: {
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
  total_sessions?: number
  processed_sessions?: number
  error?: string
}

export function SentimentAnalysis({ selectedSessions, onAnalysisComplete, cachedData, onRefreshResults }: SentimentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<EmotionAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)

  // Carica dati cached se disponibili
  useEffect(() => {
    if (cachedData && selectedSessions.length > 0) {
      const transformedSessions = selectedSessions.map((session) => {
        const cached = (cachedData || []).find((item: any) => (item.session_id || item.id) === session.id);
        if (cached && cached.analysis && typeof cached.analysis.z_scores === 'object') {
          const z = cached.analysis.z_scores || {};
          const z_scores = {
            joy: z.joy ?? 0,
            trust: z.trust ?? 0,
            fear: z.fear ?? 0,
            surprise: z.surprise ?? 0,
            sadness: z.sadness ?? 0,
            disgust: z.disgust ?? 0,
            anger: z.anger ?? 0,
            anticipation: z.anticipation ?? 0,
          };
          const analysis = { ...cached.analysis, z_scores };
          return {
            session_id: session.id,
            session_title: session.title,
            analysis,
            flower_plot: cached.flower_plot
          }
        } else {
          return {
            session_id: session.id,
            session_title: session.title,
            analysis: null,
            flower_plot: null
          }
        }
      })
      const hasAnyData = transformedSessions.some(s => s.analysis)
      const transformedResult: EmotionAnalysisResult = {
        success: hasAnyData,
        individual_sessions: transformedSessions,
        combined_analysis: null,
        total_sessions: transformedSessions.length,
        processed_sessions: transformedSessions.length
      }
      setAnalysisResult(transformedResult)
      setError(null)
    }
  }, [cachedData, selectedSessions, refreshCount])

  // Ottieni le sessioni con analisi valide
  const validSessions = useMemo(() => {
    if (!analysisResult?.individual_sessions) return []
    return analysisResult.individual_sessions.filter(hasValidAnalysis)
  }, [analysisResult])

  // Reset currentSessionIndex quando cambiano le sessioni valide
  useEffect(() => {
    if (validSessions.length > 0 && currentSessionIndex >= validSessions.length) {
      setCurrentSessionIndex(0)
    }
  }, [validSessions, currentSessionIndex])

  // Funzioni di navigazione
  const goToPreviousSession = () => {
    setCurrentSessionIndex(prev => prev > 0 ? prev - 1 : validSessions.length - 1)
  }

  const goToNextSession = () => {
    setCurrentSessionIndex(prev => prev < validSessions.length - 1 ? prev + 1 : 0)
  }

  function hasValidAnalysis(session: any) {
    if (!session || !session.analysis || typeof session.analysis !== 'object') return false;
    
    const analysis = session.analysis;
    const z = analysis.z_scores;
    
    // Controlla che z_scores esista e sia un oggetto
    if (!z || typeof z !== 'object') return false;
    
    // Controlla che tutte le emozioni richieste siano presenti
    const requiredEmotions = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation'];
    if (!requiredEmotions.every(e => e in z)) return false;
    
    // Controlla che i valori siano numeri validi
    if (!requiredEmotions.every(e => typeof z[e] === 'number' && !isNaN(z[e]))) return false;
    
    // Controlla che emotional_valence sia un numero valido
    if (typeof analysis.emotional_valence !== 'number' || isNaN(analysis.emotional_valence)) return false;
    
    return true;
  }

  const allSessionsAnalyzed = analysisResult && analysisResult.individual_sessions &&
    validSessions.length > 0 &&
    validSessions.every(sel => {
      const found = analysisResult.individual_sessions.find(s => s.session_id === sel.session_id);
      return hasValidAnalysis(found);
    });

  const runEmotionAnalysis = async () => {
    if (validSessions.length === 0) {
      setError('Seleziona almeno una sessione con trascrizione per avviare l’analisi.')
      return
    }
    if (isAnalyzing) return
    if (allSessionsAnalyzed) return
    setIsAnalyzing(true)
    setError(null)
    try {
      const sessionIds = validSessions.map(s => s.session_id)
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds, language: 'italian' }),
      })
      if (!response.ok) throw new Error(`Analisi emotiva fallita: ${response.status}`)
      const result = await response.json()
      if (result.success) {
        setAnalysisResult(result)
        onAnalysisComplete?.(result)
      } else {
        throw new Error(result.error || 'Errore sconosciuto')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto'
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
      setTimeout(() => { localStorage.removeItem('lastEmotionAnalysisRequest') }, 1000)
    }
  }

  const clearAnalysis = () => {
    setAnalysisResult(null)
    setError(null)
    setRefreshCount(c => c + 1)
  }

  // --- RENDER ---
  const hasResults = analysisResult && analysisResult.individual_sessions && analysisResult.individual_sessions.some(hasValidAnalysis)
  const showTrends = hasResults && analysisResult.individual_sessions.length > 1
  const currentSession = validSessions[currentSessionIndex]

  // Controllo di sicurezza per currentSession
  if (hasResults && validSessions.length > 0 && !currentSession) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <span className="text-gray-500 font-medium">Errore: sessione corrente non trovata</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-8 gap-6">
      <div className="w-full text-center">
        <Heart className="w-14 h-14 mx-auto text-pink-500 mb-2" />
        <h2 className="text-2xl font-bold mb-1">Analisi delle Emozioni</h2>
        <p className="text-gray-600 mb-4">Visualizza le emozioni principali rilevate nelle sessioni selezionate.</p>
      </div>
      <div className="w-full flex flex-col items-center gap-4">
        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-md text-red-800 text-base flex items-center gap-2 w-full justify-center">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {!hasResults && (
          <div className="flex flex-col items-center justify-center w-full py-12">
            <Brain className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-lg font-semibold mb-2">Nessuna analisi disponibile</p>
            <p className="text-gray-500">Seleziona una o più sessioni con trascrizione e avvia una nuova analisi.</p>
          </div>
        )}
        {hasResults && validSessions.length > 0 && (
          <Card className="w-full">
            <CardContent className="py-6">
              {/* Controlli di navigazione */}
              {validSessions.length > 1 && (
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousSession}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Precedente
                  </Button>
                  <div className="text-center">
                    <span className="font-semibold text-gray-700">
                      Sessione {currentSessionIndex + 1} di {validSessions.length}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{currentSession?.session_title || 'Sessione senza titolo'}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextSession}
                    className="flex items-center gap-2"
                  >
                    Successiva
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Visualizzazione sessione corrente */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-6 mb-2 items-center text-base">
                  <span className="font-bold text-red-800">Sessione:</span> <span className="text-red-900">{currentSession?.session_title || 'Sessione senza titolo'}</span>
                  <span className="font-bold text-red-800">Parole:</span> <span className="text-red-900">{currentSession.analysis?.text_length || 0}</span>
                  <span className="font-bold text-red-800">Valenza:</span> <span className="text-red-900">{Number(currentSession.analysis?.emotional_valence || 0).toFixed(2)}</span>
                  <span className="font-bold text-red-800">Positive:</span> <span className="text-red-900">{Number(currentSession.analysis?.positive_score || 0).toFixed(2)}</span>
                  <span className="font-bold text-red-800">Negative:</span> <span className="text-red-900">{Number(currentSession.analysis?.negative_score || 0).toFixed(2)}</span>
                </div>
                {currentSession.analysis ? (
                  <EmotionVisualizer data={currentSession.analysis} />
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-500">
                      <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nessuna analisi sentiment disponibile</p>
                      <p className="text-sm">Questa sessione non ha ancora un'analisi sentiment</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-row gap-4 w-full justify-center mt-2">
          <Button
            onClick={runEmotionAnalysis}
            disabled={isAnalyzing || allSessionsAnalyzed || validSessions.length === 0}
            className="px-6 py-2 text-base"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>Avvia nuova analisi</>
            )}
          </Button>
          {hasResults && (
            <Button
              variant="outline"
              size="lg"
              className="px-6 py-2 text-base"
              onClick={onRefreshResults ? onRefreshResults : clearAnalysis}
            >
              Aggiorna risultati
            </Button>
          )}
        </div>
        {showTrends && (
          <Card className="w-full mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Andamento delle Emozioni nel Tempo
              </CardTitle>
              <CardDescription>
                Evoluzione delle 8 emozioni principali durante le sessioni selezionate
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px] max-h-none overflow-auto">
              <EmotionTrends 
                analysisData={{
                  individual_sessions: analysisResult.individual_sessions.map(s => ({
                    session_id: s.session_id,
                    session_title: s.session_title,
                    session_date: (s as any).session_date || (s as any).sessionDate || new Date().toISOString(),
                    analysis: s.analysis
                  }))
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Funzione di visualizzazione diretta per dati backend (analisi singola)
export function visualizzaAnalisiSentimentBackend({ sentiment }: { sentiment: any }) {
  if (!sentiment || typeof sentiment !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[80px]">
        <span className="text-red-700 font-bold text-base">Nessun dato di sentiment disponibile</span>
      </div>
    );
  }
  // Forza la presenza di tutte le 8 emozioni
  const z = sentiment.z_scores || {};
  const z_scores = {
    joy: z.joy ?? 0,
    trust: z.trust ?? 0,
    fear: z.fear ?? 0,
    surprise: z.surprise ?? 0,
    sadness: z.sadness ?? 0,
    disgust: z.disgust ?? 0,
    anger: z.anger ?? 0,
    anticipation: z.anticipation ?? 0,
  };
  const significant_emotions = sentiment.significant_emotions || {};
  const dominant_emotions = sentiment.dominant_emotions || [];
  const emotional_valence = sentiment.emotional_valence || 0;
  const positive_score = sentiment.positive_score || 0;
  const negative_score = sentiment.negative_score || 0;
  const text_length = sentiment.text_length || 0;

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap gap-6 mb-2">
          <div>
            <span className="font-bold text-red-800">Valenza:</span> <span className="text-red-900">{emotional_valence}</span>
          </div>
          <div>
            <span className="font-bold text-red-800">Positive:</span> <span className="text-red-900">{positive_score}</span>
          </div>
          <div>
            <span className="font-bold text-red-800">Negative:</span> <span className="text-red-900">{negative_score}</span>
          </div>
          <div>
            <span className="font-bold text-red-800">Parole:</span> <span className="text-red-900">{text_length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[350px] text-xs">
            <thead>
              <tr className="text-red-800">
                <th className="px-2 py-1">Emozione</th>
                <th className="px-2 py-1">Z-Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(z_scores).map(([emotion, value]) => (
                <tr key={emotion}>
                  <td className="px-2 py-1 font-semibold text-red-900">{emotion}</td>
                  <td className="px-2 py-1 text-red-900">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
