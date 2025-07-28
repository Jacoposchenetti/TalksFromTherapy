"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, BarChart3, Heart, MessageSquare, Save, Edit, ChevronLeft, ChevronRight, Network, Search, X, RefreshCw, Database, History } from "lucide-react"
import { SentimentAnalysis } from "@/components/sentiment-analysis"
import TopicAnalysisComponent from "@/components/analysis/topic-modeling-gpt"
import { useMultiSessionAnalysis } from "@/hooks/useMultiSessionAnalysis"

interface Session {
  id: string
  patientId: string
  title: string
  audioFilePath?: string
  transcript?: string
  sessionDate: string
  status: 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'ANALYZING' | 'ANALYZED' | 'ERROR'
  createdAt: string
  updatedAt: string
}

interface Patient {
  id: string
  initials: string
}

interface Note {
  id?: string
  content: string
  sessionId: string
  createdAt?: string
  updatedAt?: string
}

export default function PatientAnalysisPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const patientId = params.id as string
  const [patient, setPatient] = useState<Patient | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const [currentSlide, setCurrentSlide] = useState(0) // 0: Trascrizioni, 1: Topic Modelling, 2: Sentiment Analysis, 3: Semantic Frame
  
  // Semantic Frame Analysis state
  const [targetWord, setTargetWord] = useState("")
  const [currentDisplayedWord, setCurrentDisplayedWord] = useState("")
  // AGGIUNTA: stato per tracciare l'ultima parola analizzata
  const [lastCreatedSemanticWord, setLastCreatedSemanticWord] = useState<string | null>(null)
  const [semanticFrameLoading, setSemanticFrameLoading] = useState(false)
  const [semanticFrameResult, setSemanticFrameResult] = useState<any>(null)
  const [semanticFrameError, setSemanticFrameError] = useState<string | null>(null)
  const [currentSemanticFrameIndex, setCurrentSemanticFrameIndex] = useState(0)
  const [analyzingWord, setAnalyzingWord] = useState<string | null>(null)
  
  // Transcript search state
  const [searchTerm, setSearchTerm] = useState("")

  // Multi-session analysis hook for caching
  const {
    analyses,
    loading: analysisLoading,
    error: analysisError,
    loadAllAnalyses,
    saveSessionAnalysis,
    hasAllSentimentAnalyses,
    hasAllTopicAnalyses,
    getSentimentData,
    getTopicData,
    getCustomTopicData,
    getSemanticFrameData,
    hasSemanticFrameAnalysis,
    getAllSemanticFrameWords,
    deleteSemanticFrameAnalysis
  } = useMultiSessionAnalysis({ 
    sessionIds: Array.from(selectedSessions),
    autoLoad: false
  })

  // Stato per le note di tutte le sessioni
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  // Per gestire il revert, salvo il valore originale della nota quando si entra in modalità editing
  const [originalNotes, setOriginalNotes] = useState<Record<string, string>>({})

  // Quando si entra in modalità editing, salvo il valore originale
  const handleEnterEdit = (sessionId: string) => {
    setOriginalNotes(prev => ({ ...prev, [sessionId]: sessionNotes[sessionId] || "" }))
    setEditingNotes(prev => ({ ...prev, [sessionId]: true }))
  }

  // Quando si preme Cancel, ripristino il valore originale e chiudo la modalità editing
  const handleCancelEdit = (sessionId: string) => {
    setSessionNotes(prev => ({ ...prev, [sessionId]: originalNotes[sessionId] || "" }))
    setEditingNotes(prev => ({ ...prev, [sessionId]: false }))
  }

  const [fullscreenFlower, setFullscreenFlower] = useState<{ src: string, title: string } | null>(null)
  const [lastLoadedSlide, setLastLoadedSlide] = useState<number | null>(null);

  // Gestione ESC per chiudere il fullscreen
  useEffect(() => {
    if (!fullscreenFlower) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenFlower(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenFlower])

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchPatientData()
  }, [session, status, router, patientId])

  // Carica le analisi semantiche passate quando cambiano le sessioni
  useEffect(() => {
    if (selectedSessions.size > 0) {
      const semanticFrameData = getSemanticFrameData()
      if (semanticFrameData.length > 0) {
        // Prendi la prima sessione con analisi semantiche
        const firstSession = semanticFrameData[0]
        if (firstSession.semanticFrames && Object.keys(firstSession.semanticFrames).length > 0) {
          // Prendi la prima parola analizzata
          const firstWord = Object.keys(firstSession.semanticFrames)[0]
          setSemanticFrameResult(firstSession.semanticFrames[firstWord])
          setCurrentDisplayedWord(firstWord)
        } else {
          setSemanticFrameResult(null)
        }
      } else {
        setSemanticFrameResult(null)
      }
      // Reset selezione quando cambiano le sessioni
      setCurrentSemanticFrameIndex(0)
    }
  }, [selectedSessions, getSemanticFrameData])

  // Aggiorna la visualizzazione quando cambiano i dati della cache
  useEffect(() => {
    if (selectedSessions.size > 0) {
      const semanticFrameData = getSemanticFrameData()
      if (semanticFrameData.length > 0 && getAllSemanticFrameWords().length > 0) {
        // Se c'è una nuova analisi creata, seleziona quella
        if (lastCreatedSemanticWord && getAllSemanticFrameWords().includes(lastCreatedSemanticWord)) {
          for (const sessionData of semanticFrameData) {
            if (sessionData.semanticFrames && sessionData.semanticFrames[lastCreatedSemanticWord]) {
              setSemanticFrameResult(sessionData.semanticFrames[lastCreatedSemanticWord])
              setCurrentDisplayedWord(lastCreatedSemanticWord)
              setCurrentSemanticFrameIndex(getAllSemanticFrameWords().indexOf(lastCreatedSemanticWord))
              setLastCreatedSemanticWord(null) // Reset dopo selezione
              break
            }
          }
        } else if (!semanticFrameResult) {
          // Se non c'è un'analisi corrente, mostra la prima disponibile
          const allWords = getAllSemanticFrameWords()
          if (allWords.length > 0 && currentSemanticFrameIndex < allWords.length) {
            const currentWord = allWords[currentSemanticFrameIndex]
            for (const sessionData of semanticFrameData) {
              if (sessionData.semanticFrames && sessionData.semanticFrames[currentWord]) {
                setSemanticFrameResult(sessionData.semanticFrames[currentWord])
                setCurrentDisplayedWord(currentWord)
                break
              }
            }
          }
        }
      } else {
        // Se non ci sono analisi nella cache, resetta la visualizzazione
        setSemanticFrameResult(null)
        setCurrentDisplayedWord("")
      }
    }
  }, [analyses, selectedSessions, currentSemanticFrameIndex, getSemanticFrameData, getAllSemanticFrameWords, semanticFrameResult, lastCreatedSemanticWord])

  // Funzioni di navigazione per semantic frame analysis
  const goToPreviousSemanticFrame = () => {
    const allWords = getAllSemanticFrameWords()
    if (allWords.length > 0) {
      const newIndex = currentSemanticFrameIndex > 0 ? currentSemanticFrameIndex - 1 : allWords.length - 1
      const newWord = allWords[newIndex]
      
      setCurrentSemanticFrameIndex(newIndex)
      setCurrentDisplayedWord(newWord)
      
      // Carica l'analisi dalla cache
      const semanticFrameData = getSemanticFrameData()
      for (const sessionData of semanticFrameData) {
        if (sessionData.semanticFrames && sessionData.semanticFrames[newWord]) {
          console.log(`[Frontend] Loading analysis for "${newWord}" via navigation`)
          setSemanticFrameResult(sessionData.semanticFrames[newWord])
          break
        }
      }
    }
  }

  const goToNextSemanticFrame = () => {
    const allWords = getAllSemanticFrameWords()
    if (allWords.length > 0) {
      const newIndex = currentSemanticFrameIndex < allWords.length - 1 ? currentSemanticFrameIndex + 1 : 0
      const newWord = allWords[newIndex]
      
      setCurrentSemanticFrameIndex(newIndex)
      setCurrentDisplayedWord(newWord)
      
      // Carica l'analisi dalla cache
      const semanticFrameData = getSemanticFrameData()
      for (const sessionData of semanticFrameData) {
        if (sessionData.semanticFrames && sessionData.semanticFrames[newWord]) {
          console.log(`[Frontend] Loading analysis for "${newWord}" via navigation`)
          setSemanticFrameResult(sessionData.semanticFrames[newWord])
          break
        }
      }
    }
  }

  // Carica le note di tutte le sessioni selezionate ogni volta che cambia la selezione
  // Carica le note di tutte le sessioni quando vengono caricate le sessioni
  useEffect(() => {
    if (sessions.length === 0) {
      setSessionNotes({})
      setEditingNotes({})
      setSavingNotes({})
      return
    }
    const fetchAllNotes = async () => {
      const notesObj: Record<string, string> = {}
      await Promise.all(sessions.map(async (session) => {
        try {
          const response = await fetch(`/api/notes/${session.id}`)
          if (response.ok) {
            const result = await response.json()
            const noteData = result.data || result
            notesObj[session.id] = noteData.content || ""
          } else {
            notesObj[session.id] = ""
          }
        } catch {
          notesObj[session.id] = ""
        }
      }))
      setSessionNotes(notesObj)
      setEditingNotes({})
      setSavingNotes({})
    }
    fetchAllNotes()
  }, [sessions])



  // Funzione helper per verificare se una sessione ha una nota non vuota
  const hasSessionNote = (sessionId: string) => {
    const note = sessionNotes[sessionId]
    return note && note.trim().length > 0
  }



  // Selezione automatica della sessione passata via query string
  useEffect(() => {
    if (
      sessions.length > 0 &&
      searchParams &&
      selectedSessions.size === 0 // solo se non c'è già una selezione
    ) {
      const sessionIdFromQuery = searchParams.get('sessionId')
      if (sessionIdFromQuery && sessions.some(s => s.id === sessionIdFromQuery)) {
        setSelectedSessions(new Set([sessionIdFromQuery]))
      }
    }
  }, [sessions, searchParams, selectedSessions])

  const fetchPatientData = async () => {
    try {
      setError(null)
      
      // Fetch patient info
      const patientResponse = await fetch(`/api/patients/${patientId}`)
      
      if (patientResponse.ok) {
        const patientData = await patientResponse.json()
        setPatient(patientData)
      } else {
        const errorText = await patientResponse.text()
        console.error('Patient API error:', errorText)
        setError('Error loading patient data: ' + patientResponse.status)
        return
      }

      // Fetch patient sessions
      const sessionsResponse = await fetch(`/api/sessions?patientId=${patientId}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        
        // Extract sessions from API response structure
        const sessions = sessionsData.data || sessionsData
        
        // Filter sessions with transcripts for analysis
        const transcribedSessions = sessions?.filter((s: Session) => 
          s.transcript && 
          typeof s.transcript === 'string' && 
          s.transcript.trim().length > 0
        ) || []
        
        setSessions(transcribedSessions)
        
        // Auto-select first session if available
        if (transcribedSessions.length > 0) {
          // fetchSessionNote(transcribedSessions[0].id) // This is now handled by the new useEffect
        }
      } else {
        setError('Error loading sessions')
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }




  // Funzione per salvare la nota di una singola sessione
  const handleSaveSessionNote = async (sessionId: string) => {
    setSavingNotes(prev => ({ ...prev, [sessionId]: true }))
    try {
      const response = await fetch(`/api/notes/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sessionNotes[sessionId] })
      })
      if (response.ok) {
        setEditingNotes(prev => ({ ...prev, [sessionId]: false }))
        // Ricarica la nota aggiornata
        const result = await response.json()
        const noteData = result.data || result
        const updatedContent = noteData.content || ""
        setSessionNotes(prev => ({ ...prev, [sessionId]: updatedContent }))
      } else {
        // Gestione errore
        console.error('Errore nel salvataggio della nota')
      }
    } catch (error) {
      // Gestione errore
      console.error('Errore nel salvataggio della nota:', error)
    } finally {
      setSavingNotes(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  // Function to highlight search terms in text and format dialogue
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!text) return text
    
    // First, format the dialogue by adding line breaks before "Therapist:" and "Patient:"
    let formattedText = text
      .replace(/(\s+)(Therapist:)/g, '<br/><br/><strong class="text-blue-600">$2</strong>')
      .replace(/(\s+)(Patient:)/g, '<br/><br/><strong class="text-green-600">$2</strong>')
    
    // Handle the case where Therapist: or Patient: appears at the beginning
    formattedText = formattedText
      .replace(/^(Therapist:)/g, '<strong class="text-blue-600">$1</strong>')
      .replace(/^(Patient:)/g, '<strong class="text-green-600">$1</strong>')
    
    // Then highlight search terms if provided
    if (!searchTerm.trim()) return formattedText
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = formattedText.split(regex)
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return `<mark key="${index}" class="bg-yellow-200 px-1 rounded">${part}</mark>`
      }
      return part
    }).join('')
  }

  // Function to count search term occurrences
  const countSearchOccurrences = (searchTerm: string) => {
    if (!searchTerm.trim()) return 0
    
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    let totalCount = 0
    
    getSelectedSessionsData().forEach(session => {
      if (session.transcript) {
        const matches = session.transcript.match(regex)
        totalCount += matches ? matches.length : 0
      }
    })
    
    return totalCount
  }

  // Handle session selection for checkboxes
  const handleSessionToggle = (sessionId: string) => {
    const newSelected = new Set(selectedSessions)
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId)
    } else {
      newSelected.add(sessionId)
    }
    setSelectedSessions(newSelected)
    
    // Aggiorna automaticamente le analisi se ci sono sessioni selezionate
    if (newSelected.size > 0) {
      loadAllAnalyses()
    }
  }

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set())
    } else {
      const newSelected = new Set(sessions.map(s => s.id))
      setSelectedSessions(newSelected)
      
      // Aggiorna automaticamente le analisi se ci sono sessioni selezionate
      if (newSelected.size > 0) {
        loadAllAnalyses()
      }
    }
  }



  // Get selected sessions data
  const getSelectedSessionsData = () => {
    return sessions.filter(s => selectedSessions.has(s.id))
  }
  // Get combined transcript
  const getCombinedTranscript = () => {
    const selectedSessionsData = getSelectedSessionsData()
    return selectedSessionsData
      .map(session => session.transcript || "")
      .filter(transcript => transcript.trim().length > 0)
      .join("\n\n--- SESSIONE SUCCESSIVA ---\n\n")
  }

  // Semantic Frame Analysis function
  const performSemanticFrameAnalysis = async (word?: string) => {
    const wordToAnalyze = word || targetWord.trim()
    
    if (!wordToAnalyze) {
      setSemanticFrameError("Inserisci una parola da analizzare")
      return
    }

    const combinedTranscript = getCombinedTranscript()
    if (!combinedTranscript.trim()) {
      setSemanticFrameError("Nessuna trascrizione disponibile nelle sessioni selezionate")
      return
    }

    // Prima verifica se abbiamo già questa analisi nella cache
    if (hasSemanticFrameAnalysis(wordToAnalyze)) {
      console.log(`✅ Analisi semantica per "${wordToAnalyze}" trovata nella cache`)
      const semanticFrameData = getSemanticFrameData()
      
      for (const sessionData of semanticFrameData) {
        if (sessionData.semanticFrames && sessionData.semanticFrames[wordToAnalyze]) {
          setSemanticFrameResult(sessionData.semanticFrames[wordToAnalyze])
          setTargetWord(wordToAnalyze)
          setCurrentDisplayedWord(wordToAnalyze)
          setSemanticFrameError(null)
          
          // Aggiorna l'indice corrente
          const allWords = getAllSemanticFrameWords()
          const wordIndex = allWords.indexOf(wordToAnalyze)
          if (wordIndex !== -1) {
            setCurrentSemanticFrameIndex(wordIndex)
          }
          return
        }
      }
    }

    setSemanticFrameLoading(true)
    setSemanticFrameError(null)
    setSemanticFrameResult(null)
    setAnalyzingWord(wordToAnalyze)

    // Se la parola è stata passata come parametro, aggiorna targetWord
    if (word) {
      setTargetWord(word)
    }

    try {
      const response = await fetch('/api/semantic-frame-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedTranscript,
          targetWord: wordToAnalyze,
          sessionId: getSelectedSessionsData()[0]?.id,
          language: 'italian'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSemanticFrameResult(data)
        setTargetWord(wordToAnalyze)
        setCurrentDisplayedWord(wordToAnalyze)
        setLastCreatedSemanticWord(wordToAnalyze) // AGGIUNTA: traccia la nuova analisi
        console.log('Semantic Frame Analysis successful:', data)
        
        // Salva il risultato nella cache per ogni sessione selezionata
        for (const session of getSelectedSessionsData()) {
          try {
            const saveData = {
              target_word: wordToAnalyze,
              semantic_frame: data.semantic_frame,
              emotional_analysis: data.emotional_analysis,
              context_analysis: data.context_analysis,
              statistics: data.statistics,
              network_plot: data.network_plot,
              timestamp: data.timestamp,
              session_id: session.id
            }
            console.log(`[Frontend] Saving semantic frame data for "${wordToAnalyze}":`, saveData)
            
            await saveSessionAnalysis(session.id, 'semantic_frame', saveData)
            console.log(`✅ Semantic frame analysis salvata per sessione: ${session.id}`)
          } catch (error) {
            console.error(`❌ Errore nel salvataggio semantic frame per sessione ${session.id}:`, error)
          }
        }
        
        // Ricarica la cache per aggiornare immediatamente la visualizzazione
        await loadAllAnalyses()
        
        // Forza l'aggiornamento della visualizzazione
        const semanticFrameData = getSemanticFrameData()
        console.log(`[Frontend] After save, semantic frame data:`, semanticFrameData)
        for (const sessionData of semanticFrameData) {
          if (sessionData.semanticFrames && sessionData.semanticFrames[wordToAnalyze]) {
            console.log(`[Frontend] Found saved analysis for "${wordToAnalyze}":`, sessionData.semanticFrames[wordToAnalyze])
            setSemanticFrameResult(sessionData.semanticFrames[wordToAnalyze])
            setTargetWord(wordToAnalyze)
            setCurrentDisplayedWord(wordToAnalyze)
            break
          }
        }
        
        // Aggiorna l'indice corrente
        const allWords = getAllSemanticFrameWords()
        const wordIndex = allWords.indexOf(wordToAnalyze)
        if (wordIndex !== -1) {
          setCurrentSemanticFrameIndex(wordIndex)
        }
      } else {
        setSemanticFrameError(data.error || 'Errore durante l\'analisi semantica')
        console.error('Semantic Frame Analysis error:', data.error)
      }
    } catch (error) {
      console.error('Semantic Frame Analysis request failed:', error)
      setSemanticFrameError('Errore di connessione durante l\'analisi')
    } finally {
      setSemanticFrameLoading(false)
      setAnalyzingWord(null)
    }
  }

  // Helper function to analyze a connected word
  const analyzeConnectedWord = async (word: string) => {
    setTargetWord(word)
    // Small delay to ensure state update, then start analysis
    setTimeout(() => {
      performSemanticFrameAnalysis(word)
    }, 50)
  }
  // Slide navigation
  const slides = [
    { title: "Transcripts", icon: FileText },
    { 
      title: "Topic Modelling", 
      icon: BarChart3,
      hasCachedData: hasAllTopicAnalyses
    },
    { 
      title: "Sentiment Analysis", 
      icon: Heart,
      hasCachedData: hasAllSentimentAnalyses
    },
    { title: "Analisi Semantica", icon: Network }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(prev => {
      // Aggiorna automaticamente le analisi per tutte le tab se ci sono sessioni selezionate
      if (
        prev !== index &&
        selectedSessions.size > 0 &&
        lastLoadedSlide !== index
      ) {
        loadAllAnalyses();
        setLastLoadedSlide(index);
      }
      return index;
    });
  }

  // Reset lastLoadedSlide quando cambia la selezione delle sessioni
  useEffect(() => {
    setLastLoadedSlide(null);
  }, [selectedSessions]);

  // Funzione per eliminare semantic frame analysis
  const handleDeleteSemanticFrameAnalysis = async (targetWord: string) => {
    if (!targetWord) return

    // Elimina da tutte le sessioni selezionate
    const selectedSessionsData = getSelectedSessionsData()
    let successCount = 0
    let errorCount = 0

    for (const session of selectedSessionsData) {
      const result = await deleteSemanticFrameAnalysis(session.id, targetWord)
      if (result.success) {
        successCount++
      } else {
        errorCount++
        console.error(`Errore eliminazione per sessione ${session.id}:`, result.error)
      }
    }

    if (successCount > 0) {
      // Ricarica le analisi per aggiornare la cache
      await loadAllAnalyses()
      
      // Reset della visualizzazione se l'analisi eliminata era quella corrente
      if (semanticFrameResult && semanticFrameResult.target_word === targetWord) {
        setSemanticFrameResult(null)
        setTargetWord("")
        setCurrentSemanticFrameIndex(0)
      }
      
      console.log(`✅ Eliminata semantic frame analysis "${targetWord}" da ${successCount} sessioni`)
    }

    if (errorCount > 0) {
      console.error(`❌ Errori nell'eliminazione: ${errorCount} sessioni`)
    }
  }

  // Funzione per salvare i risultati dell'analisi sentiment
  const handleSentimentAnalysisComplete = async (result: any) => {
    try {
      console.log('[handleSentimentAnalysisComplete] Salvataggio risultati sentiment:', result)
      
      if (result && result.individual_sessions) {
        const selectedSessionsData = getSelectedSessionsData()
        
        for (const sessionResult of result.individual_sessions) {
          const session = selectedSessionsData.find(s => s.id === sessionResult.session_id)
          if (session && sessionResult.analysis) {
            console.log(`[handleSentimentAnalysisComplete] Salvando per sessione ${session.id}:`, sessionResult.analysis)
            
            // Verifica se i risultati sono validi (non tutti 0)
            const z_scores = sessionResult.analysis.z_scores || {}
            const allZero = Object.values(z_scores).every(score => score === 0 || score === null || score === undefined)
            
            if (allZero) {
              console.warn(`[handleSentimentAnalysisComplete] ⚠️ Session ${session.id} has all zero scores - skipping save`)
              continue
            }
            
            // Salva nel database usando la funzione esistente
            await saveSessionAnalysis(session.id, 'sentiment', {
              z_scores: sessionResult.analysis.z_scores || {},
              significant_emotions: sessionResult.analysis.significant_emotions || {},
              dominant_emotions: sessionResult.analysis.dominant_emotions || [],
              emotional_valence: sessionResult.analysis.emotional_valence || 0,
              positive_score: sessionResult.analysis.positive_score || 0,
              negative_score: sessionResult.analysis.negative_score || 0,
              text_length: sessionResult.analysis.text_length || 0,
              flower_plot: sessionResult.flower_plot || null
            })
          }
        }
        
        // Ricarica le analisi per aggiornare la cache
        await loadAllAnalyses()
        console.log('[handleSentimentAnalysisComplete] Salvataggio completato')
      }
    } catch (error) {
      console.error('[handleSentimentAnalysisComplete] Errore durante il salvataggio:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Errore</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button onClick={() => router.push("/patients")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Paziente non trovato</h1>
          <Button onClick={() => router.push("/patients")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/patients")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Patients
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Analysis - {patient.initials}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full py-8 flex justify-start"> {/* RIMOSSO max-w-full e padding orizzontale */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No transcribed sessions
              </h3>
              <p className="text-gray-600 text-center">
                There are no transcribed sessions for this patient. 
                Upload and transcribe sessions to start the analysis.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-6 w-full items-start"> {/* grid ora w-full */}
            {/* Sidebar - Sessions List */}
            <div className="col-span-2">
              <Card className="h-[900px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transcribed sessions
                  </CardTitle>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={selectedSessions.size === sessions.length && sessions.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="select-all" className="text-sm text-gray-600">
                      Mark all
                    </label>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1 max-h-[750px] overflow-y-auto">
                    {sessions.map((session, index) => (
                      <div key={session.id} className="border-b last:border-b-0">
                        <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            id={`session-${session.id}`}
                            checked={selectedSessions.has(session.id)}
                            onChange={() => handleSessionToggle(session.id)}
                            className="rounded border-gray-300"
                          />
                          <button
                            onClick={() => {
                              // Toggle selezione per analisi (checkbox)
                              handleSessionToggle(session.id)
                            }}
                            className="flex-1 text-left p-2 rounded transition-colors hover:bg-gray-50"
                            title="Click to select/deselect this session"
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">
                                {session.title}
                              </div>
                              {hasSessionNote(session.id) && (
                                <MessageSquare className="h-4 w-4 text-sky-500" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Main Sliding Analysis Panel */}
            <div className="col-span-7">
              <Card className="h-[900px]">
                <CardHeader className="pb-4">
                  {/* Slide Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {slides.map((slide, index) => {
                        const Icon = slide.icon
                        return (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all relative ${
                              currentSlide === index
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {slide.title}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSessions.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadAllAnalyses}
                          disabled={analysisLoading}
                          className="h-8"
                          title="Ricarica analisi dalla cache"
                        >
                          <RefreshCw className={`h-3 w-3 ${analysisLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevSlide}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextSlide}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[800px] overflow-y-auto">
                  <div className="h-full">
                    {/* Slide 0: Trascrizioni */}
                    {currentSlide === 0 && (
                      <div className="h-full">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-3">
                            Trascrizioni - {selectedSessions.size > 0 ? 
                              `${selectedSessions.size} sessions selected` : 
                              'No session selected'}
                          </h3>
                          
                          {/* Search Box */}
                          {selectedSessions.size > 0 && (
                            <div className="relative mb-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  placeholder="Search words in transcripts..."
                                />
                                {searchTerm && (
                                  <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              {searchTerm && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {countSearchOccurrences(searchTerm)} results found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="h-[660px] overflow-y-auto bg-gray-50 p-4 rounded text-sm space-y-4">
                          {selectedSessions.size > 0 ? (
                            getSelectedSessionsData().map((session, index) => (
                              <div key={session.id} className="border-b pb-3 last:border-b-0">
                                <div className="font-semibold text-blue-700 mb-2">
                                  {session.title} - {new Date(session.createdAt).toLocaleDateString('it-IT')}
                                </div>
                                <div className="text-gray-700">
                                  {session.transcript ? (
                                    <div 
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerm(session.transcript, searchTerm)
                                      }}
                                    />
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Transcript not available (Status: {session.status})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                              Seleziona una o più sessioni per visualizzare le trascrizioni
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Slide 1: Topic Modelling */}
                    {currentSlide === 1 && (
                      <div className="min-h-full">
                        {/* Cache Status Indicator - only show if no cached data available */}
                        {selectedSessions.size > 0 && !hasAllTopicAnalyses && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                Clicca "Avvia Analisi Topic" per eseguire nuove analisi
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Banner removed - topic analysis cache notification */}

                        <TopicAnalysisComponent 
                          selectedSessions={getSelectedSessionsData().map(session => ({
                            id: session.id,
                            title: session.title,
                            transcript: session.transcript || ""
                          }))}
                          combinedTranscript={getCombinedTranscript()}
                          onAnalysisComplete={async (result) => {
                            console.log('Topic analysis completed:', result)
                            // Il salvataggio ora viene gestito direttamente nel componente
                            // Non serve più salvare qui
                          }}
                          cachedData={(() => {
                            const topicData = hasAllTopicAnalyses ? getTopicData() : undefined
                            const customTopicData = getCustomTopicData()
                            const selectedSessionIds = Array.from(selectedSessions)
                            
                            console.log('🎯 Topic cached data being passed:', topicData)
                            console.log('🎯 Custom topic cached data being passed:', customTopicData)
                            console.log('🎯 hasAllTopicAnalyses:', hasAllTopicAnalyses)
                            console.log('🎯 Selected session IDs:', selectedSessionIds)
                            
                            // Verifica che i topic siano correlati alle sessioni attualmente selezionate
                            if (topicData && Array.isArray(topicData) && topicData.length > 0) {
                              // Trova il risultato che corrisponde alle sessioni selezionate
                              const matchingResult = topicData.find(result => 
                                selectedSessionIds.includes(result.session_id)
                              )
                              
                              if (matchingResult) {
                                console.log('🎯 Found matching topic analysis for selected sessions:', matchingResult.session_id)
                                return {
                                  session_id: matchingResult.session_id,
                                  topics: matchingResult.topics || [],
                                  summary: matchingResult.summary || '',
                                  analysis_timestamp: matchingResult.analysis_timestamp || '',
                                  text_segments: matchingResult.text_segments || [],
                                  patient_content_stats: matchingResult.patient_content_stats || null,
                                  customTopics: customTopicData.length > 0 ? customTopicData[0].customTopics : undefined
                                }
                              } else {
                                console.log('⚠️ No matching topic analysis found for selected sessions')
                                // Non restituire topic se non corrispondono alle sessioni selezionate
                                return {
                                  customTopics: customTopicData.length > 0 ? customTopicData[0].customTopics : undefined
                                }
                              }
                            }
                            
                            // Se non abbiamo topic normali ma abbiamo custom topics, restituisci solo quelli
                            if (customTopicData.length > 0) {
                              return {
                                customTopics: customTopicData[0].customTopics
                              }
                            }
                            
                            return undefined
                          })()}
                        />
                      </div>
                    )}                      {/* Slide 2: Sentiment Analysis */}
                    {currentSlide === 2 && (
                      <div className="h-full pt-6 flex flex-col">
                        {/* Cache Status Indicator - only show if no cached data available */}
                        {selectedSessions.size > 0 && !hasAllSentimentAnalyses && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                Click "Analyze Emotions" to run new analyses
                              </span>
                            </div>
                          </div>
                        )}
                        <SentimentAnalysis 
                          selectedSessions={getSelectedSessionsData().map(session => ({
                            id: session.id,
                            title: session.title,
                            transcript: session.transcript || "",
                            sessionDate: session.sessionDate
                          }))}
                          cachedData={getSentimentData()}
                          onRefreshResults={loadAllAnalyses}
                          onAnalysisComplete={handleSentimentAnalysisComplete}
                        />
                      </div>
                    )}

                    {/* Slide 3: Analisi Semantica */}
                    {currentSlide === 3 && (
                      <div className="h-full flex flex-col gap-6">
                        <div className="mb-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Network className="h-5 w-5 text-blue-700" />
                            Analisi Semantica
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            Esplora il contesto cognitivo ed emotivo di una parola chiave nelle sessioni selezionate.<br/>
                            Inserisci una parola e visualizza la sua rete semantica e il profilo emotivo associato.
                          </p>
                        </div>
                        
                        {/* Menu Analisi Passate */}
                        {getAllSemanticFrameWords().length > 0 && (
                          <div className="mb-4">
                            

                            
                            {/* Lista delle analisi con pulsanti di eliminazione */}
                            {getAllSemanticFrameWords().length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                  <Database className="h-4 w-4" />
                                  Analisi disponibili ({getAllSemanticFrameWords().length})
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {getAllSemanticFrameWords().map((word, index) => (
                                    <div key={word} className={`flex items-center justify-between rounded-lg px-3 py-2 hover:shadow-sm transition-all ${
                                      currentDisplayedWord === word 
                                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 shadow-sm' 
                                        : 'bg-white border border-gray-200'
                                    }`}>
                                      <button
                                        onClick={() => {
                                          setCurrentDisplayedWord(word)
                                          const wordIndex = getAllSemanticFrameWords().indexOf(word)
                                          if (wordIndex !== -1) {
                                            setCurrentSemanticFrameIndex(wordIndex)
                                            // Carica l'analisi dalla cache
                                            const semanticFrameData = getSemanticFrameData()
                                            for (const sessionData of semanticFrameData) {
                                              if (sessionData.semanticFrames && sessionData.semanticFrames[word]) {
                                                setSemanticFrameResult(sessionData.semanticFrames[word])
                                                break
                                              }
                                            }
                                          }
                                        }}
                                        className="text-sm text-blue-800 font-medium hover:text-blue-600 hover:underline cursor-pointer flex-1 text-left"
                                        title={`Visualizza analisi per "${word}"`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Network className="h-3 w-3" />
                                          {word}
                                        </div>
                                      </button>
                                      <div className="flex items-center gap-1">
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                          currentDisplayedWord === word 
                                            ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                            : 'bg-white text-gray-500 border-gray-300'
                                        }`}>
                                          {currentDisplayedWord === word ? '✓' : `#${index + 1}`}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSemanticFrameAnalysis(word)}
                                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                          title={`Elimina analisi per "${word}"`}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                  Clicca su una parola per visualizzarla, o usa la X per eliminarla. Inserisci una nuova parola sotto per fare una nuova analisi.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Messaggio quando non ci sono analisi precedenti */}
                        {getAllSemanticFrameWords().length === 0 && (
                          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                              <History className="h-4 w-4" />
                              <span className="text-sm font-medium">Nessuna analisi precedente</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Inserisci una parola sotto per iniziare la tua prima analisi semantica. Le analisi verranno salvate automaticamente e appariranno qui.
                            </p>
                          </div>
                        )}
                        
                        {/* Input Controls */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <Network className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Nuova Analisi Semantica</span>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4 items-start">
                            <input
                              type="text"
                              value={targetWord}
                              onChange={(e) => setTargetWord(e.target.value)}
                              className="border rounded px-3 py-2 w-full md:w-64 focus:ring-2 focus:ring-blue-400"
                              placeholder="E.g.: madre, lavoro, amore..."
                              disabled={semanticFrameLoading}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !semanticFrameLoading) {
                                  performSemanticFrameAnalysis()
                                }
                              }}
                            />
                          <Button 
                            onClick={() => performSemanticFrameAnalysis()}
                            disabled={semanticFrameLoading || !targetWord.trim() || selectedSessions.size === 0}
                            variant="default" 
                            className="w-full md:w-auto"
                          >
                            {semanticFrameLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Analizzando...
                              </>
                            ) : (
                              <>
                                <Network className="mr-2 h-4 w-4" />
                                Analizza Frame
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                        {/* Error Message */}
                        {semanticFrameError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            <strong>Errore:</strong> {semanticFrameError}
                          </div>
                        )}

                        {/* Loading Indicator for Connected Word Analysis */}
                        {analyzingWord && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                              <strong>Analizzando parola connessa:</strong> "{analyzingWord}"
                            </div>
                            <p className="mt-1 text-xs">L'analisi verrà salvata automaticamente e aggiunta alla lista delle analisi precedenti.</p>
                          </div>
                        )}

                        {/* Results Visualization */}
                        <div className="flex-1 flex flex-col min-h-[400px]">
                          {semanticFrameResult ? (
                            <div className="bg-white rounded-lg border p-6 h-full overflow-y-auto">
                              {/* Header con informazioni dell'analisi */}
                              <div className="mb-6">
                                <h4 className="text-xl font-bold text-gray-800 mb-2">
                                  Analisi Semantica: "{semanticFrameResult.target_word || currentDisplayedWord}"
                                </h4>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                  <span>
                                    <strong>Parole connesse:</strong> {semanticFrameResult.semantic_frame?.connected_words?.length || 0}
                                  </span>
                                  <span>
                                    <strong>Valenza emotiva:</strong> {semanticFrameResult.emotional_analysis?.emotional_valence?.toFixed(2) || 'N/A'}
                                  </span>
                                  <span>
                                    <strong>Connessioni totali:</strong> {semanticFrameResult.semantic_frame?.total_connections || 0}
                                  </span>
                                </div>
                              </div>

                              {/* Network Visualization */}
                              {semanticFrameResult.network_plot && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-semibold text-gray-700 mb-3">
                                    Rete Cognitiva EmoAtlas
                                  </h5>
                                  <div className="border rounded-lg overflow-hidden">
                                    <img
                                      src={`data:image/png;base64,${semanticFrameResult.network_plot}`}
                                      alt={`Semantic network for ${semanticFrameResult.target_word || currentDisplayedWord}`}
                                      className="w-full h-auto max-h-[500px] object-contain"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Emotional Analysis */}
                              {semanticFrameResult.emotional_analysis?.z_scores && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-semibold text-gray-700 mb-3">
                                    Profilo Emotivo
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(semanticFrameResult.emotional_analysis.z_scores).map(([emotion, score]) => (
                                      <div key={emotion} className="bg-gray-50 rounded-lg p-3 text-center">
                                        <div className="text-sm font-medium text-gray-600 capitalize">
                                          {emotion === 'joy' ? 'Gioia' :
                                           emotion === 'trust' ? 'Fiducia' :
                                           emotion === 'fear' ? 'Paura' :
                                           emotion === 'surprise' ? 'Sorpresa' :
                                           emotion === 'sadness' ? 'Tristezza' :
                                           emotion === 'disgust' ? 'Disgusto' :
                                           emotion === 'anger' ? 'Rabbia' :
                                           emotion === 'anticipation' ? 'Attesa' : emotion}
                                        </div>
                                        <div className={`text-lg font-bold ${Number(score) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {Number(score).toFixed(2)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Connected Words */}
                              {semanticFrameResult.semantic_frame?.connected_words && semanticFrameResult.semantic_frame.connected_words.length > 0 && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-semibold text-gray-700 mb-3">
                                    Parole Connesse ({semanticFrameResult.semantic_frame.connected_words.length})
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {semanticFrameResult.semantic_frame.connected_words.map((word: string, index: number) => (
                                      <button
                                        key={index}
                                        onClick={() => {
                                          console.log(`[Frontend] Clicked on connected word: "${word}"`)
                                          setTargetWord(word)
                                          // Piccolo delay per assicurarsi che targetWord sia aggiornato
                                          setTimeout(() => {
                                            performSemanticFrameAnalysis(word)
                                          }, 100)
                                        }}
                                        disabled={semanticFrameLoading}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                                          analyzingWord === word
                                            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900'
                                        } ${semanticFrameLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={
                                          analyzingWord === word
                                            ? `Analizzando "${word}"...`
                                            : `Analizza semanticamente la parola "${word}"`
                                        }
                                      >
                                        {analyzingWord === word ? (
                                          <span className="flex items-center gap-1">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                                            {word}
                                          </span>
                                        ) : (
                                          word
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Clicca su una parola per analizzarla semanticamente. L'analisi verrà salvata automaticamente.
                                  </p>
                                </div>
                              )}

                              {/* Error or No Data */}
                              {semanticFrameResult.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                                  <strong>Errore nell'analisi:</strong> {semanticFrameResult.error}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <div className="text-center text-gray-500">
                                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Nessuna analisi semantica</p>
                                <p className="text-sm">Inserisci una parola e clicca "Analizza Frame" per iniziare</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Notes Section - ora a destra */}
            <div className="col-span-3 flex flex-col gap-4 h-[900px] overflow-y-auto">
              {getSelectedSessionsData().length > 0 && getSelectedSessionsData().map((session) => (
                <Card key={session.id} className="flex-0">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      Note Terapeutiche - {session.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingNotes[session.id] ? (
                      <div className="space-y-3">
                        <textarea
                          value={sessionNotes[session.id] || ""}
                          onChange={e => setSessionNotes(prev => ({ ...prev, [session.id]: e.target.value }))}
                          placeholder="Qui il terapeuta può scrivere liberamente note e osservazioni personali"
                          className="w-full h-32 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleCancelEdit(session.id)}>
                            Annulla
                          </Button>
                          <Button size="sm" onClick={() => handleSaveSessionNote(session.id)} disabled={savingNotes[session.id]}>
                            <Save className="h-3 w-3 mr-1" />
                            {savingNotes[session.id] ? "Salvataggio..." : "Salva"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div
                          className="h-32 overflow-y-auto bg-gray-50 p-3 rounded text-sm cursor-pointer"
                          onClick={() => handleEnterEdit(session.id)}
                          tabIndex={0}
                          role="textbox"
                          title="Clicca per modificare la nota"
                          style={{ minHeight: '8rem' }}
                        >
                          {sessionNotes[session.id] || (
                            <span className="text-gray-500 italic">
                              Qui il terapeuta può scrivere liberamente note e osservazioni
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Sidebar informativa ora in basso, sempre visibile */}
      {/* RIMOSSO: Sentiment History qui, ora solo sotto la tab Sentiment Analysis */}
    </div>
  )
}
