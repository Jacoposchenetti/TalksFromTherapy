export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse, hasResourceAccess } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"
import { diarizeTranscript } from "@/lib/openai"

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("GET /api/sessions - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Estrai e valida parametri query
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")
    
    // STEP 3: Costruisci query sicura - SOLO sessioni dell'utente corrente
    let query = supabaseAdmin
      .from('sessions')
      .select('*, patient:patients(*)')
      .eq('userId', authResult.user!.id) // Usa l'ID dall'auth unificato
      .eq('isActive', true)
      .order('sessionDate', { ascending: false })
    
    // STEP 4: Applica filtri opzionali
    if (patientId) {
      const sanitizedPatientId = sanitizeInput(patientId)
      if (sanitizedPatientId) {
        query = query.eq('patientId', sanitizedPatientId)
      }
    }
    
    // STEP 5: Esegui query
    const { data: sessions, error } = await query
    if (error) {
      console.error('[supabaseAdmin] Sessions fetch error:', error)
      return createErrorResponse("Errore nel recupero sessioni", 500)
    }
    
    // Decripta i transcript sensibili
    const decryptedSessions = sessions?.map(session => ({
      ...session,
      transcript: decryptIfEncrypted(session.transcript)
    })) || []
    
    return createSuccessResponse(decryptedSessions)
  } catch (error) {
    console.error('Errore GET /api/sessions:', error)
    return createErrorResponse("Errore interno", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("POST /api/sessions - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Determina tipo di content
    const contentType = request.headers.get("content-type")

    // Handle JSON requests (text file uploads)
    if (contentType?.includes("application/json")) {
      const body = await request.json()
      const { patientId, title, transcript, status, metadata } = body

      // STEP 3: Validazione input
      if (!validateApiInput(body, ['patientId', 'title', 'transcript'])) {
        return createErrorResponse("Campi richiesti mancanti: patientId, title, transcript", 400)
      }

      // STEP 4: Sanitizza input
      const sanitizedPatientId = sanitizeInput(patientId)
      const sanitizedTitle = sanitizeInput(title)
      
      // STEP 5: Verifica che il paziente appartenga all'utente
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('id', sanitizedPatientId)
        .eq('userId', authResult.user!.id) // Usa l'ID dall'auth unificato
        .eq('isActive', true)
        .single()

      if (patientError || !patient) {
        console.error('[supabaseAdmin] Patient verification error:', patientError)
        return createErrorResponse("Paziente non trovato o non autorizzato", 404)
      }

      // STEP 6: Crea sessione con transcript testuale
      // Ricava nome file senza estensione (salva in variabile per uso dopo la diarizzazione)
      let fileBaseName = null;
      if (metadata && metadata.fileName) {
        fileBaseName = metadata.fileName.replace(/\.[^/.]+$/, "");
      }
      // Recupera nome paziente
      let patientName = "Paziente";
      if (sanitizedPatientId) {
        const { data: patientData } = await supabaseAdmin
          .from('patients')
          .select('name')
          .eq('id', sanitizedPatientId)
          .single();
        if (patientData && patientData.name) patientName = patientData.name;
      }
      // Titolo iniziale (può essere qualsiasi cosa, verrà sovrascritto dopo)
      let sessionTitle = sanitizedTitle || `Session - ${patientName} - ${new Date().toISOString().split('T')[0]} ${metadata?.fileType || ''}`;
      let finalTranscript = transcript;
      try {
        finalTranscript = await diarizeTranscript(transcript, sessionTitle);
      } catch (err) {
        console.warn("Diarizzazione fallita, salvo transcript base", err);
      }
      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .insert([{
          userId: authResult.user!.id, // Usa l'ID dall'auth unificato
          patientId: sanitizedPatientId,
          title: sessionTitle,
          transcript: encryptIfSensitive(finalTranscript),
          sessionDate: new Date(),
          status: status || "TRANSCRIBED",
          documentMetadata: metadata ? JSON.stringify(metadata) : null,
        }])
        .select()
        .single();
      if (sessionError) {
        console.error('[supabaseAdmin] Session creation error:', sessionError);
        return createErrorResponse("Errore nella creazione sessione", 500);
      }
      // DOPO la diarizzazione, aggiorna SEMPRE il titolo nel formato richiesto
      let forcedTitle = `Sessione - ${patientName} - ${fileBaseName || 'Documento'}`;
      await supabaseAdmin
        .from('sessions')
        .update({ title: forcedTitle })
        .eq('id', newSession.id);
      newSession.title = forcedTitle;

      // Decripta il transcript per la risposta
      const decryptedSession = {
        ...newSession,
        transcript: decryptIfEncrypted(newSession.transcript)
      }

      console.log('[supabaseAdmin] Text session created successfully:', newSession.id)
      return createSuccessResponse(decryptedSession, "Sessione creata con successo")
    }

    // STEP 7: Handle FormData requests (audio file uploads)
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const patientId = formData.get("patientId") as string
    const title = formData.get("title") as string

    // STEP 8: Validazione file upload
    if (!audioFile || !patientId || !title) {
      return createErrorResponse("Campi richiesti mancanti: audio, patientId, title", 400)
    }

    // STEP 9: Sanitizza input
    const sanitizedPatientId = sanitizeInput(patientId)
    const sanitizedTitle = sanitizeInput(title)

    // STEP 10: Verifica che il paziente appartenga all'utente
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('id', sanitizedPatientId)
      .eq('userId', authResult.user!.id) // Usa l'ID dall'auth unificato
      .eq('isActive', true)
      .single()

    if (patientError || !patient) {
      console.error('[supabaseAdmin] Patient verification error:', patientError)
      return createErrorResponse("Paziente non trovato o non autorizzato", 404)
    }

    // STEP 11: Upload del file audio su supabaseAdmin Storage
    try {
      const bytes = await audioFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const fileName = `${Date.now()}-${audioFile.name}`
      const filePath = `${authResult.user!.id}/${fileName}` // Organizza per utente con ID sicuro
      
      // Upload su supabaseAdmin Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .upload(filePath, buffer, {
          contentType: audioFile.type,
          upsert: false
        })

      if (uploadError) {
        console.error('[supabaseAdmin Storage] Upload error:', uploadError)
        return createErrorResponse(`Upload fallito: ${uploadError.message}`, 500)
      }

      // STEP 12: Genera URL per l'accesso al file
      const { data: urlData } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .createSignedUrl(filePath, 3600) // URL valido per 1 ora

      const audioUrl = urlData?.signedUrl || null

      // STEP 13: Crea record sessione
      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .insert([{
          userId: authResult.user!.id, // Usa l'ID dall'auth unificato
          patientId: sanitizedPatientId,
          title: sanitizedTitle,
          audioFileName: fileName,
          audioUrl: audioUrl,
          audioFileSize: audioFile.size,
          sessionDate: new Date(),
          status: "UPLOADED",
        }])
        .select()
        .single()

      if (sessionError) {
        console.error('[supabaseAdmin] Session creation error:', sessionError)
        return createErrorResponse("Errore nella creazione sessione", 500)
      }

      console.log('[supabaseAdmin] Audio session created successfully:', newSession.id)
      return createSuccessResponse(newSession, "Sessione audio creata con successo")
      
    } catch (uploadError) {
      console.error("Error uploading audio:", uploadError)
      return createErrorResponse("Errore nell'upload del file audio", 500)
    }

  } catch (error) {
    console.error("Error creating session:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
