"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Brain, Loader2, MessageCircle, FileText, Eye, EyeOff, Search, Plus, X, History, Database, ChevronLeft, ChevronRight } from "lucide-react"
import { extractPatientContent } from "@/lib/text-utils"

interface Session {
  id: string
  title: string
  transcript: string
}

interface Topic {
  topic_id: number
  keywords: string[]
  description: string
}

// Aggiorna l'interfaccia AnalysisResult per includere opzionalmente session_title e title
interface AnalysisResult {
  session_id: string;
  topics: Topic[];
  summary: string;
  analysis_timestamp: string;
  text_segments?: TextSegment[];
  topicAnalysis?: {
    topics: Topic[];
    summary: string;
    analysis_timestamp: string;
    text_segments: TextSegment[];
    patient_content_stats?: {
      originalLength: number;
      patientContentLength: number;
      reductionPercentage: number;
      originalTranscript: string;
      patientContent: string;
    };
    session_id?: string;
    language?: string;
    version?: string;
  };
  patient_content_stats?: {
    originalLength: number;
    patientContentLength: number;
    reductionPercentage: number;
    originalTranscript: string;
    patientContent: string;
  };
  session_title?: string;
  title?: string;
}

// Aggiorno l'interfaccia CustomTopicSearchResult
interface CustomTopicSearchResult {
  query: string
  timestamp: string
  sessions: Array<{ id: string; title: string }>
  results: Array<{
    sessionId: string
    sessionTitle: string
    topics: Array<{
      topic: string
      relevantSegments: TextSegment[]
      totalMatches: number
      confidence: number
      error?: string
    }>
  }>
  summary: string
}

interface TextSegment {
  text: string
  topic_id: number | null
  confidence: number
}

interface TopicAnalysisProps {
  selectedSessions: Session[]
  combinedTranscript: string
  onAnalysisComplete?: (result: AnalysisResult | CustomTopicSearchResult) => void
  cachedData?: any // Dati topic analysis dalla cache
  onRequestAnalysis?: (sessionId: string) => void; // Aggiunto per avviare l'analisi
}

