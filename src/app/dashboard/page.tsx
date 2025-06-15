"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileAudio, FileText, Plus, BarChart3 } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    patientsCount: 0,
    sessionsCount: 0,
    transcriptionsCount: 0,
  })

  useEffect(() => {
    if (status === "loading") return // Still loading
    if (!session) router.push("/login")
    else fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      console.log("Dashboard: Fetching stats...")
      const [patientsRes, sessionsRes] = await Promise.all([
        fetch("/api/patients"),
        fetch("/api/sessions"),
      ])
      
      console.log("Dashboard: Response status - patients:", patientsRes.status, "sessions:", sessionsRes.status)
        if (patientsRes.ok && sessionsRes.ok) {
        const [patientsData, sessions] = await Promise.all([
          patientsRes.json(),
          sessionsRes.json(),
        ])
        
        // L'API pazienti restituisce { patients: [...] }
        const patients = patientsData.patients || []
        
        console.log("Dashboard: Data received - patients:", patients, "sessions:", sessions)
        console.log("Dashboard: Patients length:", patients?.length, "Sessions length:", sessions?.length)
        
        const patientsCount = Array.isArray(patients) ? patients.length : 0
        const sessionsCount = Array.isArray(sessions) ? sessions.length : 0
        const transcriptionsCount = Array.isArray(sessions) ? sessions.filter((s: any) => s.transcript).length : 0
        
        const newStats = {
          patientsCount: patientsCount,
          sessionsCount: sessionsCount,
          transcriptionsCount: transcriptionsCount,
        }
        
        console.log("Dashboard: New stats:", newStats)
        setStats(newStats)
      } else {
        console.error("Dashboard: API response not ok")
      }
    } catch (error) {console.error("Error fetching stats:", error)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Benvenuto, {session.user?.name}</p>
            </div>
          </div>
        </div>        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/patients")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pazienti</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>            <CardContent>
              <div className="text-2xl font-bold">{stats.patientsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.patientsCount === 0 ? "Nessun paziente registrato" : "Pazienti registrati"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/sessions")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessioni</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sessionsCount === 0 ? "Nessuna sessione caricata" : "Sessioni registrate"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trascrizioni</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transcriptionsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.transcriptionsCount === 0 ? "In attesa di trascrizioni" : "Trascrizioni completate"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Azioni Rapide
              </CardTitle>
              <CardDescription>
                Accedi rapidamente alle funzioni principali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push("/patients")} 
                className="w-full justify-start"
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                Gestisci Pazienti
              </Button>
              <Button 
                onClick={() => router.push("/sessions")} 
                className="w-full justify-start"
                variant="outline"
              >
                <FileAudio className="mr-2 h-4 w-4" />
                Visualizza Sessioni
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                disabled
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Report e Analisi (Presto)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informazioni Account</CardTitle>
              <CardDescription>
                Dettagli del tuo account TalksFromTherapy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Nome:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  Account attivo dal {new Date().toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
