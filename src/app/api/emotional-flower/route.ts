import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emoatlasService } from "@/lib/emoatlas"

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
    const { sessionId, language = 'italian' } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: "Must provide sessionId" }, 
        { status: 400 }
      )
    }

    // Fetch session from database
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        transcript: true,
        status: true
      }
    })

    if (!sessionRecord) {
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
      flower_plot: analysis.analysis.flower_plot,
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
