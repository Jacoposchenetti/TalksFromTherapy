"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileAudio, Plus, BarChart3, HelpCircle, Zap, Mail, Coins } from "lucide-react"
import GuidedTour from "@/components/guided-tour"
import { useTour, dashboardTourSteps } from "@/hooks/useTour"
import { useCredits } from "@/hooks/useCredits"
import SubscriptionGuard from "@/components/SubscriptionGuard"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isTourOpen, hasCompletedTour, startTour, closeTour, completeTour } = useTour()
  const { credits, loading: creditsLoading } = useCredits()
  const [stats, setStats] = useState({
    patientsCount: 0,
    sessionsCount: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
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

  // Separate useEffect for tour to avoid infinite loops
  useEffect(() => {
    // Check if this is user's first time and show tour
    if (session && !hasCompletedTour && status !== "loading") {
      const timer = setTimeout(() => {
        startTour()
      }, 1000) // Delay to let the page load
      
      return () => clearTimeout(timer)
    }
  }, [session, hasCompletedTour, status, startTour])

  const fetchStats = async () => {
    try {
      setError(null)
      
      console.log("🔄 Dashboard: Fetching patients and sessions in parallel...")
      // Fetch both APIs in parallel for faster loading
      const [patientsRes, sessionsRes] = await Promise.all([
        fetch("/api/patients"),
        fetch("/api/sessions")
      ])
      
      console.log("📡 Dashboard: API Responses - Patients:", patientsRes.status, "Sessions:", sessionsRes.status)
      
      if (patientsRes.ok && sessionsRes.ok) {
        const [patientsData, sessionsData] = await Promise.all([
          patientsRes.json(),
          sessionsRes.json()
        ])
        
        console.log("📦 Dashboard: Raw data - Patients:", patientsData, "Sessions:", sessionsData)
        
        // Extract the data arrays
        const patients = patientsData.data?.patients || patientsData.patients || []
        const sessions = sessionsData.data || sessionsData || []
        
        const patientsCount = Array.isArray(patients) ? patients.length : 0
        const sessionsCount = Array.isArray(sessions) ? sessions.length : 0
        
        const newStats = {
          patientsCount: patientsCount,
          sessionsCount: sessionsCount,
        }
        
        console.log("Dashboard: New stats:", newStats)
        setStats(newStats)
      } else {
        throw new Error(`HTTP error - patients: ${patientsRes.status}, sessions: ${sessionsRes.status}`)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      setError(error instanceof Error ? error.message : "Errore nel caricamento delle statistiche")
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
    <SubscriptionGuard>
      <div className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div data-tour="dashboard-header" className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome, {session.user?.name}</p>
              </div>
              
              {/* Tour button */}
              <Button
                onClick={startTour}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Tour guidato
              </Button>
            </div>
          </div>        <div data-tour="stats-cards" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/credits")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creditsLoading ? '...' : credits?.credits_balance || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {credits?.credits_balance === 0 ? "Crediti esauriti" : "Crediti disponibili"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card data-tour="quick-actions">
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
                data-tour="patients-button"
                onClick={() => router.push("/patients")} 
                className="w-full justify-start"
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Patients
              </Button>
              <Button 
                data-tour="help-button"
                onClick={() => router.push("/help")} 
                className="w-full justify-start"
                variant="outline"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Tutorials
              </Button>
              <Button 
                onClick={() => router.push("/contact")} 
                className="w-full justify-start"
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </CardContent>
          </Card>

          <Card data-tour="account-info">
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

        {/* Guided Tour Component */}
        <GuidedTour
          isOpen={isTourOpen}
          onClose={closeTour}
          onComplete={completeTour}
          steps={dashboardTourSteps}
        />
      </div>
    </div>
    </SubscriptionGuard>
  )
}
