import { NextRequest, NextResponse } from 'next/server'
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("GET /api/transcriptions - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Fetch transcriptions - SOLO dell'utente corrente
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, transcript, sessionDate, patientId')
      .eq('userId', authResult.user!.id) // Sicurezza: solo sessioni dell'utente
      .eq('isActive', true)
      .not('transcript', 'is', null)
      .order('sessionDate', { ascending: false })

    if (error) {
      console.error('[Supabase] Transcriptions fetch error:', error)
      return createErrorResponse("Errore nel recupero trascrizioni", 500)
    }

    return createSuccessResponse(data || [])
  } catch (error) {
    console.error('Errore GET /api/transcriptions:', error)
    return createErrorResponse("Errore interno", 500)
  }
} 