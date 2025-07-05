import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

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

// Funzione per classificare tutti i topic contemporaneamente
async function classifyTextForMultipleTopics(sentences: string[], topics: string[], sessionId: string) {
  const topicList = topics.map((topic, index) => `${index + 1}. "${topic}"`).join('\n')
  
  const prompt = `Classifica ogni frase del testo per trovare segmenti relativi ai topic specificati.

TOPIC DA CERCARE:
${topicList}

FRASI DA CLASSIFICARE:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

ISTRUZIONI:
1. Per ogni frase, assegna il topic_id più appropriato (1, 2, 3, etc.) o null
2. Usa topic_id corrispondente al numero del topic nella lista sopra
3. Usa topic_id = null se la frase non è chiaramente collegata a nessun topic
4. Confidence alta (>0.7) solo se sei MOLTO sicuro della connessione
5. Confidence media (0.4-0.7) per connessioni probabili
6. Confidence bassa (<0.4) per connessioni deboli
7. PREFERISCI null piuttosto che classificazioni incerte

Rispondi SOLO con JSON:
{"classifications": [
  {"sentence_id": 1, "topic_id": 2, "confidence": 0.9, "text": "testo_frase"},
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      )
    }

    const { sessionIds, customTopics }: CustomTopicSearchRequest = await request.json()

    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Nessuna sessione selezionata" },
        { status: 400 }
      )
    }

    if (!customTopics || customTopics.length === 0) {
      return NextResponse.json(
        { error: "Nessun topic personalizzato specificato" },
        { status: 400 }
      )
    }

    // Fetch sessions and their transcripts
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, transcript, status, createdAt, patientId')
      .in('id', sessionIds)
      .eq('userId', userData.id)

    if (sessionsError) {
      return NextResponse.json(
        { error: "Errore nel recupero delle sessioni" },
        { status: 500 }
      )
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna trascrizione trovata per le sessioni selezionate" },
        { status: 404 }
      )
    }

    // Filter out sessions without transcripts
    const validSessions = sessions.filter(session => 
      session.transcript && typeof session.transcript === 'string' && session.transcript.trim().length > 0
    )

    if (validSessions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna trascrizione valida trovata" },
        { status: 404 }
      )
    }

    // Combina tutte le trascrizioni
    const combinedTranscript = validSessions
      .map(session => `--- ${session.title} ---\n${session.transcript}`)
      .join('\n\n')

    // Dividi il testo in frasi per la classificazione
    const sentences = combinedTranscript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15)

    console.log(`Classificando ${sentences.length} frasi per ${customTopics.length} topic personalizzati`)

    // Classifica tutto il testo per tutti i topic contemporaneamente
    let fullTextSegments: any[] = []
    const topicSearchResults = []
    
    try {
      // Usa la nuova funzione per classificare tutti i topic insieme
      const classifications = await classifyTextForMultipleTopics(
        sentences, 
        customTopics, 
        `custom_search_${Date.now()}`
      )

      fullTextSegments = classifications

      // Crea i risultati per ogni topic
      for (let i = 0; i < customTopics.length; i++) {
        const topicId = i + 1
        const customTopic = customTopics[i]
        
        const relevantSegments = classifications.filter((segment: any) => 
          segment.topic_id === topicId && segment.confidence > 0.4
        )

        console.log(`Trovati ${relevantSegments.length} segmenti rilevanti per "${customTopic}"`)

        topicSearchResults.push({
          topic: customTopic,
          topicId: topicId,
          relevantSegments: relevantSegments,
          totalMatches: relevantSegments.length,
          confidence: relevantSegments.length > 0 ? 
            relevantSegments.reduce((sum: number, seg: any) => sum + seg.confidence, 0) / relevantSegments.length : 0
        })
      }

    } catch (error) {
      console.error('Errore nella classificazione multi-topic:', error)
      
      // Fallback: classifica ogni topic separatamente
      for (const customTopic of customTopics) {
        console.log(`Fallback: Cercando topic personalizzato: "${customTopic}"`)
        
        try {
          const classifications = await classifyTextForTopic(
            sentences.slice(0, 30), 
            customTopic, 
            `custom_search_fallback_${Date.now()}`
          )

          const relevantSegments = classifications.filter((segment: any) => 
            segment.topic_id === 1 && segment.confidence > 0.4
          )

          console.log(`Trovati ${relevantSegments.length} segmenti rilevanti per "${customTopic}"`)

          topicSearchResults.push({
            topic: customTopic,
            topicId: topicSearchResults.length + 1,
            relevantSegments: relevantSegments,
            totalMatches: relevantSegments.length,
            confidence: relevantSegments.length > 0 ? 
              relevantSegments.reduce((sum: number, seg: any) => sum + seg.confidence, 0) / relevantSegments.length : 0
          })

        } catch (topicError) {
          console.error(`Errore nella ricerca del topic "${customTopic}":`, topicError)
          
          topicSearchResults.push({
            topic: customTopic,
            topicId: topicSearchResults.length + 1,
            relevantSegments: [],
            totalMatches: 0,
            confidence: 0,
            error: topicError instanceof Error ? topicError.message : 'Errore sconosciuto'
          })
        }

        // Pausa tra i topic per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const searchResult = {
      query: customTopics.join(', '),
      timestamp: new Date().toISOString(),
      sessions: validSessions.map(s => ({ id: s.id, title: s.title })),
      results: topicSearchResults,
      fullTextSegments: fullTextSegments, // Aggiungi i segmenti completi per l'highlighting
      customTopics: customTopics.map((topic, index) => ({
        topic_id: index + 1,
        description: topic,
        keywords: [topic] // Per compatibilità con il frontend
      })),
      summary: `Ricerca completata per ${customTopics.length} topic personalizzati su ${validSessions.length} sessioni. 
                Trovati ${topicSearchResults.reduce((sum, r) => sum + r.totalMatches, 0)} segmenti rilevanti totali.`
    }

    // Salva i risultati per ogni sessione
    try {
      for (const session of validSessions) {
        // Salva direttamente nel database invece di fare fetch
        const { error: saveError } = await supabase
          .from('analyses')
          .upsert([{
            sessionId: session.id,
            patientId: session.patientId,
            customTopicAnalysisResults: JSON.stringify({
              searches: [searchResult]
            }),
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

    return NextResponse.json({
      success: true,
      data: searchResult
    })

  } catch (error) {
    console.error('Errore nella ricerca di topic personalizzati:', error)
    return NextResponse.json(
      { error: "Errore interno del server durante la ricerca" },
      { status: 500 }
    )
  }
}
