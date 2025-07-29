import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

interface CachedAnalysis {
  sentiment?: any
  topics?: any
  topicAnalysis?: {
    topics: any[]
    summary: string
    analysis_timestamp: string
    text_segments: any[]
    patient_content_stats?: any
    session_id?: string
    language?: string
    version?: string
  }
  customTopics?: {
    searches: any[]
  }
  semanticFrames?: {
    [targetWord: string]: {
      target_word: string
      semantic_frame: any
      visualization: {
        frame_plot: string
      }
      timestamp?: string
      session_id?: string
    }
  }
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
    console.log('[getSentimentData] Session IDs:', memoizedSessionIds);
    console.log('[getSentimentData] Analyses:', analyses);
    
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      console.log(`[getSentimentData] Analysis for session ${sessionId}:`, analysis);
      
      let sessionTitle = `Sessione ${sessionId}`;
      if (analysis && typeof analysis === 'object') {
        if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') sessionTitle = analysis.sessionTitle;
        else if ('title' in analysis && typeof analysis.title === 'string') sessionTitle = analysis.title;
      }
      
      if (analysis && analysis.sentiment) {
        console.log(`[getSentimentData] Found sentiment for session ${sessionId}:`, analysis.sentiment);
        results.push({
          session_id: sessionId,
          session_title: sessionTitle,
          analysis: analysis.sentiment,
          flower_plot: analysis.sentiment.flower_plot
        })
      } else {
        console.log(`[getSentimentData] No sentiment found for session ${sessionId}`);
      }
    }
    
    console.log('[getSentimentData] Final results:', results);
    return results
  }, [memoizedSessionIds, analyses])

  const getTopicData = useCallback(() => {
    return memoizedSessionIds.map(sessionId => {
      const analysis = analyses[sessionId];
      let sessionTitle = `Sessione ${sessionId}`;
      if (analysis && typeof analysis === 'object') {
        if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') sessionTitle = analysis.sessionTitle;
        else if ('title' in analysis && typeof analysis.title === 'string') sessionTitle = analysis.title;
      }
      if (analysis && analysis.topicAnalysis) {
        return {
          session_id: sessionId,
          session_title: sessionTitle,
          topics: analysis.topicAnalysis.topics || [],
          summary: analysis.topicAnalysis.summary || '',
          analysis_timestamp: analysis.topicAnalysis.analysis_timestamp || '',
          text_segments: analysis.topicAnalysis.text_segments || [],
          patient_content_stats: analysis.topicAnalysis.patient_content_stats || null
        }
      }
      // Placeholder se non c'è analisi
      return { session_id: sessionId, session_title: sessionTitle, missing: true };
    });
  }, [memoizedSessionIds, analyses]);

  const getCustomTopicData = useCallback(() => {
    // Aggrega i dati di custom topic analysis per tutte le sessioni
    const results = [];
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      let sessionTitle = `Sessione ${sessionId}`;
      if (analysis && typeof analysis === 'object') {
        if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') sessionTitle = analysis.sessionTitle;
        else if ('title' in analysis && typeof analysis.title === 'string') sessionTitle = analysis.title;
      }
      if (analysis && analysis.customTopics && analysis.customTopics.searches) {
        results.push({
          session_id: sessionId,
          session_title: sessionTitle,
          customTopics: analysis.customTopics
        })
      }
    }
    return results
  }, [memoizedSessionIds, analyses])

  const getTopicAnalysisData = useCallback(() => {
    // Restituisce i dati completi di topic analysis per tutte le sessioni
    const results = [];
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      if (analysis && analysis.topicAnalysis) {
        results.push({
          session_id: sessionId,
          session_title: getSessionTitle(analysis, sessionId),
          topics: analysis.topicAnalysis.topics || [],
          topicAnalysis: analysis.topicAnalysis,
          customTopics: analysis.customTopics,
          text_segments: analysis.topicAnalysis.text_segments || []
        });
      }
    }
    return results;
  }, [memoizedSessionIds, analyses])

  const getSessionTitle = useCallback((analysis: any, sessionId: string) => {
    if (analysis && typeof analysis === 'object') {
      if ('sessionTitle' in analysis && typeof analysis.sessionTitle === 'string') return analysis.sessionTitle;
      if ('title' in analysis && typeof analysis.title === 'string') return analysis.title;
      if ('session_title' in analysis && typeof analysis.session_title === 'string') return analysis.session_title;
    }
    return `Sessione ${sessionId}`;
  }, [])

  // Funzioni per semantic frame analysis
  const getSemanticFrameData = useCallback(() => {
    const results = [];
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      if (analysis && analysis.semanticFrames) {
        results.push({
          session_id: sessionId,
          session_title: getSessionTitle(analysis, sessionId),
          semanticFrames: analysis.semanticFrames
        });
      }
    }
    return results;
  }, [memoizedSessionIds, analyses, getSessionTitle])

  const hasSemanticFrameAnalysis = useCallback((targetWord?: string) => {
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      if (analysis?.semanticFrames) {
        if (targetWord) {
          return targetWord in analysis.semanticFrames;
        }
        return Object.keys(analysis.semanticFrames).length > 0;
      }
    }
    return false;
  }, [memoizedSessionIds, analyses])

  const getAllSemanticFrameWords = useCallback(() => {
    const words = new Set<string>();
    for (const sessionId of memoizedSessionIds) {
      const analysis = analyses[sessionId];
      if (analysis?.semanticFrames) {
        Object.keys(analysis.semanticFrames).forEach(word => words.add(word));
      }
    }
    return Array.from(words);
  }, [memoizedSessionIds, analyses])

  // Funzione per eliminare semantic frame analysis
  const deleteSemanticFrameAnalysis = useCallback(async (sessionId: string, targetWord: string) => {
    try {
      const response = await fetch(`/api/analyses?sessionId=${sessionId}&analysisType=semantic_frame&targetWord=${encodeURIComponent(targetWord)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (data.success) {
        // Aggiorna la cache locale rimuovendo l'analisi
        setAnalyses(prev => {
          const updated = { ...prev }
          if (updated[sessionId]?.semanticFrames) {
            const newSemanticFrames = { ...updated[sessionId].semanticFrames }
            delete newSemanticFrames[targetWord]
            
            if (Object.keys(newSemanticFrames).length === 0) {
              // Se non ci sono più semantic frames, rimuovi tutto il campo
              const { semanticFrames, ...rest } = updated[sessionId]
              updated[sessionId] = rest
            } else {
              updated[sessionId] = {
                ...updated[sessionId],
                semanticFrames: newSemanticFrames
              }
            }
          }
          return updated
        })

        console.log(`✅ Semantic frame analysis "${targetWord}" eliminata per sessione: ${sessionId}`)
        return { success: true }
      } else {
        console.error(`❌ Errore nell'eliminazione semantic frame "${targetWord}":`, data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error(`❌ Errore nella richiesta di eliminazione semantic frame "${targetWord}":`, error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [memoizedSessionIds])

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
    getCustomTopicData,
    // Multi-session sentiment helpers
    getMultiSessionSentimentData,
    saveMultiSessionSentimentData,
    getSessionComboKey,
    // Semantic frame helpers
    getSemanticFrameData,
    hasSemanticFrameAnalysis,
    getAllSemanticFrameWords,
    deleteSemanticFrameAnalysis
  }
}
