import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CreditsService } from "@/lib/credits-service"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Credits Stats API: Fetching user stats...")
    
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Credits Stats API: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const creditsService = new CreditsService()
    const stats = await creditsService.getCreditStats(session.user.id)
    
    console.log("✅ Credits Stats API: Stats fetched successfully")
    return NextResponse.json({ 
      success: true, 
      data: stats 
    })

  } catch (error) {
    console.error("❌ Credits Stats API: Error:", error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats" 
    }, { status: 500 })
  }
}
