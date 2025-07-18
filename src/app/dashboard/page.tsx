"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileAudio, FileText, Plus, BarChart3, HelpCircle } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    patientsCount: 0,
    sessionsCount: 0,
    transcriptionsCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("Dashboard useEffect - status:", status, "session:", !!session)
    
    if (status === "loading") {
      console.log("Dashboard: Still loading session...")
      return // Still loading
    }
    
    if (!session) {
      console.log("Dashboard: No session, redirecting to login...")
      router.push("/login")
      return
    }
    
    console.log("Dashboard: Session found, fetching stats...")
    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Dashboard: Fetching stats...")
      
      const [patientsRes, sessionsRes] = await Promise.all([
        fetch("/api/patients"),
        fetch("/api/sessions"),
      ])
      
      console.log("Dashboard: Response status - patients:", patientsRes.status, "sessions:", sessionsRes.status)
        if (!patientsRes.ok || !sessionsRes.ok) {
        throw new Error(`HTTP error - patients: ${patientsRes.status}, sessions: ${sessionsRes.status}`)
      }
      
      const [patientsData, sessions] = await Promise.all([
        patientsRes.json(),
        sessionsRes.json(),
      ])
      
      // L'API pazienti restituisce { success: true, data: { patients: [...] } }
      const patients = patientsData.data?.patients || patientsData.patients || []
      
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
    } catch (error) {
      console.error("Error fetching stats:", error)
      setError(error instanceof Error ? error.message : "Errore nel caricamento delle statistiche")
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
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
              <p className="text-gray-600">Welcome, {session.user?.name}</p>
            </div>
          </div>
        </div>        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/patients")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>            <CardContent>
              <div className="text-2xl font-bold">{stats.patientsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.patientsCount === 0 ? "No patients registered" : "Registered patients"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/sessions")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sessionsCount === 0 ? "No sessions uploaded" : "Registered sessions"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transcriptions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transcriptionsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.transcriptionsCount === 0 ? "Awaiting transcriptions" : "Completed transcriptions"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Quickly access main features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push("/patients")} 
                className="w-full justify-start"
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Patients
              </Button>
              <Button 
                onClick={() => router.push("/sessions")} 
                className="w-full justify-start"
                variant="outline"
              >
                <FileAudio className="mr-2 h-4 w-4" />
                View Sessions
              </Button>
              <Button 
                onClick={() => router.push("/help")} 
                className="w-full justify-start"
                variant="outline"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Tutorials
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                disabled
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports & Analysis (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your TalksFromTherapy account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  Account active since {new Date().toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
