import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transcribeAudio } from "@/lib/openai"
import { join } from "path"

export const runtime = 'nodejs'

// POST /api/transcribe - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {  try {
    const session = await getServerSession(authOptions)
    
    console.log("POST /api/transcribe - Inizio richiesta", { 
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
        audioFileName: true,
        audioUrl: true,
        title: true
      }    })

    console.log("Query database completata", { 
      found: !!sessionRecord, 
      sessionId,
      status: sessionRecord?.status,
      audioFileName: sessionRecord?.audioFileName
    })

    if (!sessionRecord) {
      console.log(`❌ Sessione non trovata`)
      return NextResponse.json(
        { error: "Sessione non trovata" },
        { status: 404 }
      )
    }

    console.log(`✅ Sessione trovata:`, {
      id: sessionRecord.id,
      title: sessionRecord.title,
      status: sessionRecord.status,
      audioFileName: sessionRecord.audioFileName,
      userId: sessionRecord.userId
    })

    if (sessionRecord.status !== "UPLOADED") {
      console.log(`⚠️ Stato sessione attuale: "${sessionRecord.status}" (expected: "UPLOADED")`)
      return NextResponse.json(
        { 
          error: `La sessione deve essere in stato UPLOADED per avviare la trascrizione. Stato attuale: ${sessionRecord.status}`,
          currentStatus: sessionRecord.status,
          sessionId: sessionRecord.id
        },
        { status: 400 }
      )
    }

    if (!sessionRecord.audioFileName) {
      return NextResponse.json(
        { error: "Nessun file audio trovato per questa sessione" },
        { status: 400 }
      )
    }

    // Aggiorna lo stato a TRANSCRIBING
    await prisma.session.update({      where: { id: sessionId },
      data: { 
        status: "TRANSCRIBING",
        updatedAt: new Date()
      }
    })

    try {
      // Costruisce il percorso completo del file audio
      const audioFilePath = join(process.cwd(), "uploads", "audio", sessionRecord.audioFileName)
      
      console.log(`🚀 Avvio trascrizione REALE per file: ${audioFilePath}`)
      
      // Verifica che il file esista
      const fs = require('fs')
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`File audio non trovato: ${audioFilePath}`)
      }
      
      // Ottieni informazioni sul file
      const fileStats = fs.statSync(audioFilePath)
      console.log(`📁 Dimensione file: ${fileStats.size} bytes (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Utilizza OpenAI Whisper per la trascrizione reale
      const transcript = await transcribeAudio(audioFilePath)
      
      console.log(`📝 Trascrizione ricevuta: "${transcript}"`)
      console.log(`📏 Lunghezza trascrizione: ${transcript.length} caratteri`)
      
      // Verifica se la trascrizione sembra valida
      if (transcript.length < 10 || transcript.includes("Sottotitoli e revisione a cura di")) {
        console.warn(`⚠️ Trascrizione sospetta: "${transcript}"`)
        console.warn(`💡 Potrebbe essere un watermark, file vuoto o audio di bassa qualità`)
      }
      
      // Aggiorna la sessione con la trascrizione completata
      await prisma.session.update({
        where: { id: sessionId },
        data: { 
          status: "TRANSCRIBED",
          transcript: transcript,
          updatedAt: new Date()
        }
      })

      console.log(`✅ Trascrizione REALE completata per sessione ${sessionId}`)

      return NextResponse.json({
        message: "Trascrizione completata con successo",
        sessionId,
        status: "TRANSCRIBED",
        transcript: transcript,
        fileSize: fileStats.size,
        filePath: audioFilePath
      })

    } catch (error) {
      console.error("❌ Errore durante la trascrizione:", error)
      
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
