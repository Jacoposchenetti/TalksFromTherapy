import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CreditsService } from "@/lib/credits-service"
import { CreditFeature } from "@/lib/credits-config"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Credits Deduct API: Processing deduction...")
    
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Credits Deduct API: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { feature, description, referenceId } = body

    if (!feature || !description) {
      return NextResponse.json({ 
        error: "Missing required fields: feature, description" 
      }, { status: 400 })
    }

    // Valida feature
    const validFeatures = [
      'TRANSCRIPTION', 
      'TOPIC_MODELLING', 
      'CUSTOM_TOPIC_MODELLING',
      'SENTIMENT_ANALYSIS', 
      'SEMANTIC_FRAME', 
      'AI_INSIGHTS', 
      'DOCUMENT_ANALYSIS'
    ]
    if (!validFeatures.includes(feature)) {
      return NextResponse.json({ 
        error: `Invalid feature. Must be one of: ${validFeatures.join(', ')}` 
      }, { status: 400 })
    }

    const creditsService = new CreditsService()
    
    // Controlla se ha crediti sufficienti
    const hasEnough = await creditsService.hasEnoughCredits(session.user.id, feature as CreditFeature)
    if (!hasEnough) {
      return NextResponse.json({ 
        error: "Crediti insufficienti per questa operazione",
        code: "INSUFFICIENT_CREDITS"
      }, { status: 402 }) // Payment Required
    }

    // Deduce crediti atomicamente
    const newBalance = await creditsService.deductCredits(
      session.user.id,
      feature as CreditFeature,
      description,
      referenceId
    )
    
    console.log("✅ Credits Deduct API: Credits deducted successfully")
    return NextResponse.json({ 
      success: true, 
      data: {
        newBalance,
        deducted: true
      }
    })

  } catch (error) {
    console.error("❌ Credits Deduct API: Error:", error)
    
    if (error instanceof Error && error.message.includes('Crediti insufficienti')) {
      return NextResponse.json({ 
        error: "Crediti insufficienti per questa operazione",
        code: "INSUFFICIENT_CREDITS"
      }, { status: 402 })
    }

    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to deduct credits" 
    }, { status: 500 })
  }
}
