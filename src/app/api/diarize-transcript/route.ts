import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { diarizeTranscript } from "@/lib/openai"

export const runtime = 'nodejs'

// POST /api/diarize-transcript - Diarizza una trascrizione esistente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("POST /api/diarize-transcript - Inizio richiesta", { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })
    
    if (!session?.user?.id) {
      console.log("Errore: utente non autenticato")
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { sessionId } = await request.json()
    console.log("Dati ricevuti:", { sessionId })

    if (!sessionId) {
      console.log("Errore: sessionId mancante")
      return NextResponse.json(
        { error: "ID sessione richiesto" },
        { status: 400 }
      )
    }

    console.log(`🔍 Ricerca sessione con ID: ${sessionId}`)
    console.log(`👤 User ID: ${session.user.id}`)

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
        title: true,
        transcript: true
      }
    })

    console.log("Query database completata", { 
      found: !!sessionRecord, 
      sessionId,
      status: sessionRecord?.status,
      hasTranscript: !!sessionRecord?.transcript
    })

    if (!sessionRecord) {
      console.log(`❌ Sessione non trovata`)
      return NextResponse.json(
        { error: "Sessione non trovata" },
        { status: 404 }
      )
    }

    if (!sessionRecord.transcript || sessionRecord.transcript.trim().length === 0) {
      console.log(`❌ Nessuna trascrizione trovata per la sessione`)
      return NextResponse.json(
        { error: "Nessuna trascrizione trovata per questa sessione" },
        { status: 400 }
      )
    }

    console.log(`✅ Sessione trovata:`, {
      id: sessionRecord.id,
      title: sessionRecord.title,
      status: sessionRecord.status,
      transcriptLength: sessionRecord.transcript.length
    })

    try {
      console.log(`🎭 Avvio diarizzazione per sessione: ${sessionRecord.title}`)
      
      // Esegui la diarizzazione
      const diarizedTranscript = await diarizeTranscript(sessionRecord.transcript, sessionRecord.title)
      
      console.log(`🎭 Diarizzazione completata: "${diarizedTranscript.substring(0, 100)}..."`)
      console.log(`📏 Lunghezza trascrizione diarizzata: ${diarizedTranscript.length} caratteri`)
      
      // Aggiorna la sessione con la trascrizione diarizzata
      await prisma.session.update({
        where: { id: sessionId },
        data: { 
          transcript: diarizedTranscript,
          updatedAt: new Date()
        }
      })

      console.log(`✅ Diarizzazione completata per sessione ${sessionId}`)

      return NextResponse.json({
        message: "Diarizzazione completata con successo",
        sessionId,
        originalTranscriptLength: sessionRecord.transcript.length,
        diarizedTranscriptLength: diarizedTranscript.length,
        transcript: diarizedTranscript
      })

    } catch (error) {
      console.error("❌ Errore durante la diarizzazione:", error)
      
      return NextResponse.json({
        error: "Errore durante la diarizzazione",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Errore durante l'avvio diarizzazione:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A")
    return NextResponse.json(
      { 
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : "Errore sconosciuto",
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
} 