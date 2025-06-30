import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

// GET /api/analyses?sessionId=xxx - Recupera analisi per una sessione
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }
    // Recupera l'ID utente da Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }
    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .single()
    if (sessionError || !sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }
    // Recupera l'analisi esistente
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('sessionId', sessionId)
      .single()
    if (analysisError || !analysis) {
      return NextResponse.json({ cached: false, analysis: null })
    }
    // Trasforma i dati per l'uso nel frontend
    const responseData = {
      cached: true,
      analysis: {
        // Sentiment Analysis
        sentiment: analysis.emotions ? {
          z_scores: JSON.parse(analysis.emotions),
          emotional_valence: analysis.emotionalValence,
          significant_emotions: analysis.significantEmotions ? JSON.parse(analysis.significantEmotions) : {},
          flower_plot: analysis.emotionFlowerPlot,
          sentiment_score: analysis.sentimentScore
        } : null,
        // Topic Analysis  
        topics: analysis.topicAnalysisResult ? JSON.parse(analysis.topicAnalysisResult) : null,
        // Semantic Frame Analysis
        semanticFrames: analysis.semanticFrameResults ? JSON.parse(analysis.semanticFrameResults) : {},
        // Metadata
        analysisVersion: analysis.analysisVersion,
        language: analysis.language,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
    }
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Errore nel recupero analisi:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

// POST /api/analyses - Salva o aggiorna analisi per una sessione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }
    const body = await request.json()
    const { sessionId, analysisType, analysisData } = body
    if (!sessionId || !analysisType || !analysisData) {
      return NextResponse.json({ error: "Dati richiesti mancanti" }, { status: 400 })
    }
    // Recupera l'ID utente da Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }
    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId, patientId')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .single()
    if (sessionError || !sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }
    // Prepara i dati per l'aggiornamento basati sul tipo di analisi
    let updateData: any = {
      patientId: sessionData.patientId,
      language: analysisData.language || 'italian',
      analysisVersion: '1.0.0',
      updatedAt: new Date()
    }
    switch (analysisType) {
      case 'sentiment':
        updateData = {
          ...updateData,
          emotions: JSON.stringify(analysisData.z_scores || {}),
          emotionalValence: analysisData.emotional_valence || 0,
          sentimentScore: analysisData.sentiment_score || 0,
          significantEmotions: JSON.stringify(analysisData.significant_emotions || {}),
          emotionFlowerPlot: analysisData.flower_plot || null
        }
        break
      case 'topics':
        updateData = {
          ...updateData,
          keyTopics: JSON.stringify(analysisData.topics || []),
          topicAnalysisResult: JSON.stringify(analysisData)
        }
        break
      case 'semantic_frame':
        const { target_word } = analysisData
        if (target_word) {
          // Recupera risultati esistenti
          const { data: existingAnalysis } = await supabase
            .from('analyses')
            .select('semanticFrameResults')
            .eq('sessionId', sessionId)
            .single()
          let existingFrames = {}
          if (existingAnalysis?.semanticFrameResults) {
            try {
              existingFrames = JSON.parse(existingAnalysis.semanticFrameResults)
            } catch (e) {
              console.error("Errore parsing semantic frames esistenti:", e)
            }
          }
          existingFrames[target_word] = analysisData
          updateData = {
            ...updateData,
            semanticFrameResults: JSON.stringify(existingFrames)
          }
        }
        break
      default:
        return NextResponse.json({ error: "Tipo di analisi non supportato" }, { status: 400 })
    }
    // Upsert dell'analisi (crea se non esiste, aggiorna se esiste)
    // Prima controlla se esiste già
    const { data: existing, error: existingError } = await supabase
      .from('analyses')
      .select('id')
      .eq('sessionId', sessionId)
      .single()
    let analysisId = null
    if (existing && existing.id) {
      // Aggiorna
      const { data: updated, error: updateError } = await supabase
        .from('analyses')
        .update(updateData)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (updateError) {
        return NextResponse.json({ error: "Errore durante l'aggiornamento analisi" }, { status: 500 })
      }
      analysisId = updated.id
    } else {
      // Crea
      const { data: created, error: createError } = await supabase
        .from('analyses')
        .insert([{ sessionId, ...updateData }])
        .select('id')
        .single()
      if (createError) {
        return NextResponse.json({ error: "Errore durante la creazione analisi" }, { status: 500 })
      }
      analysisId = created.id
    }
    return NextResponse.json({ 
      success: true, 
      analysisId,
      message: "Analisi salvata con successo"
    })
  } catch (error) {
    console.error("Errore nel salvataggio analisi:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

// DELETE /api/analyses?sessionId=xxx&analysisType=xxx - Cancella un tipo specifico di analisi
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }
    // Recupera l'ID utente da Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (userError || !userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }
    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', userData.id)
      .single()
    if (sessionError || !sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }
    // Cancella l'analisi
    const { error: deleteError } = await supabase
      .from('analyses')
      .delete()
      .eq('sessionId', sessionId)
    if (deleteError) {
      return NextResponse.json({ error: "Errore durante la cancellazione analisi" }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: "Analisi cancellata con successo" })
  } catch (error) {
    console.error("Errore nella cancellazione analisi:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
