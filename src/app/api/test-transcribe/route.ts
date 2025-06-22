import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/test-transcribe - Test del sistema di trascrizione
export async function GET() {
  try {
    console.log("=== TEST TRANSCRIBE START ===")
    
    // Test 1: Autenticazione
    const session = await getServerSession(authOptions)
    console.log("1. Test autenticazione:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      email: session?.user?.email 
    })
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: "Test fallito: utente non autenticato",
        step: "authentication"
      }, { status: 401 })
    }

    // Test 2: Connessione database
    try {
      const userCount = await prisma.user.count()
      console.log("2. Test database:", { success: true, userCount })
    } catch (dbError) {
      console.error("2. Test database:", { error: dbError })
      return NextResponse.json({
        error: "Test fallito: errore database",
        step: "database",
        details: dbError instanceof Error ? dbError.message : "Errore sconosciuto"
      }, { status: 500 })
    }

    // Test 3: Query sessioni
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: {
          id: true,
          title: true,
          status: true,
          audioFileName: true,
          audioUrl: true,
          createdAt: true
        },
        take: 5
      })
      console.log("3. Test query sessioni:", { success: true, count: sessions.length })
      
      // Test 4: Verifica chiave OpenAI
      const openaiKey = process.env.OPENAI_API_KEY
      const hasValidKey = !!(openaiKey && openaiKey !== '***REMOVED***your-openai-api-key-here' && openaiKey.startsWith('***REMOVED***'))
      console.log("4. Test OpenAI key:", { hasValidKey, keyLength: openaiKey?.length })
      
      return NextResponse.json({
        success: true,
        tests: {
          authentication: true,
          database: true,
          sessions: true,
          openai: hasValidKey
        },
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          sessionCount: sessions.length,
          sessions: sessions,
          openaiConfigured: hasValidKey
        }
      })
      
    } catch (sessionError) {
      console.error("3. Test query sessioni:", { error: sessionError })
      return NextResponse.json({
        error: "Test fallito: errore query sessioni",
        step: "sessions",
        details: sessionError instanceof Error ? sessionError.message : "Errore sconosciuto"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("=== TEST TRANSCRIBE ERROR ===", error)
    return NextResponse.json({
      error: "Test fallito: errore generale",
      step: "general",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
  }
}

// POST /api/test-transcribe - Test specifico di una sessione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    // Test query specifica sessione
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        isActive: true
      },
      select: {
        id: true,
        userId: true,
        status: true,
        audioFileName: true,
        audioUrl: true,
        title: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      found: !!sessionRecord,
      session: sessionRecord
    })

  } catch (error) {
    console.error("Test POST error:", error)
    return NextResponse.json({
      error: "Errore durante il test",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
  }
}
