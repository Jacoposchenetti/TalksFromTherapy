import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // Recupera tutte le sessioni dell'utente per debug
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        status,
        audio_file_name,
        audio_url,
        error_message,
        created_at,
        patients(id, initials)
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Errore recupero sessioni:", error)
      return NextResponse.json({
        error: "Errore durante il recupero delle sessioni",
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      totalSessions: sessions?.length || 0,
      sessions: sessions || [],
      userInfo: {
        id: session.user.id,
        email: session.user.email
      }
    })

  } catch (error) {
    console.error("Errore recupero sessioni:", error)
    return NextResponse.json({
      error: "Errore durante il recupero delle sessioni",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
  }
}
