import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { sessionIds, minTopicSize = 5 }: TopicAnalysisRequest = await request.json()

    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Nessuna sessione selezionata" },
        { status: 400 }
      )
    }

    // Fetch sessions and their transcripts
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        userId: session.user.id,
        transcript: { not: null },
        status: 'TRANSCRIBED'
      },
      select: {
        id: true,
        title: true,
        transcript: true,
        createdAt: true
      }
    })

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna trascrizione trovata per le sessioni selezionate" },
        { status: 404 }
      )
    }

    // Filter out sessions without transcripts
    const validSessions = sessions.filter(session => 
      session.transcript && session.transcript.trim().length > 0
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
    console.log(`Calling BERTopic service at ${PYTHON_SERVICE_URL}/analyze-topics`)
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/analyze-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bertopicRequest),
      // Add timeout
      signal: AbortSignal.timeout(60000) // 60 seconds timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('BERTopic service error:', errorText)
      
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

    // Save analysis results to database (optional)
    try {
      await prisma.analysis.createMany({
        data: validSessions.map(session => ({
          sessionId: session.id,
          patientId: sessionIds[0], // Assuming all sessions belong to same patient
          summary: `Topic modeling analysis completed. Found ${bertopicResult.summary.total_topics} topics.`,
          keyTopics: JSON.stringify(bertopicResult.topics.slice(0, 5)), // Store top 5 topics
          processingTime: Date.now(),
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        skipDuplicates: true
      })
    } catch (dbError) {
      console.warn('Failed to save analysis to database:', dbError)
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
