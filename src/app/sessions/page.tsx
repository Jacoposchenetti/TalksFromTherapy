"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, Play, FileText, BarChart3, ArrowLeft, Calendar, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { DocumentParser } from "@/lib/document-parser"
import { NotificationManager } from "@/lib/notification-manager"

interface Session {
  id: string
  title: string
  audioUrl?: string
  audioFileName?: string
  audioFileSize?: number
  transcript?: string
  sessionDate: string
  duration?: number
  status: string
  documentMetadata?: string
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
          </div>        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white border border-red-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>  )
}

function SessionsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId")
    const [sessions, setSessions] = useState<Session[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingText, setUploadingText] = useState(false)
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<string>("")
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    sessionId: string
    sessionName: string  }>({
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
    console.log('useEffect triggered with patientId:', patientId)
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchSessions(),
          fetchPatients()
        ])
        
        if (patientId) {
          console.log('Fetching patient for ID:', patientId)
          await fetchPatient(patientId)
          setSelectedPatientForUpload(patientId)
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
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
    }
  }

  const getFilteredSessions = () => {
    if (patientId) {
      return sessions
    } else if (selectedPatientForUpload) {
      return sessions.filter(session => session.patient.id === selectedPatientForUpload)
    } else {
      return sessions
    }
  }
  const fetchPatient = async (id: string) => {
    try {
      console.log(`Fetching patient with ID: ${id}`)
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Patient data received:', data)
        setPatient(data)
      } else {
        console.error('Failed to fetch patient:', response.status, response.statusText)
      }    } catch (error) {
      console.error("Error fetching patient:", error)
    }
  }

  const fetchPatients = async () => {
    try {
      console.log('Fetching patients...')
      const response = await fetch("/api/patients")
      if (response.ok) {
        const data = await response.json()
        console.log('Patients response:', data)
        // API returns { patients: [...] }, so we need data.patients
        const patientsArray = data.patients || []
        console.log('Patients array:', patientsArray)
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

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      NotificationManager.showWarning("Seleziona un file audio valido")
      event.target.value = ""
      return
    }

    // Validate file size (max 50MB for audio)
    const maxSizeInBytes = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSizeInBytes) {
      NotificationManager.showWarning("File troppo grande. Dimensione massima: 50MB")
      event.target.value = ""
      return
    }

    // Use selected patient or current patientId
    const targetPatientId = selectedPatientForUpload || patientId
    if (!targetPatientId) {
      NotificationManager.showWarning("Seleziona un paziente prima di caricare il file audio")
      event.target.value = ""
      return
    }    setUploading(true)
    
    // Trova il nome del paziente per il titolo
    const selectedPatient = patients.find(p => p.id === targetPatientId)
    const patientName = selectedPatient?.initials || "Paziente"
    
    const formData = new FormData()
    formData.append("audio", file)
    formData.append("patientId", targetPatientId)
    formData.append("title", `Sessione ${patientName} - ${new Date().toLocaleDateString()}`)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        fetchSessions()
        event.target.value = ""
        NotificationManager.showSuccess("File audio caricato con successo!")
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || "Errore durante il caricamento del file audio"
        NotificationManager.showError(errorMessage)
      }
    } catch (error) {
      console.error("Error uploading session:", error)
      NotificationManager.showError("Errore durante il caricamento del file audio")
    } finally {
      setUploading(false)
    }
  }

  const handleTextFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file format
    const fileName = file.name.toLowerCase()
    const supportedFormats = DocumentParser.getSupportedFormats()
    const fileExtension = fileName.split('.').pop()
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      NotificationManager.showWarning(`Formato file non supportato. Usa: ${supportedFormats.map(f => f.toUpperCase()).join(', ')}`)
      event.target.value = ""
      return
    }

    // Validate file size (max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeInBytes) {
      NotificationManager.showWarning("File troppo grande. Dimensione massima: 10MB")
      event.target.value = ""
      return
    }

    // Use selected patient or current patientId
    const targetPatientId = selectedPatientForUpload || patientId
    if (!targetPatientId) {
      NotificationManager.showWarning("Seleziona un paziente prima di caricare il file di testo")
      event.target.value = ""
      return
    }

    setUploadingText(true)

    try {
      // Parse il documento usando il parser appropriato
      const parsedDocument = await DocumentParser.parseFile(file)
      
      if (!parsedDocument.text || parsedDocument.text.trim().length === 0) {
        throw new Error("Il documento sembra essere vuoto o non è stato possibile estrarre il testo")      }
      
      // Trova il nome del paziente per il titolo
      const selectedPatient = patients.find(p => p.id === targetPatientId)
      const patientName = selectedPatient?.initials || "Paziente"
      
      // Crea una sessione con il testo già trascritto
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: targetPatientId,
          title: `Sessione ${patientName} - ${new Date().toLocaleDateString()} (${parsedDocument.metadata?.format?.toUpperCase()})`,
          transcript: parsedDocument.text,
          status: "TRANSCRIBED",
          metadata: parsedDocument.metadata
        }),
      })
      
      if (response.ok) {
        fetchSessions()
        event.target.value = ""
        
        const wordCount = parsedDocument.metadata?.wordCount || 0
        const pages = parsedDocument.metadata?.pages
        let successMessage = "File di testo caricato con successo!"
        if (wordCount > 0) {
          successMessage += ` (${wordCount} parole`
          if (pages) successMessage += `, ${pages} pagine`
          successMessage += ")"
        }
        
        NotificationManager.showSuccess(successMessage)
      } else {
        const error = await response.json()
        const errorMessage = "Errore durante il caricamento del file: " + (error.error || "Errore sconosciuto")
        NotificationManager.showError(errorMessage)
      }
    } catch (error) {
      console.error("Error uploading text file:", error)
      const errorMessage = error instanceof Error ? error.message : "Errore durante la lettura del file"
      NotificationManager.showError(errorMessage)
    } finally {
      setUploadingText(false)
    }
  }
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { 
        label: "Caricato", 
        className: "bg-gray-100 text-gray-800",
        icon: "📁"
      },
      TRANSCRIBING: { 
        label: "Trascrivendo", 
        className: "bg-blue-100 text-blue-800",
        icon: "⏳"
      },
      TRANSCRIBED: { 
        label: "Trascritto", 
        className: "bg-green-100 text-green-800",
        icon: "✅"
      },
      ANALYZING: { 
        label: "Analizzando", 
        className: "bg-yellow-100 text-yellow-800",
        icon: "🔍"
      },
      ANALYZED: { 
        label: "Analizzato", 
        className: "bg-green-100 text-green-800",
        icon: "📊"
      },
      ERROR: { 
        label: "Errore", 
        className: "bg-red-100 text-red-800",
        icon: "❌"
      },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      className: "bg-gray-100 text-gray-800",
      icon: "❓"
    }
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatDocumentMetadata = (documentMetadata?: string) => {
    if (!documentMetadata) return null
    
    try {
      const metadata = JSON.parse(documentMetadata)
      const parts = []
      
      if (metadata.format) {
        parts.push(metadata.format.toUpperCase())
      }
      
      if (metadata.wordCount) {
        parts.push(`${metadata.wordCount} parole`)
      }
      
      if (metadata.pages) {
        parts.push(`${metadata.pages} pagine`)
      }
      
      return parts.join(' • ')
    } catch {
      return null
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
          NotificationManager.showSuccess("Trascrizione completata con successo!")
        }
      } else {
        const error = await response.json()
        console.error("Errore avvio trascrizione:", error)
        NotificationManager.showError("Errore durante l'avvio della trascrizione: " + (error.details || error.error))
      }
    } catch (error) {
      console.error("Errore avvio trascrizione:", error)
      NotificationManager.showError("Errore durante l'avvio della trascrizione")
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
        NotificationManager.showSuccess("Sessione eliminata con successo!")
      } else {
        const error = await response.json()
        console.error("Errore eliminazione sessione:", error)
        NotificationManager.showError("Errore durante l'eliminazione della sessione: " + (error.error || "Errore sconosciuto"))
      }
    } catch (error) {
      console.error("Errore eliminazione sessione:", error)
      NotificationManager.showError("Errore durante l'eliminazione della sessione")
    }
  }

  const handleDeleteClick = (sessionId: string, sessionTitle: string) => {
    setDeleteModal({
      isOpen: true,
      sessionId,
      sessionName: sessionTitle
    })
  }

  const handleTitleClick = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId)
    setEditingTitle(currentTitle)
  }

  const handleTitleSubmit = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      NotificationManager.showWarning("Il titolo non può essere vuoto")
      handleTitleCancel()
      return
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingTitle.trim()
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore durante l'aggiornamento")
      }

      const updatedSession = await response.json()

      // Aggiorna la sessione nella lista
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === sessionId
            ? { ...session, title: updatedSession.title }
            : session
        )
      )

      setEditingSessionId(null)
      setEditingTitle("")
      NotificationManager.showSuccess("Titolo aggiornato con successo")
    } catch (error) {
      console.error("Errore aggiornamento titolo:", error)
      if (error instanceof Error) {
        NotificationManager.showError("Errore durante l'aggiornamento del titolo: " + error.message)
      } else {
        NotificationManager.showError("Errore durante l'aggiornamento del titolo")
      }
    }
  }

  const handleTitleCancel = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSubmit(sessionId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleTitleCancel()
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      sessionId: '',
      sessionName: ''
    })
  }

  const handleDeleteConfirm = async () => {
    await handleDeleteSession(deleteModal.sessionId, deleteModal.sessionName)
    handleDeleteCancel()
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
    <div className="container mx-auto p-6 max-w-full overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        {patientId && (
          <Button
            variant="outline"
            onClick={() => router.push("/patients")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai Pazienti
          </Button>
        )}        <div>
          <h1 className="text-3xl font-bold">
            {(() => {
              // Se stiamo ancora caricando, mostra solo "Sessioni"
              if (loading) {
                return "Sessioni"
              }
              
              console.log('Title render debug:', { 
                patient, 
                patientId, 
                patientsLength: patients.length,
                patients: patients.map(p => ({ id: p.id, initials: p.initials })),
                loading
              })
              
              if (patient && patient.initials) {
                return `Sessioni - ${patient.initials}`
              } else if (patientId && patients.length > 0) {
                const foundPatient = patients.find(p => p.id === patientId)
                console.log('Found patient:', foundPatient)
                return foundPatient && foundPatient.initials ? `Sessioni - ${foundPatient.initials}` : "Sessioni"
              } else {
                return "Sessioni"
              }
            })()}
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
          </CardTitle>          <CardDescription>
            Carica un file audio per iniziare la trascrizione automatica o un file di testo già trascritto
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
              {/* File inputs */}
            <div className="space-y-4">              {/* Audio file input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carica File Audio
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    disabled={uploading || uploadingText || (!patientId && !selectedPatientForUpload)}
                    className="flex-1"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Caricamento audio...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formati supportati: MP3, WAV, M4A, OGG • Dimensione massima: 50MB
                </p>
              </div>

              {/* Text file input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carica File di Testo
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept={DocumentParser.getAcceptString()}
                    onChange={handleTextFileUpload}
                    disabled={uploading || uploadingText || (!patientId && !selectedPatientForUpload)}
                    className="flex-1"
                  />
                  {uploadingText && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Elaborazione documento...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formati supportati: {DocumentParser.getSupportedFormats().map(f => f.toUpperCase()).join(', ')} • Dimensione massima: 10MB
                </p>
              </div>
            </div>
              {/* Helper text */}
            {!patientId && !selectedPatientForUpload && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Seleziona un paziente prima di caricare file audio o di testo
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
        ) : (          getFilteredSessions().map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow w-full overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleTitleKeyDown(e, session.id)}
                            onBlur={() => handleTitleSubmit(session.id)}
                            className="text-lg font-semibold"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTitleSubmit(session.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleTitleCancel}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span 
                          className="truncate cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleTitleClick(session.id, session.title)}
                          title="Clicca per modificare il titolo"
                        >
                          {session.title}
                        </span>
                      )}
                      {getStatusBadge(session.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                      {!patientId && (
                        <span className="truncate">{session.patient.initials}</span>
                      )}
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </span>                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="h-4 w-4" />
                        {formatDuration(session.duration)}
                      </span>
                      {session.audioFileSize && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          {formatFileSize(session.audioFileSize)}
                        </span>
                      )}
                      {session.documentMetadata && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-sm text-blue-600">
                          <FileText className="h-4 w-4" />
                          {formatDocumentMetadata(session.documentMetadata)}
                        </span>
                      )}
                    </CardDescription>
                  </div>                  <div className="flex gap-2 flex-wrap flex-shrink-0">{session.audioUrl && (
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
                    )}                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteClick(session.id, session.title)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Elimina
                    </Button>
                  </div>
                </div>
              </CardHeader>              {session.transcript && (
                <CardContent className="pt-0">
                  <div className="bg-muted p-4 rounded-lg w-full overflow-hidden">
                    <div className="relative w-full">
                      <p className={`text-sm whitespace-pre-wrap break-words w-full ${
                        expandedSessions.has(session.id) ? '' : 'line-clamp-3'
                      }`}>
                        {session.transcript}
                      </p>
                      {session.transcript.length > 200 && (
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedSessions)
                            if (expandedSessions.has(session.id)) {
                              newExpanded.delete(session.id)
                            } else {
                              newExpanded.add(session.id)
                            }
                            setExpandedSessions(newExpanded)
                          }}
                          className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          {expandedSessions.has(session.id) ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Mostra meno
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Leggi tutto
                            </>
                          )}
                        </button>
                      )}
                    </div>
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
      />    </div>
  )
}

export default function SessionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <SessionsPageContent />
    </Suspense>
  )
}
