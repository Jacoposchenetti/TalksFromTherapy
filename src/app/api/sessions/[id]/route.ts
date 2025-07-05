import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const sessionId = params.id

    // Trova la sessione e verifica ownership
    const { data: sessionToDelete, error: sessionError } = await supabase
      .from('sessions')
      .select('id, audioFileName, userId')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionToDelete) {
      console.error('[Supabase] Session fetch error:', sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Elimina il file audio da Supabase Storage se esiste
    if (sessionToDelete.audioFileName) {
      try {
        const filePath = `${userData.id}/${sessionToDelete.audioFileName}`
        const { error: deleteError } = await supabase.storage
          .from('talksfromtherapy')
          .remove([filePath])
        
        if (deleteError) {
          console.warn("Could not delete audio file from storage:", deleteError)
          // Continua con l'eliminazione dal database anche se il file non può essere eliminato
        }
      } catch (fileError) {
        console.warn("Error deleting audio file:", fileError)
      }
    }

    // Soft delete della sessione (imposta isActive a false)
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ isActive: false })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Supabase] Session update error:', updateError)
      return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error deleting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const sessionId = params.id

    // Cerca la sessione con i dati del paziente
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*, patient:patients(*)')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionData) {
      console.error('[Supabase] Session fetch error:', sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const sessionId = params.id
    const body = await request.json()
    const { title, transcript } = body

    // Validate input - either title or transcript (or both) should be provided
    if (!title && !transcript) {
      return NextResponse.json({ 
        error: "Either title or transcript must be provided" 
      }, { status: 400 })
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ 
          error: "Title must be a non-empty string" 
        }, { status: 400 })
      }

      if (title.trim().length > 255) {
        return NextResponse.json({ 
          error: "Title must be less than 255 characters" 
        }, { status: 400 })
      }
    }

    // Validate transcript if provided
    if (transcript !== undefined) {
      if (typeof transcript !== 'string') {
        return NextResponse.json({ 
          error: "Transcript must be a string" 
        }, { status: 400 })
      }

      if (transcript.trim().length === 0) {
        return NextResponse.json({ 
          error: "Transcript cannot be empty" 
        }, { status: 400 })
      }
    }

    // Verify session exists and user owns it
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !existingSession) {
      console.error('[Supabase] Session verification error:', sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Update the session with provided fields
    const updateData: any = { updatedAt: new Date().toISOString() }
    
    if (title !== undefined) {
      updateData.title = title.trim()
    }
    
    if (transcript !== undefined) {
      updateData.transcript = transcript.trim()
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select('*, patient:patients(*)')
      .single()

    if (updateError) {
      console.error('[Supabase] Session update error:', updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error("Error updating session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}