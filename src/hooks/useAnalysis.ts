import { useState, useEffect, useCallback } from 'react'

interface CachedAnalysis {
  sentiment?: any
  topics?: any
  customTopicSearches?: Array<{
    query: string
    timestamp: string
    results: any[]
  }>
  semanticFrames?: Record<string, any>
  analysisVersion?: string
  language?: string
  createdAt?: string
  updatedAt?: string
}

interface AnalysisState {
  cached: boolean
  analysis: CachedAnalysis | null
  loading: boolean
  error: string | null
}

interface UseAnalysisOptions {
  sessionId: string
  autoLoad?: boolean
}

export function useAnalysis({ sessionId, autoLoad = true }: UseAnalysisOptions) {
  const [state, setState] = useState<AnalysisState>({
    cached: false,
    analysis: null,
    loading: false,
    error: null
  })

  // Carica analisi esistenti dal database
  const loadCachedAnalysis = useCallback(async () => {
    if (!sessionId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`/api/analyses?sessionId=${sessionId}`)
      const data = await response.json()

      if (response.ok) {
        setState({
          cached: data.cached,
          analysis: data.analysis,
          loading: false,
          error: null
        })
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Errore nel caricamento'
        }))
      }
    } catch (error) {
      console.error('Errore nel caricamento analisi:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Errore di connessione'
      }))
    }
  }, [sessionId])

  // Salva un tipo specifico di analisi
  const saveAnalysis = useCallback(async (analysisType: string, analysisData: any) => {
    if (!sessionId) return false

    try {
      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          analysisType,
          analysisData
        })
      })

      const result = await response.json()

      if (response.ok) {
        // Ricarica i dati dopo il salvataggio
        await loadCachedAnalysis()
        return true
      } else {
        console.error('Errore nel salvataggio:', result.error)
        return false
      }
    } catch (error) {
      console.error('Errore nel salvataggio analisi:', error)
      return false
    }
  }, [sessionId, loadCachedAnalysis])

  // Cancella un tipo specifico di analisi
  const clearAnalysis = useCallback(async (analysisType?: string) => {
    if (!sessionId) return false

    try {
      const url = analysisType 
        ? `/api/analyses?sessionId=${sessionId}&analysisType=${analysisType}`
        : `/api/analyses?sessionId=${sessionId}`

      const response = await fetch(url, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        // Ricarica i dati dopo la cancellazione
        await loadCachedAnalysis()
        return true
      } else {
        console.error('Errore nella cancellazione:', result.error)
        return false
      }
    } catch (error) {
      console.error('Errore nella cancellazione analisi:', error)
      return false
    }
  }, [sessionId, loadCachedAnalysis])

  // Verifica se un tipo di analisi è già disponibile
  const hasAnalysis = useCallback((analysisType: string): boolean => {
    if (!state.analysis) return false

    switch (analysisType) {
      case 'sentiment':
        return !!state.analysis.sentiment
      case 'topics':
        return !!state.analysis.topics
      case 'semantic_frame':
        return !!state.analysis.semanticFrames && Object.keys(state.analysis.semanticFrames).length > 0
      default:
        return false
    }
  }, [state.analysis])

  // Ottiene un tipo specifico di analisi
  const getAnalysis = useCallback((analysisType: string, targetWord?: string): any => {
    if (!state.analysis) return null

    switch (analysisType) {
      case 'sentiment':
        return state.analysis.sentiment
      case 'topics':
        return state.analysis.topics
      case 'semantic_frame':
        if (targetWord && state.analysis.semanticFrames) {
          return state.analysis.semanticFrames[targetWord] || null
        }
        return state.analysis.semanticFrames
      default:
        return null
    }
  }, [state.analysis])

  // Auto-load al mount se richiesto
  useEffect(() => {
    if (autoLoad && sessionId) {
      loadCachedAnalysis()
    }
  }, [autoLoad, sessionId, loadCachedAnalysis])

  return {
    ...state,
    loadCachedAnalysis,
    saveAnalysis,
    clearAnalysis,
    hasAnalysis,
    getAnalysis,
    
    // Shortcuts per tipi specifici
    hasSentimentAnalysis: hasAnalysis('sentiment'),
    hasTopicAnalysis: hasAnalysis('topics'),
    hasSemanticFrameAnalysis: hasAnalysis('semantic_frame'),
    
    getSentimentAnalysis: () => getAnalysis('sentiment'),
    getTopicAnalysis: () => getAnalysis('topics'),
    getSemanticFrameAnalysis: (targetWord?: string) => getAnalysis('semantic_frame', targetWord)
  }
}
