"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, BarChart3, Heart, MessageSquare, Save, Edit } from "lucide-react"

interface Session {
  id: string
  patientId: string
  title: string
  audioFilePath?: string
  transcript?: string
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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

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
          setSelectedSession(sessionsData[0])
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
    if (!selectedSession) return
    
    setSavingNote(true)
    try {
      const response = await fetch(`/api/sessions/${selectedSession.id}/note`, {
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
      }
    } catch (error) {
      console.error("Error saving note:", error)
      alert("Errore durante il salvataggio della nota")
    } finally {
      setSavingNote(false)
    }  }

  // Handle select all checkbox
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      // Select all sessions
      const allSessionIds = new Set(sessions.map(s => s.id))
      setSelectedSessions(allSessionIds)
    } else {
      // Deselect all sessions
      setSelectedSessions(new Set())
    }
  }

  // Handle individual session selection
  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session)
    fetchSessionNote(session.id)
    
    // Toggle this session in the selected sessions set
    const newSelectedSessions = new Set(selectedSessions)
    if (newSelectedSessions.has(session.id)) {
      newSelectedSessions.delete(session.id)
    } else {
      newSelectedSessions.add(session.id)
    }
    setSelectedSessions(newSelectedSessions)
    
    // Update select all checkbox state
    setSelectAll(newSelectedSessions.size === sessions.length)
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
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
            {/* Sidebar - Sessions List */}
            <div className="col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Sessioni e Trascrizioni
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">                  <div className="space-y-1">
                    <div className="p-4 border-b bg-gray-50">                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectAll}
                          onChange={(e) => handleSelectAllChange(e.target.checked)}
                          className="rounded w-4 h-4" 
                        />
                        <span className="text-sm font-medium">Selezione tutto</span>
                      </label>
                    </div>
                    {sessions.map((session, index) => (
                      <div key={session.id} className="border-b last:border-b-0">
                        <button
                          onClick={() => handleSessionSelect(session)}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                            selectedSession?.id === session.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                          }`}
                        >                          <div className="flex items-center space-x-2">                            <input 
                              type="checkbox" 
                              checked={selectedSessions.has(session.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleSessionSelect(session)
                              }}
                              className="rounded w-4 h-4" 
                            />
                            <div>
                              <div className="font-medium text-sm">
                                {session.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(session.createdAt).toLocaleDateString('it-IT')}
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Analysis Area */}
            <div className="col-span-9">
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Top Left - Transcription */}                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Trascrizione - {selectedSessions.size > 1 ? `${selectedSessions.size} Sessioni` : 
                                    selectedSession ? `Sessione ${sessions.findIndex(s => s.id === selectedSession.id) + 1}` : 
                                    'Nessuna Sessione'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSessions.size > 0 ? (
                      <div className="h-48 overflow-y-auto bg-gray-50 p-4 rounded text-sm space-y-4">
                        {sessions
                          .filter(session => selectedSessions.has(session.id))
                          .map((session, index) => (
                            <div key={session.id} className="border-b pb-3 last:border-b-0">
                              <div className="font-semibold text-blue-600 mb-2">
                                {session.title} - {new Date(session.createdAt).toLocaleDateString('it-IT')}
                              </div>                              <div className="text-gray-700">
                                {session.transcript || (
                                  <span className="text-gray-400 italic">
                                    Trascrizione non disponibile (Status: {session.status})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-500">
                        Seleziona una o più sessioni per visualizzare le trascrizioni
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Right - Topic Modelling */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Topic Modelling - Sessione {selectedSession ? sessions.findIndex(s => s.id === selectedSession.id) + 1 : 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Info grafica</p>
                        <p className="text-xs">Topic Modelling verrà implementato</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom Left - Sentiment Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Sentiment Analysis - Sessione {selectedSession ? sessions.findIndex(s => s.id === selectedSession.id) + 1 : 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Heart className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Info grafica</p>
                        <p className="text-xs">Sentiment Analysis verrà implementato</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom Right - Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      Note - Sessione {selectedSession ? sessions.findIndex(s => s.id === selectedSession.id) + 1 : 1}
                      <div className="flex gap-2">
                        {!editingNote ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingNote(true)}
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
                  </CardHeader>                  <CardContent>
                    {editingNote ? (
                      <div className="space-y-3">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Qui il terapeuta può scrivere note personali e appunti liberamente"
                          className="w-full h-44 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingNote(false)
                              fetchSessionNote(selectedSession?.id || "")
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
                        <div className="h-44 overflow-y-auto bg-gray-50 p-3 rounded text-sm">
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
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Modifica
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
