import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Dashboard Stats API: Starting stats fetch...")
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      console.log("❌ Dashboard Stats API: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔄 Dashboard Stats API: Fetching from existing APIs...")
    
    // Get the current request URL to build absolute URLs
    const baseUrl = request.nextUrl.origin
    
    // Fetch both APIs in parallel using the existing endpoints
    const [patientsRes, sessionsRes] = await Promise.all([
      fetch(`${baseUrl}/api/patients`, {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      }),
      fetch(`${baseUrl}/api/sessions`, {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      })
    ])

    console.log("📡 Dashboard Stats API: Responses - Patients:", patientsRes.status, "Sessions:", sessionsRes.status)

    if (!patientsRes.ok || !sessionsRes.ok) {
      throw new Error(`API calls failed - patients: ${patientsRes.status}, sessions: ${sessionsRes.status}`)
    }

    const [patientsData, sessionsData] = await Promise.all([
      patientsRes.json(),
      sessionsRes.json()
    ])

    // Extract the data arrays
    const patients = patientsData.data?.patients || patientsData.patients || []
    const sessions = sessionsData.data || sessionsData || []

    const stats = {
      patientsCount: Array.isArray(patients) ? patients.length : 0,
      sessionsCount: Array.isArray(sessions) ? sessions.length : 0,
    }

    console.log("✅ Dashboard Stats API: Stats calculated:", stats)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error("❌ Dashboard Stats API: Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
