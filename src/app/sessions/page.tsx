"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Play, FileText, BarChart3, ArrowLeft, Calendar, Clock } from "lucide-react"

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

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId")
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchSessions()
    if (patientId) {
      fetchPatient(patientId)
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

  const fetchPatient = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPatient(data)
      }
    } catch (error) {
      console.error("Error fetching patient:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !patientId) return

    setUploading(true)
    const formData = new FormData()
    formData.append("audio", file)
    formData.append("patientId", patientId)
    formData.append("title", `Sessione ${new Date().toLocaleDateString()}`)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      })
      
      if (response.ok) {
        fetchSessions()
      }
    } catch (error) {
      console.error("Error uploading session:", error)
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
      </div>

      {patientId && (
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
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Caricamento...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessuna sessione trovata</h3>
              <p className="text-muted-foreground text-center">
                {patientId 
                  ? "Carica il primo file audio per iniziare"
                  : "Seleziona un paziente per visualizzare le sue sessioni"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
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
                  </div>
                  <div className="flex gap-2">
                    {session.audioUrl && (
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Audio
                      </Button>
                    )}
                    {session.transcript && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Trascrizione
                      </Button>
                    )}
                    {session.status === "ANALYZED" && (
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analisi
                      </Button>
                    )}
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
          ))
        )}
      </div>
    </div>
  )
}
