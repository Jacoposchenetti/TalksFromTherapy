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
}

export default function TopicAnalysisComponent({ 
  selectedSessions, 
  combinedTranscript, 
  onAnalysisComplete,
  cachedData 
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
      let allTopics: Topic[] = []
      let allSummaries: string[] = []

      // Se ci sono più sessioni, analizza ognuna separatamente per i topic
      if (selectedSessions.length > 1) {
        console.log(`Analyzing ${selectedSessions.length} sessions separately for topics`)
        
        for (let i = 0; i < selectedSessions.length; i++) {
          const session = selectedSessions[i]
          console.log(`Analyzing session ${i + 1}/${selectedSessions.length}: ${session.title}`)

          // Estrai il contenuto del paziente per questa sessione
          const patientContent = extractPatientContent(session.transcript)
          console.log(`📊 Sessione ${session.id}: ${session.transcript.length} → ${patientContent.length} caratteri`)

          const response = await fetch('/api/single-session-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: session.id,
              transcript: session.transcript // L'API estrae automaticamente il contenuto del paziente
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
        const response = await fetch('/api/single-session-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: `combined_${Date.now()}`,
            transcript: combinedTranscript
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
      if (result.topics && result.topics.length > 0) {
        console.log('Starting text classification...')
        const segments = await classifyTextToTopicsSeparately(selectedSessions, result.topics)
        console.log('Classification completed, segments:', segments)
        
        // Aggiorna il risultato con i text_segments
        const resultWithSegments = { ...result, text_segments: segments }
        setAnalysisResult(resultWithSegments)
        
        // Salva il risultato completo per ogni sessione
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
                analysisData: resultWithSegments
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
        
        onAnalysisComplete?.(resultWithSegments)
      }

    } catch (error) {
      console.error('Errore durante l\'analisi:', error)
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

    let allSegments: TextSegment[] = []

    try {
      // Processa ogni sessione separatamente
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i]
        console.log(`Processing session ${i + 1}/${sessions.length}: ${session.title}`)

        // Estrai il contenuto del paziente per questa sessione
        const patientContent = extractPatientContent(session.transcript)
        console.log(`📊 Sessione ${session.id}: ${session.transcript.length} → ${patientContent.length} caratteri`)

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
    const el = topicRefs.current[topicId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-blue-400')
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 1200)
    }
  }

  // Prima di mappare i segmenti nella modalità testo (dentro CardContent, showTextView true)
  let firstTopicSegmentRendered: Record<number, boolean> = {}

  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  // topicSessions: array di AnalysisResult, uno per sessione selezionata
  const topicSessions = React.useMemo(() => {
    if (!analysisResult) return [];
    if (Array.isArray(analysisResult)) return analysisResult;
    // Se analysisResult è singolo, restituisci come array
    return [analysisResult];
  }, [analysisResult]);

  const goToPreviousSession = () => {
    setCurrentSessionIndex(prev => prev > 0 ? prev - 1 : topicSessions.length - 1);
  };
  const goToNextSession = () => {
    setCurrentSessionIndex(prev => prev < topicSessions.length - 1 ? prev + 1 : 0);
  };

  // DEBUG: logga lo stato delle variabili chiave
  console.log('[DEBUG TopicModeling]', {
    analysisResult,
    isCustomMode,
    topicSessionsLength: topicSessions.length,
    selectedSessionsLength: selectedSessions.length
  });

  return (
    <div className="h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
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
          className="flex items-center gap-2"
        >
          {isCustomMode ? (
            <>
              <Search className="h-4 w-4" />
              Auto Discovery
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Custom Topics
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
              Avvia Analisi Topic
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Search className="h-3 w-3" />
                              <span className="truncate">{search.query}</span>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(search.timestamp).toLocaleDateString()} - {search.results.reduce((total, sessionResult) => total + sessionResult.topics.length, 0)} topic
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
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
            
            <div className="flex items-center gap-2">
                              <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomTopic}
                  disabled={customTopics.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi Topic
                </Button>
              
                              <Button
                  onClick={runCustomTopicSearch}
                  disabled={isSearching || !combinedTranscript || customTopics.every(t => t.trim().length === 0)}
                  className="flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ricerca in corso...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Cerca Topics
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
          {analysisResult && !isCustomMode && topicSessions.length > 0 && (
            <Card className="relative">
              <CardHeader className="pt-2 pb-0">
                {/* RIMUOVI CardTitle con Macrotemi individuati */}
                {/* <CardTitle className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Brain className="h-5 w-5" /> Macrotemi individuati
                </CardTitle> */}
                <CardDescription className="mb-2">
                  {topicSessions[currentSessionIndex]?.summary}
                </CardDescription>
              </CardHeader>
              {/* Barra di navigazione sessioni topic modeling standard - sempre visibile se più di una sessione selezionata */}
              {topicSessions.length > 1 && (
                <div className="flex justify-center mb-4 mt-2">
                  <div className="flex flex-col w-full max-w-xl bg-gray-50 rounded-xl py-4 px-6 items-center shadow-sm">
                    <div className="flex w-full items-center justify-between mb-1">
                      <Button variant="outline" size="sm" onClick={goToPreviousSession} className="flex items-center gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="font-semibold">Precedente</span>
                      </Button>
                      <div className="flex flex-col items-center flex-1">
                        <span className="font-semibold text-lg">{topicSessions[currentSessionIndex]?.session_title || topicSessions[currentSessionIndex]?.title || 'Sessione'}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={goToNextSession} className="flex items-center gap-1">
                        <span className="font-semibold">Successiva</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-center text-gray-600 text-base mt-1">
                      {/* Mostra solo il nome della sessione, non il codice */}
                      {topicSessions[currentSessionIndex]?.session_title || topicSessions[currentSessionIndex]?.title || 'Sessione'}
                    </div>
                  </div>
                </div>
              )}
              {topicSessions.length === 1 && (
                <div className="flex justify-center mb-4 mt-2">
                  <div className="flex flex-col w-full max-w-xl bg-gray-50 rounded-xl py-4 px-6 items-center shadow-sm">
                    <div className="flex w-full items-center justify-center mb-1">
                      {/* Mostra solo il nome della sessione, non il codice */}
                      <span className="font-semibold text-lg">{topicSessions[0]?.session_title || topicSessions[0]?.title || 'Sessione'}</span>
                    </div>
                  </div>
                </div>
              )}
              <CardContent>
                {/* Elenco Macrotemi e keywords - ora PRIMA della trascrizione evidenziata */}
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-2">Elenco Macrotemi</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {topicSessions[currentSessionIndex]?.topics && Array.isArray(topicSessions[currentSessionIndex]?.topics) ? (
                      topicSessions[currentSessionIndex].topics.map((topic, index) => (
                        <Badge
                          key={topic.topic_id}
                          className={getTopicColor(topic.topic_id) + ' text-base px-3 py-1 cursor-pointer transition-all'}
                          title={topic.description}
                        >
                          {topic.description.replace(/\s*\([^)]*\)$/, '')}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">Nessun topic disponibile</p>
                    )}
                  </div>
                  {/* Keywords per ogni topic */}
                  <div className="space-y-2">
                    {topicSessions[currentSessionIndex]?.topics && Array.isArray(topicSessions[currentSessionIndex]?.topics) ? (
                      topicSessions[currentSessionIndex].topics.map((topic, index) => (
                        <div key={topic.topic_id} className="mb-2">
                          <span className="font-semibold text-blue-900">{topic.description.replace(/\s*\([^)]*\)$/, '')}:</span>
                          <span className="ml-2 text-gray-700 text-sm">
                            {topic.keywords && Array.isArray(topic.keywords) ? topic.keywords.join(', ') : <span className="italic text-gray-400">Nessuna parola chiave</span>}
                          </span>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
                {/* Testo evidenziato con i topic - sempre visibile */}
                <div className="p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto text-base leading-relaxed">
                  {topicSessions[currentSessionIndex]?.text_segments && Array.isArray(topicSessions[currentSessionIndex]?.text_segments) ? (
                    topicSessions[currentSessionIndex].text_segments.map((segment, index) => {
                      const isSessionSeparator = segment.text.includes('---') && segment.topic_id === null
                      if (isSessionSeparator) {
                        return (
                          <div
                            key={index}
                            className="py-3 my-4 text-center font-medium text-gray-700 border-t border-b border-gray-300 bg-gray-100"
                          >
                            {segment.text.replace(/\n/g, '').trim()}
                          </div>
                        )
                      }
                      return (
                        <span
                          key={index}
                          className={`inline-block p-1 rounded transition-all ${getTopicBackgroundColor(segment.topic_id)} ${segment.topic_id ? 'border-l-4 border-blue-400 font-semibold text-blue-900' : 'text-gray-800'}`}
                          title={segment.topic_id ? `${topicSessions[currentSessionIndex]?.topics?.find(t => t.topic_id === segment.topic_id)?.description.replace(/\s*\([^)]*\)$/, '') || `Topic ${segment.topic_id}`} (${Math.round(segment.confidence * 100)}% confidence)` : 'Unclassified'}
                        >
                          {segment.text}
                        </span>
                      )
                    })
                  ) : (
                    <p className="text-gray-500 italic">
                      Classificazione del testo in corso...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}