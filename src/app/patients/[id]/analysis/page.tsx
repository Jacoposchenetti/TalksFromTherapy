"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, BarChart3, Heart, MessageSquare, Save, Edit, ChevronLeft, ChevronRight, TrendingUp, Network } from "lucide-react"
import TopicAnalysisComponent from "@/components/analysis/topic-analysis"
import { SentimentAnalysis } from "@/components/sentiment-analysis"
import { EmotionTrends } from "@/components/emotion-trends"

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

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchPatientData()
  }, [session, status, router, patientId])

  const fetchPatientData = async () => {
    try {
      setError(null)
      console.log('Fetching patient data for ID:', patientId)
      
      // Fetch patient info
      const patientResponse = await fetch(`/api/patients/${patientId}`)
      console.log('Patient response status:', patientResponse.status)
      
      if (patientResponse.ok) {
        const patientData = await patientResponse.json()
        console.log('Patient data received:', patientData)
        setPatient(patientData)
      } else {
        const errorText = await patientResponse.text()
        console.error('Patient API error:', errorText)
        setError('Errore nel caricamento dei dati del paziente: ' + patientResponse.status)
        return      }

      // Fetch patient sessions
      const sessionsResponse = await fetch(`/api/sessions?patientId=${patientId}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        console.log('Sessions data received:', sessionsData)
        console.log('Sessions with transcript:', sessionsData?.filter((s: Session) => s.transcript))
        
        // TEMP: Show all sessions to debug transcription issue
        console.log('All sessions for patient:', sessionsData)
        sessionsData?.forEach((session: Session, index: number) => {
          console.log(`Session ${index + 1}:`, {
            id: session.id,
            title: session.title,
            status: session.status,
            transcript: session.transcript,
            transcriptLength: session.transcript?.length,
            transcriptType: typeof session.transcript,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          })
        })
        
        // Show ALL sessions temporarily to see what we have
        setSessions(sessionsData || [])
          // This is the problematic filter - we'll fix it after seeing the data
        /*
        const transcribedSessions = sessionsData?.filter((s: Session) => {
          const hasTranscription = s.transcription && 
                                 typeof s.transcription === 'string' && 
                                 s.transcription.trim().length > 0
          console.log(`Session ${s.id}: transcription="${s.transcription}", status="${s.status}", hasTranscription=${hasTranscription}`)
          return hasTranscription
        }) || []
        */
          // Auto-select first session if available (using all sessions for now)
        if (sessionsData && sessionsData.length > 0) {
          setActiveSessionForNote(sessionsData[0])
          fetchSessionNote(sessionsData[0].id)
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
  const performSemanticFrameAnalysis = async () => {
    if (!targetWord.trim()) {
      setSemanticFrameError("Inserisci una parola chiave per l'analisi")
      return
    }

    const combinedTranscript = getCombinedTranscript()
    if (!combinedTranscript.trim()) {
      setSemanticFrameError("Nessuna trascrizione disponibile nelle sessioni selezionate")
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
          targetWord: targetWord.trim(),
          sessionId: getSelectedSessionsData()[0]?.id || null,
          language: 'italian'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSemanticFrameResult(data)
        console.log('Semantic Frame Analysis successful:', data)
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
  // Slide navigation
  const slides = [
    { title: "Trascrizioni", icon: FileText },
    { title: "Topic Modelling", icon: BarChart3 },
    { title: "Sentiment Analysis", icon: Heart },
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
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar - Sessions List */}
              <div className="col-span-3">
                <Card className="h-[600px]">
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
                    <div className="space-y-1 max-h-[450px] overflow-y-auto">
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
                  </CardContent>
                </Card>
              </div>              {/* Main Sliding Analysis Panel */}
              <div className="col-span-9">
                <Card className="min-h-[600px]">
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
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
                  <CardContent className="min-h-[500px] overflow-auto">
                    <div className="h-full">
                      {/* Slide 0: Trascrizioni */}
                      {currentSlide === 0 && (
                        <div className="h-full">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold">
                              Trascrizioni - {selectedSessions.size > 0 ? 
                                `${selectedSessions.size} sessioni selezionate` : 
                                'Nessuna Sessione Selezionata'}
                            </h3>
                          </div>
                          <div className="h-[420px] overflow-y-auto bg-gray-50 p-4 rounded text-sm space-y-4">
                            {selectedSessions.size > 0 ? (
                              getSelectedSessionsData().map((session, index) => (
                                <div key={session.id} className="border-b pb-3 last:border-b-0">
                                  <div className="font-semibold text-blue-700 mb-2">
                                    {session.title} - {new Date(session.createdAt).toLocaleDateString('it-IT')}
                                  </div>
                                  <div className="text-gray-700">
                                    {session.transcript || (
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
                        <div className="h-full">
                          <TopicAnalysisComponent 
                            selectedSessions={getSelectedSessionsData().map(session => ({
                              id: session.id,
                              title: session.title,
                              transcript: session.transcript || ""
                            }))}
                            combinedTranscript={getCombinedTranscript()}
                            onAnalysisComplete={(result) => {
                              console.log('Topic analysis completed:', result)
                            }}
                          />
                        </div>
                      )}                      {/* Slide 2: Sentiment Analysis */}
                      {currentSlide === 2 && (
                        <div className="h-full">                          <SentimentAnalysis 
                            selectedSessions={getSelectedSessionsData().map(session => ({
                              id: session.id,
                              title: session.title,
                              transcript: session.transcript || "",
                              sessionDate: session.sessionDate
                            }))}
                            onAnalysisComplete={(result) => {
                              console.log('🎯 Sentiment analysis completed:', result)
                              console.log('🎯 Result type:', typeof result)
                              console.log('🎯 Result.success:', result.success)
                              console.log('🎯 Result.analysis:', result.analysis)
                              console.log('🎯 Individual sessions type:', typeof result.analysis?.individual_sessions)
                              console.log('🎯 Individual sessions:', result.analysis?.individual_sessions)
                              
                              // Transform data for EmotionTrends component
                              if (result.success && result.analysis?.individual_sessions) {
                                console.log('🔄 Setting emotionAnalysisResults:', result.analysis.individual_sessions)
                                setEmotionAnalysisResults(result.analysis.individual_sessions)
                                console.log('📊 State should be updated now')
                              } else {
                                console.log('❌ Conditions not met:', {
                                  success: result.success,
                                  hasIndividualSessions: !!result.analysis?.individual_sessions
                                })
                              }
                            }}
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
                          </div>
                          
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
                              onClick={performSemanticFrameAnalysis}
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
                                    <div className="flex justify-center">
                                      <img 
                                        src={`data:image/png;base64,${semanticFrameResult.visualization.frame_plot}`}
                                        alt={`Rete semantica per ${semanticFrameResult.target_word}`}
                                        className="max-w-full h-auto rounded border"
                                        style={{ maxHeight: '500px' }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Analysis Results */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Frame Statistics */}
                                  <div className="bg-white rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3 text-gray-700">Statistiche Frame</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Parole connesse:</span>
                                        <span className="font-medium">{semanticFrameResult.semantic_frame?.frame_size || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Connessioni totali:</span>
                                        <span className="font-medium">{semanticFrameResult.semantic_frame?.total_connections || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Valenza emotiva:</span>
                                        <span className={`font-medium ${
                                          (semanticFrameResult.semantic_frame?.emotional_valence || 0) > 0 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                        }`}>
                                          {(semanticFrameResult.semantic_frame?.emotional_valence || 0).toFixed(3)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Significant Emotions */}
                                  <div className="bg-white rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3 text-gray-700">Emozioni Significative</h4>
                                    {semanticFrameResult.semantic_frame?.significant_emotions && 
                                     Object.keys(semanticFrameResult.semantic_frame.significant_emotions).length > 0 ? (
                                      <div className="space-y-2 text-sm">
                                        {Object.entries(semanticFrameResult.semantic_frame.significant_emotions)
                                          .sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number))
                                          .slice(0, 5)
                                          .map(([emotion, score]) => (
                                            <div key={emotion} className="flex justify-between items-center">
                                              <span className="capitalize">{emotion}:</span>
                                              <span className={`font-medium ${
                                                (score as number) > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {(score as number).toFixed(2)}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-sm">Nessuna emozione significativa rilevata</p>
                                    )}
                                  </div>
                                </div>

                                {/* Connected Words */}
                                {semanticFrameResult.semantic_frame?.connected_words && 
                                 semanticFrameResult.semantic_frame.connected_words.length > 0 && (
                                  <div className="bg-white rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3 text-gray-700">Parole Connesse</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {semanticFrameResult.semantic_frame.connected_words.map((word: string, index: number) => (
                                        <span 
                                          key={index}
                                          className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                                        >
                                          {word}
                                        </span>
                                      ))}
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

                          <div className="text-xs text-gray-500 mt-4">
                            <p>
                              <strong>Cos'è?</strong> La Semantic Frame Analysis permette di esplorare le associazioni cognitive ed emotive di una parola chiave nel testo, utile per analisi narrative, metafore, ruoli e insight clinici.
                            </p>
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
                      <div className="w-full overflow-hidden">
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
