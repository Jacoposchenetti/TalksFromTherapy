import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

export const runtime = 'nodejs'

// GET /api/patients/[id] - Ottieni dettagli singolo paziente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }
    
    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID paziente non valido", 400)
    }

    const patientId = sanitizeInput(params.id)
    
    // Trova il paziente su Supabase usando l'ID utente dal sistema auth
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, initials, dateOfBirth, notes, createdAt, updatedAt')
      .eq('id', patientId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (error || !patient) {
      return createErrorResponse("Paziente non trovato", 404)
    }

    // Decripta le note se sono criptate
    const decryptedNotes = decryptIfEncrypted(patient.notes)

    return createSuccessResponse({
      ...patient,
      notes: decryptedNotes
    })
  } catch (error) {
    console.error("Errore durante il recupero paziente:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

// PUT /api/patients/[id] - Aggiorna paziente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Non autorizzato', 401)
    }

    const body = await request.json()
    const { initials, dateOfBirth, notes } = body

    // Validazione input rigorosa
    if (!validateApiInput(body, [])) { // PUT può avere body vuoto per update parziali
      return createErrorResponse('Dati di input non validi', 400)
    }

    // Verifica che il paziente esista e appartenga all'utente
    const { data: existingPatient, error: findError } = await supabase
      .from('patients')
      .select('id, userId')
      .eq('id', params.id)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (findError || !existingPatient) {
      return createErrorResponse('Paziente non trovato', 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, existingPatient.userId)) {
      return createErrorResponse('Accesso negato a questa risorsa', 403)
    }

    // Validazione e sanitizzazione avanzata
    if (initials && (sanitizeInput(initials).trim().length < 2 || !/^[A-Za-z\s]+$/.test(sanitizeInput(initials).trim()))) {
      return createErrorResponse('Le iniziali devono essere di almeno 2 caratteri e contenere solo lettere', 400)
    }
    const updateData: any = {}
    if (initials !== undefined) updateData.initials = sanitizeInput(initials).trim().toUpperCase()
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (notes !== undefined) updateData.notes = encryptIfSensitive(sanitizeInput(notes || '').trim()) || null

    const { data: patient, error: updateError } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', params.id)
      .eq('userId', authResult.user!.id) // Double check per sicurezza
      .select('id, initials, dateOfBirth, notes, createdAt, updatedAt')
      .single()

    if (updateError) {
      console.error('Errore aggiornamento paziente:', updateError)
      return createErrorResponse('Errore durante l\'aggiornamento paziente', 500)
    }

    // Decripta le note per la risposta
    const decryptedNotes = decryptIfEncrypted(patient.notes)

    return createSuccessResponse({
      ...patient,
      notes: decryptedNotes
    }, 'Paziente aggiornato con successo')
  } catch (error) {
    console.error("Errore durante l'aggiornamento paziente:", error)
    return createErrorResponse('Errore interno del server', 500)
  }
}

// DELETE /api/patients/[id] - Soft delete paziente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Non autorizzato', 401)
    }

    // Verifica che il paziente esista e appartenga all'utente
    const { data: existingPatient, error: findError } = await supabase
      .from('patients')
      .select('id, userId')
      .eq('id', params.id)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (findError || !existingPatient) {
      return createErrorResponse('Paziente non trovato', 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, existingPatient.userId)) {
      return createErrorResponse('Accesso negato a questa risorsa', 403)
    }

    // Soft delete - marca come inattivo invece di eliminare
    const { error: updateError } = await supabase
      .from('patients')
      .update({ isActive: false })
      .eq('id', params.id)
      .eq('userId', authResult.user!.id) // Double check per sicurezza

    if (updateError) {
      console.error('Errore eliminazione paziente:', updateError)
      return createErrorResponse('Errore durante l\'eliminazione paziente', 500)
    }

    return createSuccessResponse(null, 'Paziente eliminato con successo')
  } catch (error) {
    console.error("Errore durante l'eliminazione paziente:", error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
