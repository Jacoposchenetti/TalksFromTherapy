"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, Clock } from "lucide-react"

interface Session {
  id: string
  title: string
  transcript?: string
  sessionDate: string
  duration?: number
  patientId?: string
  status?: string
  patient?: {
    id: string
    initials: string
  }
}

export default function TranscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchTranscriptions()
  }, [session, status, router])

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch("/api/transcriptions")
      if (response.ok) {
        const { data } = await response.json()
        console.log("[Supabase] Transcriptions API response:", data)
        setSessions(data || [])
      } else {
        const errorText = await response.text()
        console.error("[Supabase] API error:", errorText)
      }
    } catch (error) {
      console.error("[Supabase] Network or fetch error:", error)
    } finally {
      setLoading(false)
    }
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
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Trascrizioni</h1>
        <p className="text-muted-foreground">
          Visualizza e gestisci tutte le trascrizioni delle sessioni
        </p>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessuna trascrizione trovata</h3>
              <p className="text-muted-foreground text-center">
                Le trascrizioni appariranno qui una volta create dalle sessioni audio
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {session.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span>{session.patient?.initials || session.patientId || ""}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(session.duration)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {session.transcript && (
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">
                      {session.transcript}
                    </p>
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