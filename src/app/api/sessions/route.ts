import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest) {
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

  // Filtra per utente e opzionalmente per paziente
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")
  let query = supabase
    .from('sessions')
    .select('*')
    .eq('userId', userData.id)
    .eq('isActive', true)
    .order('sessionDate', { ascending: false })
  if (patientId) {
    query = query.eq('patientId', patientId)
  }
  const { data: sessions, error } = await query
  if (error) {
    console.error('[Supabase] Sessions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(sessions)
}

export async function POST(request: NextRequest) {
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

    const contentType = request.headers.get("content-type")

    // Handle JSON requests (text file uploads)
    if (contentType?.includes("application/json")) {
      const body = await request.json()
      const { patientId, title, transcript, status, metadata } = body

      if (!patientId || !title || !transcript) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        )
      }

      // Verify patient belongs to user
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .eq('userId', userData.id)
        .eq('isActive', true)
        .single()

      if (patientError || !patient) {
        console.error('[Supabase] Patient verification error:', patientError)
        return NextResponse.json({ error: "Patient not found" }, { status: 404 })
      }

      // Create session record with text transcript
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          userId: userData.id,
          patientId,
          title,
          transcript,
          sessionDate: new Date(),
          status: status || "TRANSCRIBED",
          documentMetadata: metadata ? JSON.stringify(metadata) : null,
        }])
        .select()
        .single()

      if (sessionError) {
        console.error('[Supabase] Session creation error:', sessionError)
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
      }

      console.log('[Supabase] Text session created successfully:', newSession.id)
      return NextResponse.json(newSession, { status: 201 })
    }

    // Handle FormData requests (audio file uploads)
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const patientId = formData.get("patientId") as string
    const title = formData.get("title") as string

    if (!audioFile || !patientId || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify patient belongs to user
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()

    if (patientError || !patient) {
      console.error('[Supabase] Patient verification error:', patientError)
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "audio")
    await mkdir(uploadsDir, { recursive: true })

    // Save the audio file
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const fileName = `${Date.now()}-${audioFile.name}`
    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Create session record
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        userId: userData.id,
        patientId,
        title,
        audioFileName: fileName,
        audioUrl: `/uploads/audio/${fileName}`,
        audioFileSize: audioFile.size,
        sessionDate: new Date(),
        status: "UPLOADED",
      }])
      .select()
      .single()

    if (sessionError) {
      console.error('[Supabase] Session creation error:', sessionError)
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    console.log('[Supabase] Audio session created successfully:', newSession.id)
    return NextResponse.json(newSession, { status: 201 })

  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
