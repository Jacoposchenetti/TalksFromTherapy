"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
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

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchPatientData()
  }, [session, status, router, patientId])

  // Carica analisi esistenti quando cambiano le sessioni selezionate
  useEffect(() => {
    if (selectedSessions.size > 0) {
      loadAllAnalyses()
    }
  }, [selectedSessions, loadAllAnalyses])

  // Aggiorna i risultati dell'emotion analysis quando cambiano le analisi
  useEffect(() => {
    if (hasAllSentimentAnalyses && selectedSessions.size > 0) {
      const sentimentData = getSentimentData()
      setEmotionAnalysisResults(sentimentData)
    }
  }, [hasAllSentimentAnalyses, selectedSessions.size]) // Rimuoviamo getSentimentData per evitare loop

  // Carica analisi semantic frame passate quando cambiano le sessioni selezionate o le analisi
  useEffect(() => {
    if (selectedSessions.size > 0) {
      loadPastSemanticFrameAnalyses()
    }
  }, [selectedSessions, analyses])

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
        setError('Errore nel caricamento dei dati del paziente: ' + patientResponse.status)
        return
      }

      // Fetch patient sessions
      const sessionsResponse = await fetch(`/api/sessions?patientId=${patientId}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        
        // Filter sessions with transcripts for analysis
        const transcribedSessions = sessionsData?.filter((s: Session) => 
          s.transcript && 
          typeof s.transcript === 'string' && 
          s.transcript.trim().length > 0
        ) || []
        
        setSessions(transcribedSessions)
        
        // Auto-select first session if available
        if (transcribedSessions.length > 0) {
          setActiveSessionForNote(transcribedSessions[0])
          fetchSessionNote(transcribedSessions[0].id)
        }
      } else {
        setError('Errore nel caricamento delle sessioni')
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionNote = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/note`)
      if (response.ok) {
        const noteData = await response.json()
        setNote(noteData.content || "")      } else {
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
      const response = await fetch(`/api/sessions/${activeSessionForNote.id}/note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: note }),
      })

      if (response.ok) {
        setEditingNote(false)
        alert("Nota salvata con successo!")
      } else {
        alert("Errore durante il salvataggio della nota")
      }    } catch (error) {
      console.error("Error saving note:", error)
      alert("Errore durante il salvataggio della nota")
    } finally {
      setSavingNote(false)
    }
  }

  // Function to highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
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
    fetchSessionNote(session.id)
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
    { title: "Trascrizioni", icon: FileText },
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
            Torna ai Pazienti
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
            Torna ai Pazienti
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
                Torna ai Pazienti
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Analisi - {patient.initials}
                </h1>
                <p className="text-gray-600">
                  Analisi delle sessioni terapeutiche e trascrizioni
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna sessione trascritta
              </h3>
              <p className="text-gray-600 text-center">
                Non ci sono sessioni trascritte per questo paziente. 
                Carica e trascrivi delle sessioni per iniziare l'analisi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Main Analysis Area with Slides */}
            <div className="grid grid-cols-12 gap-6">              {/* Sidebar - Sessions List */}
              <div className="col-span-2">
                <Card className="h-[900px]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sessioni e Trascrizioni
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
                        Seleziona tutto
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
                              onClick={() => handleSessionSelectForNote(session)}
                              className={`flex-1 text-left ${
                                activeSessionForNote?.id === session.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                              }`}
                            >
                              <div className="font-medium text-sm">
                                {session.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(session.createdAt).toLocaleDateString('it-IT')}
                              </div>
                              <div className="text-xs text-gray-400">
                                Status: {session.status}
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>                </Card>
              </div>

              {/* Main Sliding Analysis Panel */}
              <div className="col-span-10">
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
                              {slide.hasCachedData && selectedSessions.size > 0 && (
                                <Database className="h-3 w-3 text-green-600" title="Dati in cache disponibili" />
                              )}
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
                                `${selectedSessions.size} sessioni selezionate` : 
                                'Nessuna Sessione Selezionata'}
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
                                        dangerouslySetInnerHTML={{
                                          __html: highlightSearchTerm(session.transcript, searchTerm)
                                        }}
                                      />
                                    ) : (
                                      <span className="text-gray-400 italic">
                                        Trascrizione non disponibile (Status: {session.status})
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
                                  Clicca "Analizza Topic" per eseguire nuove analisi
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Show recalculate button when cached data is available */}
                          {hasAllTopicAnalyses && (
                            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-medium">
                                    Analisi topic caricate dalla cache
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Pulisci cache per topic analysis
                                    selectedSessions.forEach(sessionId => {
                                      fetch(`/api/analyses?sessionId=${sessionId}&analysisType=topics`, {
                                        method: 'DELETE'
                                      })
                                    })
                                  }}
                                  className="text-xs"
                                >
                                  Ricalcola
                                </Button>
                              </div>
                            </div>
                          )}

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
                        <div className="h-full pt-6">
                          {/* Cache Status Indicator - only show if no cached data available */}
                          {selectedSessions.size > 0 && !hasAllSentimentAnalyses && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  Clicca "Analizza Emozioni" per eseguire nuove analisi
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Show recalculate button when cached data is available */}
                          {hasAllSentimentAnalyses && (
                            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-medium">
                                    Analisi caricate dalla cache
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Pulisci cache e forza ricalcolo
                                    setEmotionAnalysisResults([])
                                    selectedSessions.forEach(sessionId => {
                                      fetch(`/api/analyses?sessionId=${sessionId}&analysisType=sentiment`, {
                                        method: 'DELETE'
                                      })
                                    })
                                  }}
                                  className="text-xs"
                                >
                                  Ricalcola
                                </Button>
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
                              
                              // Transform data for EmotionTrends component
                              if (result.success && result.analysis?.individual_sessions) {
                                console.log('🔄 Setting emotionAnalysisResults:', result.analysis.individual_sessions)
                                setEmotionAnalysisResults(result.analysis.individual_sessions)
                                
                                // Salva ogni sessione nella cache
                                const sessions = result.analysis.individual_sessions
                                for (const session of sessions) {
                                  await saveSessionAnalysis(session.session_id, 'sentiment', session.analysis)
                                }
                                console.log('✅ Analisi sentiment salvate nella cache')
                              }
                            }}
                            cachedData={hasAllSentimentAnalyses ? getSentimentData() : undefined}
                          />
                        </div>
                      )}

                      {/* Slide 3: Analisi Semantica */}
                      {currentSlide === 3 && (
                        <div className="h-full flex flex-col gap-6">
                          <div className="mb-2">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Network className="h-5 w-5 text-blue-700" />
                              Analisi Semantica (Semantic Frame)
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">
                              Esplora il contesto cognitivo ed emotivo di una parola chiave nelle sessioni selezionate.<br/>
                              Inserisci una parola e visualizza la sua rete semantica e il profilo emotivo associato.
                            </p>
                            
                            {/* Descrizione metodologica */}
                            <div className="text-xs text-gray-500 mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <p>
                                <strong>💡 Cos'è?</strong> La Semantic Frame Analysis permette di esplorare le associazioni cognitive ed emotive di una parola chiave nel testo, utile per analisi narrative, metafore, ruoli e insight clinici.
                              </p>
                            </div>

                            {/* Cache Status per Semantic Frame */}
                            {selectedSessions.size > 0 && analyses[getSelectedSessionsData()[0]?.id]?.semanticFrames && Object.keys(analyses[getSelectedSessionsData()[0]?.id]?.semanticFrames || {}).length > 0 && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-medium">
                                    Analisi semantic frame disponibili per: {Object.keys(analyses[getSelectedSessionsData()[0]?.id]?.semanticFrames || {}).join(', ')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Menu Analisi Passate */}
                          {Object.keys(pastAnalyses).length > 0 && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                              <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                                <Database className="h-4 w-4 text-blue-600" />
                                Analisi Passate
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
                                  <option value="">Seleziona un'analisi passata</option>
                                  {Object.keys(pastAnalyses).map(word => (
                                    <option key={word} value={word}>
                                      {word} (analizzata in precedenza)
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
                                Seleziona un'analisi precedente per visualizzarla nuovamente, o inserisci una nuova parola sotto.
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
                              placeholder="Es: madre, lavoro, amore..."
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

                          {/* Error Message */}
                          {semanticFrameError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                              <strong>Errore:</strong> {semanticFrameError}
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
                                      Rete Semantica per "{semanticFrameResult.target_word}"
                                    </h4>
                                    <div className="flex justify-center mb-4">
                                      <img 
                                        src={`data:image/png;base64,${semanticFrameResult.visualization.frame_plot}`}
                                        alt={`Rete semantica per ${semanticFrameResult.target_word}`}
                                        className="max-w-full h-auto rounded border"
                                        style={{ maxHeight: '500px' }}
                                      />
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="bg-gray-50 rounded-lg p-3 mt-4">
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">📋 Legenda Colori</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                          <span><strong>Rosso:</strong> Parole con valenza negativa</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                          <span><strong>Verde:</strong> Parole con valenza positiva</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                          <span><strong>Grigio:</strong> Parole neutrali</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                          <span><strong>Viola:</strong> Connessioni contrastive</span>
                                        </div>
                                      </div>
                                      <div className="mt-2 text-xs text-gray-600">
                                        <p><strong>Dimensione font:</strong> Proporzionale alla centralità/importanza della parola nel testo</p>
                                        <p><strong>Connessioni:</strong> Linee indicano relazioni sintattiche tra le parole</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Semantic Network Visualization */}

                                {semanticFrameResult.network_plot && (
                                  <div className="bg-white rounded-lg border p-4 mb-4">
                                    <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                      <Network className="w-5 h-5 text-green-600" />
                                      🎯 Rete Semantica Generata da EmoAtlas
                                    </h4>
                                    <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                                      <img 
                                        src={`data:image/png;base64,${semanticFrameResult.network_plot}`}
                                        alt={`Rete semantica per la parola "${targetWord}"`}
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
                                      ? "Seleziona delle sessioni e inserisci una parola per iniziare l'analisi"
                                      : "Inserisci una parola chiave e clicca 'Analizza Frame'"
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
              </div>            </div>            {/* Historical Sentiment Trends - Only visible in Sentiment Analysis tab */}
            {currentSlide === 2 && (
              <Card className="h-[600px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Storico Sentiment - Andamento Emozioni nel Tempo
                  </CardTitle>
                  <CardDescription>
                    Evoluzione delle 8 emozioni fondamentali attraverso le sessioni di terapia
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[500px] max-h-none overflow-auto">
                  {(() => {
                    console.log('🎨 Rendering trends section. emotionAnalysisResults:', emotionAnalysisResults)
                    console.log('🎨 emotionAnalysisResults.length:', emotionAnalysisResults.length)
                    return emotionAnalysisResults.length > 0 ? (
                      <div className="w-full overflow-y-auto">
                        <EmotionTrends 
                          analysisData={{ individual_sessions: emotionAnalysisResults }}
                        />
                      </div>                    ) : (
                      <div className="min-h-[500px] flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <TrendingUp className="h-16 w-16 mx-auto mb-4" />
                          <p className="text-lg mb-2">Grafico Storico Sentiment</p>
                          <p className="text-sm">
                            Esegui prima l'analisi sentiment per visualizzare il grafico
                          </p>
                          <p className="text-xs mt-2 text-gray-500">
                            Vai al tab "Sentiment Analysis" e analizza le sessioni selezionate
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Note Terapeutiche - {activeSessionForNote ? 
                      `${activeSessionForNote.title}` : 
                      'Seleziona una sessione'}
                  </div>
                  <div className="flex gap-2">
                    {!editingNote ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingNote(true)}
                        disabled={!activeSessionForNote}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifica
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={handleSaveNote}
                        disabled={savingNote}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Salva
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingNote ? (
                  <div className="space-y-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Qui il terapeuta può scrivere note personali e appunti liberamente"
                      className="w-full h-32 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingNote(false)
                          fetchSessionNote(activeSessionForNote?.id || "")
                        }}
                      >
                        Annulla
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveNote}
                        disabled={savingNote}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {savingNote ? "Salvando..." : "Salva"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-32 overflow-y-auto bg-gray-50 p-3 rounded text-sm">
                      {note || (
                        <span className="text-gray-500 italic">
                          Qui il terapeuta può scrivere note personali e appunti liberamente
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingNote(true)}
                        disabled={!activeSessionForNote}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifica
                      </Button>
                    </div>
                  </div>                )}
              </CardContent>
            </Card>          </div>
        )}
      </div>
    </div>
  )
}
