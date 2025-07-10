import { NextRequest, NextResponse } from 'next/server'
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CustomTopicSearchRequest {
  sessionIds: string[]
  customTopics: string[]
}

// Funzione per classificare direttamente senza fetch interno
async function classifyTextForTopic(sentences: string[], topic: string, sessionId: string) {
  const prompt = `Classifica ogni frase del testo per trovare segmenti relativi al topic specifico.

TOPIC DA CERCARE: "${topic}"

FRASI DA CLASSIFICARE:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

ISTRUZIONI:
1. Assegna topic_id = 1 SOLO alle frasi che sono CHIARAMENTE e SPECIFICAMENTE collegate al topic "${topic}"
2. Usa topic_id = null per tutte le altre frasi
3. Confidence alta (>0.7) solo se sei MOLTO sicuro della connessione
4. Confidence media (0.4-0.7) per connessioni probabili
5. Confidence bassa (<0.4) per connessioni deboli
6. PREFERISCI null piuttosto che classificazioni incerte

Rispondi SOLO con JSON:
{"classifications": [
  {"sentence_id": 1, "topic_id": 1, "confidence": 0.9, "text": "testo_frase"},
  {"sentence_id": 2, "topic_id": null, "confidence": 0.1, "text": "testo_frase"}
]}`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Sei un esperto analista di testi terapeutici. Classifica con precisione le frasi in base ai topic richiesti."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    if (parsed.classifications && Array.isArray(parsed.classifications)) {
      return parsed.classifications.map((cls: any) => ({
        text: cls.text || sentences[cls.sentence_id - 1] || '',
        topic_id: cls.topic_id,
        confidence: cls.confidence || 0
      }))
    }
    
    return []
  } catch (error) {
    console.error('Errore nella classificazione OpenAI:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    const body = await request.json()
    const { sessionIds, customTopics }: CustomTopicSearchRequest = body

    // Validazione input rigorosa
    if (!validateApiInput(body, ['sessionIds', 'customTopics'])) {
      return createErrorResponse("SessionIds e customTopics sono richiesti", 400)
    }

    if (!sessionIds || sessionIds.length === 0) {
      return createErrorResponse("Nessuna sessione selezionata", 400)
    }

    if (!customTopics || customTopics.length === 0) {
      return createErrorResponse("Nessun topic personalizzato specificato", 400)
    }

    // Fetch sessions and their transcripts
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, transcript, status, createdAt, patientId')
      .in('id', sessionIds)
      .eq('userId', authResult.user!.id)

    if (sessionsError) {
      return createErrorResponse("Errore nel recupero delle sessioni", 500)
    }

    if (!sessions || sessions.length === 0) {
      return createErrorResponse("Nessuna trascrizione trovata per le sessioni selezionate", 404)
    }

    // Filter out sessions without transcripts
    const validSessions = sessions.filter(session => 
      session.transcript && typeof session.transcript === 'string' && session.transcript.trim().length > 0
    )

    if (validSessions.length === 0) {
      return createErrorResponse("Nessuna trascrizione valida trovata", 404)
    }

    // Decripta i transcript e combina le trascrizioni
    const combinedTranscript = validSessions
      .map(session => {
        const decryptedTranscript = decryptIfEncrypted(session.transcript)
        return `--- ${session.title} ---\n${decryptedTranscript}`
      })
      .join('\n\n')

    // Usa l'endpoint classify-text-segments per cercare i topic personalizzati
    const topicSearchResults = []

    for (const customTopic of customTopics) {
      console.log(`Cercando topic personalizzato: "${customTopic}"`)
      
      let attempt = 0
      const maxAttempts = 2
      let success = false
      
      while (attempt < maxAttempts && !success) {
        try {
          // Dividi il testo in frasi per la classificazione
          const sentences = combinedTranscript
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 15)

          console.log(`Classificando ${sentences.slice(0, 30).length} frasi per topic: "${customTopic}"`)

          // Usa la funzione diretta invece della fetch
          const classifications = await classifyTextForTopic(
            sentences.slice(0, 30), 
            customTopic, 
            `custom_search_${Date.now()}_attempt_${attempt}`
          )

          const relevantSegments = classifications.filter((segment: any) => 
            segment.topic_id === 1 && segment.confidence > 0.4
          )

          console.log(`Trovati ${relevantSegments.length} segmenti rilevanti per "${customTopic}"`)

          topicSearchResults.push({
            topic: customTopic,
            relevantSegments: relevantSegments,
            totalMatches: relevantSegments.length,
            confidence: relevantSegments.length > 0 ? 
              relevantSegments.reduce((sum: number, seg: any) => sum + seg.confidence, 0) / relevantSegments.length : 0
          })
          success = true

        } catch (error) {
          console.error(`Errore nella ricerca del topic "${customTopic}" (tentativo ${attempt + 1}):`, error)
          
          if (attempt === maxAttempts - 1) {
            // Ultimo tentativo fallito
            topicSearchResults.push({
              topic: customTopic,
              relevantSegments: [],
              totalMatches: 0,
              confidence: 0,
              error: error instanceof Error ? error.message : 'Errore sconosciuto'
            })
          }
        }
        
        attempt++
        
        // Pausa tra i tentativi
        if (attempt < maxAttempts && !success) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Pausa tra i topic per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const searchResult = {
      query: customTopics.join(', '),
      timestamp: new Date().toISOString(),
      sessions: validSessions.map(s => ({ id: s.id, title: s.title })),
      results: topicSearchResults,
      summary: `Ricerca completata per ${customTopics.length} topic personalizzati su ${validSessions.length} sessioni. 
                Trovati ${topicSearchResults.reduce((sum, r) => sum + r.totalMatches, 0)} segmenti rilevanti totali.`
    }

    // Salva i risultati per ogni sessione
    try {
      for (const session of validSessions) {
        // Prima recupera le ricerche esistenti
        const { data: existingAnalysis } = await supabase
          .from('analyses')
          .select('customTopicAnalysisResults')
          .eq('sessionId', session.id)
          .single()

        let existingSearches = []
        if (existingAnalysis?.customTopicAnalysisResults) {
          try {
            const decryptedResults = decryptIfEncrypted(existingAnalysis.customTopicAnalysisResults)
            const parsed = JSON.parse(decryptedResults)
            existingSearches = parsed.searches || []
          } catch (parseError) {
            console.warn('Error parsing existing searches:', parseError)
          }
        }

        // Aggiungi la nuova ricerca preservando quelle esistenti
        const allSearches = [...existingSearches, searchResult]
        
        // Mantieni solo le ultime 50 ricerche per evitare che il database cresca troppo
        const limitedSearches = allSearches.slice(-50)

        // Salva direttamente nel database
        const { error: saveError } = await supabase
          .from('analyses')
          .upsert([{
            sessionId: session.id,
            patientId: session.patientId,
            customTopicAnalysisResults: encryptIfSensitive(JSON.stringify({
              searches: limitedSearches
            })),
            updatedAt: new Date()
          }], {
            onConflict: 'sessionId'
          })
        
        if (saveError) {
          console.error('Errore nel salvataggio per sessione', session.id, ':', saveError)
        } else {
          console.log('✅ Risultati salvati per sessione:', session.id)
        }
      }
      console.log('✅ Risultati della ricerca personalizzata salvati nella cache')
    } catch (saveError) {
      console.warn('⚠️ Errore nel salvataggio della ricerca personalizzata:', saveError)
      // Non fallire la richiesta per questo
    }

    return createSuccessResponse(searchResult)

  } catch (error) {
    console.error('Errore nella ricerca di topic personalizzati:', error)
    return createErrorResponse("Errore interno del server durante la ricerca", 500)
  }
}
