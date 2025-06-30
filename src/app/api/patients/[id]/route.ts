import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export const runtime = 'nodejs'

// GET /api/patients/[id] - Ottieni dettagli singolo paziente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }
    // Recupera l'ID utente da Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      )
    }
    // Trova il paziente su Supabase
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, initials, dateOfBirth, notes, createdAt, updatedAt')
      .eq('id', params.id)
      .eq('userId', userData.id)
      .eq('isActive', true)
      .single()
    if (error || !patient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }
    return NextResponse.json(patient)
  } catch (error) {
    console.error("Errore durante il recupero paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[id] - Aggiorna paziente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }
    const { initials, dateOfBirth, notes } = await request.json()
    // Verifica che il paziente esista e appartenga all'utente
    const { data: existingPatient, error: findError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', params.id)
      .eq('userId', session.user.email ? undefined : null)
      .eq('isActive', true)
      .single()
    if (findError || !existingPatient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }
    // Validazione
    if (initials && (initials.trim().length < 2 || !/^[A-Za-z\s]+$/.test(initials.trim()))) {
      return NextResponse.json(
        { error: "Le iniziali devono essere di almeno 2 caratteri e contenere solo lettere" },
        { status: 400 }
      )
    }
    const updateData: any = {}
    if (initials !== undefined) updateData.initials = initials.trim().toUpperCase()
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    const { data: patient, error: updateError } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', params.id)
      .select('id, initials, dateOfBirth, notes, createdAt, updatedAt')
      .single()
    if (updateError) {
      return NextResponse.json(
        { error: "Errore durante l'aggiornamento paziente" },
        { status: 500 }
      )
    }
    return NextResponse.json({
      message: "Paziente aggiornato con successo",
      patient
    })
  } catch (error) {
    console.error("Errore durante l'aggiornamento paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[id] - Soft delete paziente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }
    // Verifica che il paziente esista e appartenga all'utente
    const { data: existingPatient, error: findError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', params.id)
      .eq('userId', session.user.email ? undefined : null)
      .eq('isActive', true)
      .single()
    if (findError || !existingPatient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }
    // Soft delete - marca come inattivo invece di eliminare
    const { error: updateError } = await supabase
      .from('patients')
      .update({ isActive: false })
      .eq('id', params.id)
    if (updateError) {
      return NextResponse.json(
        { error: "Errore durante l'eliminazione paziente" },
        { status: 500 }
      )
    }
    return NextResponse.json({
      message: "Paziente eliminato con successo"
    })
  } catch (error) {
    console.error("Errore durante l'eliminazione paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
