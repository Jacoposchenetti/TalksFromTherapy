import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { emoatlasService, SessionData } from "@/lib/emoatlas"

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("POST /api/emotion-analysis - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Validazione input
    const requestData = await request.json()
    
    if (!validateApiInput(requestData, ['sessionIds'])) {
      return createErrorResponse("Dati richiesta non validi - sessionIds richiesto", 400)
    }

    const { sessionIds, language = 'italian' } = requestData

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return createErrorResponse("sessionIds deve essere un array non vuoto", 400)
    }

    // STEP 3: Sanitizza sessionIds e verifica che siano stringhe valide
    const sanitizedSessionIds = sessionIds
      .map(id => sanitizeInput(id.toString()))
      .filter(id => id.length > 0)

    if (sanitizedSessionIds.length === 0) {
      return createErrorResponse("Nessun sessionId valido fornito", 400)
    }

    // STEP 4: Fetch sessions e verifica ownership
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, transcript, sessionDate, status, patientId, userId')
      .in('id', sanitizedSessionIds)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)

    if (sessionsError) {
      console.error('Errore recupero sessioni:', sessionsError)
      return createErrorResponse("Errore nel recupero delle sessioni", 500)
    }

    if (!sessions || sessions.length === 0) {
      return createErrorResponse("Nessuna sessione trovata o accesso negato", 404)
    }

    // STEP 5: Double-check resource access per ogni sessione
    const authorizedSessions = sessions.filter(session => 
      hasResourceAccess(authResult.user!.id, session.userId)
    )

    if (authorizedSessions.length === 0) {
      return createErrorResponse("Accesso negato alle sessioni richieste", 403)
    }

    // STEP 6: Filter sessions with transcripts
    const sessionsWithTranscripts = authorizedSessions.filter(s => 
      s.transcript && 
      typeof s.transcript === 'string' && 
      s.transcript.trim().length > 0
    )

    if (sessionsWithTranscripts.length === 0) {
      return createErrorResponse("Nessuna sessione con trascrizione trovata", 400)
    }

    // Prepare session data for analysis
    const sessionData: SessionData[] = sessionsWithTranscripts.map(session => ({
      id: session.id,
      title: session.title,
      transcript: session.transcript!,
      sessionDate: session.sessionDate ? new Date(session.sessionDate).toISOString() : new Date().toISOString()
    }))

    // Perform emotion analysis
    console.log('🧪 Starting emotion analysis for', sessionData.length, 'sessions')
    console.log('🌍 Language configured:', language)
    console.log('📊 Session data:', sessionData.map(s => ({ id: s.id, title: s.title, transcript_length: s.transcript.length })))
    
    const analysis = await emoatlasService.analyzeEmotions(sessionData, language)
    
    console.log('📈 Analysis result:', { 
      success: analysis.success, 
      error: analysis.error,
      language_used: analysis.success && analysis.individual_sessions.length > 0 ? 
        analysis.individual_sessions[0]?.analysis?.language : 'unknown'
    })

    if (!analysis.success) {
      console.error('❌ EmoAtlas analysis failed:', analysis.error)
      return NextResponse.json({ 
        error: "Emotion analysis failed", 
        details: analysis.error 
      }, { status: 500 })
    }

    // Save analysis results to Supabase
    try {
      for (const session of sessionsWithTranscripts) {
        const sessionAnalysis = analysis.individual_sessions.find(s => s.session_id === session.id)
        if (sessionAnalysis) {
          const { data: insertData, error: insertError } = await supabase
            .from('analyses')
            .upsert([{
              sessionId: session.id,
              patientId: session.patientId,
              emotions: JSON.stringify(sessionAnalysis.analysis.z_scores || {}),
              emotionalValence: sessionAnalysis.analysis.emotional_valence || 0,
              sentimentScore: sessionAnalysis.analysis.emotional_valence || 0,
              significantEmotions: JSON.stringify(sessionAnalysis.analysis.significant_emotions || {}),
              emotionFlowerPlot: (sessionAnalysis as any).flower_plot || null,
              language: language,
              analysisVersion: '1.0.0',
              createdAt: new Date(),
              updatedAt: new Date()
            }], {
              onConflict: 'sessionId'
            })
          
          if (insertError) {
            console.error('[Supabase] Error saving emotion analysis:', insertError)
          } else {
            console.log('[Supabase] Emotion analysis saved for session:', session.id)
          }
        }
      }
    } catch (dbError) {
      console.warn('Failed to save emotion analysis to Supabase:', dbError)
      // Continue anyway, don't fail the request
    }

    console.log('✅ Analysis completed successfully')
    return NextResponse.json({
      success: true,
      analysis,
      processed_sessions: sessionsWithTranscripts.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Emotion analysis API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const health = await emoatlasService.healthCheck()
    
    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      service: 'EmoAtlas',
      error: health.error,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
