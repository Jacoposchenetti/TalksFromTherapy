import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // SECURITY WARNING: This is a debug endpoint - should be restricted in production
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_API !== 'true') {
      return createErrorResponse("Debug API non disponibile in produzione", 403)
    }

    console.log("GET /api/debug-sessions - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Recupera SOLO le sessioni dell'utente corrente (no data leaking)
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        status,
        audio_file_name,
        created_at,
        patients(id, initials)
      `)
      .eq('user_id', authResult.user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50) // SECURITY: Limit results

    if (error) {
      console.error("Errore recupero sessioni:", error)
      return createErrorResponse("Errore durante il recupero delle sessioni", 500)
    }

    return createSuccessResponse({
      totalSessions: sessions?.length || 0,
      sessions: sessions || [],
      userInfo: {
        id: authResult.user!.id,
        email: authResult.user!.email
      }
    })

  } catch (error) {
    console.error("Errore recupero sessioni:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
