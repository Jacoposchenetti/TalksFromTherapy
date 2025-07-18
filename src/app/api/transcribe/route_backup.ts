import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { transcribeAudio, diarizeTranscript } from "@/lib/openai"

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'

// POST /api/transcribe - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("POST /api/transcribe - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Validazione input
    const requestData = await request.json()
    
    if (!validateApiInput(requestData, ['sessionId'])) {
      return createErrorResponse("Dati richiesta non validi - sessionId richiesto", 400)
    }

    const sessionId = sanitizeInput(requestData.sessionId)
    console.log("Dati validati:", { sessionId })

    console.log(`🔍 Ricerca sessione con ID: ${sessionId}`)
    console.log(`👤 User ID: ${authResult.user!.id}`)

    // STEP 3: Verifica accesso alla risorsa
    const { data: sessionRecord, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId, status, audioFileName, audioUrl, title')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
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
        { error: "File audio non trovato per questa sessione" },
        { status: 400 }
      )
    }

    // Aggiorna lo stato a TRANSCRIBING su Supabase
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ 
        status: "TRANSCRIBING",
        updatedAt: new Date()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Supabase] Error updating session status to TRANSCRIBING:', updateError)
      return NextResponse.json(
        { error: "Errore durante l'aggiornamento dello stato della sessione" },
        { status: 500 }
      )
    }

    console.log(`🔄 Stato sessione aggiornato a TRANSCRIBING`)

    // STEP 4: Download e trascrizione file audio
    try {
      console.log(`📁 Tentativo di download file: ${sessionRecord.audioFileName}`)
      
      // Costruisci il path corretto per Supabase Storage
      const filePath = `audio/${sessionRecord.audioFileName}`
      console.log(`📍 Path completo file: ${filePath}`)
      
      // Scarica il file da Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .download(filePath)

      if (downloadError || !fileData) {
        throw new Error(`Errore download file da Supabase Storage: ${downloadError?.message}`)
      }
      
      console.log(`📁 File scaricato, dimensione: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Converti il Blob in un File object per OpenAI
      const audioFile = new File([fileData], sessionRecord.audioFileName, {
        type: fileData.type || 'audio/mpeg'
      })
      
      console.log(`🤖 Invio file ad OpenAI per trascrizione...`)
      const transcript = await transcribeAudio(audioFile)
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error("La trascrizione è vuota o non valida")
      }
      
      console.log(`✅ Trascrizione completata, lunghezza: ${transcript.length} caratteri`)
      console.log(`📝 Preview trascrizione: "${transcript.substring(0, 100)}..."`)
      
      // STEP 5: Diarizzazione (opzionale, se richiesta)
      let finalTranscript = transcript
      try {
        console.log(`🎯 Tentativo di diarizzazione...`)
        const diarizedTranscript = await diarizeTranscript(transcript)
        if (diarizedTranscript && diarizedTranscript.trim().length > 0) {
          finalTranscript = diarizedTranscript
          console.log(`✅ Diarizzazione completata`)
        } else {
          console.log(`⚠️ Diarizzazione non riuscita, uso trascrizione originale`)
        }
      } catch (diarizeError) {
        console.log(`⚠️ Errore durante diarizzazione (non critico):`, diarizeError)
        // Usa la trascrizione originale se la diarizzazione fallisce
      }
      
      // Aggiorna la sessione con la trascrizione completata su Supabase
      const { error: finalUpdateError } = await supabaseAdmin
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

      console.log(`✅ Trascrizione salvata su Supabase`)

      return createSuccessResponse({
        message: "Trascrizione completata con successo",
        sessionId: sessionId,
        transcriptLength: finalTranscript.length,
        preview: finalTranscript.substring(0, 200)
      })

    } catch (error) {
      console.error("❌ Errore durante la trascrizione:", error)
      
      // In caso di errore, aggiorna lo stato a ERROR su Supabase
      const { error: errorUpdateError } = await supabaseAdmin
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

      return NextResponse.json(
        { 
          error: "Errore durante la trascrizione",
          details: error instanceof Error ? error.message : "Errore sconosciuto"
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("❌ Errore generale API transcribe:", error)
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
