import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { emoatlasService } from "@/lib/emoatlas"

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
    const { sessionId, language = 'italian' } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: "Must provide sessionId" }, 
        { status: 400 }
      )
    }

    // Fetch session from Supabase
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, transcript, status')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (!sessionRecord.transcript || typeof sessionRecord.transcript !== 'string' || sessionRecord.transcript.trim().length === 0) {
      return NextResponse.json({ 
        error: "Session has no transcript" 
      }, { status: 400 })
    }

    console.log('🌸 Generating emotional flower for session:', sessionRecord.id)
    console.log('🌍 Language:', language)

    // Generate emotional flower plot
    const sessionData = [{
      id: sessionRecord.id,
      title: sessionRecord.title,
      transcript: sessionRecord.transcript,
      sessionDate: new Date().toISOString()
    }]
    
    const analysisResult = await emoatlasService.analyzeEmotions(sessionData, language)

    if (!analysisResult.success || analysisResult.individual_sessions.length === 0) {
      console.error('❌ Flower plot generation failed:', analysisResult.error)
      return NextResponse.json({ 
        error: "Failed to generate emotional flower", 
        details: analysisResult.error 
      }, { status: 500 })
    }

    const analysis = analysisResult.individual_sessions[0]

    console.log('✅ Emotional flower generated successfully')
    
    return NextResponse.json({
      success: true,
      session_id: sessionRecord.id,
      session_title: sessionRecord.title,
      flower_plot: (analysis as any).flower_plot,
      z_scores: analysis.analysis.z_scores,
      emotional_valence: analysis.analysis.emotional_valence,
      language: language,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Emotional flower API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
