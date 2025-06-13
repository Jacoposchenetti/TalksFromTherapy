"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Play, FileText, BarChart3, ArrowLeft, Calendar, Clock, Trash2 } from "lucide-react"

interface Session {
  id: string
  title: string
  audioUrl?: string
  audioFileName?: string
  transcript?: string
  sessionDate: string
  duration?: number
  status: string
  patient: {
    id: string
    initials: string
  }
  createdAt: string
}

interface Patient {
  id: string
  initials: string
}

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  sessionName: string
}

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, sessionName }: ConfirmDeleteModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-red-900">
                Elimina Sessione
              </h3>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-gray-700 mb-2">
            Sei sicuro di voler eliminare la sessione:
          </p>
          <p className="font-semibold text-gray-900 mb-4">
            "{sessionName}"
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              ⚠️ Questa azione non può essere annullata. La sessione e tutti i dati associati verranno rimossi definitivamente.
            </p>
          </div>
        </div>        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId")
  const [sessions, setSessions] = useState<Session[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<string>("")
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    sessionId: string
    sessionName: string
  }>({
    isOpen: false,
    sessionId: '',
    sessionName: ''
  })
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchSessions()
    fetchPatients() // Always fetch patients for the dropdown
    if (patientId) {
      fetchPatient(patientId)
      setSelectedPatientForUpload(patientId) // Pre-select patient if coming from patient page
    }
  }, [session, status, router, patientId])
  const fetchSessions = async () => {
    try {
      const url = patientId ? `/api/sessions?patientId=${patientId}` : "/api/sessions"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sessions based on selected patient (when not in patient-specific view)
  const getFilteredSessions = () => {
    if (patientId) {
      // When in patient-specific view, show all sessions (already filtered by API)
      return sessions
    } else if (selectedPatientForUpload) {
      // When patient is selected from dropdown, filter sessions
      return sessions.filter(session => session.patient.id === selectedPatientForUpload)
    } else {
      // When no patient selected, show all sessions
      return sessions
    }
  }
  const fetchPatient = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPatient(data)
      }    } catch (error) {
      console.error("Error fetching patient:", error)
    }
  }

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients")
      if (response.ok) {
        const data = await response.json()
        // API returns { patients: [...] }, so we need data.patients
        const patientsArray = data.patients || []
        setPatients(Array.isArray(patientsArray) ? patientsArray : [])
      } else {
        console.error("Failed to fetch patients:", response.statusText)
        setPatients([])
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
      setPatients([])
    }
  }
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Use selected patient or current patientId
    const targetPatientId = selectedPatientForUpload || patientId
    if (!targetPatientId) {
      alert("Seleziona un paziente prima di caricare il file audio")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("audio", file)
    formData.append("patientId", targetPatientId)
    formData.append("title", `Sessione ${new Date().toLocaleDateString()}`)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      })
      
      if (response.ok) {
        fetchSessions()
        // Reset file input
        event.target.value = ""
      } else {
        alert("Errore durante il caricamento del file")
      }
    } catch (error) {
      console.error("Error uploading session:", error)
      alert("Errore durante il caricamento del file")
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { label: "Caricato", className: "bg-gray-100 text-gray-800" },
      TRANSCRIBING: { label: "Trascrivendo", className: "bg-blue-100 text-blue-800" },
      TRANSCRIBED: { label: "Trascritto", className: "bg-green-100 text-green-800" },
      ANALYZING: { label: "Analizzando", className: "bg-yellow-100 text-yellow-800" },
      ANALYZED: { label: "Analizzato", className: "bg-green-100 text-green-800" },
      ERROR: { label: "Errore", className: "bg-red-100 text-red-800" },
    }
      const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" }
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>{config.label}</span>
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleStartTranscription = async (sessionId: string) => {
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Trascrizione risultato:", result)
        
        // Ricarica le sessioni per vedere lo stato aggiornato
        fetchSessions()
        
        // Se la trascrizione è completata immediatamente, mostra un messaggio
        if (result.status === "TRANSCRIBED") {
          alert("Trascrizione completata con successo!")
        }
      } else {
        const error = await response.json()
        console.error("Errore avvio trascrizione:", error)
        alert("Errore durante l'avvio della trascrizione: " + (error.details || error.error))
      }
    } catch (error) {
      console.error("Errore avvio trascrizione:", error)
      alert("Errore durante l'avvio della trascrizione")
    }
  }
  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => {
    const confirmed = confirm(`Sei sicuro di voler eliminare la sessione "${sessionTitle}"? Questa azione non può essere annullata.`)
    
    if (!confirmed) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Ricarica le sessioni per rimuovere quella eliminata
        fetchSessions()
        alert("Sessione eliminata con successo!")
      } else {
        const error = await response.json()
        console.error("Errore eliminazione sessione:", error)
        alert("Errore durante l'eliminazione della sessione: " + (error.error || "Errore sconosciuto"))
      }
    } catch (error) {
      console.error("Errore eliminazione sessione:", error)
      alert("Errore durante l'eliminazione della sessione")
    }
  }

  const handleDeleteClick = (sessionId: string, sessionTitle: string) => {
    setDeleteModal({
      isOpen: true,
      sessionId,
      sessionName: sessionTitle
    })
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/sessions/${deleteModal.sessionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Ricarica le sessioni per rimuovere quella eliminata
        fetchSessions()
        alert("Sessione eliminata con successo!")
      } else {
        const error = await response.json()
        console.error("Errore eliminazione sessione:", error)
        alert("Errore durante l'eliminazione della sessione: " + (error.error || "Errore sconosciuto"))
      }
    } catch (error) {
      console.error("Errore eliminazione sessione:", error)
      alert("Errore durante l'eliminazione della sessione")
    } finally {
      setDeleteModal({
        isOpen: false,
        sessionId: '',
        sessionName: ''
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      sessionId: '',
      sessionName: ''
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        {patientId && (
          <Button
            variant="outline"
            onClick={() => router.push("/patients")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai Pazienti
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold">
            {patient ? `Sessioni - ${patient.initials}` : "Sessioni"}
          </h1>
          <p className="text-muted-foreground">
            Gestisci le sessioni terapeutiche e le trascrizioni
          </p>
        </div>
      </div>      {/* Upload card - always visible */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carica Nuova Sessione
          </CardTitle>
          <CardDescription>
            Carica un file audio per iniziare la trascrizione automatica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Patient selector - only show when not in patient-specific view */}
            {!patientId && (
              <div>
                <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona Paziente
                </label>                <select
                  id="patient-select"
                  value={selectedPatientForUpload}
                  onChange={(e) => setSelectedPatientForUpload(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="">-- Seleziona un paziente --</option>
                  {patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.initials}
                      </option>
                    ))
                  ) : (
                    <option disabled>Caricamento pazienti...</option>
                  )}
                </select>
              </div>
            )}
            
            {/* File input */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading || (!patientId && !selectedPatientForUpload)}
                className="flex-1"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Caricamento...
                </div>
              )}
            </div>
            
            {/* Helper text */}
            {!patientId && !selectedPatientForUpload && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Seleziona un paziente prima di caricare il file audio
              </p>
            )}
          </div>
        </CardContent>
      </Card>      <div className="grid gap-4">
        {getFilteredSessions().length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessuna sessione trovata</h3>
              <p className="text-muted-foreground text-center">
                {patientId 
                  ? "Carica il primo file audio per iniziare"
                  : selectedPatientForUpload 
                    ? "Questo paziente non ha ancora sessioni. Carica il primo file audio per iniziare."
                    : "Seleziona un paziente per visualizzare le sue sessioni"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          getFilteredSessions().map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {session.title}
                      {getStatusBadge(session.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      {!patientId && (
                        <span>{session.patient.initials}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(session.duration)}
                      </span>
                    </CardDescription>
                  </div>                  <div className="flex gap-2">                    {session.audioUrl && (
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Audio
                      </Button>
                    )}
                    {session.status === "UPLOADED" && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleStartTranscription(session.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Avvia Trascrizione
                      </Button>
                    )}
                    {session.status === "TRANSCRIBING" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-1"></div>
                        Trascrivendo...
                      </Button>
                    )}
                    {session.status === "ERROR" && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleStartTranscription(session.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Riprova Trascrizione
                      </Button>
                    )}
                    {session.transcript && session.status === "TRANSCRIBED" && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Trascrizione
                      </Button>                    )}
                    {session.status === "ANALYZED" && (
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analisi
                      </Button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(session.id, session.title)}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: '1px solid #dc2626',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                      Elimina
                    </button>
                  </div>
                </div>
              </CardHeader>
              {session.transcript && (
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm line-clamp-3">{session.transcript}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))        )}
      </div>

      {/* Modal di conferma eliminazione */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        sessionName={deleteModal.sessionName}
      />
    </div>
  )
}
