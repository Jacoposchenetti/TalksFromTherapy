import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export const runtime = 'nodejs'

// GET /api/patients - Lista pazienti dell'utente autenticato
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("GET /api/patients - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Fetch pazienti usando l'ID dall'auth unificato
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[Supabase] Patients fetch error:', error)
      return createErrorResponse("Errore nel recupero pazienti", 500)
    }

    return createSuccessResponse({ patients: patients || [] })
  } catch (error) {
    console.error('Errore autenticazione API patients:', error)
    return createErrorResponse("Errore interno", 500)
  }
}

// POST /api/patients - Crea nuovo paziente
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("POST /api/patients - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Validazione e sanitizzazione input
    const body = await request.json()
    
    if (!body.initials || typeof body.initials !== 'string' || body.initials.trim() === '') {
      return createErrorResponse("Iniziali paziente richieste", 400)
    }

    // Validazione iniziali
    if (body.initials.trim().length < 2 || !/^[A-Za-z\s]+$/.test(body.initials.trim())) {
      return createErrorResponse("Le iniziali devono essere di almeno 2 caratteri e contenere solo lettere", 400)
    }

    // STEP 3: Crea nuovo paziente
    const patientData = {
      initials: body.initials.trim().toUpperCase(),
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      notes: body.notes?.trim() || null,
      userId: authResult.user!.id,
      isActive: true
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()

    if (error) {
      console.error('[Supabase] Patient insert error:', error)
      return createErrorResponse("Errore durante la creazione del paziente", 500)
    }

    return createSuccessResponse(data, "Paziente creato con successo")
  } catch (error) {
    console.error('Errore creazione paziente:', error)
    return createErrorResponse("Errore interno", 500)
  }
}
