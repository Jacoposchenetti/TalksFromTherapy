import { NextRequest, NextResponse } from 'next/server'
import { verifyApiAuth, createErrorResponse, createSuccessResponse, validateApiInput } from "@/lib/auth-utils"
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("GET /api/transcription-jobs - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Fetch transcription jobs - SOLO dell'utente corrente
    const { data, error } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('userId', authResult.user!.id) // Sicurezza: solo jobs dell'utente
      .order('startedAt', { ascending: false })

    if (error) {
      console.error('[Supabase] Transcription jobs fetch error:', error)
      return createErrorResponse("Errore nel recupero job trascrizione", 500)
    }

    return createSuccessResponse(data || [])
  } catch (error) {
    console.error('Errore GET /api/transcription-jobs:', error)
    return createErrorResponse("Errore interno", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // STEP 2: Validazione input
    const body = await request.json()
    
    if (!validateApiInput(body, ['sessionId', 'status'])) {
      return createErrorResponse("Dati richiesti mancanti", 400)
    }

    console.log("POST /api/transcription-jobs - Job creation", { 
      userId: authResult.user?.id,
      sessionId: body.sessionId 
    })

    // STEP 3: Aggiungi userId per sicurezza
    const jobData = {
      ...body,
      userId: authResult.user!.id, // Assicura che il job sia legato all'utente
      startedAt: new Date().toISOString()
    }

    // STEP 4: Inserisci nel database
    const { data, error } = await supabase
      .from('transcription_jobs')
      .insert([jobData])
      .select()

    if (error) {
      console.error('[Supabase] Transcription job creation error:', error)
      return createErrorResponse("Errore nella creazione job trascrizione", 500)
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Errore POST /api/transcription-jobs:', error)
    return createErrorResponse("Errore interno", 500)
  }
} 