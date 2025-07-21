import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = "talksfromtherapy"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 })
  }

  // Recupera la sessione e il path audio
  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("audioUrl")
    .eq("id", sessionId)
    .eq("isActive", true)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
  }

  if (!session.audioUrl) {
    return NextResponse.json({ error: "Audio non disponibile per questa sessione" }, { status: 404 })
  }

  // Estrai il path relativo all'interno del bucket
  let audioPath = session.audioUrl
  // Se audioUrl è un URL completo, estrai solo la parte dopo il bucket
  if (audioPath.startsWith("https://")) {
    const idx = audioPath.indexOf(BUCKET + "/")
    if (idx !== -1) {
      audioPath = audioPath.slice(idx + BUCKET.length + 1)
    }
  }

  // Genera signed URL valido 1 ora
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(audioPath, 60 * 60)

  if (signError || !signed) {
    return NextResponse.json({ error: "Errore nella generazione del signed URL" }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
} 