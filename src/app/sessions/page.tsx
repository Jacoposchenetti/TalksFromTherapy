"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, Play, FileText, BarChart3, ArrowLeft, Calendar, Clock, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react"
import { DocumentParser } from "@/lib/document-parser"
import { NotificationManager } from "@/lib/notification-manager"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"

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
  const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null) // sessionId or null
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null) // sessionId being edited
  const [editingTranscriptText, setEditingTranscriptText] = useState<string>("")
  const [savingTranscript, setSavingTranscript] = useState(false)
  // Audio player state
  const { playSession, currentSession, isPlaying } = useAudioPlayer()

  useEffect(() => {
    if (status === "loading") return
    if (!session) {      router.push("/login")
      return
    }
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchSessions(),
          fetchPatients()
        ])
          if (patientId) {
          await fetchPatient(patientId)
          setSelectedPatientForUpload(patientId)
        }
      } finally {
        setLoading(false)
      }
    }
      loadData()
  }, [session, status, router, patientId])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setExportMenuOpen(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportMenuOpen])

  const fetchSessions = async () => {
    try {
      const url = patientId ? `/api/sessions?patientId=${patientId}` : "/api/sessions"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Extract sessions from API response structure
        const sessions = data.data || data
        setSessions(sessions)
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
    }
  }

  const getFilteredSessions = () => {
    if (patientId) {
      return sessions
    } else if (selectedPatientForUpload) {
      return sessions.filter(session => session.patient?.id === selectedPatientForUpload)
    } else {
      return sessions    }
  }

  const fetchPatient = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
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
      if (response.ok) {        const data = await response.json()
        // API returns { success: true, data: { patients: [...] } }
        const patientsArray = data.data?.patients || data.patients || []
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
      NotificationManager.showWarning("Seleziona un patient before uploading audio file")
      event.target.value = ""
      return
    }    setUploading(true)
    
    // Trova il nome del patient for the title
    const selectedPatient = patients.find(p => p.id === targetPatientId)
    const patientName = selectedPatient?.initials || "Patient"
    
    const formData = new FormData()
    formData.append("audio", file)
    formData.append("patientId", targetPatientId)
    formData.append("title", `Session - ${patientName} - ${new Date().toLocaleDateString()}`)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        fetchSessions()
        event.target.value = ""
        NotificationManager.showSuccess("File audio uploaded successfully!")
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
      NotificationManager.showWarning("Seleziona un patient before uploading text file")
      event.target.value = ""
      return
    }

    setUploadingText(true)

    try {
      // Parse il documento usando il parser appropriato
      const parsedDocument = await DocumentParser.parseFile(file)
      
      if (!parsedDocument.text || parsedDocument.text.trim().length === 0) {
        throw new Error("Il documento sembra essere vuoto o non è stato possibile estrarre il testo")      }
      
      // Trova il nome del patient for the title
      const selectedPatient = patients.find(p => p.id === targetPatientId)
      const patientName = selectedPatient?.initials || "Patient"
      
      // Crea una sessione con il testo già trascritto
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: targetPatientId,
          title: `Session - ${patientName} - ${new Date().toLocaleDateString()} (${parsedDocument.metadata?.format?.toUpperCase()})`,
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
        let successMessage = "File di testo uploaded successfully!"
        if (wordCount > 0) {
          successMessage += ` (${wordCount} words`
          if (pages) successMessage += `, ${pages} pages`
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
        label: "Uploaded", 
        className: "bg-gray-100 text-gray-800",
        icon: "📁"
      },
      TRANSCRIBING: { 
        label: "Transcribing", 
        className: "bg-blue-100 text-blue-800",
        icon: "⏳"
      },
      TRANSCRIBED: { 
        label: "Transcribed", 
        className: "bg-green-100 text-green-800",
        icon: "✅"
      },
      ANALYZING: { 
        label: "Analyzing", 
        className: "bg-yellow-100 text-yellow-800",
        icon: "🔍"
      },
      ANALYZED: { 
        label: "Analyzed", 
        className: "bg-green-100 text-green-800",
        icon: "📊"
      },
      ERROR: { 
        label: "Error", 
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
        parts.push(`${metadata.wordCount} words`)
      }
      
      if (metadata.pages) {
        parts.push(`${metadata.pages} pages`)
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
        const result = await response.json()        // Ricarica le sessioni per vedere lo stato aggiornato
        fetchSessions()
        
        // Se la trascrizione è completata immediatamente, mostra un messaggio
        if (result.status === "TRANSCRIBED") {
          NotificationManager.showSuccess("Trascrizione completed successfully!")
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
      sessionName: sessionTitle    })
  }

  const handleExportTranscript = async (sessionId: string, sessionTitle: string, format: 'txt' | 'pdf' | 'docx' = 'txt') => {
    try {
      setExportMenuOpen(null) // Chiude il menu
      
      // Show loading notification
      if (format === 'pdf') {
        NotificationManager.showInfo("Generazione PDF in corso...")
      } else if (format === 'docx') {
        NotificationManager.showInfo("Generazione DOCX in corso...")
      } else {
        NotificationManager.showInfo("Preparazione file TXT...")
      }
      
      const response = await fetch(`/api/sessions/${sessionId}/export?format=${format}`)
      
      // Check if response is OK first
      if (!response.ok) {
        let errorMessage = 'Errore durante l\'export'
        try {
          const error = await response.json()
          errorMessage = error.error || error.details || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Check content type
      const contentType = response.headers.get('Content-Type')
      console.log(`Response Content-Type: ${contentType}`)
        // Validate content type
      if (format === 'pdf' && !contentType?.includes('application/pdf')) {
        console.error(`Expected application/pdf but got: ${contentType}`)
        const responseText = await response.text()
        console.error('Response body:', responseText.substring(0, 500))
        throw new Error(`Server ha restituito ${contentType} invece di PDF. Controlla i log del server.`)
      }
      
      if (format === 'txt' && !contentType?.includes('text/plain')) {
        console.error(`Expected text/plain but got: ${contentType}`)
        throw new Error(`Server ha restituito ${contentType} invece di TXT.`)
      }
      
      if (format === 'docx' && !contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        console.error(`Expected application/vnd.openxmlformats-officedocument.wordprocessingml.document but got: ${contentType}`)
        throw new Error(`Server ha restituito ${contentType} invece di DOCX.`)
      }
      
      // Download the file normally
      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error('File vuoto ricevuto dal server')
      }
      
      console.log(`Downloaded ${format.toUpperCase()} file: ${blob.size} bytes`)
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = `trascrizione_${sessionTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      
      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      NotificationManager.showSuccess(`Trascrizione esportata in ${format.toUpperCase()} with success!`)
    } catch (error) {
      console.error("Errore export trascrizione:", error)
      NotificationManager.showError(`Errore durante l'export della trascrizione in ${format.toUpperCase()}: ${(error as Error).message}`)
    }
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

  const handleTranscriptEdit = (sessionId: string, currentText: string) => {
    setEditingTranscriptId(sessionId)
    setEditingTranscriptText(currentText)
  }

  const handleTranscriptSave = async (sessionId: string) => {
    if (savingTranscript) return

    setSavingTranscript(true)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: editingTranscriptText.trim(),
          status: "TRANSCRIBED"
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore durante il salvataggio della trascrizione")
      }

      // Aggiorna la sessione nella lista
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === sessionId
            ? { ...session, transcript: editingTranscriptText.trim(), status: "TRANSCRIBED" }
            : session
        )
      )

      setEditingTranscriptId(null)
      setEditingTranscriptText("")
      NotificationManager.showSuccess("Trascrizione salvata con successo")
    } catch (error) {
      console.error("Errore salvataggio trascrizione:", error)
      if (error instanceof Error) {
        NotificationManager.showError("Errore durante il salvataggio della trascrizione: " + error.message)
      } else {
        NotificationManager.showError("Errore durante il salvataggio della trascrizione")
      }
    } finally {
      setSavingTranscript(false)
    }
  }

  // Funzioni per editing trascrizione
  const handleTranscriptClick = (sessionId: string, currentTranscript: string) => {
    setEditingTranscriptId(sessionId)
    setEditingTranscriptText(currentTranscript)
  }

  const handleTranscriptSubmit = async (sessionId: string) => {
    if (!editingTranscriptText.trim()) {
      NotificationManager.showWarning("La trascrizione non può essere vuota")
      handleTranscriptCancel()
      return
    }

    setSavingTranscript(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: editingTranscriptText.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore durante l'aggiornamento della trascrizione")
      }

      // Aggiorna la sessione locale
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === sessionId
            ? { ...session, transcript: editingTranscriptText.trim() }
            : session
        )
      )

      setEditingTranscriptId(null)
      setEditingTranscriptText("")
      NotificationManager.showSuccess("Trascrizione aggiornata con successo")
    } catch (error) {
      console.error("Errore aggiornamento trascrizione:", error)
      if (error instanceof Error) {
        NotificationManager.showError("Errore durante l'aggiornamento della trascrizione: " + error.message)
      } else {
        NotificationManager.showError("Errore durante l'aggiornamento della trascrizione")
      }
    } finally {
      setSavingTranscript(false)
    }
  }

  const handleTranscriptCancel = () => {
    setEditingTranscriptId(null)
    setEditingTranscriptText("")
  }

  const handleTranscriptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleTranscriptCancel()
    }
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
            Back to Patients
          </Button>
        )}        <div>
          <h1 className="text-3xl font-bold">
            {(() => {
              if (loading) {
                return "Sessions"
              }
              if (patient && patient.initials) {
                return `Sessions - ${patient.initials}`
              } else if (patientId && patients.length > 0) {
                const foundPatient = patients.find(p => p.id === patientId)
                return foundPatient && foundPatient.initials ? `Sessions - ${foundPatient.initials}` : "Sessions"
              } else {
                return "Sessions"
              }
            })()}
          </h1>
          <p className="text-muted-foreground">
            Manage therapy sessions and transcriptions
          </p>
        </div>
      </div>      {/* Upload card - always visible */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Session
          </CardTitle>          <CardDescription>
            Upload an audio file to start automatic transcription or a pre-transcribed text file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Patient selector - only show when not in patient-specific view */}
            {!patientId && (
              <div>
                <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient
                </label>                <select
                  id="patient-select"
                  value={selectedPatientForUpload}
                  onChange={(e) => setSelectedPatientForUpload(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="">-- Select a patient --</option>
                  {patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.initials}
                      </option>
                    ))
                  ) : (
                    <option disabled>Loading patients...</option>
                  )}
                </select>
              </div>
            )}
              {/* File inputs */}
            <div className="space-y-4">              {/* Audio file input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Audio File
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
                      Uploading audio...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: MP3, WAV, M4A, OGG • Max size: 50MB
                </p>
              </div>

              {/* Text file input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Text File
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
                      Processing document...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: {DocumentParser.getSupportedFormats().map(f => f.toUpperCase()).join(', ')} • Max size: 10MB
                </p>
              </div>
            </div>
              {/* Helper text */}
            {!patientId && !selectedPatientForUpload && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Select a patient before uploading audio or text files
              </p>
            )}
          </div>
        </CardContent>
      </Card>      <div className="grid gap-4">
        {getFilteredSessions().length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
              <p className="text-muted-foreground text-center">
                {patientId 
                  ? "Upload the first audio file to get started"
                  : selectedPatientForUpload 
                    ? "This patient has no sessions yet. Upload the first audio file to get started."
                    : "Select a patient to view their sessions"
                }
              </p>
            </CardContent>
          </Card>        ) : (          getFilteredSessions().map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow w-full overflow-visible">
              <CardHeader className="overflow-visible">
                <div className="flex items-start justify-between gap-4 overflow-visible">
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
                          title="Click to edit title"
                        >
                          {session.title}
                        </span>
                      )}
                      {getStatusBadge(session.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                      {!patientId && (
                        <span className="truncate">{session.patient?.initials || 'N/A'}</span>
                      )}
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
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
                        </span>                      )}                    </CardDescription>
                  </div>
                    <div className="flex gap-2 flex-wrap items-center justify-end min-w-0 overflow-visible">{session.audioUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => playSession(session)}
                        className={currentSession?.id === session.id && isPlaying ? "bg-blue-50 border-blue-300 text-blue-700" : ""}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {currentSession?.id === session.id && isPlaying ? 'Playing' : 'Audio'}
                      </Button>
                    )}
                    {session.status === "UPLOADED" && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleStartTranscription(session.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Start Transcription
                      </Button>
                    )}
                    {session.status === "TRANSCRIBING" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-1"></div>
                        Transcribing...
                      </Button>
                    )}
                    {session.status === "ERROR" && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleStartTranscription(session.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Retry Transcription
                      </Button>
                    )}                    {session.transcript && session.status === "TRANSCRIBED" && (
                      <>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Transcription
                        </Button>
                        <div className="relative">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setExportMenuOpen(exportMenuOpen === session.id ? null : session.id)}
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                          {exportMenuOpen === session.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={() => handleExportTranscript(session.id, session.title, 'txt')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100"
                              >
                                <FileText className="h-4 w-4 mr-2 inline" />
                                TXT
                              </button>
                              <button
                                onClick={() => handleExportTranscript(session.id, session.title, 'pdf')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100"
                              >
                                <FileText className="h-4 w-4 mr-2 inline" />
                                PDF
                              </button>
                              <button
                                onClick={() => handleExportTranscript(session.id, session.title, 'docx')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                              >
                                <FileText className="h-4 w-4 mr-2 inline" />
                                DOCX
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    
                    {/* Pulsante Delete spostato a destra */}
                    <div className="flex-shrink-0 ml-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteClick(session.id, session.title)}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                        title="Elimina sessione"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>              {session.transcript && (
                <CardContent className="pt-0">
                  <div className="bg-muted p-4 rounded-lg w-full overflow-hidden">
                    <div className="relative w-full">
                      {editingTranscriptId === session.id ? (
                        // Modalità editing
                        <div className="w-full">
                          <textarea
                            value={editingTranscriptText}
                            onChange={(e) => setEditingTranscriptText(e.target.value)}
                            onKeyDown={handleTranscriptKeyDown}
                            className="w-full min-h-[200px] p-3 text-sm border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Modifica la trascrizione..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleTranscriptCancel}
                              disabled={savingTranscript}
                            >
                              Annulla
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleTranscriptSubmit(session.id)}
                              disabled={savingTranscript || !editingTranscriptText.trim()}
                            >
                              {savingTranscript ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Salvando...
                                </>
                              ) : (
                                "Salva"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Modalità visualizzazione
                        <div 
                          className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors group"                          onClick={() => handleTranscriptClick(session.id, session.transcript || "")}
                          title="Click to edit transcription"
                        >
                          <p className={`text-sm whitespace-pre-wrap break-words w-full ${
                            expandedSessions.has(session.id) ? '' : 'line-clamp-3'
                          }`}>
                            {session.transcript}
                          </p>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            <span className="text-xs text-gray-500 italic">✏️ Click to edit</span>
                          </div>
                        </div>
                      )}
                      
                      {session.transcript.length > 200 && editingTranscriptId !== session.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Previene il trigger dell'editing
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
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Read more
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
