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

    const prompt = `Classifica ogni frase del testo ai topic identificati.

TOPIC DISPONIBILI:
${topics}

FRASI DA CLASSIFICARE:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

ISTRUZIONI:
1. Assegna ogni frase al topic più appropriato usando l'ID del topic
2. Se una frase non appartiene chiaramente a nessun topic, usa null
3. Fornisci una confidence da 0.0 a 1.0
4. Rispondi in formato JSON:

{"classifications": [
  {"sentence_id": 1, "topic_id": 2, "confidence": 0.8},
  {"sentence_id": 2, "topic_id": null, "confidence": 0.3}
]}
`

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Sei un esperto nella classificazione di testi terapeutici. Rispondi sempre in formato JSON valido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })

    const content = response.choices[0].message.content?.trim()
    console.log('GPT classification response:', content)

    if (!content) {
      throw new Error('Empty response from GPT')
    }

    try {
      const classificationsData = JSON.parse(content)
      
      // Trasforma le classificazioni in segmenti
      const segments = sentences.map((sentence: string, index: number) => {
        const classification = classificationsData.classifications?.find(
          (c: any) => c.sentence_id === index + 1
        )
        
        return {
          text: sentence,
          topic_id: classification?.topic_id || null,
          confidence: classification?.confidence || 0
        }
      })

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
