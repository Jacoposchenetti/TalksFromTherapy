import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/analyses?sessionId=xxx - Recupera analisi per una sessione
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione input
    const { searchParams } = new URL(request.url)
    const sessionId = sanitizeInput(searchParams.get('sessionId') || '')
    
    if (!validateApiInput({ sessionId }, ['sessionId'])) {
      return createErrorResponse("sessionId richiesto", 400)
    }

    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .single()

    if (sessionError || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Recupera l'analisi esistente
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('sessionId', sessionId)
      .single()

    if (analysisError || !analysis) {
      return createSuccessResponse({ cached: false, analysis: null })
    }

    // Trasforma i dati per l'uso nel frontend
    const responseData = {
      cached: true,
      analysis: {
        // Sentiment Analysis
        sentiment: analysis.emotions ? {
          z_scores: JSON.parse(decryptIfEncrypted(analysis.emotions) || '{}'),
          emotional_valence: analysis.emotionalValence,
          significant_emotions: analysis.significantEmotions ? JSON.parse(decryptIfEncrypted(analysis.significantEmotions) || '{}') : {},
          flower_plot: decryptIfEncrypted(analysis.emotionFlowerPlot),
          sentiment_score: analysis.sentimentScore
        } : null,
        // Topic Analysis  
        topics: analysis.topicAnalysisResult ? JSON.parse(decryptIfEncrypted(analysis.topicAnalysisResult) || 'null') : null,
        // Custom Topic Searches
        customTopicSearches: analysis.customTopicAnalysisResults ? 
          JSON.parse(decryptIfEncrypted(analysis.customTopicAnalysisResults) || '{}').searches || [] : [],
        // Semantic Frame Analysis
        semanticFrames: analysis.semanticFrameResults ? JSON.parse(decryptIfEncrypted(analysis.semanticFrameResults) || '{}') : {},
        // Metadata
        analysisVersion: analysis.analysisVersion,
        language: analysis.language,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
    }

    return createSuccessResponse(responseData)
  } catch (error) {
    console.error("Errore nel recupero analisi:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

// POST /api/analyses - Salva o aggiorna analisi per una sessione
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione input
    const body = await request.json()
    const { sessionId, analysisType, analysisData } = body
    
    const sanitizedSessionId = sanitizeInput(sessionId || '')
    const sanitizedAnalysisType = sanitizeInput(analysisType || '')
    
    if (!validateApiInput({ sessionId: sanitizedSessionId, analysisType: sanitizedAnalysisType, analysisData }, ['sessionId', 'analysisType', 'analysisData'])) {
      return createErrorResponse("Dati richiesti mancanti", 400)
    }

    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId, patientId')
      .eq('id', sanitizedSessionId)
      .eq('userId', authResult.user!.id)
      .single()

    if (sessionError || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Prepara i dati per l'aggiornamento basati sul tipo di analisi
    let updateData: any = {
      patientId: sessionData.patientId,
      language: analysisData.language || 'italian',
      analysisVersion: '1.0.0',
      updatedAt: new Date()
    }

    switch (sanitizedAnalysisType) {
      case 'sentiment':
        updateData = {
          ...updateData,
          emotions: encryptIfSensitive(JSON.stringify(analysisData.z_scores || {})),
          emotionalValence: analysisData.emotional_valence || 0,
          sentimentScore: analysisData.sentiment_score || 0,
          significantEmotions: encryptIfSensitive(JSON.stringify(analysisData.significant_emotions || {})),
          emotionFlowerPlot: encryptIfSensitive(analysisData.flower_plot || null)
        }
        break
      case 'topics':
        updateData = {
          ...updateData,
          keyTopics: encryptIfSensitive(JSON.stringify(analysisData.topics || [])),
          topicAnalysisResult: encryptIfSensitive(JSON.stringify(analysisData))
        }
        break
      case 'custom_topics':
        // Per i topic personalizzati, aggiungiamo alla lista esistente
        const { data: existingCustomAnalysis } = await supabaseAdmin
          .from('analyses')
          .select('customTopicAnalysisResults')
          .eq('sessionId', sanitizedSessionId)
          .single()
        
        let existingCustomSearches = []
        if (existingCustomAnalysis?.customTopicAnalysisResults) {
          try {
            const decryptedData = decryptIfEncrypted(existingCustomAnalysis.customTopicAnalysisResults)
            const parsed = JSON.parse(decryptedData || '{}')
            existingCustomSearches = parsed.searches || []
          } catch (e) {
            console.error("Errore parsing custom topic searches esistenti:", e)
          }
        }
        
        // Aggiungi la nuova ricerca
        const newSearch = {
          query: analysisData.query,
          timestamp: new Date().toISOString(),
          results: analysisData.results || []
        }
        existingCustomSearches.push(newSearch)
        
        updateData = {
          ...updateData,
          customTopicAnalysisResults: encryptIfSensitive(JSON.stringify({
            searches: existingCustomSearches
          }))
        }
        break
      case 'semantic_frame':
        const { target_word } = analysisData
        if (target_word) {
          // Recupera risultati esistenti
          const { data: existingAnalysis } = await supabaseAdmin
            .from('analyses')
            .select('semanticFrameResults')
            .eq('sessionId', sanitizedSessionId)
            .single()
          let existingFrames = {}
          if (existingAnalysis?.semanticFrameResults) {
            try {
              const decryptedData = decryptIfEncrypted(existingAnalysis.semanticFrameResults)
              existingFrames = JSON.parse(decryptedData || '{}')
            } catch (e) {
              console.error("Errore parsing semantic frames esistenti:", e)
            }
          }
          existingFrames[target_word] = analysisData
          updateData = {
            ...updateData,
            semanticFrameResults: encryptIfSensitive(JSON.stringify(existingFrames))
          }
        }
        break
      default:
        return createErrorResponse("Tipo di analisi non supportato. Tipi supportati: sentiment, topics, custom_topics, semantic_frame", 400)
    }

    // Upsert dell'analisi (crea se non esiste, aggiorna se esiste)
    // Prima controlla se esiste già
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('analyses')
      .select('id')
      .eq('sessionId', sanitizedSessionId)
      .single()

    let analysisId = null
    if (existing && existing.id) {
      // Aggiorna
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('analyses')
        .update(updateData)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (updateError) {
        return createErrorResponse("Errore durante l'aggiornamento analisi", 500)
      }
      analysisId = updated.id
    } else {
      // Crea
      const { data: created, error: createError } = await supabaseAdmin
        .from('analyses')
        .insert([{ sessionId: sanitizedSessionId, ...updateData }])
        .select('id')
        .single()
      if (createError) {
        return createErrorResponse("Errore durante la creazione analisi", 500)
      }
      analysisId = created.id
    }

    return createSuccessResponse({ 
      success: true, 
      analysisId,
      message: "Analisi salvata con successo"
    })
  } catch (error) {
    console.error("Errore nel salvataggio analisi:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

// DELETE /api/analyses?sessionId=xxx&analysisType=xxx - Cancella un tipo specifico di analisi
export async function DELETE(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione input
    const { searchParams } = new URL(request.url)
    const sessionId = sanitizeInput(searchParams.get('sessionId') || '')
    
    if (!validateApiInput({ sessionId }, ['sessionId'])) {
      return createErrorResponse("sessionId richiesto", 400)
    }

    // Verifica che la sessione appartenga all'utente
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .single()

    if (sessionError || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Cancella l'analisi
    const { error: deleteError } = await supabaseAdmin
      .from('analyses')
      .delete()
      .eq('sessionId', sessionId)

    if (deleteError) {
      return createErrorResponse("Errore durante la cancellazione analisi", 500)
    }

    return createSuccessResponse({ success: true, message: "Analisi cancellata con successo" })
  } catch (error) {
    console.error("Errore nella cancellazione analisi:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
