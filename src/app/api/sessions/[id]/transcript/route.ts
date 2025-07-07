import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { data: sessionData, error } = await supabase
      .from('sessions')
      .select(`
        id,
        transcript,
        patients!inner (
          id,
          initials
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Error fetching session transcript:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}