import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { sessionId } = params

    // Trova l'utente su Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      console.error('[Supabase] User fetch error:', userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verifica che la sessione esista e appartenga all'utente
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, audioFileName, audioUrl, title, patient:patients(initials)')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      console.error('[Supabase] Session fetch error:', sessionError)
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    if (!sessionRecord.audioFileName) {
      return NextResponse.json({ error: "Nessun file audio per questa sessione" }, { status: 404 })
    }

    try {
      // Scarica il file da Supabase Storage
      const filePath = `${userData.id}/${sessionRecord.audioFileName}`
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('talksfromtherapy')
        .download(filePath)

      if (downloadError || !fileData) {
        console.error('[Supabase Storage] Download error:', downloadError)
        return NextResponse.json({ error: "File audio non trovato" }, { status: 404 })
      }

      // Determina il content type dal nome del file
      const fileExtension = sessionRecord.audioFileName.split('.').pop()?.toLowerCase()
      let contentType = 'audio/mpeg' // default
      
      switch (fileExtension) {
        case 'mp3':
          contentType = 'audio/mpeg'
          break
        case 'wav':
          contentType = 'audio/wav'
          break
        case 'ogg':
          contentType = 'audio/ogg'
          break
        case 'm4a':
          contentType = 'audio/mp4'
          break
      }

      // Restituisce il file audio
      return new NextResponse(fileData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${sessionRecord.audioFileName}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      })

    } catch (error) {
      console.error('Errore servizio audio:', error)
      return NextResponse.json({ 
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      }, { status: 500 })
    }
    
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
      return NextResponse.json({ error: "File audio non trovato" }, { status: 404 })
    }

  } catch (error) {
    console.error("Errore servizio audio:", error)
    return NextResponse.json({ 
      error: "Errore interno del server",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
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