export default function TopicAnalysisComponent({ 
  selectedSessions, 
  combinedTranscript, 
  onAnalysisComplete,
  cachedData,
  onRequestAnalysis
}: TopicAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // Cambia il tipo di stato analysisResult per accettare anche array
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | AnalysisResult[] | null>(null);
  const [customSearchResult, setCustomSearchResult] = useState<CustomTopicSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTextView, setShowTextView] = useState(false)
  const [showCustomTextView, setShowCustomTextView] = useState(false)
  
  // Nuovi stati per i topic personalizzati
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customTopics, setCustomTopics] = useState<string[]>([''])
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState<string>('')
  
  // Stati per le ricerche salvate
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [isLoadingSearches, setIsLoadingSearches] = useState(false)
  const [selectedCustomSearchId, setSelectedCustomSearchId] = useState<string>("");
  // AGGIUNTA: stato per tracciare l'ultima ricerca custom creata
  type LastCreatedCustomSearch = { id: string } | null;
  const [lastCreatedCustomSearch, setLastCreatedCustomSearch] = React.useState<LastCreatedCustomSearch>(null);

  // Funzioni per gestire i topic personalizzati
  const addCustomTopic = () => {
    setCustomTopics([...customTopics, ''])
  }

  const removeCustomTopic = (index: number) => {
    if (customTopics.length > 1) {
      setCustomTopics(customTopics.filter((_, i) => i !== index))
    }
  }

  const updateCustomTopic = (index: number, value: string) => {
    const newTopics = [...customTopics]
    newTopics[index] = value
    setCustomTopics(newTopics)
  }

  // Funzioni per gestire le ricerche salvate
  const loadSavedSearches = async () => {
    setIsLoadingSearches(true)
    try {
      const response = await fetch('/api/saved-custom-searches')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSavedSearches(result.searches || [])
        }
      }
    } catch (error) {
      console.error('Error loading saved searches:', error)
    } finally {
      setIsLoadingSearches(false)
    }
  }

  const loadSavedSearch = (searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId)
    if (search) {
      // Carica i risultati della ricerca salvata
      setCustomSearchResult({
        query: search.query,
        timestamp: search.timestamp,
        sessions: search.sessions,
        results: search.results,
        summary: search.summary
      })
      setSelectedCustomSearchId(searchId)
    }
  }

  // Filtra le analisi precedenti per mostrare solo quelle delle sessioni selezionate
  const relevantSearches = savedSearches.filter(search => {
    const selectedSessionIds = selectedSessions.map(s => s.id)
    return search.results.some(result => selectedSessionIds.includes(result.sessionId))
  })

  // Filtro di unicità sugli id (o timestamp/query) prima del rendering
  const uniqueSearches = [];
  const seenKeys = new Set();
  for (let i = 0; i < relevantSearches.length; i++) {
    const s = relevantSearches[i];
    const key = s.id || s.timestamp || s.query || String(i);
    if (!seenKeys.has(key)) {
      uniqueSearches.push(s);
      seenKeys.add(key);
    }
  }

  // Carica automaticamente i dati cachati quando cambia la cache, la selezione o la modalità
  React.useEffect(() => {
    console.log('📦 Cached data received:', cachedData)
    console.log('📦 Selected sessions:', selectedSessions.map(s => ({ id: s.id, title: s.title })))
    
    if (cachedData && selectedSessions.length > 0) {
      // Caso 1: cachedData è un array di risultati (topicData)
      if (Array.isArray(cachedData)) {
        setAnalysisResult(cachedData);
      }
      // Caso 2: cachedData è un oggetto singolo con session_id e topics
      else if (cachedData.session_id && cachedData.topics) {
        setAnalysisResult(cachedData);
      }
      // Caso 3: fallback
      else {
        setAnalysisResult(null);
      }
      // Carica custom topics - solo se siamo in modalità custom
      if (
        cachedData.customTopics &&
        cachedData.customTopics.searches &&
        Array.isArray(cachedData.customTopics.searches) &&
        cachedData.customTopics.searches.length > 0 &&
        isCustomMode
      ) {
        console.log('📦 Loading cached custom topics data:', cachedData.customTopics)
        // Prendi l'ultima ricerca custom
        const lastSearch = cachedData.customTopics.searches[cachedData.customTopics.searches.length - 1]
        setCustomSearchResult(lastSearch)
        setSavedSearches(cachedData.customTopics.searches)
      }
    }
  }, [cachedData, isCustomMode, isAnalyzing, selectedSessions])

  // Carica le ricerche salvate quando si attiva la modalità custom
  React.useEffect(() => {
    if (isCustomMode && savedSearches.length === 0) {
      loadSavedSearches()
    }
  }, [isCustomMode, savedSearches.length])

  // Aggiorna sempre la lista delle analisi custom quando cambia la selezione delle sessioni o si entra in custom mode
  React.useEffect(() => {
    if (isCustomMode) {
      loadSavedSearches();
    }
  }, [selectedSessions.map(s => s.id).join(','), isCustomMode]);

  // useEffect per selezionare la nuova ricerca appena creata
  React.useEffect(() => {
    if (lastCreatedCustomSearch && relevantSearches.some(s => s.id === lastCreatedCustomSearch.id)) {
      setSelectedCustomSearchId(lastCreatedCustomSearch.id)
      setLastCreatedCustomSearch(null)
    }
  }, [lastCreatedCustomSearch, relevantSearches])

  // Mantieni solo questo effetto per azzerare la selezione quando cambi tab custom/auto
  React.useEffect(() => {
    setSelectedCustomSearchId("");
  }, [isCustomMode]);

  const runCustomTopicSearch = async () => {
    const validTopics = customTopics.filter(topic => topic.trim().length > 0)
    
    if (validTopics.length === 0) {
      setError("Inserisci almeno un topic da cercare")
      return
    }

    setIsSearching(true)
    setError(null)
    setCustomSearchResult(null)
    setSearchProgress(`Preparazione ricerca per ${validTopics.length} topic...`)

    try {
      const response = await fetch('/api/custom-topic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionIds: selectedSessions.map(s => s.id),
          customTopics: validTopics
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP Error: ${response.status}`)
      }

      setSearchProgress('Elaborazione risultati...')
      const result = await response.json()
      
      if (result.success) {
        setCustomSearchResult(result.data)
        onAnalysisComplete?.(result.data)
        setSearchProgress('')
        // AGGIUNTA: aggiorna la tab ricaricando le ricerche salvate
        await loadSavedSearches()
        // AGGIUNTA: seleziona la nuova ricerca appena creata
        if (result.data && result.data.timestamp) {
          setLastCreatedCustomSearch({ id: result.data.timestamp })
        }
      } else {
        throw new Error(result.error || 'Errore sconosciuto')
      }

    } catch (error) {
      console.error('Errore durante la ricerca personalizzata:', error)
      setError(error instanceof Error ? error.message : 'Errore sconosciuto durante la ricerca')
      setSearchProgress('')
    } finally {
      setIsSearching(false)
    }
  }

  const runTopicAnalysis = async () => {
    if (!combinedTranscript || combinedTranscript.trim().length === 0) {
      setError("No transcript available for analysis")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log(`Starting topic analysis for ${selectedSessions.length} sessions`)

      let allTopics: Topic[] = []
      let allSummaries: string[] = []

      if (selectedSessions.length > 1) {
        // Multi-session analysis: analizza tutte le sessioni selezionate
        console.log('Multi-session analysis mode')
        
        // Analizza ogni sessione separatamente
        for (let i = 0; i < selectedSessions.length; i++) {
          const session = selectedSessions[i]
          console.log(`Analyzing session ${i + 1}/${selectedSessions.length}: ${session.title}`)

          // Normalizza la struttura del transcript per l'analisi
          const normalizedTranscript = normalizeTranscriptStructure(session.transcript);

          const response = await fetch('/api/single-session-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: session.id,
              transcript: normalizedTranscript
              // L'API estrae automaticamente il contenuto del paziente
            }),
          })

          if (response.ok) {
            const sessionResult = await response.json()
            
            // Aggiungi i topic di questa sessione con ID univoci
            const sessionTopics = sessionResult.topics.map((topic: Topic) => ({
              ...topic,
              topic_id: allTopics.length + topic.topic_id, // Rendi univoco l'ID
              description: topic.description // Rimuovi riferimento al documento
            }))
            
            allTopics.push(...sessionTopics)
            allSummaries.push(`${session.title}: ${sessionResult.summary}`)
            
            console.log(`Session ${i + 1}: Found ${sessionTopics.length} topics`)
          } else {
            console.error(`Session ${i + 1} analysis failed:`, response.status)
          }

          // Pausa tra le analisi
          if (i < selectedSessions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        // If there are too many topics, consolidate similar ones
        if (allTopics.length > 8) {
          console.log(`Consolidating ${allTopics.length} topics`)
          allTopics = await consolidateTopics(allTopics)
        }

      } else {
        // Sessione singola: usa l'approccio originale
        // Normalizza la struttura del transcript combinato
        const normalizedCombinedTranscript = normalizeTranscriptStructure(combinedTranscript);
        
        const response = await fetch('/api/single-session-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: `combined_${Date.now()}`,
            transcript: normalizedCombinedTranscript
          }),
        })

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        allTopics = result.topics
        allSummaries = [result.summary]
      }

      // Crea il risultato combinato
      const result = {
        session_id: `multi_session_${Date.now()}`,
        topics: allTopics,
        summary: allSummaries.join(' | '),
        analysis_timestamp: new Date().toISOString(),
        language: 'italian',
        version: '1.0.0'
      }

      setAnalysisResult(result)
      onAnalysisComplete?.(result)

      // Classifica automaticamente il testo se l'analisi è riuscita
      if (allTopics.length > 0) {
        console.log('Starting text classification...')
        const textSegments = await classifyTextToTopicsSeparately(selectedSessions, allTopics)
        
        // Aggiorna il risultato con i segmenti classificati
        const updatedResult = {
          ...result,
          text_segments: textSegments
        }
        
        setAnalysisResult(updatedResult)
        onAnalysisComplete?.(updatedResult)
        
        // Salva il risultato per ogni sessione
        for (const session of selectedSessions) {
          try {
            const response = await fetch('/api/analyses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                sessionId: session.id,
                analysisType: 'topics',
                analysisData: updatedResult
              })
            })

            if (response.ok) {
              console.log(`✅ Topic analysis saved for session: ${session.id}`)
            } else {
              console.error(`❌ Failed to save topic analysis for session: ${session.id}`)
            }
          } catch (error) {
            console.error(`❌ Error saving topic analysis for session ${session.id}:`, error)
          }
        }
        
        console.log(`Classification completed: ${textSegments.length} segments`)
      }

    } catch (error) {
      console.error('Errore durante l\'analisi:', error)
      setError(error instanceof Error ? error.message : 'Unknown error during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Nuova funzione per analizzare una singola sessione specifica
  const runSingleSessionAnalysis = async (sessionId: string) => {
    const targetSession = selectedSessions.find(s => s.id === sessionId)
    if (!targetSession) {
      setError("Sessione non trovata")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log(`Starting single session analysis for: ${targetSession.title}`)

      // Normalizza la struttura del transcript per l'analisi
      const normalizedTranscript = normalizeTranscriptStructure(targetSession.transcript);

      const response = await fetch('/api/single-session-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: targetSession.id,
          transcript: normalizedTranscript
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      // Classifica il testo per questa sessione
      console.log('Starting text classification for single session...')
      const textSegments = await classifyTextToTopicsSeparately([targetSession], result.topics)
      
      const finalResult = {
        ...result,
        text_segments: textSegments,
        session_title: targetSession.title
      }

      // Salva il risultato per questa sessione specifica
      if (onAnalysisComplete) {
        onAnalysisComplete(finalResult)
      }

      // Salva anche nel database
      try {
        const saveResponse = await fetch('/api/analyses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: targetSession.id,
            analysisType: 'topics',
            analysisData: finalResult
          })
        })

        if (saveResponse.ok) {
          console.log(`✅ Topic analysis saved for session: ${targetSession.id}`)
        } else {
          console.error(`❌ Failed to save topic analysis for session: ${targetSession.id}`)
        }
      } catch (error) {
        console.error(`❌ Error saving topic analysis for session ${targetSession.id}:`, error)
      }

      console.log(`Single session analysis completed: ${textSegments.length} segments`)

    } catch (error) {
      console.error('Errore durante l\'analisi della sessione singola:', error)
      setError(error instanceof Error ? error.message : 'Unknown error during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const consolidateTopics = async (topics: Topic[]): Promise<Topic[]> => {
    // Se abbiamo 8 o meno topic, non consolidare
    if (topics.length <= 8) {
      return topics
    }

    console.log(`Consolidating ${topics.length} topics into max 8`)

    try {
      const topicDescriptions = topics.map(t => 
        `${t.topic_id}: ${t.description} (${t.keywords.join(', ')})`
      ).join('\n')

      const consolidationPrompt = `
Analizza questi topic e raggruppa quelli simili per ridurre il numero totale a massimo 8 topic principali.

TOPIC DA CONSOLIDARE:
${topicDescriptions}

ISTRUZIONI:
- Raggruppa topic simili o correlati
- Mantieni i topic più importanti e specifici
- Crea descrizioni che rappresentino i topic consolidati
- Combina le parole chiave dei topic raggruppati
- Massimo 8 topic finali

Rispondi SOLO con JSON:
{
  "consolidated_topics": [
    {
      "topic_id": 1,
      "description": "descrizione_consolidata",
      "keywords": ["parola1", "parola2", "parola3", "parola4"]
    }
  ]
}
`

      const response = await fetch('/api/classify-text-segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: [consolidationPrompt],
          topics: "consolidation",
          session_id: `consolidate_${Date.now()}`,
          isTopicConsolidation: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.segments?.[0]?.text || '{}'
        
        try {
          const parsed = JSON.parse(content)
          if (parsed.consolidated_topics && Array.isArray(parsed.consolidated_topics)) {
            console.log(`Consolidated to ${parsed.consolidated_topics.length} topics`)
            return parsed.consolidated_topics
          }
        } catch (parseError) {
          console.error('Failed to parse consolidation result:', parseError)
        }
      }
    } catch (error) {
      console.error('Topic consolidation failed:', error)
    }

    // Fallback: take the first 8 topics
    console.log('Using fallback: taking first 8 topics')
    return topics.slice(0, 8)
  }
  
  const getTopicColor = (topicId: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-orange-100 text-orange-800'
    ]
    return colors[(topicId - 1) % colors.length]
  }

  const getTopicBackgroundColor = (topicId: number | null) => {
    if (topicId === null) return 'bg-gray-100 text-gray-600'
    
    const backgroundColors = [
      'bg-blue-100 text-blue-900',
      'bg-green-100 text-green-900', 
      'bg-yellow-100 text-yellow-900',
      'bg-red-100 text-red-900',
      'bg-purple-100 text-purple-900',
      'bg-indigo-100 text-indigo-900',
      'bg-pink-100 text-pink-900',
      'bg-orange-100 text-orange-900'
    ]
    return backgroundColors[(topicId - 1) % backgroundColors.length]
  }

  const classifyTextToTopicsSeparately = async (sessions: Session[], topics: Topic[]) => {
    if (sessions.length === 0 || topics.length === 0) {
      console.log('No sessions or topics found')
      return []
    }

    const topicList = topics.map(t => `${t.topic_id}: ${t.description} (parole chiave: ${t.keywords.join(', ')})`).join('\n')
    console.log(`Processing ${sessions.length} sessions separately`)
    console.log('📋 Topics disponibili:', topics.map(t => `${t.topic_id}: ${t.description}`));

    let allSegments: TextSegment[] = []

    try {
      // Processa ogni sessione separatamente
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i]
        console.log(`Processing session ${i + 1}/${sessions.length}: ${session.title}`)

        // Normalizza la struttura del transcript per l'analisi
        const normalizedTranscript = normalizeTranscriptStructure(session.transcript);
        
        // Estrai il contenuto del paziente per questa sessione
        const patientContent = extractPatientContent(normalizedTranscript)
        console.log(`📊 Sessione ${session.id}: ${session.transcript.length} → ${normalizedTranscript.length} → ${patientContent.length} caratteri`)

        // Split patient text into sentences
        const allSentences = patientContent
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 15)

        console.log(`Session ${i + 1}: ${allSentences.length} total sentences (patient content only)`)

        if (allSentences.length === 0) {
          console.log(`Session ${i + 1}: No sentences found, skipping`)
          continue
        }

        // Add a separator between sessions if not the first
        if (i > 0) {
          allSegments.push({
            text: `\n--- ${session.title} ---\n`,
            topic_id: null,
            confidence: 0
          })
        }

        // Sequential classification with growing context
        const sessionSegments = await classifyWithContext(allSentences, topicList, session.id)
        allSegments.push(...sessionSegments)

        // Pause between sessions to avoid rate limiting
        if (i < sessions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`Total segments from all sessions: ${allSegments.length}`)
      console.log(`Segments with topics: ${allSegments.filter(s => s.topic_id !== null).length}`)
      
      return allSegments

    } catch (error) {
      console.error('Error in text classification:', error)
      return []
    }
  }

  const classifyWithContext = async (sentences: string[], topicList: string, sessionId: string): Promise<TextSegment[]> => {
    const segments: TextSegment[] = []
    
    // Processa i blocchi di frasi
    const chunkSize = 20 // Processa 20 frasi alla volta
    for (let chunkIndex = 0; chunkIndex < sentences.length; chunkIndex += chunkSize) {
      const sentenceChunk = sentences.slice(chunkIndex, chunkIndex + chunkSize)
      console.log(`Processing chunk ${Math.floor(chunkIndex / chunkSize) + 1}: ${sentenceChunk.length} sentences`)

      try {
        // Prima classificazione: prova a classificare tutte le frasi del blocco
        const response = await fetch('/api/classify-text-segments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sentences: sentenceChunk,
            topics: topicList,
            session_id: `${sessionId}_chunk_${chunkIndex}_${Date.now()}`
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const initialClassifications = result.segments || []

          // Processa ogni frase del blocco sequenzialmente
          for (let sentenceIndex = 0; sentenceIndex < sentenceChunk.length; sentenceIndex++) {
            const sentence = sentenceChunk[sentenceIndex]
            const initialClassification = initialClassifications[sentenceIndex]
            
            let finalSegment: TextSegment

            // Se la classificazione iniziale ha un topic valido, usala
            if (initialClassification?.topic_id && initialClassification.topic_id > 0) {
              finalSegment = {
                text: sentence,
                topic_id: initialClassification.topic_id,
                confidence: initialClassification.confidence || 0.5
              }
              console.log(`Sentence ${chunkIndex + sentenceIndex + 1}: Direct classification -> Topic ${finalSegment.topic_id}`)
            } else {
              // Altrimenti, prova la classificazione con contesto
              console.log(`Sentence ${chunkIndex + sentenceIndex + 1}: Needs context classification`)
              finalSegment = await classifySingleWithContext(
                sentence, 
                segments, 
                topicList, 
                sessionId, 
                chunkIndex + sentenceIndex
              )
            }

            segments.push(finalSegment)
          }
        } else {
          console.error(`Chunk classification error:`, response.status, response.statusText)
          
          // Fallback per il blocco
          sentenceChunk.forEach(sentence => {
            segments.push({
              text: sentence,
              topic_id: null,
              confidence: 0
            })
          })
        }
      } catch (error) {
        console.error('Error in chunk classification:', error)
        
        // Fallback per il blocco
        sentenceChunk.forEach(sentence => {
          segments.push({
            text: sentence,
            topic_id: null,
            confidence: 0
          })
        })
      }

      // Pausa tra i blocchi
      if (chunkIndex + chunkSize < sentences.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    return segments
  }

  const classifySingleWithContext = async (
    sentence: string, 
    previousSegments: TextSegment[], 
    topicList: string, 
    sessionId: string, 
    sentenceIndex: number
  ): Promise<TextSegment> => {
    
    // Prova con contesto crescente: 1 frase, poi 2 frasi precedenti
    for (let contextSize = 1; contextSize <= 2; contextSize++) {
      const contextSegments = previousSegments.slice(-contextSize)
      
      if (contextSegments.length === 0) {
        // Nessun contesto disponibile
        break
      }

      const contextSentences = contextSegments.map(seg => seg.text)
      const contextTopics = contextSegments.map(seg => 
        seg.topic_id ? `Topic ${seg.topic_id}` : 'Non classificato'
      )

      console.log(`Trying context classification for sentence ${sentenceIndex + 1} with ${contextSize} previous sentences`)

      try {
        const contextPrompt = `
CONTESTO PRECEDENTE:
${contextSentences.map((sent, i) => `${i + 1}. "${sent}" -> ${contextTopics[i]}`).join('\n')}

FRASE DA CLASSIFICARE:
"${sentence}"

TOPIC DISPONIBILI:
${topicList}

Considerando il contesto delle frasi precedenti e i loro topic assegnati, classifica la frase corrente. 
Se il contesto suggerisce un topic specifico, usalo. Altrimenti assegna il topic più appropriato basandoti sul contenuto.

Rispondi SOLO con JSON:
{"topic_id": numero_o_null, "confidence": valore_0_a_1, "reasoning": "breve_spiegazione"}
`

        const response = await fetch('/api/classify-text-segments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sentences: [contextPrompt],
            topics: topicList,
            session_id: `${sessionId}_context_${contextSize}_${Date.now()}`,
            isContextClassification: true
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const classification = result.segments?.[0]
          
          if (classification?.topic_id && classification.topic_id > 0) {
            console.log(`Context classification (${contextSize} sentences) successful -> Topic ${classification.topic_id}`)
            return {
              text: sentence,
              topic_id: classification.topic_id,
              confidence: classification.confidence || 0.4
            }
          }
        }
      } catch (error) {
        console.error(`Context classification failed for context size ${contextSize}:`, error)
      }

      // Small pause between attempts
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // If all attempts fail, try to inherit the topic from the previous sentence if it makes sense
    const lastSegmentWithTopic = previousSegments.slice().reverse().find(seg => seg.topic_id !== null)
    
    if (lastSegmentWithTopic && previousSegments.length > 0) {
      console.log(`Inheriting topic ${lastSegmentWithTopic.topic_id} from previous context`)
      return {
        text: sentence,
        topic_id: lastSegmentWithTopic.topic_id,
        confidence: 0.2 // Low confidence for inherited topic
      }
    }

    // Last fallback: unclassified
    console.log(`No classification possible for sentence ${sentenceIndex + 1}`)
    return {
      text: sentence,
      topic_id: null,
      confidence: 0
    }
  }

  // 1. Stato per gestire il mapping topicId -> ref
  const topicRefs = useRef<{ [topicId: number]: HTMLSpanElement | null }>({})
  const firstTopicSegmentRenderedRef = useRef<Record<number, boolean>>({})

  // Resetto il tracking ogni volta che cambia l'analisi
  useEffect(() => {
    firstTopicSegmentRenderedRef.current = {}
  }, [analysisResult, showTextView])

  // Funzione per scrollare al primo segmento del topic
  const scrollToTopic = (topicId: number) => {
    console.log('🎯 scrollToTopic chiamata con topicId:', topicId)
    console.log('🎯 topicRefs.current:', topicRefs.current)
    console.log('🎯 Chiavi disponibili in topicRefs:', Object.keys(topicRefs.current))
    
    const el = topicRefs.current[topicId]
    console.log('🎯 Elemento trovato:', el)
    
    if (el) {
      console.log('🎯 Scrolling to element...')
      console.log('🎯 Elemento text content:', el.textContent?.substring(0, 100))
      
      // Trova il contenitore scrollabile
      const scrollContainer = el.closest('.overflow-y-auto')
      console.log('🎯 Scroll container:', scrollContainer)
      
      if (scrollContainer) {
        // Calcola la posizione dell'elemento rispetto al contenitore
        const containerRect = scrollContainer.getBoundingClientRect()
        const elementRect = el.getBoundingClientRect()
        
        // Calcola la posizione relativa dell'elemento rispetto al contenitore
        const relativeTop = elementRect.top - containerRect.top
        const scrollTop = scrollContainer.scrollTop + relativeTop - 50
        
        console.log('🎯 Container rect:', containerRect)
        console.log('🎯 Element rect:', elementRect)
        console.log('🎯 Relative top:', relativeTop)
        console.log('🎯 Current scrollTop:', scrollContainer.scrollTop)
        console.log('🎯 Scrolling to position:', scrollTop)
        
        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      } else {
        // Fallback: usa scrollIntoView
        console.log('🎯 Usando fallback scrollIntoView')
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      
      el.classList.add('ring-2', 'ring-blue-400')
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 1200)
    } else {
      console.log('❌ Nessun elemento trovato per topicId:', topicId)
      console.log('❌ Controlla che il topic sia stato mappato correttamente nel testo')
    }
  }

  // Prima di mappare i segmenti nella modalità testo (dentro CardContent, showTextView true)
  let firstTopicSegmentRendered: Record<number, boolean> = {}

  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  // Reset currentSessionIndex quando cambiano le sessioni selezionate
  React.useEffect(() => {
    if (currentSessionIndex >= selectedSessions.length) {
      setCurrentSessionIndex(0);
    }
  }, [selectedSessions.length, currentSessionIndex]);

  // topicSessions: array di AnalysisResult, uno per sessione selezionata
  const topicSessions = React.useMemo(() => {
    if (!analysisResult) return [];
    if (Array.isArray(analysisResult)) return analysisResult;
    // Se analysisResult è singolo, restituisci come array
    return [analysisResult];
  }, [analysisResult]);

  const allTopicSessions = selectedSessions.map((s) => {
    const found = topicSessions.find(ts => ts.session_id === s.id);
    if (found) return found;
    return { session_id: s.id, session_title: s.title, missing: true };
  });

  const goToPreviousSession = () => {
    setCurrentSessionIndex(prev => prev > 0 ? prev - 1 : allTopicSessions.length - 1);
  };
  const goToNextSession = () => {
    setCurrentSessionIndex(prev => prev < allTopicSessions.length - 1 ? prev + 1 : 0);
  };

  // DEBUG: logga lo stato delle variabili chiave
  console.log('[DEBUG TopicModeling]', {
    analysisResult,
    isCustomMode,
    topicSessionsLength: topicSessions.length,
    selectedSessionsLength: selectedSessions.length
  });

  // Type guard per distinguere tra sessione con analisi e placeholder
  function isTopicAnalysis(obj: any): obj is AnalysisResult {
    return obj && Array.isArray(obj.topics);
  }

  // Funzione per normalizzare la struttura del transcript per il topic modeling
  const normalizeTranscriptStructure = (transcript: string): string => {
    if (!transcript) return transcript;
    
    console.log('🔧 [Topic Modeling] Normalizing transcript structure...');
    console.log('📝 [Topic Modeling] Original transcript (first 200 chars):', transcript.substring(0, 200));
    
    // Check if the transcript is already properly formatted
    const hasProperStructure = /(Paziente:|Terapeuta:)\s*\n/.test(transcript);
    
    if (hasProperStructure) {
      console.log('✅ [Topic Modeling] Transcript already has proper structure, skipping normalization');
      return transcript;
    }
    
    // Rimuovi tutti i newline e metti tutto su una riga
    let normalized = transcript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Aggiungi newline prima e dopo ogni speaker marker per creare la struttura richiesta
    // Formato: [interlocutore]\n[paragrafo]\n[interlocutore]\n etc
    // Regex specifici per "Paziente:" e "Terapeuta:"
    normalized = normalized
      .replace(/(Paziente:)/g, '\n$1\n')
      .replace(/(Terapeuta:)/g, '\n$1\n')
      // Fallback per altri marker
      .replace(/(P:|T:|THERAPIST:|Therapist:)/gi, '\n$1\n');
    
    // Rimuovi newline multipli consecutivi e normalizza
    normalized = normalized
      .replace(/\n\s*\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim();
    
    // Se non ci sono speaker markers, aggiungi un marker di default per il paziente
    if (!/(Paziente:|Terapeuta:|P:|T:|THERAPIST:|Therapist:)/gi.test(normalized)) {
      normalized = `Paziente:\n${normalized}`;
    }
    
    // Assicurati che la struttura sia corretta: ogni speaker marker deve essere seguito da un newline
    // e ogni paragrafo deve essere separato da un newline
    normalized = normalized
      .replace(/(Paziente:|Terapeuta:|P:|T:|THERAPIST:|Therapist:)([^\n])/gi, '$1\n$2')
      .replace(/([^\n])(Paziente:|Terapeuta:|P:|T:|THERAPIST:|Therapist:)/gi, '$1\n$2');
    
    console.log('✅ [Topic Modeling] Normalized transcript (first 200 chars):', normalized.substring(0, 200));
    console.log('🔍 [Topic Modeling] Speaker markers found:', (normalized.match(/(Paziente:|Terapeuta:|P:|T:|THERAPIST:|Therapist:)/gi) || []).length);
    
    return normalized;
  };

  // Funzione per formattare il transcript per la visualizzazione HTML
  const formatTranscriptForDisplay = (transcript: string): string => {
    const normalized = normalizeTranscriptStructure(transcript);
    // Converti \n in <br/> per il rendering HTML
    return normalized.replace(/\n/g, '<br/>');
  };

  // Nuova funzione per mappare i risultati del topic modeling alla trascrizione completa
  // Approccio semplice e diretto: mapping basato su ricerca esatta e fuzzy
  const mapTopicResultsToFullTranscript = (session: Session, patientSegments: TextSegment[]): TextSegment[] => {
    // Normalizza la struttura del transcript per il topic modeling
    const normalizedTranscript = normalizeTranscriptStructure(session.transcript);
    const fullTranscript = normalizedTranscript;
    
    // Se non ci sono segmenti del paziente, restituisci la trascrizione completa senza evidenziazione
    if (!patientSegments || patientSegments.length === 0) {
      return [{
        text: fullTranscript,
        topic_id: null,
        confidence: 0
      }];
    }

    // Estrai il contenuto del paziente dalla trascrizione completa
    const patientContent = extractPatientContent(fullTranscript);
    
    // Se non c'è contenuto del paziente, restituisci la trascrizione senza evidenziazione
    if (!patientContent || patientContent.trim().length === 0) {
      return [{
        text: fullTranscript,
        topic_id: null,
        confidence: 0
      }];
    }

    // APPROCCIO MIGLIORATO: Dividi la trascrizione per speaker e cerca match più flessibili
    const fullSegments: TextSegment[] = [];
    
    // Pattern per identificare speaker
    const speakerPattern = /(PAZIENTE:|P:|Terapeuta:|Paziente:)/gi;
    
    // Dividi la trascrizione mantenendo i separatori
    const parts = fullTranscript.split(speakerPattern);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Se questa parte è un marker di speaker
      if (speakerPattern.test(part)) {
        // Aggiungi il marker senza evidenziazione
        fullSegments.push({
          text: part,
          topic_id: null,
          confidence: 0
        });
        
        // La prossima parte sarà il contenuto dello speaker
        if (i + 1 < parts.length) {
          const content = parts[i + 1];
          
          // Determina se questo è contenuto del paziente
          const isPatientContent = /^(PAZIENTE:|P:|Paziente:)/gi.test(part);
          
          if (isPatientContent && content) {
            // CERCA MATCH PIÙ FLESSIBILI
            let bestTopicId: number | null = null;
            let bestConfidence = 0;
            
            // Normalizza il contenuto per il confronto
            const normalizedContent = content.toLowerCase().trim();
            
            // Prima prova: ricerca esatta
            for (const segment of patientSegments) {
              if (segment.topic_id === null) continue;
              
              const normalizedSegment = segment.text.toLowerCase().trim();
              
              // Match esatto
              if (normalizedContent === normalizedSegment) {
                bestTopicId = segment.topic_id;
                bestConfidence = segment.confidence;
                break;
              }
            }
            
            // Se non hai trovato match esatti, prova con match parziali
            if (bestTopicId === null) {
              for (const segment of patientSegments) {
                if (segment.topic_id === null) continue;
                
                const normalizedSegment = segment.text.toLowerCase().trim();
                
                // Match contenuto (il segmento è contenuto nel contenuto)
                if (normalizedContent.includes(normalizedSegment) && normalizedSegment.length > 15) {
                  if (segment.confidence > bestConfidence) {
                    bestTopicId = segment.topic_id;
                    bestConfidence = segment.confidence;
                  }
                }
              }
            }
            
            // Se ancora non hai trovato match, prova con frasi più piccole
            if (bestTopicId === null) {
              // Dividi il contenuto in frasi più piccole
              const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
              
              for (const sentence of sentences) {
                const normalizedSentence = sentence.toLowerCase().trim();
                
                for (const segment of patientSegments) {
                  if (segment.topic_id === null) continue;
                  
                  const normalizedSegment = segment.text.toLowerCase().trim();
                  
                  // Match esatto per frase
                  if (normalizedSentence === normalizedSegment) {
                    if (segment.confidence > bestConfidence) {
                      bestTopicId = segment.topic_id;
                      bestConfidence = segment.confidence;
                    }
                  }
                  
                  // Match parziale per frase
                  if (normalizedSentence.includes(normalizedSegment) && normalizedSegment.length > 10) {
                    if (segment.confidence > bestConfidence) {
                      bestTopicId = segment.topic_id;
                      bestConfidence = segment.confidence;
                    }
                  }
                }
              }
            }
            
            // Aggiungi il contenuto con il topic trovato
            fullSegments.push({
              text: content,
              topic_id: bestTopicId,
              confidence: bestConfidence
            });
            
            // Debug logging per il mapping
            if (bestTopicId !== null) {
              console.log('🎨 [Mapping] Topic assegnato:', bestTopicId, 'confidence:', bestConfidence, 'text:', content.substring(0, 50) + '...');
            }
          } else {
            // Contenuto del terapeuta o altro
            fullSegments.push({
              text: content,
              topic_id: null,
              confidence: 0
            });
          }
          
          i++; // Salta la prossima parte (contenuto)
        }
      } else {
        // Questa è una parte normale (non un marker di speaker)
        fullSegments.push({
          text: part,
          topic_id: null,
          confidence: 0
        });
      }
    }
    
    // Debug: riassunto del mapping
    const mappedTopics = fullSegments.filter(s => s.topic_id !== null).map(s => s.topic_id);
    const uniqueTopics = Array.from(new Set(mappedTopics));
    console.log('🎨 [Mapping] Riassunto:', {
      totalSegments: fullSegments.length,
      mappedSegments: mappedTopics.length,
      uniqueTopics: uniqueTopics.length,
      topics: uniqueTopics
    });
    
    return fullSegments;
  };

  return (
    <div className="h-full space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            Topic Analysis
            {cachedData && !isCustomMode && (
              <Badge variant="secondary" className="text-xs">
                Cached
              </Badge>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            {selectedSessions.length > 0 
              ? `${selectedSessions.length} sessions selected` 
              : 'No session selected'}
          </p>
        </div>
        
        {/* Pulsante per cambiare modalità */}
        <Button
          variant="outline"
          onClick={() => {
            setIsCustomMode(!isCustomMode);
            // Se stai entrando in custom mode, aggiorna subito la lista e azzera il risultato
            if (!isCustomMode) {
              loadSavedSearches();
              setCustomSearchResult(null);
              setSelectedCustomSearchId("");
            }
            setAnalysisResult(null);
            setError(null);
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          {isCustomMode ? (
            <>
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Auto Discovery</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Custom Topics</span>
            </>
          )}
        </Button>
      </div>

     

      {/* Modalità Auto Discovery */}
      {!isCustomMode && (
        <Button 
          onClick={runTopicAnalysis}
          disabled={isAnalyzing || !combinedTranscript || combinedTranscript.trim().length === 0}
          className="flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizzando...
            </>
          ) : (
            <>
              Avvia Analisi Topic (Tutte le Sessioni)
            </>
          )}
        </Button>
      )}

      {/* Modalità Custom Topics */}
      {isCustomMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Ricerca Topic Personalizzati
            </CardTitle>
            <CardDescription>
              Inserisci topic specifici che vuoi cercare nelle sessioni selezionate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Menu a tendina per ricerche passate */}
            {isLoadingSearches ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Caricamento ricerche precedenti...</span>
              </div>
            ) : uniqueSearches.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Analisi precedenti ({uniqueSearches.length})
                </Label>
                
                {/* Griglia delle analisi precedenti */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {uniqueSearches.map((search, index) => {
                    const key = search.id || search.timestamp || search.query || String(index);
                    return (
                      <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 hover:shadow-sm transition-all ${
                        selectedCustomSearchId === key
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 shadow-sm'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <button
                          onClick={() => {
                            setSelectedCustomSearchId(key);
                            // Aggiorna il risultato visualizzato
                            const selected = uniqueSearches.find(s => (s.id || s.timestamp || s.query || String(index)) === key);
                            if (selected) {
                              setCustomSearchResult(selected);
                            }
                          }}
                          className="text-sm text-blue-800 font-medium hover:text-blue-600 hover:underline cursor-pointer flex-1 text-left"
                          title={`Carica analisi: ${search.query}`}
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <Search className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{search.query}</span>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 truncate">
                              {new Date(search.timestamp).toLocaleDateString()} - {search.results.reduce((total, sessionResult) => total + sessionResult.topics.length, 0)} topic
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            selectedCustomSearchId === key
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-white text-gray-500 border-gray-300'
                          }`}>
                            {selectedCustomSearchId === key ? '✓' : `#${index + 1}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Clicca su un'analisi per caricarla, o crea una nuova ricerca sotto.
                </p>
                
                <div className="h-px bg-gray-200 my-4" />
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">Nessuna analisi precedente per le sessioni selezionate</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Crea una nuova ricerca sotto per iniziare. Le analisi verranno salvate automaticamente e appariranno qui.
                </p>
              </div>
            )}
            
            {/* Input per nuova ricerca */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Nuova Ricerca</Label>
              {customTopics.map((topic, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Topic ${index + 1} (es. "ansia", "relazioni", "stress lavoro")`}
                    value={topic}
                    onChange={(e) => updateCustomTopic(index, e.target.value)}
                    className="flex-1"
                  />
                  {customTopics.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCustomTopic(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomTopic}
                disabled={customTopics.length >= 5}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Aggiungi Topic</span>
              </Button>
              
              <Button
                onClick={runCustomTopicSearch}
                disabled={isSearching || !combinedTranscript || customTopics.every(t => t.trim().length === 0)}
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Ricerca in corso...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Cerca Topics</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Progress indicator */}
            {isSearching && searchProgress && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800">{searchProgress}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!combinedTranscript || combinedTranscript.trim().length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nessuna trascrizione selezionata
            </h4>
            <p className="text-gray-600 text-center">
              Seleziona una o più sessioni per iniziare l'analisi dei topic.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Freccette di navigazione per topic modeling standard - fuori dalla Card */}
          {/* Overlay del titolo in alto a sinistra */}
          {/* Rimuovi la box overlay con Brain e 'Identified Topics' */}
          {selectedSessions.length > 0 && !isCustomMode && (
            <Card className="relative">
              <CardHeader className="pt-2 pb-0">
                {/* RIMUOVI CardTitle con Macrotemi individuati */}
                {/* <CardTitle className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Brain className="h-5 w-5" /> Macrotemi individuati
                </CardTitle> */}
                <CardDescription className="mb-2">
                  {allTopicSessions[currentSessionIndex] && isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? allTopicSessions[currentSessionIndex].summary : ''}
                </CardDescription>
              </CardHeader>
              {/* Barra di navigazione sessioni topic modeling standard - sempre visibile se più di una sessione selezionata */}
              {allTopicSessions.length > 1 && (
                <div className="flex justify-center mb-4 mt-2">
                  <div className="flex flex-col w-full max-w-xl bg-gray-50 rounded-xl py-4 px-4 sm:px-6 items-center shadow-sm">
                    <div className="flex w-full items-center justify-between mb-1">
                      <Button variant="outline" size="sm" onClick={goToPreviousSession} className="flex items-center gap-1 text-xs sm:text-sm">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="font-semibold hidden sm:inline">Precedente</span>
                      </Button>
                      <div className="flex flex-col items-center flex-1 px-2">
                        <span className="font-semibold text-sm sm:text-lg text-center truncate max-w-full">{allTopicSessions[currentSessionIndex]?.session_title || (allTopicSessions[currentSessionIndex] && isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? allTopicSessions[currentSessionIndex].title : '') || 'Sessione'}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={goToNextSession} className="flex items-center gap-1 text-xs sm:text-sm">
                        <span className="font-semibold hidden sm:inline">Successiva</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-center text-gray-600 text-xs sm:text-base mt-1 px-2">
                      {/* Mostra solo il nome della sessione, non il codice */}
                      <span className="truncate max-w-full block">{allTopicSessions[currentSessionIndex]?.session_title || (allTopicSessions[currentSessionIndex] && isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? allTopicSessions[currentSessionIndex].title : '') || 'Sessione'}</span>
                    </div>
                  </div>
                </div>
              )}
              {allTopicSessions.length === 1 && (
                <div className="flex justify-center mb-4 mt-2">
                  <div className="flex flex-col w-full max-w-xl bg-gray-50 rounded-xl py-4 px-4 sm:px-6 items-center shadow-sm">
                    <div className="flex w-full items-center justify-center mb-1">
                      {/* Mostra solo il nome della sessione, non il codice */}
                      <span className="font-semibold text-sm sm:text-lg text-center truncate max-w-full px-2">{allTopicSessions[0]?.session_title || (allTopicSessions[0] && isTopicAnalysis(allTopicSessions[0]) ? allTopicSessions[0].title : '') || 'Sessione'}</span>
                    </div>
                  </div>
                </div>
              )}
              <CardContent>
                {allTopicSessions[currentSessionIndex] && !isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-lg font-medium text-gray-700 mb-4 text-center">
                      L'analisi topic modeling per questa sessione non è ancora pronta.<br />
                      Premi il pulsante qui sotto per avviarla.
                    </p>
                    <Button onClick={() => runSingleSessionAnalysis(allTopicSessions[currentSessionIndex].session_id)}>
                      Avvia Analisi Topic
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h4 className="font-semibold text-lg mb-2">Elenco Macrotemi</h4>
                      <div className="space-y-2">
                        {isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? (
                          allTopicSessions[currentSessionIndex].topics.map((topic, index) => (
                            <div key={topic.topic_id} className="mb-2">
                              <Badge
                                className={getTopicColor(topic.topic_id) + ' text-sm sm:text-base px-2 sm:px-3 py-1 cursor-pointer transition-all mb-2 break-words'}
                                title={topic.description}
                                onClick={() => scrollToTopic(topic.topic_id)}
                              >
                                {topic.description.replace(/\s*\([^)]*\)$/, '')}
                              </Badge>
                              <div className="ml-2">
                                <span className="text-gray-700 text-xs sm:text-sm break-words">
                                  {topic.keywords && Array.isArray(topic.keywords) ? topic.keywords.join(', ') : <span className="italic text-gray-400">Nessuna parola chiave</span>}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">Nessun topic disponibile</p>
                        )}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto text-sm sm:text-base leading-relaxed">
                        {isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? (
                          (() => {
                            const currentSession = selectedSessions.find(s => s.id === allTopicSessions[currentSessionIndex].session_id);
                            const analysisResult = allTopicSessions[currentSessionIndex] as AnalysisResult;
                            

                            
                            // Usa i text_segments da topicAnalysis se disponibili, altrimenti da analysisResult direttamente
                            const textSegments = analysisResult.topicAnalysis?.text_segments || analysisResult.text_segments || [];
                            
                            const fullSegments = currentSession ? 
                              mapTopicResultsToFullTranscript(currentSession, textSegments) :
                              textSegments;
                            
                            return fullSegments.map((segment, index) => {
                              const isSessionSeparator = segment.text.includes('---') && segment.topic_id === null;
                              if (isSessionSeparator) {
                                return (
                                  <div
                                    key={index}
                                    className="py-3 my-4 text-center font-medium text-gray-700 border-t border-b border-gray-300 bg-gray-100"
                                  >
                                    {segment.text.replace(/\n/g, '').trim()}
                                  </div>
                                );
                              }
                              return (
                                <span
                                  key={index}
                                  ref={segment.topic_id ? (el) => {
                                    if (el && !topicRefs.current[segment.topic_id!]) {
                                      // Salva solo il primo segmento per ogni topic_id (prima occorrenza nel documento)
                                      topicRefs.current[segment.topic_id!] = el;
                                      console.log('🔗 Ref assegnato per topicId:', segment.topic_id, 'elemento:', el, 'indice:', index)
                                    }
                                  } : undefined}
                                  className={`inline-block p-1 rounded transition-all ${getTopicBackgroundColor(segment.topic_id)} ${segment.topic_id ? 'border-l-4 border-blue-400 font-semibold text-blue-900' : 'text-gray-800'}`}
                                  title={segment.topic_id ? `${isTopicAnalysis(allTopicSessions[currentSessionIndex]) ? (allTopicSessions[currentSessionIndex].topics?.find(t => t.topic_id === segment.topic_id)?.description.replace(/\s*\([^)]*\)$/, '')) : ''} (${Math.round(segment.confidence * 100)}% confidence)` : 'Unclassified'}
                                >
                                  {segment.text}
                                </span>
                              );
                            });
                          })()
                        ) : (
                        <p className="text-gray-500 italic">
                          Classificazione del testo in corso...
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
