import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      )
    }
    const { sessionIds, minTopicSize = 5 }: TopicAnalysisRequest = await request.json()
    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Nessuna sessione selezionata" },
        { status: 400 }
      )
    }
    // Fetch sessions and their transcripts da Supabase
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, transcript, status, createdAt')
      .in('id', sessionIds)
      .eq('userId', userData.id)
    if (sessionsError) {
      return NextResponse.json(
        { error: "Errore nel recupero delle sessioni" },
        { status: 500 }
      )
    }
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna trascrizione trovata per le sessioni selezionate" },
        { status: 404 }
      )
    }
    // Filter out sessions without transcripts
    const validSessions = sessions.filter(session => 
      session.transcript && typeof session.transcript === 'string' && session.transcript.trim().length > 0
    )
    if (validSessions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna trascrizione valida trovata" },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: "Servizio di analisi non disponibile. Assicurati che il servizio Python sia in esecuzione." },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: `Errore del servizio di analisi: ${response.status}` },
        { status: 502 }
      )
    }
    const bertopicResult: BertopicResponse = await response.json()
    // Save analysis results to Supabase (optional)
    try {
      for (const session of validSessions) {
        const { data: insertData, error: insertError } = await supabase
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
          return NextResponse.json({ error: 'Errore durante il salvataggio dell\'analisi topic modeling', details: insertError.message }, { status: 500 })
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
    return NextResponse.json(enrichedResult)
  } catch (error) {
    console.error("Errore durante l'analisi dei topic:", error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: "Impossibile connettersi al servizio di analisi. Verifica che il servizio Python sia in esecuzione." },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: "Errore interno del server durante l'analisi" },
      { status: 500 }
    )
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
