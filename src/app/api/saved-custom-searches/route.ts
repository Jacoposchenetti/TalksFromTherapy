import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
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
      .eq('sessions.userId', userData.id)
      .not('customTopicAnalysisResults', 'is', null)
      .order('createdAt', { ascending: false })

    if (analysesError) {
      console.error('Error fetching saved searches:', analysesError)
      return NextResponse.json({ error: "Errore nel recupero delle ricerche salvate" }, { status: 500 })
    }

    const savedSearches: SavedSearch[] = []

    if (analyses) {
      for (const analysis of analyses) {
        try {
          const customResults = JSON.parse(analysis.customTopicAnalysisResults || '{}')
          
          if (customResults.searches && Array.isArray(customResults.searches)) {
            customResults.searches.forEach((search: any) => {
              savedSearches.push({
                id: `${analysis.id}_${search.timestamp}`,
                query: search.query,
                timestamp: search.timestamp,
                sessions: search.sessions || [],
                results: search.results || [],
                summary: search.summary || 'Ricerca personalizzata completata'
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

    return NextResponse.json({
      success: true,
      searches: savedSearches.slice(0, 20) // Limita a 20 ricerche più recenti
    })

  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
