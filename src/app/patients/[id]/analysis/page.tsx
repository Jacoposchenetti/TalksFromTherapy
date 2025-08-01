"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, MessageSquare, FileText, Save, Edit, ArrowLeft, BarChart3, Heart, Network, Search, X, RefreshCw, Database, History } from "lucide-react"
import { SentimentAnalysis } from "@/components/sentiment-analysis"
import TopicAnalysisComponent from "@/components/analysis/topic-modeling-gpt"
import { useMultiSessionAnalysis } from "@/hooks/useMultiSessionAnalysis"
import { useRef } from "react"

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

function AnalysisPageInner() {
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
  const [sidebarOpen, setSidebarOpen] = useState(true) // Sidebar visibility state
  const [notesOpen, setNotesOpen] = useState(true) // Notes tab visibility state
  const [currentNoteSessionIndex, setCurrentNoteSessionIndex] = useState(0) // Current session index for notes navigation
  
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
    autoLoad: true // Cambiato da false a true
  })

  // Stato per le note di tutte le sessioni
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  // Per gestire il revert, salvo il valore originale della nota quando si entra in modalità editing
  const [originalNotes, setOriginalNotes] = useState<Record<string, string>>({})
  
  // Stato per i riassunti di tutte le sessioni
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({})
  const [generatingSummary, setGeneratingSummary] = useState<Record<string, boolean>>({})

  // Constants for adaptive height logic
  const MIN_NOTE_HEIGHT = 200 // Minimum height in pixels for notes with no text or short text
  const TEXT_LENGTH_THRESHOLD = 300 // Character threshold for adaptive height
  const MAX_NOTE_HEIGHT = 600 // Maximum height for very long notes

  // Function to calculate adaptive height for note tabs
  const getNoteHeight = (content: string): string => {
    const contentLength = content?.length || 0
    
    if (contentLength === 0 || contentLength < TEXT_LENGTH_THRESHOLD) {
      return `${MIN_NOTE_HEIGHT}px`
    } else {
      // Calculate adaptive height based on content length
      // More responsive scaling: base height + additional height for longer content
      const adaptiveHeight = Math.min(
        MIN_NOTE_HEIGHT + (contentLength - TEXT_LENGTH_THRESHOLD) * 0.8,
        MAX_NOTE_HEIGHT
      )
      return `${adaptiveHeight}px`
    }
  }

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
  const autoSelectedRef = useRef(false)

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
    const fetchAllNotes = async () => {
      if (selectedSessions.size === 0) return

      try {
        const selectedSessionsData = getSelectedSessionsData()
        const notesPromises = selectedSessionsData.map(async (session) => {
          try {
            const response = await fetch(`/api/notes/${session.id}`)
            if (response.ok) {
              const result = await response.json()
              const noteData = result.data || result
              return { sessionId: session.id, content: noteData.content || "" }
            } else {
              console.warn(`No note found for session ${session.id}`)
              return { sessionId: session.id, content: "" }
            }
          } catch (error) {
            console.error(`Error fetching note for session ${session.id}:`, error)
            return { sessionId: session.id, content: "" }
          }
        })

        const notesResults = await Promise.all(notesPromises)
        const notesMap: Record<string, string> = {}
        notesResults.forEach(result => {
          notesMap[result.sessionId] = result.content
        })
        setSessionNotes(notesMap)
      } catch (error) {
        console.error('Error fetching notes:', error)
      }
    }
    fetchAllNotes()
    fetchAllSummaries()
  }, [sessions, selectedSessions])



  // Funzione helper per verificare se una sessione ha una nota non vuota
  const hasSessionNote = (sessionId: string) => {
    const note = sessionNotes[sessionId]
    return note && note.trim().length > 0
  }



  // Selezione automatica della sessione passata via query string SOLO al primo caricamento
  useEffect(() => {
    if (
      sessions.length > 0 &&
      searchParams &&
      selectedSessions.size === 0 &&
      !autoSelectedRef.current
    ) {
      const sessionIdFromQuery = searchParams.get('sessionId')
      if (sessionIdFromQuery && sessions.some(s => s.id === sessionIdFromQuery)) {
        setSelectedSessions(new Set([sessionIdFromQuery]))
        autoSelectedRef.current = true
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
        const result = await response.json()
        
        setEditingNotes(prev => ({ ...prev, [sessionId]: false }))
        // Ricarica la nota aggiornata
        const noteData = result.data || result
        const updatedContent = noteData.content || ""
        setSessionNotes(prev => ({ ...prev, [sessionId]: updatedContent }))
      } else {
        // Gestione errore
        const errorText = await response.text()
        console.error('Error saving note - status:', response.status, 'response:', errorText)
      }
    } catch (error) {
      // Gestione errore
      console.error('Error saving note:', error)
    } finally {
      setSavingNotes(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  // Function to highlight search terms in text and format dialogue
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!text) return text
    
    // First, format the dialogue by adding line breaks before speaker markers
    // Handle Italian markers (Paziente:, Terapeuta:, P:, T:)
    let formattedText = text
      .replace(/(\s+)(Paziente:)/g, '<br/><br/><strong class="text-green-600">$2</strong>')
      .replace(/(\s+)(Terapeuta:)/g, '<br/><br/><strong class="text-blue-600">$2</strong>')
      .replace(/(\s+)(P:|T:)/g, '<br/><br/><strong class="text-green-600">$2</strong>')
      // Handle English markers (Patient:, Therapist:)
      .replace(/(\s+)(Patient:)/g, '<br/><br/><strong class="text-green-600">$2</strong>')
      .replace(/(\s+)(Therapist:)/g, '<br/><br/><strong class="text-blue-600">$2</strong>')
    
    // Handle the case where speaker markers appear at the beginning
    formattedText = formattedText
      .replace(/^(Paziente:)/g, '<strong class="text-green-600">$1</strong>')
      .replace(/^(Terapeuta:)/g, '<strong class="text-blue-600">$1</strong>')
      .replace(/^(P:|T:)/g, '<strong class="text-green-600">$1</strong>')
      .replace(/^(Patient:)/g, '<strong class="text-green-600">$1</strong>')
      .replace(/^(Therapist:)/g, '<strong class="text-blue-600">$1</strong>')
    
    // Ensure proper structure: each speaker marker should be followed by content on a new line
    formattedText = formattedText
      .replace(/(<strong[^>]*>Paziente:<\/strong>)([^<])/g, '$1<br/>$2')
      .replace(/(<strong[^>]*>Terapeuta:<\/strong>)([^<])/g, '$1<br/>$2')
      .replace(/(<strong[^>]*>P:|T:<\/strong>)([^<])/g, '$1<br/>$2')
      .replace(/(<strong[^>]*>Patient:<\/strong>)([^<])/g, '$1<br/>$2')
      .replace(/(<strong[^>]*>Therapist:<\/strong>)([^<])/g, '$1<br/>$2')
    
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
    // Aggiorna automaticamente le analisi solo se ci sono sessioni selezionate
    if (newSelected.size > 0) {
      loadAllAnalyses()
    }
    // NON selezionare mai automaticamente se newSelected.size === 0
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
  // Funzione per normalizzare la struttura del transcript per il topic modeling
  const normalizeTranscriptStructure = (transcript: string): string => {
    if (!transcript) return transcript;
    
    console.log('🔧 Normalizing transcript structure...');
    console.log('📝 Original transcript (first 200 chars):', transcript.substring(0, 200));
    
    // Check if the transcript is already properly formatted
    const hasProperStructure = /(Paziente:|Terapeuta:)\s*\n/.test(transcript);
    
    if (hasProperStructure) {
      console.log('✅ Transcript already has proper structure, skipping normalization');
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
    
    console.log('✅ Normalized transcript (first 200 chars):', normalized.substring(0, 200));
    console.log('🔍 Speaker markers found:', (normalized.match(/(Paziente:|Terapeuta:|P:|T:|THERAPIST:|Therapist:)/gi) || []).length);
    
    return normalized;
  };

  // Funzione per formattare il transcript per la visualizzazione HTML
  const formatTranscriptForDisplay = (transcript: string): string => {
    const normalized = normalizeTranscriptStructure(transcript);
    // Converti \n in <br/> per il rendering HTML
    return normalized.replace(/\n/g, '<br/>');
  };

  // Get combined transcript
  const getCombinedTranscript = () => {
    const selectedSessionsData = getSelectedSessionsData()
    return selectedSessionsData
      .map(session => normalizeTranscriptStructure(session.transcript || ""))
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

  // Navigation functions for notes
  const goToPreviousNote = () => {
    const selectedSessions = getSelectedSessionsData()
    if (selectedSessions.length > 0) {
      setCurrentNoteSessionIndex(prev => 
        prev > 0 ? prev - 1 : selectedSessions.length - 1
      )
    }
  }

  const goToNextNote = () => {
    const selectedSessions = getSelectedSessionsData()
    if (selectedSessions.length > 0) {
      setCurrentNoteSessionIndex(prev => 
        prev < selectedSessions.length - 1 ? prev + 1 : 0
      )
    }
  }

  // Reset note session index when selected sessions change
  useEffect(() => {
    const selectedSessions = getSelectedSessionsData()
    if (currentNoteSessionIndex >= selectedSessions.length) {
      setCurrentNoteSessionIndex(0)
    }
  }, [selectedSessions, currentNoteSessionIndex])

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

  // Funzione per caricare i riassunti di tutte le sessioni selezionate
  const fetchAllSummaries = async () => {
    if (selectedSessions.size === 0) return

    try {
      const selectedSessionsData = getSelectedSessionsData()
      const summariesPromises = selectedSessionsData.map(async (session) => {
        try {
          // Carica il riassunto dalla tabella analyses
          const response = await fetch(`/api/sessions/${session.id}/summary`)
          if (response.ok) {
            const summaryData = await response.json()
            return { sessionId: session.id, content: summaryData.data?.summary || "" }
          } else {
            console.warn(`No summary found for session ${session.id}`)
            return { sessionId: session.id, content: "" }
          }
        } catch (error) {
          console.error(`Error fetching summary for session ${session.id}:`, error)
          return { sessionId: session.id, content: "" }
        }
      })

      const summariesResults = await Promise.all(summariesPromises)
      const summariesMap: Record<string, string> = {}
      summariesResults.forEach(result => {
        summariesMap[result.sessionId] = result.content
      })
      setSessionSummaries(summariesMap)
    } catch (error) {
      console.error('Error fetching summaries:', error)
    }
  }

  // Funzione per generare manualmente il riassunto
  const handleGenerateSummary = async (sessionId: string) => {
    setGeneratingSummary(prev => ({ ...prev, [sessionId]: true }))
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        const summary = result.data?.summary || ""
        
        // Aggiorna lo stato locale
        setSessionSummaries(prev => ({ ...prev, [sessionId]: summary }))
        
        console.log(`✅ Riassunto generato manualmente per sessione ${sessionId}`)
      } else {
        const errorText = await response.text()
        console.error(`❌ Errore nella generazione del riassunto: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Error generating summary:', error)
    } finally {
      setGeneratingSummary(prev => ({ ...prev, [sessionId]: false }))
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

  const selectedSessionsData = getSelectedSessionsData();
  const topicData = hasAllTopicAnalyses ? getTopicData() : undefined;
  const topicDataWithTitles = topicData?.map(result => {
    const session = selectedSessionsData.find(s => s.id === result.session_id);
    return {
      ...result,
      session_title: session?.title || result.session_title || `Sessione ${result.session_id}`,
    };
  });

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
        <div className={`w-full py-8 ${sidebarOpen ? 'px-0' : 'px-4 sm:px-6 lg:pl-0 lg:pr-8'} ${notesOpen ? 'lg:pr-0' : 'lg:pr-0'} ${!notesOpen ? 'lg:pr-0' : ''}`}>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 w-full">
            {/* Sidebar - Sessions List */}
            <div className={`transition-all duration-300 ease-in-out min-w-0 ${
              sidebarOpen 
                ? 'lg:col-span-3 xl:col-span-2' 
                : 'lg:col-span-1'
            } ${!sidebarOpen ? 'lg:ml-0' : ''}`}>
              <div className={`transition-all duration-300 ease-in-out ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'
              }`}>
                <Card className={`${!sidebarOpen ? 'lg:w-12 lg:min-w-12 lg:max-w-12 lg:h-16' : ''}`}>
                  <CardHeader className={!sidebarOpen ? 'lg:p-2 lg:px-2' : ''}>
                    {sidebarOpen ? (
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          <span>Transcribed sessions</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          className="hidden lg:flex h-8 w-8 p-0 ml-auto"
                          title="Nascondi sidebar"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    ) : (
                                             <CardTitle className="flex flex-col items-center justify-center h-12 space-y-1 -mt-6">
                         <FileText className="h-5 w-5" />
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          className="h-6 w-6 p-0 ml-auto"
                          title="Mostra sidebar"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </CardTitle>
                    )}
                    <div className={`flex items-center gap-2 pt-2 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={selectedSessions.size === sessions.length && sessions.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                        Seleziona tutto
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className={`p-0 ${!sidebarOpen ? 'lg:hidden' : ''}`}>
                    <div className={`space-y-1 max-h-[600px] overflow-y-auto ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            selectedSessions.has(session.id)
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSessionToggle(session.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSessions.has(session.id)}
                            onChange={() => handleSessionToggle(session.id)}
                            className="rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {session.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(session.sessionDate).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {hasSessionNote(session.id) && (
                            <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Mobile toggle button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden w-full mt-2"
                title={sidebarOpen ? "Nascondi sidebar" : "Mostra sidebar"}
              >
                <FileText className="h-4 w-4 mr-2" />
                {sidebarOpen ? "Nascondi Sessioni" : "Mostra Sessioni"}
              </Button>
            </div>
                                   {/* Main Sliding Analysis Panel */}
                       <div className={`transition-all duration-300 ease-in-out min-w-0 ${
                         sidebarOpen
                           ? notesOpen ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-9 xl:col-span-9'
                           : notesOpen ? 'lg:col-span-8 xl:col-span-8' : 'lg:col-span-10 xl:col-span-10'
                       }`}>
              <Card>
                <CardHeader className="pb-4">
                  {/* Slide Navigation */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {slides.map((slide, index) => {
                        const Icon = slide.icon
                        return (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all relative text-sm sm:text-base ${
                              currentSlide === index
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{slide.title}</span>
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
                <CardContent className="min-h-[600px] max-h-[800px] overflow-y-auto">
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
                                  placeholder="Cerca parole nelle trascrizioni..."
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
                                  {countSearchOccurrences(searchTerm)} risultati trovati
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
                                      className="whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerm(formatTranscriptForDisplay(session.transcript), searchTerm)
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
                          selectedSessions={selectedSessionsData.map(session => ({
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
                          cachedData={topicDataWithTitles && topicDataWithTitles.length > 0 ? topicDataWithTitles : undefined}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
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
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
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
                                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
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
            {/* Notes Section - minimizable */}
            <div className={`transition-all duration-300 ease-in-out min-w-0 ${
              notesOpen 
                ? 'lg:col-span-3 xl:col-span-3' 
                : 'lg:col-span-1'
            }`}>
              <div className={`transition-all duration-300 ease-in-out ${
                notesOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'
              }`}>
                <Card className={`${!notesOpen ? 'lg:w-12 lg:min-w-12 lg:max-w-12 lg:py-0 lg:px-0 lg:absolute lg:right-0 lg:h-16' : ''}`}>
                  <CardHeader className={!notesOpen ? 'lg:p-2 lg:px-2' : ''}>
                    {notesOpen ? (
                      <CardTitle className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotesOpen(!notesOpen)}
                          className="hidden lg:flex h-8 w-8 p-0 mr-auto"
                          title="Nascondi note"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 flex-1 justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Note e Riassunto - {getSelectedSessionsData().length > 0 ? getSelectedSessionsData()[currentNoteSessionIndex]?.title : ''}</span>
                          </div>
                          {getSelectedSessionsData().length > 1 && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={goToPreviousNote}
                                className="h-6 w-6 p-0"
                                title="Sessione precedente"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={goToNextNote}
                                className="h-6 w-6 p-0"
                                title="Sessione successiva"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardTitle>
                    ) : (
                                             <CardTitle className="flex flex-col items-center justify-center h-12 space-y-1 mt-0">
                         <MessageSquare className="h-5 w-5" />
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotesOpen(!notesOpen)}
                          className="h-6 w-6 p-0 mr-auto"
                          title="Mostra note"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className={`p-0 ${!notesOpen ? 'lg:hidden' : ''}`}>
                    <div className={`space-y-4 ${notesOpen ? 'block' : 'hidden lg:hidden'}`}>
                      {getSelectedSessionsData().length > 0 ? (
                        (() => {
                          const selectedSessions = getSelectedSessionsData()
                          const currentSession = selectedSessions[currentNoteSessionIndex]
                          
                          return (
                            <>
                              <Card 
                                key={currentSession.id} 
                                className="flex-shrink-0"
                                style={{ height: getNoteHeight(sessionNotes[currentSession.id] || "") }}
                              >
                                <CardHeader className="flex-shrink-0">
                                  <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <MessageSquare className="h-5 w-5" />
                                      Note
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 min-h-0 flex flex-col">
                                  {editingNotes[currentSession.id] ? (
                                    <div className="space-y-3 flex-1 flex flex-col">
                                      <textarea
                                        value={sessionNotes[currentSession.id] || ""}
                                        onChange={e => setSessionNotes(prev => ({ ...prev, [currentSession.id]: e.target.value }))}
                                        placeholder="Qui il terapeuta può scrivere liberamente note e osservazioni personali"
                                        className="w-full flex-1 min-h-0 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        autoFocus
                                      />
                                      <div className="flex gap-2 justify-end flex-shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => handleCancelEdit(currentSession.id)}>
                                          Annulla
                                        </Button>
                                        <Button size="sm" onClick={() => handleSaveSessionNote(currentSession.id)} disabled={savingNotes[currentSession.id]}>
                                          <Save className="h-3 w-3 mr-1" />
                                          {savingNotes[currentSession.id] ? "Salvataggio..." : "Salva"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 flex-1 flex flex-col">
                                      <div
                                        className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-3 rounded text-sm cursor-pointer"
                                        onClick={() => handleEnterEdit(currentSession.id)}
                                        tabIndex={0}
                                        role="textbox"
                                        title="Clicca per modificare la nota"
                                      >
                                        {sessionNotes[currentSession.id] || (
                                          <span className="text-gray-500 italic">
                                            Qui il terapeuta può scrivere liberamente note e osservazioni
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                              
                              {/* Summary Module */}
                              <Card className="flex-shrink-0">
                                <CardHeader className="flex-shrink-0">
                                  <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5" />
                                      Riassunto
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 min-h-0 flex flex-col">
                                  <div className="space-y-3 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600">Riassunto della trascrizione</span>
                                      {!sessionSummaries[currentSession.id] && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleGenerateSummary(currentSession.id)}
                                          disabled={generatingSummary[currentSession.id]}
                                          className="h-8 px-3"
                                        >
                                          {generatingSummary[currentSession.id] ? (
                                            <>
                                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                              Generazione...
                                            </>
                                          ) : (
                                            <>
                                              <FileText className="h-3 w-3 mr-1" />
                                              Genera Riassunto
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                    <textarea
                                      value={sessionSummaries[currentSession.id] || ""}
                                      placeholder={sessionSummaries[currentSession.id] ? "Il riassunto della trascrizione apparirà qui..." : "Nessun riassunto disponibile. Clicca 'Genera Riassunto' per crearlo."}
                                      className="w-full flex-1 min-h-0 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      readOnly
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          )
                        })()
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Seleziona una sessione per vedere le sue note</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              

              
              {/* Mobile toggle button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotesOpen(!notesOpen)}
                className="lg:hidden w-full mt-2"
                title={notesOpen ? "Nascondi note" : "Mostra note"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {notesOpen ? "Nascondi Note e Riassunto" : "Mostra Note e Riassunto"}
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Sidebar informativa ora in basso, sempre visibile */}
      {/* RIMOSSO: Sentiment History qui, ora solo sotto la tab Sentiment Analysis */}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <AnalysisPageInner />
    </Suspense>
  );
}
