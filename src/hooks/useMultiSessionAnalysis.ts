import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

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

  // Multi-session sentiment analysis cache (volatile, per combinazione di sessioni)
  const multiSessionSentimentCache = useRef<{ [key: string]: any }>({})

  // Helper per chiave combinazione sessioni
  const getSessionComboKey = (ids: string[]) => ids.slice().sort().join('__')

  // Memoizza la funzione getter per la sentiment analysis multi-sessione
  const getMultiSessionSentimentData = useCallback((selectedIds: string[]) => {
    const key = getSessionComboKey(selectedIds)
    return multiSessionSentimentCache.current[key] || null
  }, [])

  // Quando viene fatta una nuova analisi multi-sessione, salvala nella cache locale
  const saveMultiSessionSentimentData = useCallback((selectedIds: string[], result: any) => {
    const key = getSessionComboKey(selectedIds)
    multiSessionSentimentCache.current[key] = result
  }, [])

  // Rimuovi tutte le chiamate a console.log e debugLog

  // Carica analisi per tutte le sessioni
  const loadAllAnalyses = useCallback(async () => {
    if (!memoizedSessionIds.length) return

    setLoading(true)
    setError(null)

    try {
      const promises = memoizedSessionIds.map(async (sessionId) => {
        const response = await fetch(`/api/analyses?sessionId=${sessionId}`)
        const data = await response.json()
        let analysisValue = null;
        // FIX: estrai da data.analysis se presente
        if (response.ok && data.data && data.data.analysis) {
          analysisValue = data.data.analysis;
        } else if (response.ok && data.analysis) {
          // fallback legacy
          analysisValue = data.analysis;
        } else if (response.ok && data.success && Array.isArray(data.individual_sessions) && data.individual_sessions.length > 0 && data.individual_sessions[0].analysis) {
          analysisValue = { sentiment: data.individual_sessions[0].analysis };
        }
        return { sessionId, data: analysisValue }
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
              // Provo a recuperare il titolo reale se presente
              let sessionTitle = `Sessione ${sessionId}`
              if (analysis && typeof analysis === 'object') {
                if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') sessionTitle = analysis.sessionTitle
                else if ('title' in analysis && typeof analysis.title === 'string') sessionTitle = analysis.title
                else if ('session_title' in analysis && typeof analysis.session_title === 'string') sessionTitle = analysis.session_title
              }
              results.push({
                session_id: sessionId,
                session_title: sessionTitle,
                analysis: analysis.sentiment,
                flower_plot: analysis.sentiment.flower_plot
              })
            }
            break
          case 'topics':
            if (analysis.topics) {
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
  const getSentimentData = useCallback(() => {
    // Aggrega sempre anche per una sola sessione
    const results = [];
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      let sessionTitle = `Sessione ${sessionId}`;
      if (analysis && typeof analysis === 'object') {
        if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') sessionTitle = analysis.sessionTitle;
        else if ('title' in analysis && typeof analysis.title === 'string') sessionTitle = analysis.title;
      }
      if (analysis && analysis.sentiment) {
        results.push({
          session_id: sessionId,
          session_title: sessionTitle,
          analysis: analysis.sentiment,
          flower_plot: analysis.sentiment.flower_plot
        });
      }
    }
    return results;
  }, [memoizedSessionIds, analyses]);
  
  // Special getter for topic data (returns single analysis result)
  const getTopicData = useCallback(() => {
    // Topic analysis is typically done on the first session (combined analysis)
    if (memoizedSessionIds.length > 0) {
      const firstSessionId = memoizedSessionIds[0]
      const analysis = analyses[firstSessionId]
      if (analysis?.topics) {
        return analysis.topics
      }
    }
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
    getTopicData,
    // Multi-session sentiment helpers
    getMultiSessionSentimentData,
    saveMultiSessionSentimentData,
    getSessionComboKey
  }
}
