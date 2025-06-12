import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transcribeAudio } from "@/lib/openai"
import { join } from "path"

export const runtime = 'nodejs'

// POST /api/transcribe - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: "ID sessione richiesto" },
        { status: 400 }
      )
    }

    // Verifica che la sessione esista e appartenga all'utente
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        isActive: true
      }
    })

    if (!sessionRecord) {
      return NextResponse.json(
        { error: "Sessione non trovata" },
        { status: 404 }
      )
    }

    if (sessionRecord.status !== "UPLOADED") {
      return NextResponse.json(
        { error: "La sessione deve essere in stato UPLOADED per avviare la trascrizione" },
        { status: 400 }
      )
    }    if (!sessionRecord.audioFileName) {
      return NextResponse.json(
        { error: "Nessun file audio trovato per questa sessione" },
        { status: 400 }
      )
    }

    // Aggiorna lo stato a TRANSCRIBING
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "TRANSCRIBING",
        updatedAt: new Date()
      }
    })

    try {
      // Costruisce il percorso completo del file audio
      const audioFilePath = join(process.cwd(), "uploads", "audio", sessionRecord.audioFileName)
      
      console.log(`Avvio trascrizione per file: ${audioFilePath}`)
      
      // Utilizza OpenAI Whisper per la trascrizione reale
      const transcript = await transcribeAudio(audioFilePath)
      
      // Aggiorna la sessione con la trascrizione completata
      await prisma.session.update({
        where: { id: sessionId },
        data: { 
          status: "TRANSCRIBED",
          transcript: transcript,
          updatedAt: new Date()
        }
      })

      console.log(`Trascrizione completata per sessione ${sessionId}`)

      return NextResponse.json({
        message: "Trascrizione completata con successo",
        sessionId,
        status: "TRANSCRIBED",
        transcript: transcript
      })

    } catch (error) {
      console.error("Errore durante la trascrizione:", error)
      
      // In caso di errore, aggiorna lo stato a ERROR
      await prisma.session.update({
        where: { id: sessionId },
        data: { 
          status: "ERROR",
          errorMessage: error instanceof Error ? error.message : "Errore sconosciuto",
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        error: "Errore durante la trascrizione",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Errore durante l'avvio trascrizione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
