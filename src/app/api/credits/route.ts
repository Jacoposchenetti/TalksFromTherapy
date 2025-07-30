import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CreditsService } from "@/lib/credits-service"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Credits API: Fetching user credits...")
    
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Credits API: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const creditsService = new CreditsService()
    const credits = await creditsService.getUserCredits(session.user.id)
    
    console.log("✅ Credits API: Credits fetched successfully")
    return NextResponse.json({ 
      success: true, 
      data: credits 
    })

  } catch (error) {
    console.error("❌ Credits API: Error:", error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credits" 
    }, { status: 500 })
  }
}
