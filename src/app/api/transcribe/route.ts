import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { transcribeAudio, diarizeTranscript } from "@/lib/openai"

export const runtime = 'nodejs'

// POST /api/transcribe - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {
  try {
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

    // Cerca la sessione su Supabase
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId, status, audioFileName, audioUrl, title')
      .eq('id', sessionId)
      .eq('userId', session.user.id)
      .eq('isActive', true)
      .single()

    console.log("Query Supabase completata", { 
      found: !!sessionRecord, 
      sessionId,
      status: sessionRecord?.status,
      audioFileName: sessionRecord?.audioFileName,
      error: sessionError
    })

    if (sessionError || !sessionRecord) {
      console.log(`❌ Sessione non trovata su Supabase:`, sessionError)
      return NextResponse.json(
        { error: "Sessione non trovata" },
        { status: 404 }
      )
    }

    console.log(`✅ Sessione trovata su Supabase:`, {
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

    // Aggiorna lo stato a TRANSCRIBING su Supabase
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        status: "TRANSCRIBING",
        updatedAt: new Date()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Supabase] Error updating session status to TRANSCRIBING:', updateError)
      return NextResponse.json(
        { error: "Errore nell'aggiornamento dello stato sessione" },
        { status: 500 }
      )
    }

    try {
      // Scarica il file audio da Supabase Storage
      const filePath = `${sessionRecord.userId}/${sessionRecord.audioFileName}`
      
      console.log(`🚀 Download file audio da Supabase Storage: ${filePath}`)
      
      // Scarica il file da Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('talksfromtherapy')
        .download(filePath)

      if (downloadError || !fileData) {
        throw new Error(`Errore download file da Supabase Storage: ${downloadError?.message}`)
      }
      
      console.log(`📁 File scaricato, dimensione: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Converte il blob in buffer per OpenAI
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Step 1: Utilizza OpenAI Whisper per la trascrizione iniziale
      console.log(`📝 Step 1: Trascrizione iniziale con Whisper...`)
      const initialTranscript = await transcribeAudio(buffer, sessionRecord.audioFileName)
      
      console.log(`📝 Trascrizione iniziale ricevuta: "${initialTranscript.substring(0, 100)}..."`)
      console.log(`📏 Lunghezza trascrizione iniziale: ${initialTranscript.length} caratteri`)
      
      // Verifica se la trascrizione sembra valida
      if (initialTranscript.length < 10 || initialTranscript.includes("Sottotitoli e revisione a cura di")) {
        console.warn(`⚠️ Trascrizione sospetta: "${initialTranscript}"`)
        console.warn(`💡 Potrebbe essere un watermark, file vuoto o audio di bassa qualità`)
      }
      
      // Step 2: Diarizzazione con GPT-3.5-turbo (con fallback)
      console.log(`🎭 Step 2: Avvio diarizzazione con GPT-3.5-turbo...`)
      let finalTranscript = initialTranscript // Fallback alla trascrizione base
      
      try {
        const diarizedTranscript = await diarizeTranscript(initialTranscript, sessionRecord.title)
        finalTranscript = diarizedTranscript
        console.log(`🎭 Diarizzazione completata: "${diarizedTranscript.substring(0, 100)}..."`)
        console.log(`📏 Lunghezza trascrizione diarizzata: ${diarizedTranscript.length} caratteri`)
      } catch (diarizeError) {
        console.warn(`⚠️ Diarizzazione fallita, usando trascrizione base:`, diarizeError)
        console.log(`📝 Salvando trascrizione senza diarizzazione`)
      }
      
      // Aggiorna la sessione con la trascrizione completata su Supabase
      const { error: finalUpdateError } = await supabase
        .from('sessions')
        .update({
          status: "TRANSCRIBED",
          transcript: finalTranscript,
          updatedAt: new Date()
        })
        .eq('id', sessionId)

      if (finalUpdateError) {
        console.error('[Supabase] Error updating session with transcript:', finalUpdateError)
        throw new Error('Errore nel salvataggio della trascrizione su Supabase')
      }

      console.log(`✅ Processo completo (trascrizione${finalTranscript === initialTranscript ? '' : ' + diarizzazione'}) completato per sessione ${sessionId}`)

      return NextResponse.json({
        message: `Trascrizione${finalTranscript === initialTranscript ? '' : ' e diarizzazione'} completate con successo`,
        sessionId,
        status: "TRANSCRIBED",
        transcript: finalTranscript,
        initialTranscriptLength: initialTranscript.length,
        finalTranscriptLength: finalTranscript.length,
        fileSize: fileData.size,
        fileName: sessionRecord.audioFileName,
        diarizationSuccessful: finalTranscript !== initialTranscript
      })

    } catch (error) {
      console.error("❌ Errore durante la trascrizione:", error)
      
      // In caso di errore, aggiorna lo stato a ERROR su Supabase
      const { error: errorUpdateError } = await supabase
        .from('sessions')
        .update({
          status: "ERROR",
          errorMessage: error instanceof Error ? error.message : "Errore sconosciuto",
          updatedAt: new Date()
        })
        .eq('id', sessionId)

      if (errorUpdateError) {
        console.error('[Supabase] Error updating session status to ERROR:', errorUpdateError)
      }

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
