import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { emoatlasService, SessionData } from "@/lib/emoatlas"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Recupera l'ID utente da Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
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

    // Fetch sessions from Supabase
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, transcript, sessionDate, status, patientId')
      .in('id', sessionIds)
      .eq('userId', userData.id)
      .eq('isActive', true)

    if (sessionsError) {
      console.error('Supabase sessions error:', sessionsError)
      return NextResponse.json({ error: "Error fetching sessions" }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
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
