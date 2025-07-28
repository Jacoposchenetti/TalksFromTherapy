// src/app/api/gdpr/delete-data/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    const { sessionIds, deleteType } = await request.json()

    // Validate request
    if (!sessionIds || !Array.isArray(sessionIds)) {
      return createErrorResponse("ID sessioni non validi", 400)
    }

    // Get sessions to delete with all related data
    const { data: sessionsToDelete, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, audioFileName, userId')
      .in('id', sessionIds)
      .eq('userId', authResult.user!.id)

    if (fetchError || !sessionsToDelete?.length) {
      return createErrorResponse("Sessioni non trovate", 404)
    }

    let deletedCount = 0
    let errors: string[] = []

    for (const session of sessionsToDelete) {
      try {
        // 1. Delete audio file from storage
        if (session.audioFileName) {
          const filePath = `${authResult.user!.id}/${session.audioFileName}`
          await supabaseAdmin.storage
            .from('talksfromtherapy')
            .remove([filePath])
        }

        // 2. Delete related chat messages
        await supabaseAdmin
          .from('chat_messages')
          .delete()
          .in('chat_id', 
            supabaseAdmin
              .from('analysis_chats')
              .select('id')
              .eq('user_id', authResult.user!.id)
              .contains('session_ids', [session.id])
          )

        // 3. Delete analysis chats
        await supabaseAdmin
          .from('analysis_chats')
          .delete()
          .eq('user_id', authResult.user!.id)
          .contains('session_ids', [session.id])

        // 4. Delete session notes
        await supabaseAdmin
          .from('session_notes')
          .delete()
          .eq('session_id', session.id)

        // 5. Hard delete session
        const { error: deleteError } = await supabaseAdmin
          .from('sessions')
          .delete()
          .eq('id', session.id)
          .eq('userId', authResult.user!.id)

        if (deleteError) throw deleteError

        // 6. Log GDPR compliance
        await supabaseAdmin
          .from('gdpr_deletion_log')
          .insert({
            user_id: authResult.user!.id,
            session_id: session.id,
            deletion_type: deleteType || 'gdpr_immediate',
            data_categories: ['session_data', 'transcript', 'audio_file', 'analysis_data'],
            legal_basis: 'GDPR Art. 17 - Right to erasure (immediate)',
            performed_by: authResult.user!.id
          })

        deletedCount++

      } catch (error) {
        console.error(`Error deleting session ${session.id}:`, error)
        errors.push(`Sessione ${session.id}: ${error}`)
      }
    }

    if (errors.length > 0) {
      return createErrorResponse(
        `Eliminate ${deletedCount} sessioni. Errori: ${errors.join(', ')}`, 
        207 // Multi-status
      )
    }

    return createSuccessResponse({
      deletedCount,
      message: "Tutti i dati sono stati eliminati definitivamente dal sistema",
      gdprCompliance: "Conforme all'Art. 17 GDPR - Diritto alla cancellazione"
    })

  } catch (error) {
    console.error("Error in GDPR hard delete:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
