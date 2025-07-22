"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, BarChart3, Heart, MessageSquare, Save, Edit, ChevronLeft, ChevronRight, TrendingUp, Network, Search, X, RefreshCw, Database } from "lucide-react"
import { SentimentAnalysis } from "@/components/sentiment-analysis"
import { EmotionTrends } from "@/components/emotion-trends"
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
  const [note, setNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [activeSessionForNote, setActiveSessionForNote] = useState<Session | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0) // 0: Trascrizioni, 1: Topic Modelling, 2: Sentiment Analysis, 3: Semantic Frame
  const [emotionAnalysisResults, setEmotionAnalysisResults] = useState<any[]>([]) // Store emotion analysis results
  
  // Semantic Frame Analysis state
  const [targetWord, setTargetWord] = useState("")
  const [semanticFrameLoading, setSemanticFrameLoading] = useState(false)
  const [semanticFrameResult, setSemanticFrameResult] = useState<any>(null)
  const [semanticFrameError, setSemanticFrameError] = useState<string | null>(null)
  const [pastAnalyses, setPastAnalyses] = useState<{[key: string]: any}>({})
  const [selectedPastAnalysis, setSelectedPastAnalysis] = useState<string>("")
  
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
    getTopicData
  } = useMultiSessionAnalysis({ 
    sessionIds: Array.from(selectedSessions),
    autoLoad: false  // We'll load manually when sessions are selected
  })

  // Stato per le note di tutte le sessioni selezionate
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

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchPatientData()
  }, [session, status, router, patientId])

  // Carica analisi esistenti ogni volta che cambia la selezione delle sessioni (FORZATO SEMPRE)
  useEffect(() => {
    if (selectedSessions.size > 0) {
      loadAllAnalyses();
    }
  }, [selectedSessions, loadAllAnalyses]);

  // Aggiorna i risultati dell'emotion analysis quando cambiano le analisi (ONLY ONCE)
  useEffect(() => {
    if (hasAllSentimentAnalyses && selectedSessions.size > 0) {
      const sentimentData = getSentimentData()
      if (sentimentData && sentimentData.length > 0) {
        setEmotionAnalysisResults(sentimentData)
      }
    }
  }, [hasAllSentimentAnalyses])

  // Carica analisi semantic frame passate quando cambiano le sessioni selezionate (WITH PROTECTION)
  useEffect(() => {
    if (selectedSessions.size > 0) {
      const timeoutId = setTimeout(() => {
        loadPastSemanticFrameAnalyses()
      }, 750)
      
      return () => clearTimeout(timeoutId)
    }
  }, [selectedSessions])

  // Carica le note di tutte le sessioni selezionate ogni volta che cambia la selezione
  useEffect(() => {
    const selected = Array.from(selectedSessions)
    if (selected.length === 0) {
      setSessionNotes({})
      setEditingNotes({})
      setSavingNotes({})
      return
    }
    const fetchAllNotes = async () => {
      const notesObj: Record<string, string> = {}
      await Promise.all(selected.map(async (sessionId) => {
        try {
          const response = await fetch(`/api/notes/${sessionId}`)
          if (response.ok) {
            const result = await response.json()
            const noteData = result.data || result
            notesObj[sessionId] = noteData.content || ""
          } else {
            notesObj[sessionId] = ""
          }
        } catch {
          notesObj[sessionId] = ""
        }
      }))
      setSessionNotes(notesObj)
      setEditingNotes({})
      setSavingNotes({})
    }
    fetchAllNotes()
  }, [selectedSessions])

  // Imposta automaticamente la prima sessione come attiva per le note
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionForNote) {
      setActiveSessionForNote(sessions[0])
    }
  }, [sessions, activeSessionForNote])

  // Imposta automaticamente la prima sessione come sessione attiva per le note
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionForNote) {
      setActiveSessionForNote(sessions[0])
    }
  }, [sessions, activeSessionForNote])

  // Selezione automatica della sessione passata via query string
  useEffect(() => {
    if (sessions.length > 0 && searchParams) {
      const sessionIdFromQuery = searchParams.get('sessionId')
      if (sessionIdFromQuery && sessions.some(s => s.id === sessionIdFromQuery)) {
        setSelectedSessions(new Set([sessionIdFromQuery]))
      }
    }
  }, [sessions, searchParams])

  const loadPastSemanticFrameAnalyses = async () => {
    if (selectedSessions.size === 0) return
    
    const firstSessionId = Array.from(selectedSessions)[0]
    const analysis = analyses[firstSessionId]
    
    if (analysis?.semanticFrames) {
      setPastAnalyses(analysis.semanticFrames)
    } else {
      setPastAnalyses({})
    }
    // Reset selezione quando cambiano le sessioni
    setSelectedPastAnalysis("")
  }

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
          setActiveSessionForNote(transcribedSessions[0])
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

  const fetchSessionNote = async (sessionId: string) => {
    try {
      console.log('🔍 Frontend fetchSessionNote called with sessionId:', sessionId)
      // Usa l'API semplificata temporaneamente
      const response = await fetch(`/api/notes/${sessionId}`)
      console.log('🔍 Fetch URL:', `/api/notes/${sessionId}`)
      if (response.ok) {
        const result = await response.json()
        console.log('🔍 Fetch note result for sessionId', sessionId, ':', result)
        // Gestisce sia il formato diretto che quello con success/data
        const noteData = result.data || result
        setNote(noteData.content || "")
      } else {
        console.error('Error fetching note, status:', response.status)
        setNote("")
      }
    } catch (error) {
      console.error("Error fetching note:", error)
      setNote("")
    }
  }
  const handleSaveNote = async () => {
    if (!activeSessionForNote) return
    
    setSavingNote(true)
    try {
      // Usa l'API semplificata temporaneamente
      const response = await fetch(`/api/notes/${activeSessionForNote.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: note }),
      })

      if (response.ok) {
        setEditingNote(false)
        // Ricarica la nota per assicurarsi che sia aggiornata
        await fetchSessionNote(activeSessionForNote.id)
        // alert("Note saved successfully!") // RIMOSSO: non mostrare più l'avviso di successo
      } else {
        alert("Error saving note")
      }    } catch (error) {
      console.error("Error saving note:", error)
      alert("Error saving note")
    } finally {
      setSavingNote(false)
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
        setSessionNotes(prev => ({ ...prev, [sessionId]: noteData.content || "" }))
      } else {
        // Gestione errore
      }
    } catch {
      // Gestione errore
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
  }

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)))
    }
  }

  // Handle session selection for notes
  const handleSessionSelectForNote = (session: Session) => {
    setActiveSessionForNote(session)
    // fetchSessionNote(session.id) // This is now handled by the new useEffect
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
      setSemanticFrameError("Inserisci una parola chiave per l'analisi")
      return
    }

    const combinedTranscript = getCombinedTranscript()
    if (!combinedTranscript.trim()) {
      setSemanticFrameError("Nessuna trascrizione disponibile nelle sessioni selezionate")
      return
    }

    // Prima verifica se abbiamo già questa analisi nella cache
    const firstSessionId = getSelectedSessionsData()[0]?.id
    if (firstSessionId && analyses[firstSessionId]?.semanticFrames?.[wordToAnalyze]) {
      setSemanticFrameResult(analyses[firstSessionId].semanticFrames[wordToAnalyze])
      return
    }

    setSemanticFrameLoading(true)
    setSemanticFrameError(null)
    setSemanticFrameResult(null)

    try {
      const response = await fetch('/api/semantic-frame-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedTranscript,
          targetWord: wordToAnalyze,
          sessionId: firstSessionId,
          language: 'italian'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSemanticFrameResult(data)
        console.log('Semantic Frame Analysis successful:', data)
        
        // Salva il risultato nella cache per la prima sessione
        if (firstSessionId) {
          await saveSessionAnalysis(firstSessionId, 'semantic_frame', data)
          console.log('✅ Semantic frame salvato nella cache')
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
    setCurrentSlide(index)
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
                              // Seleziona anche per le note come prima
                              setActiveSessionForNote(session)
                            }}
                            className={`flex-1 text-left p-2 rounded transition-colors ${
                              activeSessionForNote?.id === session.id 
                                ? "bg-blue-50 border border-blue-200 shadow-sm" 
                                : "hover:bg-gray-50"
                            }`}
                            title="Click to select this session for notes"
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">
                                {session.title}
                              </div>
                              {activeSessionForNote?.id === session.id && (
                                <MessageSquare className="h-4 w-4 text-blue-600" />
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
                              Select one or more sessions to view the transcripts
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
                                Click "Analyze Topics" to run new analyses
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
                            
                            // Salva nella cache se abbiamo risultati
                            if (result && getSelectedSessionsData().length > 0) {
                              const firstSessionId = getSelectedSessionsData()[0].id
                              await saveSessionAnalysis(firstSessionId, 'topics', result)
                              console.log('✅ Analisi topic salvata nella cache')
                            }
                          }}
                          cachedData={(() => {
                            const topicData = hasAllTopicAnalyses ? getTopicData() : undefined
                            console.log('🎯 Topic cached data being passed:', topicData)
                            console.log('🎯 hasAllTopicAnalyses:', hasAllTopicAnalyses)
                            return topicData
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
                          onAnalysisComplete={async (result) => {
                            console.log('🎯 Sentiment analysis completed:', result)
                            
                            // ONLY transform data, don't trigger more requests
                            if (result.success && result.individual_sessions) {
                              console.log('🔄 Setting emotionAnalysisResults:', result.individual_sessions)
                              setEmotionAnalysisResults(result.individual_sessions)
                              
                              // Salva ogni sessione nella cache (do this quietly)
                              try {
                                const sessions = result.individual_sessions
                                for (const session of sessions) {
                                  await saveSessionAnalysis(session.session_id, 'sentiment', session.analysis)
                                }
                                console.log('✅ Analisi sentiment salvate nella cache')
                              } catch (error) {
                                console.error('⚠️ Error saving to cache (non-blocking):', error)
                              }
                            }
                          }}
                          cachedData={hasAllSentimentAnalyses ? getSentimentData() : undefined}
                        />
                        {/* Sentiment History/Emotion Trends sotto la tab principale */}
                        <div className="w-full mt-8 px-2 sm:px-4 lg:px-6">
                          <Card className="h-[600px]">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Sentiment History - Emotion Trends Over Time
                              </CardTitle>
                              <CardDescription>
                                Evolution of the 8 core emotions throughout therapy sessions
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="min-h-[500px] max-h-none overflow-auto">
                              {emotionAnalysisResults.length > 0 ? (
                                <div className="w-full overflow-y-auto">
                                  <EmotionTrends 
                                    analysisData={{ individual_sessions: emotionAnalysisResults }}
                                  />
                                </div>
                              ) : (
                                <div className="min-h-[500px] flex items-center justify-center text-gray-400">
                                  <div className="text-center">
                                    <TrendingUp className="h-16 w-16 mx-auto mb-4" />
                                    <p className="text-lg mb-2">Sentiment History Chart</p>
                                    <p className="text-sm">
                                      Run the sentiment analysis first to view the chart
                                    </p>
                                    <p className="text-xs mt-2 text-gray-500">
                                      Go to the "Sentiment Analysis" tab and analyze the selected sessions
                                    </p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Slide 3: Analisi Semantica */}
                    {currentSlide === 3 && (
                      <div className="h-full flex flex-col gap-6">
                        <div className="mb-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Network className="h-5 w-5 text-blue-700" />
                            Word Analysis
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            Explore the cognitive and emotional context of a keyword in the selected sessions.<br/>
                            Enter a word and view its semantic network and associated emotional profile.
                          </p>
                        </div>
                        
                        {/* Menu Analisi Passate */}
                        {Object.keys(pastAnalyses).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                              Past Analyses
                            </h4>
                            <div className="flex gap-3 items-center">
                              <select
                                value={selectedPastAnalysis}
                                onChange={(e) => {
                                  setSelectedPastAnalysis(e.target.value)
                                  if (e.target.value && pastAnalyses[e.target.value]) {
                                    setSemanticFrameResult(pastAnalyses[e.target.value])
                                    setTargetWord(e.target.value)
                                    setSemanticFrameError(null)
                                  }
                                }}
                                className="border rounded px-3 py-2 bg-white min-w-[200px] focus:ring-2 focus:ring-blue-400"
                              >
                                <option value="">Select previous search </option>
                                {Object.keys(pastAnalyses).map(word => (
                                  <option key={word} value={word}>
                                    {word}
                                  </option>
                                ))}
                              </select>
                              {selectedPastAnalysis && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPastAnalysis("")
                                    setSemanticFrameResult(null)
                                    setTargetWord("")
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Select a previous analysis to view it again, or enter a new word below.
                            </p>
                          </div>
                        )}
                        
                        {/* Input Controls */}
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <input
                            type="text"
                            value={targetWord}
                            onChange={(e) => setTargetWord(e.target.value)}
                            className="border rounded px-3 py-2 w-full md:w-64 focus:ring-2 focus:ring-blue-400"
                            placeholder="E.g.: mother, work, love..."
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
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Network className="mr-2 h-4 w-4" />
                                Analyze Frame
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Error Message */}
                        {semanticFrameError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            <strong>Error:</strong> {semanticFrameError}
                          </div>
                        )}

                        {/* Results Visualization */}
                        <div className="flex-1 flex flex-col min-h-[400px]">
                          {semanticFrameResult ? (
                            <div className="space-y-6">
                              {/* Network Visualization */}
                              {semanticFrameResult.visualization?.frame_plot && (
                                <div className="bg-white rounded-lg border p-4">
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Network className="h-5 w-5 text-blue-600" />
                                    Semantic Network for "{semanticFrameResult.target_word}"
                                  </h4>
                                  <div className="flex justify-center mb-4">
                                    <img 
                                      src={`data:image/png;base64,${semanticFrameResult.visualization.frame_plot}`}
                                      alt={`Semantic network for ${semanticFrameResult.target_word}`}
                                      className="max-w-full h-auto rounded border"
                                      style={{ maxHeight: '500px' }}
                                    />
                                  </div>
                                  
                                  {/* Legend */}
                                  <div className="bg-gray-50 rounded-lg p-3 mt-4">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">📋 Color Legend</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span><strong>Red:</strong> Words with negative valence</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span><strong>Green:</strong> Words with positive valence</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                        <span><strong>Gray:</strong> Neutral words</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        <span><strong>Purple:</strong> Contrastive connections</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-600">
                                      <p><strong>Font size:</strong> Proportional to the centrality/importance of the word in the text</p>
                                      <p><strong>Connections:</strong> Lines indicate syntactic relationships between words</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Semantic Network Visualization */}

                              {semanticFrameResult.network_plot && (
                                <div className="bg-white rounded-lg border p-4 mb-4">
                                  <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                    <Network className="w-5 h-5 text-green-600" />
                                    🎯 Semantic Network Generated by EmoAtlas
                                  </h4>
                                  <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                                    <img 
                                      src={`data:image/png;base64,${semanticFrameResult.network_plot}`}
                                      alt={`Semantic network for the word "${targetWord}"`}
                                      className="max-w-full h-auto rounded-lg shadow-lg border-2 border-blue-200"
                                      style={{ maxHeight: '600px', maxWidth: '100%' }}
                                      onLoad={() => console.log('✅ Network plot image loaded successfully!')}
                                      onError={(e) => {
                                        console.error('❌ Errore nel caricamento immagine network plot:', e);
                                        console.error('❌ Image src length:', e.currentTarget.src.length);
                                        console.error('❌ Base64 data length:', semanticFrameResult.network_plot.length);
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                              <span className="text-gray-400 text-center">
                                <Network className="w-12 h-12 mx-auto mb-2" />
                                <span className="block font-medium">Visualizzazione frame semantico</span>
                                <span className="block text-sm mt-1">
                                  {selectedSessions.size === 0 
                                    ? "Select sessions and enter a word to start the analysis"
                                    : "Enter a keyword and click 'Analyze Frame'"
                                  }
                                </span>
                              </span>
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
