import { useState, useEffect, useCallback, useMemo } from 'react'

interface CachedAnalysis {
  sentiment?: any
  topics?: any
  semanticFrames?: Record<string, any>
  analysisVersion?: string
  language?: string
  createdAt?: string
  updatedAt?: string
}

interface MultiSessionAnalysis {
  [sessionId: string]: CachedAnalysis
}

interface UseMultiAnalysisOptions {
  sessionIds: string[]
  autoLoad?: boolean
}

export function useMultiSessionAnalysis({ sessionIds, autoLoad = true }: UseMultiAnalysisOptions) {
  const [analyses, setAnalyses] = useState<MultiSessionAnalysis>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Memoizza sessionIds array per evitare dipendenze inutili
  const memoizedSessionIds = useMemo(() => sessionIds, [sessionIds.join(',')])

  // Carica analisi per tutte le sessioni
  const loadAllAnalyses = useCallback(async () => {
    if (!memoizedSessionIds.length) return

    setLoading(true)
    setError(null)

    try {
      const promises = memoizedSessionIds.map(async (sessionId) => {
        const response = await fetch(`/api/analyses?sessionId=${sessionId}`)
        const data = await response.json()
        return { sessionId, data: response.ok ? data.analysis : null }
      })

      const results = await Promise.all(promises)
      
      const newAnalyses: MultiSessionAnalysis = {}
      results.forEach(({ sessionId, data }) => {
        if (data) {
          newAnalyses[sessionId] = data
        }
      })

      setAnalyses(newAnalyses)
    } catch (error) {
      console.error('Errore nel caricamento analisi multiple:', error)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }, [memoizedSessionIds])

  // Salva analisi per una sessione specifica
  const saveSessionAnalysis = useCallback(async (sessionId: string, analysisType: string, analysisData: any) => {
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

      if (response.ok) {
        // Ricarica l'analisi per questa sessione specifica
        const updatedResponse = await fetch(`/api/analyses?sessionId=${sessionId}`)
        const updatedData = await updatedResponse.json()
        
        if (updatedResponse.ok && updatedData.analysis) {
          setAnalyses(prev => ({
            ...prev,
            [sessionId]: updatedData.analysis
          }))
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Errore nel salvataggio analisi:', error)
      return false
    }
  }, [])

  // Memoizza le funzioni di controllo per evitare ricreazioni
  const allSessionsHaveAnalysis = useCallback((analysisType: string): boolean => {
    return memoizedSessionIds.every(sessionId => {
      const analysis = analyses[sessionId]
      if (!analysis) return false

      switch (analysisType) {
        case 'sentiment':
          return !!analysis.sentiment
        case 'topics':
          return !!analysis.topics
        case 'semantic_frame':
          return !!analysis.semanticFrames && Object.keys(analysis.semanticFrames).length > 0
        default:
          return false
      }
    })
  }, [memoizedSessionIds, analyses])

  // Memoizza la funzione per ottenere analisi aggregate
  const getAggregatedAnalysis = useCallback((analysisType: string) => {
    const results: any[] = []
    
    memoizedSessionIds.forEach(sessionId => {
      const analysis = analyses[sessionId]
      if (analysis) {
        switch (analysisType) {
          case 'sentiment':
            if (analysis.sentiment) {
              results.push({
                session_id: sessionId,
                session_title: `Sessione ${sessionId}`, // TODO: Get real session title
                analysis: analysis.sentiment,
                flower_plot: analysis.sentiment.flower_plot
              })
            }
            break
          case 'topics':
            if (analysis.topics) {
              // For topics, return the single analysis result since topic modeling is done on combined sessions
              return analysis.topics
            }
            break
        }
      }
    })

    return results
  }, [memoizedSessionIds, analyses])

  // Memoizza i valori booleani
  const hasAllSentimentAnalyses = useMemo(() => allSessionsHaveAnalysis('sentiment'), [allSessionsHaveAnalysis])
  const hasAllTopicAnalyses = useMemo(() => allSessionsHaveAnalysis('topics'), [allSessionsHaveAnalysis])

  // Memoizza le funzioni getter
  const getSentimentData = useCallback(() => getAggregatedAnalysis('sentiment'), [getAggregatedAnalysis])
  
  // Special getter for topic data (returns single analysis result)
  const getTopicData = useCallback(() => {
    // Topic analysis is typically done on the first session (combined analysis)
    if (memoizedSessionIds.length > 0) {
      const firstSessionId = memoizedSessionIds[0]
      const analysis = analyses[firstSessionId]
      console.log('🔍 getTopicData - firstSessionId:', firstSessionId)
      console.log('🔍 getTopicData - analysis:', analysis)
      if (analysis?.topics) {
        console.log('🔍 getTopicData - analysis.topics:', analysis.topics)
        return analysis.topics
      }
    }
    console.log('🔍 getTopicData - returning null')
    return null
  }, [memoizedSessionIds, analyses])

  // Auto-load al mount se richiesto
  useEffect(() => {
    if (autoLoad && memoizedSessionIds.length > 0) {
      loadAllAnalyses()
    }
  }, [autoLoad, loadAllAnalyses]) // Usa loadAllAnalyses che è già memoizzato

  return {
    analyses,
    loading,
    error,
    loadAllAnalyses,
    saveSessionAnalysis,
    allSessionsHaveAnalysis,
    getAggregatedAnalysis,
    
    // Shortcuts
    hasAllSentimentAnalyses,
    hasAllTopicAnalyses,
    
    getSentimentData,
    getTopicData
  }
}
