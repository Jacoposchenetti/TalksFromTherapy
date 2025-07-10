import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, sanitizeInput, createErrorResponse, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { createReadStream, statSync } from "fs"
import { join } from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // STEP 2: Sanitizza sessionId
    const sessionId = sanitizeInput(params.sessionId)
    
    if (!sessionId) {
      return createErrorResponse("SessionId non valido", 400)
    }

    console.log("GET /api/audio - Richiesta autorizzata", { 
      userId: authResult.user?.id,
      sessionId 
    })

    // STEP 3: Verifica accesso alla risorsa
    const { data: sessionRecord, error } = await supabase
      .from('sessions')
      .select(`
        id,
        userId,
        audioFileName,
        audioUrl,
        title,
        patients!inner (
          initials
        )
      `)
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id) // FIX: era session.user.id
      .eq('isActive', true)
      .single()

    if (error || !sessionRecord) {
      return createErrorResponse("Sessione non trovata", 404) // FIX: response sicura
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionRecord.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    if (!sessionRecord.audioFileName) {
      return createErrorResponse("Nessun file audio per questa sessione", 404) // FIX: response sicura
    }

    // Costruisce il percorso del file audio
    const audioFilePath = join(process.cwd(), "uploads", "audio", sessionRecord.audioFileName)
    
    try {
      const stats = statSync(audioFilePath)
      const fileSize = stats.size
      
      // Gestione range requests per streaming
      const range = request.headers.get('range')
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = (end - start) + 1
        
        const stream = createReadStream(audioFilePath, { start, end })
        
        return new Response(stream as any, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': getAudioMimeType(sessionRecord.audioFileName),
            'Cache-Control': 'public, max-age=3600'
          }
        })
      } else {
        // Risposta completa
        const stream = createReadStream(audioFilePath)
        
        return new Response(stream as any, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': getAudioMimeType(sessionRecord.audioFileName),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      
    } catch (fileError) {
      console.error(`File audio non trovato: ${audioFilePath}`, fileError)
      return createErrorResponse("File audio non trovato", 404) // FIX: response sicura
    }

  } catch (error) {
    console.error("Errore servizio audio:", error)
    return createErrorResponse("Errore interno del server", 500) // FIX: response sicura
  }
}

function getAudioMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'm4a':
      return 'audio/mp4'
    case 'ogg':
      return 'audio/ogg'
    case 'flac':
      return 'audio/flac'
    case 'aac':
      return 'audio/aac'
    default:
      return 'audio/mpeg' // Default fallback
  }
}
