import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from '@supabase/supabase-js'
import { CreditsService } from "@/lib/credits-service"

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

interface TopicAnalysisRequest {
  sessionIds: string[]
  minTopicSize?: number
}

interface BertopicRequest {
  texts: string[]
  session_ids: string[]
  min_topic_size: number
  language: string
}

interface BertopicResponse {
  topics: Array<{
    id: number
    name: string
    words: Array<{ word: string; weight: number }>
    count: number
    representative_docs: string[]
  }>
  topic_distribution: Array<{
    session_id: string
    text_index: number
    topic_id: number
    probability: number
    text_preview: string
  }>
  visualization_data: {
    topic_map: any
    topic_hierarchy: any
  }
  summary: {
    total_documents: number
    total_topics: number
    avg_topic_size: number
    outliers_count: number
    coverage: number
  }
}

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("🧠 POST /api/topic-analysis - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Verifica crediti prima di procedere
    const creditsService = new CreditsService()
    const requiredCredits = 1 // Topic analysis costa 1 credito
    
    try {
      const userCredits = await creditsService.getUserCredits(authResult.user!.id)
      if (userCredits.credits_balance < requiredCredits) {
        return createErrorResponse(
          `Crediti insufficienti. Richiesti: ${requiredCredits}, Disponibili: ${userCredits.credits_balance}`, 
          402 // Payment Required
        )
      }
      console.log(`✅ Crediti sufficienti: ${userCredits.credits_balance} >= ${requiredCredits}`)
    } catch (creditsError) {
      console.error("❌ Errore verifica crediti:", creditsError)
      return createErrorResponse("Errore nella verifica crediti", 500)
    }

    const requestData = await request.json()
    
    // SECURITY: Validazione input rigorosa
    if (!validateApiInput(requestData, ['sessionIds'])) {
      return createErrorResponse("Dati richiesta non validi", 400)
    }

    const { sessionIds, minTopicSize = 5 }: TopicAnalysisRequest = requestData

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return createErrorResponse("Nessuna sessione selezionata", 400)
    }

    // SECURITY: Limitiamo il numero di sessioni per prevenire abuse
    if (sessionIds.length > 50) {
      return createErrorResponse("Troppi sessioni selezionate (max 50)", 400)
    }
    // SECURITY: Fetch solo le sessioni dell'utente autenticato
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, title, transcript, status, createdAt')
      .eq('userId', authResult.user!.id)
      .in('id', sessionIds)

    if (sessionsError) {
      console.error('Errore database sessioni:', sessionsError)
      return createErrorResponse("Errore nel recupero delle sessioni", 500)
    }

    if (!sessions || sessions.length === 0) {
      return createErrorResponse("Nessuna trascrizione trovata per le sessioni selezionate", 404)
    }

    // Filter out sessions without transcripts
    const validSessions = sessions.filter(session => 
      session.transcript && typeof session.transcript === 'string' && session.transcript.trim().length > 0
    )

    if (validSessions.length === 0) {
      return createErrorResponse("Nessuna trascrizione valida trovata", 400)
    }

    // Prepare data for BERTopic service
    const bertopicRequest: BertopicRequest = {
      texts: validSessions.map(session => session.transcript!),
      session_ids: validSessions.map(session => session.id),
      min_topic_size: Math.max(2, Math.min(minTopicSize, Math.floor(validSessions.length / 2))),
      language: "italian"
    }
    // Call Python BERTopic service
    const response = await fetch(`${PYTHON_SERVICE_URL}/analyze-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bertopicRequest),
      signal: AbortSignal.timeout(60000) // 60 seconds timeout
    })
    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 404) {
        return createErrorResponse("Servizio di analisi non disponibile. Assicurati che il servizio Python sia in esecuzione.", 503)
      }
      return createErrorResponse(`Errore del servizio di analisi: ${response.status}`, 502)
    }
    const bertopicResult: BertopicResponse = await response.json()
    // Save analysis results to Supabase (optional)
    try {
      for (const session of validSessions) {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('analyses')
          .insert([{
            sessionId: session.id,
            patientId: sessionIds[0], // Assumiamo tutte le sessioni dello stesso paziente
            summary: `Topic modeling analysis completed. Found ${bertopicResult.summary.total_topics} topics.`,
            keyTopics: JSON.stringify(bertopicResult.topics.slice(0, 5)),
            processingTime: Date.now(),
            createdAt: new Date(),
            updatedAt: new Date()
          }])
        if (insertError) {
          console.error('[Supabase] Error inserting topic analysis:', insertError)
          return createErrorResponse('Errore durante il salvataggio dell\'analisi topic modeling', 500)
        } else {
          console.log('[Supabase] Topic analysis inserted:', insertData)
        }
      }
    } catch (dbError) {
      console.warn('Failed to save analysis to Supabase:', dbError)
      // Continue anyway, don't fail the request
    }
    // Add session metadata to the response
    const enrichedResult = {
      ...bertopicResult,
      sessions: validSessions.map(session => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt
      })),
      analysis_timestamp: new Date().toISOString()
    }

    // STEP 5: Deduci crediti dopo successo completamento
    try {
      const newBalance = await creditsService.deductCredits(
        authResult.user!.id,
        'TOPIC_MODELLING', // CreditFeature
        `Analisi topic modeling su ${sessionIds.length} sessioni`,
        sessionIds.join(',') // referenceId con lista sessioni
      )
      console.log(`💳 Crediti dedotti: 1. Nuovo saldo: ${newBalance}`)
    } catch (creditsError) {
      console.error("⚠️ Errore deduzione crediti (analisi completata):", creditsError)
      // Non bloccare la risposta, l'analisi è già stata completata
    }

    return createSuccessResponse(enrichedResult, "Analisi dei topic completata con successo")

  } catch (error) {
    console.error("Errore durante l'analisi dei topic:", error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createErrorResponse(
        "Impossibile connettersi al servizio di analisi. Verifica che il servizio Python sia in esecuzione.", 
        503
      )
    }

    return createErrorResponse("Errore interno del server durante l'analisi", 500)
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check if Python service is reachable
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    })
    
    if (response.ok) {
      return NextResponse.json({
        status: "healthy",
        python_service: "reachable",
        url: PYTHON_SERVICE_URL
      })
    } else {
      return NextResponse.json({
        status: "degraded",
        python_service: "unreachable",
        url: PYTHON_SERVICE_URL
      }, { status: 503 })
    }
  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      python_service: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      url: PYTHON_SERVICE_URL
    }, { status: 503 })
  }
}
