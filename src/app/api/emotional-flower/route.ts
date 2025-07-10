import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { emoatlasService } from "@/lib/emoatlas"

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    const body = await request.json()
    const { sessionId, language = 'italian' } = body

    // Validazione input rigorosa
    if (!validateApiInput(body, ['sessionId'])) {
      return createErrorResponse("SessionId è richiesto", 400)
    }

    const sanitizedSessionId = sanitizeInput(sessionId)
    const sanitizedLanguage = sanitizeInput(language)

    // Validazione language
    if (!['italian', 'english'].includes(sanitizedLanguage)) {
      return createErrorResponse("Language deve essere 'italian' o 'english'", 400)
    }

    // Fetch session from Supabase CON VERIFICA OWNERSHIP
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, transcript, status, userId')
      .eq('id', sanitizedSessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Double check accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionRecord.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    if (!sessionRecord.transcript || typeof sessionRecord.transcript !== 'string' || sessionRecord.transcript.trim().length === 0) {
      return createErrorResponse("La sessione non ha un transcript", 400)
    }

    console.log('🌸 Generating emotional flower for session:', sessionRecord.id)
    console.log('🌍 Language:', sanitizedLanguage)

    // Generate emotional flower plot
    const sessionData = [{
      id: sessionRecord.id,
      title: sessionRecord.title,
      transcript: sessionRecord.transcript,
      sessionDate: new Date().toISOString()
    }]
    
    const analysisResult = await emoatlasService.analyzeEmotions(sessionData, sanitizedLanguage)

    if (!analysisResult.success || analysisResult.individual_sessions.length === 0) {
      console.error('❌ Flower plot generation failed:', analysisResult.error)
      return createErrorResponse("Errore nella generazione del fiore emotivo", 500)
    }

    const analysis = analysisResult.individual_sessions[0]

    console.log('✅ Emotional flower generated successfully')
    
    return createSuccessResponse({
      session_id: sessionRecord.id,
      session_title: sessionRecord.title,
      flower_plot: (analysis as any).flower_plot,
      z_scores: analysis.analysis.z_scores,
      emotional_valence: analysis.analysis.emotional_valence,
      language: sanitizedLanguage,
      timestamp: new Date().toISOString()
    }, "Fiore emotivo generato con successo")

  } catch (error) {
    console.error("Emotional flower API error:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
