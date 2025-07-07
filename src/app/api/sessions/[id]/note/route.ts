import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export const runtime = 'nodejs'

// GET /api/sessions/[id]/note - Get note for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sessionId = params.id

    // Verify session belongs to user
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('userId', user.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Find existing note
    const { data: note } = await supabase
      .from('session_notes')
      .select('*')
      .eq('sessionId', sessionId)
      .single()

    return NextResponse.json({
      id: note?.id,
      content: note?.content || "",
      sessionId: sessionId,
      createdAt: note?.createdAt,
      updatedAt: note?.updatedAt,
    })
  } catch (error) {
    console.error("Error fetching session note:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/sessions/[id]/note - Create or update note for a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sessionId = params.id
    const { content } = await request.json()

    if (typeof content !== 'string') {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify session belongs to user
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('userId', user.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Upsert note
    const { data: note, error: noteError } = await supabase
      .from('session_notes')
      .upsert({
        sessionId: sessionId,
        content: content,
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'sessionId'
      })
      .select()
      .single()

    if (noteError) {
      throw noteError
    }

    return NextResponse.json({
      id: note.id,
      content: note.content,
      sessionId: note.sessionId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })
  } catch (error) {
    console.error("Error saving session note:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
