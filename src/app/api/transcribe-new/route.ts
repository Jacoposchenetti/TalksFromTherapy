import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { transcribeAudio, diarizeTranscript } from "@/lib/openai"
import { CreditsService } from "@/lib/credits-service"

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'

// POST /api/transcribe-new - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("🚀🚀🚀 POST /api/transcribe-new - VERSIONE NUOVA - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Verifica crediti prima di procedere
    const creditsService = new CreditsService()
    const requiredCredits = 5 // Trascrizione costa 5 crediti
    
    try {
      const userCredits = await creditsService.getUserCredits(authResult.user!.id)
      if (userCredits.credits_balance < requiredCredits) {
        return createErrorResponse(
          `Crediti insufficienti. Richiesti: ${requiredCredits}, Disponibili: ${userCredits.credits_balance}`, 
          402 // Payment Required
        )
      }
      console.log(`✅ Crediti sufficienti: ${userCredits.credits_balance} >= ${requiredCredits}`)
    } catch (creditsError) {
      console.error("❌ Errore verifica crediti:", creditsError)
      return createErrorResponse("Errore nella verifica crediti", 500)
    }

    // STEP 3: Validazione input
    const requestData = await request.json()
    
    if (!validateApiInput(requestData, ['sessionId'])) {
      return createErrorResponse("Dati richiesta non validi - sessionId richiesto", 400)
    }

    const sessionId = sanitizeInput(requestData.sessionId)
    console.log("🔍 Dati validati:", { sessionId })

    console.log(`🔍 Ricerca sessione con ID: ${sessionId}`)
    console.log(`👤 User ID: ${authResult.user!.id}`)

    // STEP 4: Verifica accesso alla risorsa
    const { data: sessionRecord, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId, status, audioFileName, audioUrl, title, isAutoDelete')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    console.log("📊 Query Supabase completata", { 
      found: !!sessionRecord, 
      sessionId,
      status: sessionRecord?.status,
      audioFileName: sessionRecord?.audioFileName,
      title: sessionRecord?.title,
      isAutoDelete: sessionRecord?.isAutoDelete,
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

    console.log(`🔄 Aggiornamento stato a TRANSCRIBING...`)

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
        { error: "Errore nell'aggiornamento dello stato sessione" },
        { status: 500 }
      )
    }

    console.log(`✅ Stato aggiornato a TRANSCRIBING`)

    try {
      // Scarica il file audio da Supabase Storage
      const filePath = `${sessionRecord.userId}/${sessionRecord.audioFileName}`
      
      console.log(`🚀 DOWNLOAD FILE AUDIO DA SUPABASE STORAGE:`)
      console.log(`   📁 Bucket: talksfromtherapy`)
      console.log(`   📂 Path: ${filePath}`)
      console.log(`   👤 User ID: ${sessionRecord.userId}`)
      console.log(`   🎵 Audio File Name: ${sessionRecord.audioFileName}`)
      
      // Prima verifichiamo se il file esiste
      console.log(`🔍 VERIFICA ESISTENZA FILE...`)
      const { data: listData, error: listError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .list(sessionRecord.userId, {
          limit: 100,
          search: sessionRecord.audioFileName
        })
      
      console.log(`📋 RISULTATO VERIFICA:`)
      console.log(`   ❌ List Error:`, listError)
      console.log(`   📊 Files found:`, listData?.length || 0)
      if (listData && listData.length > 0) {
        console.log(`   📄 File details for session ${sessionId}:`, {
          name: listData[0].name,
          size: listData[0].metadata?.size,
          lastModified: listData[0].updated_at,
          contentType: listData[0].metadata?.mimetype
        })
        
        // Lista TUTTI i file per capire se ci sono duplicati
        console.log(`🗂️ TUTTI I FILE NELLA CARTELLA UTENTE:`)
        listData.forEach((file, index) => {
          console.log(`   File ${index + 1}: ${file.name} (${file.metadata?.size} bytes, modified: ${file.updated_at})`)
        })
      }
      
      if (listError) {
        throw new Error(`Errore nella verifica esistenza file: ${JSON.stringify(listError)}`)
      }
      
      if (!listData || listData.length === 0) {
        throw new Error(`File non trovato nel bucket. Path cercato: ${filePath}`)
      }
      
      console.log(`✅ File trovato! Procedo con il download...`)
      
      // Scarica il file da Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .download(filePath)

      console.log(`📥 RISULTATO DOWNLOAD:`)
      console.log(`   ❌ Download Error:`, downloadError)
      console.log(`   📄 File Data:`, fileData ? `Blob (${fileData.size} bytes)` : 'null')

      if (downloadError || !fileData) {
        throw new Error(`Errore download file da Supabase Storage: ${JSON.stringify(downloadError)}`)
      }
      
      console.log(`✅ File scaricato con successo, dimensione: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Converte il blob in buffer per OpenAI
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Calcola hash del file per verificare univocità
      const crypto = require('crypto')
      const fileHash = crypto.createHash('md5').update(buffer).digest('hex')
      console.log(`🔐 File hash (MD5): ${fileHash} - SessionID: ${sessionId}`)
      
      // Step 1: Utilizza OpenAI Whisper per la trascrizione iniziale
      console.log(`� Step 5: Avvio trascrizione con OpenAI Whisper...`)
      console.log(`📝 Buffer size: ${buffer.length} bytes`)
      console.log(`📝 File name: ${sessionRecord.audioFileName}`)
      console.log(`�📝 Step 1: Trascrizione iniziale con Whisper...`)
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

      // STEP 5: Deduci crediti dopo successo completamento
      try {
        const newBalance = await creditsService.deductCredits(
          authResult.user!.id,
          'TRANSCRIPTION', // CreditFeature
          'Trascrizione audio completata',
          sessionId // referenceId
        )
        console.log(`💳 Crediti dedotti: 5. Nuovo saldo: ${newBalance}`)
      } catch (creditsError) {
        console.error("⚠️ Errore deduzione crediti (trascrizione completata):", creditsError)
        // Non bloccare la risposta, la trascrizione è già stata salvata
      }

      // STEP 6: Auto-eliminazione FILE AUDIO (mantieni sessione) se è una registrazione
      if (sessionRecord.isAutoDelete) {
        console.log(`🗑️ Auto-eliminazione FILE AUDIO avviata per sessione registrata: ${sessionId}`)
        console.log(`📋 La sessione rimarrà visibile con trascrizione e analisi`)
        
        try {
          // Elimina SOLO il file audio da Supabase Storage
          const filePath = `${sessionRecord.userId}/${sessionRecord.audioFileName}`
          const { error: deleteFileError } = await supabaseAdmin.storage
            .from('talksfromtherapy')
            .remove([filePath])
          
          if (deleteFileError) {
            console.error(`❌ Errore eliminazione file audio: ${deleteFileError.message}`)
          } else {
            console.log(`✅ File audio eliminato: ${filePath}`)
          }

          // Aggiorna la sessione per segnare che l'audio è stato eliminato
          const { error: updateSessionError } = await supabaseAdmin
            .from('sessions')
            .update({ 
              audioFileName: null,
              isAutoDelete: false // Reset flag ora che l'audio è stato eliminato
            })
            .eq('id', sessionId)
          
          if (updateSessionError) {
            console.error(`❌ Errore aggiornamento sessione: ${updateSessionError.message}`)
          } else {
            console.log(`✅ Sessione aggiornata: audio eliminato, trascrizione mantenuta ${sessionId}`)
          }
        } catch (deleteError) {
          console.error(`❌ Errore durante auto-eliminazione audio:`, deleteError)
          // Non bloccare la risposta anche se l'eliminazione fallisce
        }
      }

      console.log(`✅ Processo completo (trascrizione${finalTranscript === initialTranscript ? '' : ' + diarizzazione'}) completato per sessione ${sessionId}`)

      return NextResponse.json({
        message: `Trascrizione${finalTranscript === initialTranscript ? '' : ' e diarizzazione'} completate con successo${sessionRecord.isAutoDelete ? ' - Registrazione eliminata automaticamente' : ''}`,
        sessionId,
        status: "TRANSCRIBED",
        transcript: finalTranscript,
        initialTranscriptLength: initialTranscript.length,
        finalTranscriptLength: finalTranscript.length,
        fileSize: fileData.size,
        fileName: sessionRecord.audioFileName,
        diarizationSuccessful: finalTranscript !== initialTranscript,
        autoDeleted: sessionRecord.isAutoDelete
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
