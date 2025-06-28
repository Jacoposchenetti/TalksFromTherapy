import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emoatlasService, SessionData } from "@/lib/emoatlas"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { sessionIds, language = 'italian' } = body

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Must provide sessionIds array" }, 
        { status: 400 }
      )
    }

    // Fetch sessions from database
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        userId: user.id,
        isActive: true
      },      select: {
        id: true,
        title: true,
        transcript: true,
        sessionDate: true,
        status: true
      }
    })

    if (sessions.length === 0) {
      return NextResponse.json({ error: "No sessions found" }, { status: 404 })
    }

    // Filter sessions with transcripts
    const sessionsWithTranscripts = sessions.filter(s => 
      s.transcript && 
      typeof s.transcript === 'string' && 
      s.transcript.trim().length > 0
    )

    if (sessionsWithTranscripts.length === 0) {
      return NextResponse.json({ 
        error: "No sessions with transcripts found" 
      }, { status: 400 })
    }    // Prepare session data for analysis
    const sessionData: SessionData[] = sessionsWithTranscripts.map(session => ({
      id: session.id,
      title: session.title,
      transcript: session.transcript!,
      sessionDate: session.sessionDate ? session.sessionDate.toISOString() : new Date().toISOString()
    }))// Perform emotion analysis
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
