import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { transcribeAudio } from "@/lib/openai"
import { join } from "path"
import { existsSync, readFileSync } from "fs"

export const runtime = 'nodejs'

// POST /api/test-transcription - Test trascrizione file audio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { fileName } = await request.json()

    if (!fileName) {
      return NextResponse.json(
        { error: "Nome file richiesto" },
        { status: 400 }
      )
    }

    // Verifica che il file esista
    const audioFilePath = join(process.cwd(), "uploads", "audio", fileName)
    
    if (!existsSync(audioFilePath)) {
      return NextResponse.json(
        { error: "File audio non trovato" },
        { status: 404 }
      )
    }

    try {
      console.log(`Test trascrizione per file: ${audioFilePath}`)
      
      // Leggi il file audio come Buffer
      const audioBuffer = readFileSync(audioFilePath)
      
      // Prova la trascrizione
      const transcript = await transcribeAudio(audioBuffer, fileName)
      
      return NextResponse.json({
        success: true,
        fileName,
        transcript,
        message: "Trascrizione test completata con successo"
      })

    } catch (error) {
      console.error("Errore durante il test trascrizione:", error)
      
      return NextResponse.json({
        success: false,
        error: "Errore durante la trascrizione",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Errore test trascrizione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
