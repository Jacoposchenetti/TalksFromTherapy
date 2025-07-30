import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CreditsService } from "@/lib/credits-service"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Credits Transactions API: Fetching user transactions...")
    
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Credits Transactions API: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const creditsService = new CreditsService()
    const transactions = await creditsService.getCreditTransactions(session.user.id, limit)
    
    console.log("✅ Credits Transactions API: Transactions fetched successfully")
    return NextResponse.json({ 
      success: true, 
      data: transactions 
    })

  } catch (error) {
    console.error("❌ Credits Transactions API: Error:", error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch transactions" 
    }, { status: 500 })
  }
}
