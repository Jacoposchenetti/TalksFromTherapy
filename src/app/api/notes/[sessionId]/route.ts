import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Versione semplificata per test - bypassa NextAuth
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🔍 Simple note API GET - sessionId received:', params.sessionId)
    console.log('🔍 Full URL:', request.url)
    
    const { data: note, error } = await supabaseAdmin
      .from('session_notes')
      .select('*')
      .eq('sessionId', params.sessionId)
      .single()

    console.log('🔍 Simple note result for sessionId', params.sessionId, ':', { note, error })

    if (error && error.code === 'PGRST116') {
      // Note not found, return empty
      return NextResponse.json({
        success: true,
        data: {
          id: null,
          content: "",
          sessionId: params.sessionId,
          createdAt: null,
          updatedAt: null,
        }
      })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: note
    })
  } catch (error) {
    console.error("Simple note API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json()
    console.log('🔍 Simple note API POST called')
    console.log('🔍 sessionId received:', params.sessionId)
    console.log('🔍 body received:', body)

    const { data: note, error } = await supabaseAdmin
      .from('session_notes')
      .upsert({
        sessionId: params.sessionId,
        content: body.content,
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'sessionId'
      })
      .select()
      .single()

    console.log('🔍 Simple note upsert result:', { note, error })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: note,
      message: "Note saved successfully"
    })
  } catch (error) {
    console.error("Simple note API POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
