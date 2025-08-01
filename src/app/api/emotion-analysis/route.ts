import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { emoatlasService } from "@/lib/emoatlas"
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  console.log("🧪 GET /api/emotion-analysis called!")
  return NextResponse.json({
    status: "Emotion Analysis API ready",
    timestamp: new Date().toISOString(),
    working: true
  })
}

export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/emotion-analysis called!")
  
  try {
    // STEP 1: Verify authorization
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      console.log("❌ Authorization failed:", authResult.error)
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("✅ POST /api/emotion-analysis - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Parse request body
    const { sessionIds, language = 'italian' } = await request.json()

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return createErrorResponse("IDs sessione non forniti o non validi", 400)
    }

    console.log(`🌸 Processing emotion analysis for ${sessionIds.length} sessions`)

    // STEP 3: Fetch sessions with transcripts from database
    const { data: sessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, title, transcript, createdAt')
      .in('id', sessionIds)
      .eq('userId', authResult.user!.id)
      .not('transcript', 'is', null)

    if (fetchError) {
      console.error('Database error:', fetchError)
      return createErrorResponse("Errore durante il recupero delle sessioni", 500)
    }

    if (!sessions || sessions.length === 0) {
      return createErrorResponse("Nessuna sessione trovata con trascrizioni", 404)
    }

    console.log(`📝 Found ${sessions.length} sessions with transcripts`)

    // STEP 4: Transform sessions to EmoAtlas format
    const sessionData = sessions.map(session => ({
      id: session.id,
      title: session.title || `Session ${new Date(session.createdAt).toLocaleDateString()}`,
      transcript: session.transcript,
      sessionDate: session.createdAt
    }))

    // STEP 5: Analyze emotions using EmoAtlas service
    console.log(`🔍 About to call EmoAtlas service with ${sessionData.length} sessions`)
    
    try {
      const analysisResult = await emoatlasService.analyzeEmotions(sessionData, language)
      console.log(`🎯 EmoAtlas service response:`, {
        success: analysisResult.success,
        error: analysisResult.error,
        sessionCount: analysisResult.individual_sessions?.length
      })

      if (!analysisResult.success) {
        console.error('EmoAtlas analysis failed:', analysisResult.error)
        return createErrorResponse(analysisResult.error || "Analisi emotiva fallita", 500)
      }

      console.log(`✅ Emotion analysis completed for ${analysisResult.individual_sessions.length} sessions`)
      return createSuccessResponse(analysisResult, "Analisi emotiva completata con successo")
      
    } catch (emoError) {
      console.error('🚨 EmoAtlas service call failed:', emoError)
      return createErrorResponse(`Errore servizio EmoAtlas: ${emoError instanceof Error ? emoError.message : 'Unknown error'}`, 500)
    }

  } catch (error) {
    console.error("Error in emotion analysis:", error)
    const errorMessage = error instanceof Error ? error.message : "Errore durante l'analisi emotiva"
    return createErrorResponse(errorMessage, 500)
  }
}
