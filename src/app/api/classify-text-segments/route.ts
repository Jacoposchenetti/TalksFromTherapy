import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sentences, topics, session_id } = body

    if (!sentences || !topics || !Array.isArray(sentences)) {
      return NextResponse.json(
        { error: 'sentences and topics are required' },
        { status: 400 }
      )
    }

    console.log('Classifying text segments:', { session_id, sentences_count: sentences.length })
    console.log('Topics received:', topics)
    console.log('First few sentences:', sentences.slice(0, 3))

    const prompt = `Classifica ogni frase del testo ai topic identificati con precisione.

TOPIC DISPONIBILI:
${topics}

FRASI DA CLASSIFICARE:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

ISTRUZIONI:
1. Assegna ogni frase al topic più appropriato usando l'ID numerico del topic (1, 2, 3, ecc.)
2. Se una frase è chiaramente correlata a un topic, assegnale quel topic
3. Se una frase non è chiaramente correlata a nessun topic, usa null
4. Fornisci una confidence da 0.0 a 1.0
5. Sii ragionevolmente selettivo ma non eccessivamente restrittivo
6. Una frase deve essere correlata al topic per essere classificata, ma non deve essere perfettamente allineata

ESEMPIO DI CLASSIFICAZIONE:
{"classifications": [
  {"sentence_id": 1, "topic_id": 1, "confidence": 0.9},
  {"sentence_id": 2, "topic_id": 1, "confidence": 0.7},
  {"sentence_id": 3, "topic_id": null, "confidence": 0.3},
  {"sentence_id": 4, "topic_id": 2, "confidence": 0.8},
  {"sentence_id": 5, "topic_id": 2, "confidence": 0.6}
]}

Rispondi SOLO in formato JSON valido, nient'altro:`

    console.log('Prompt being sent to GPT:')
    console.log('='.repeat(50))
    console.log(prompt)
    console.log('='.repeat(50))

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Sei un esperto nella classificazione di testi terapeutici. Rispondi sempre in formato JSON valido. Classifica le frasi ai topic appropriati in modo ragionevole."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const content = response.choices[0].message.content?.trim()
    console.log('GPT classification response:', content)

    if (!content) {
      throw new Error('Empty response from GPT')
    }

    try {
      // Pulisci la risposta da eventuali caratteri extra
      const cleanContent = content.replace(/```json|```/g, '').trim()
      console.log('Cleaned content:', cleanContent)
      
      const classificationsData = JSON.parse(cleanContent)
      console.log('Parsed classifications:', classificationsData)
      
      // Trasforma le classificazioni in segmenti
      const segments = sentences.map((sentence: string, index: number) => {
        const classification = classificationsData.classifications?.find(
          (c: any) => c.sentence_id === index + 1
        )
        
        const segment = {
          text: sentence,
          topic_id: classification?.topic_id || null,
          confidence: classification?.confidence || 0
        }
        
        console.log(`Segment ${index + 1}:`, segment)
        return segment
      })

      console.log('Final segments:', segments)
      console.log('Segments with topic_id:', segments.filter(s => s.topic_id !== null).length)
      console.log('Sample segments with topic_id:', segments.filter(s => s.topic_id !== null).slice(0, 3))
      console.log('Classification completed:', { segments_count: segments.length })

      return NextResponse.json({ segments })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // Fallback: nessuna classificazione
      const segments = sentences.map((sentence: string) => ({
        text: sentence,
        topic_id: null,
        confidence: 0
      }))
      
      console.log('Fallback segments (all null topic_id):', segments.length)
      return NextResponse.json({ segments })
    }

  } catch (error) {
    console.error('Error in classify-text-segments:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
