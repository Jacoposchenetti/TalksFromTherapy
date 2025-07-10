import { NextRequest, NextResponse } from 'next/server'
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from '@/lib/supabase'

interface SavedSearch {
  id: string
  query: string
  timestamp: string
  sessions: Array<{ id: string; title: string }>
  results: Array<{
    topic: string
    relevantSegments: Array<{ text: string; confidence: number }>
    totalMatches: number
    confidence: number
  }>
  summary: string
}

export async function GET(request: NextRequest) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Recupera tutte le analisi con ricerche custom salvate dell'utente
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select(`
        id,
        customTopicAnalysisResults,
        createdAt,
        sessions!inner (
          id,
          title,
          userId
        )
      `)
      .eq('sessions.userId', authResult.user!.id)
      .not('customTopicAnalysisResults', 'is', null)
      .order('createdAt', { ascending: false })

    if (analysesError) {
      console.error('Error fetching saved searches:', analysesError)
      return createErrorResponse("Errore nel recupero delle ricerche salvate", 500)
    }

    const savedSearches: SavedSearch[] = []

    if (analyses) {
      for (const analysis of analyses) {
        try {
          const customResults = JSON.parse(analysis.customTopicAnalysisResults || '{}')
          
          // Verifica accesso alla sessione
          if (analysis.sessions && Array.isArray(analysis.sessions) && analysis.sessions.length > 0) {
            const session = analysis.sessions[0]
            if (session.userId && !hasResourceAccess(authResult.user!.id, session.userId)) {
              continue // Salta questa analisi se non ha accesso
            }
          }
          
          if (customResults.searches && Array.isArray(customResults.searches)) {
            customResults.searches.forEach((search: any) => {
              savedSearches.push({
                id: sanitizeInput(`${analysis.id}_${search.timestamp}`),
                query: sanitizeInput(search.query || ''),
                timestamp: search.timestamp,
                sessions: search.sessions || [],
                results: search.results || [],
                summary: sanitizeInput(search.summary || 'Ricerca personalizzata completata')
              })
            })
          }
        } catch (parseError) {
          console.error('Error parsing custom topic results:', parseError)
        }
      }
    }

    // Ordina per timestamp decrescente
    savedSearches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return createSuccessResponse({
      searches: savedSearches.slice(0, 20) // Limita a 20 ricerche più recenti
    })

  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
