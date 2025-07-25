import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"
import { visualizzaAnalisiSentimentBackend } from "@/components/sentiment-analysis";

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Funzione robusta per il parsing JSON/text
function safeJsonParse(str: string) {
  if (!str) return null;
  try {
    return JSON.parse(str)
  } catch {
    return str // fallback: restituisci la stringa grezza
  }
}

// Funzione per decodificare base64 JSON
function decodeBase64Json(str: string) {
  if (!str) return {};
  try {
    const jsonString = Buffer.from(str, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
  } catch {
    return {};
  }
}

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

    console.log('[API/analyses] GET called with sessionId:', sessionId);

    // DEBUG: Log the sessionId parameter
    console.log('[API/analyses] sessionId param:', sessionId);

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

    console.log('[API/analyses] Row fetched:', analysis);

    if (analysisError || !analysis) {
      return createSuccessResponse({ cached: false, analysis: null })
    }

    // Decodifica i campi base64 JSON per sentiment
    const z_scores = {
      joy: analysis.joy ?? 0,
      trust: analysis.trust ?? 0,
      fear: analysis.fear ?? 0,
      surprise: analysis.surprise ?? 0,
      sadness: analysis.sadness ?? 0,
      disgust: analysis.disgust ?? 0,
      anger: analysis.anger ?? 0,
      anticipation: analysis.anticipation ?? 0,
    };
    console.log('[API/analyses] z_scores:', z_scores);
    const significant_emotions = analysis.significantEmotions ? decodeBase64Json(analysis.significantEmotions) : {};
    const dominant_emotions = analysis.dominantemotions ? decodeBase64Json(analysis.dominantemotions) : [];
    const flower_plot = analysis.emotionFlowerPlot || null;

    // Decodifica i campi per topic analysis
    const keyTopics = analysis.keyTopics ? JSON.parse(decryptIfEncrypted(analysis.keyTopics)) : null;
    const topicAnalysisResult = analysis.topicAnalysisResult ? JSON.parse(decryptIfEncrypted(analysis.topicAnalysisResult)) : null;
    const customTopicAnalysisResults = analysis.customTopicAnalysisResults ? JSON.parse(decryptIfEncrypted(analysis.customTopicAnalysisResults)) : null;
    const semanticFrameResults = analysis.semanticFrameResults ? JSON.parse(decryptIfEncrypted(analysis.semanticFrameResults)) : null;

    // DEBUG: Log the decoded fields
    console.log('[API/analyses] Decoded significant_emotions:', significant_emotions);
    console.log('[API/analyses] Decoded dominant_emotions:', dominant_emotions);
    console.log('[API/analyses] Decoded keyTopics:', keyTopics);
    console.log('[API/analyses] Decoded topicAnalysisResult:', topicAnalysisResult);

    const responseData = {
      cached: true,
      analysis: {
        sentiment: {
          z_scores,
          significant_emotions,
          dominant_emotions,
          emotional_valence: analysis.emotionalValence,
          positive_score: analysis.positivescore,
          negative_score: analysis.negativescore,
          text_length: analysis.wordcount,
          sentiment_score: analysis.sentimentScore,
          flower_plot
        },
        topics: keyTopics,
        topicAnalysis: topicAnalysisResult,
        customTopics: customTopicAnalysisResults,
        semanticFrames: semanticFrameResults
      }
    }
    console.log('Sto restituendo:', JSON.stringify(responseData, null, 2));
    return createSuccessResponse(responseData)
  } catch (error) {
    console.error('[API/analyses] Uncaught error:', error);
    return createErrorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
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
        // Calcola positive/negative score se mancano
        let z_scores = analysisData.z_scores || {};
        let positive_score = analysisData.positive_score ?? ((z_scores.joy ?? 0) + (z_scores.trust ?? 0) + (z_scores.anticipation ?? 0));
        let negative_score = analysisData.negative_score ?? ((z_scores.fear ?? 0) + (z_scores.sadness ?? 0) + (z_scores.anger ?? 0) + (z_scores.disgust ?? 0));
        let word_count = analysisData.word_count ?? analysisData.text_length ?? 0;
        let dominant_emotions = analysisData.dominant_emotions ? JSON.stringify(analysisData.dominant_emotions) : null;
        updateData = {
          ...updateData,
          // Salva ogni emozione come colonna separata, come per emotionalValence
          joy: z_scores.joy ?? 0,
          trust: z_scores.trust ?? 0,
          fear: z_scores.fear ?? 0,
          surprise: z_scores.surprise ?? 0,
          sadness: z_scores.sadness ?? 0,
          disgust: z_scores.disgust ?? 0,
          anger: z_scores.anger ?? 0,
          anticipation: z_scores.anticipation ?? 0,
          emotionalValence: analysisData.emotional_valence || 0,
          sentimentScore: analysisData.sentiment_score || 0,
          significantEmotions: encryptIfSensitive(JSON.stringify(analysisData.significant_emotions || {})),
          positivescore: positive_score,
          negativescore: negative_score,
          wordcount: word_count,
          dominantemotions: dominant_emotions
        }
        break
      case 'topics':
        updateData = {
          ...updateData,
          keyTopics: encryptIfSensitive(JSON.stringify(analysisData.topics || [])),
          topicAnalysisResult: encryptIfSensitive(JSON.stringify({
            topics: analysisData.topics || [],
            summary: analysisData.summary || '',
            analysis_timestamp: analysisData.analysis_timestamp || new Date().toISOString(),
            text_segments: analysisData.text_segments || [],
            patient_content_stats: analysisData.patient_content_stats || null,
            session_id: analysisData.session_id || null,
            language: analysisData.language || 'italian',
            version: analysisData.version || '1.0.0'
          })),
          topicAnalysisTimestamp: new Date(),
          topicAnalysisVersion: analysisData.version || '1.0.0',
          topicAnalysisLanguage: analysisData.language || 'italian'
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
      // Aggiorna record esistente
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
      // Crea nuovo record
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
