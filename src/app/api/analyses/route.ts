import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/analyses?sessionId=xxx - Recupera analisi per una sessione
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    // Verifica che la sessione appartenga all'utente
    const sessionData = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    // Recupera l'analisi esistente
    const analysis = await prisma.analysis.findUnique({
      where: {
        sessionId: sessionId
      }
    })

    if (!analysis) {
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, analysisType, analysisData } = body

    if (!sessionId || !analysisType || !analysisData) {
      return NextResponse.json({ error: "Dati richiesti mancanti" }, { status: 400 })
    }

    // Verifica che la sessione appartenga all'utente
    const sessionData = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        patient: true
      }
    })

    if (!sessionData) {
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
        // Per semantic frame, salviamo i risultati per parola specifica
        const { target_word } = analysisData
        if (target_word) {
          // Recupera risultati esistenti
          const existingAnalysis = await prisma.analysis.findUnique({
            where: { sessionId }
          })
          
          let existingFrames = {}
          if (existingAnalysis?.semanticFrameResults) {
            try {
              existingFrames = JSON.parse(existingAnalysis.semanticFrameResults)
            } catch (e) {
              console.error("Errore parsing semantic frames esistenti:", e)
            }
          }

          // Aggiungi/aggiorna il frame per questa parola
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
    const analysis = await prisma.analysis.upsert({
      where: {
        sessionId: sessionId
      },
      update: updateData,
      create: {
        sessionId,
        ...updateData
      }
    })

    return NextResponse.json({ 
      success: true, 
      analysisId: analysis.id,
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const analysisType = searchParams.get('analysisType')

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    // Verifica che la sessione appartenga all'utente
    const sessionData = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    if (analysisType) {
      // Cancella solo un tipo specifico di analisi
      let updateData: any = {}
      
      switch (analysisType) {
        case 'sentiment':
          updateData = {
            emotions: null,
            emotionalValence: null,
            sentimentScore: null,
            significantEmotions: null,
            emotionFlowerPlot: null
          }
          break
        case 'topics':
          updateData = {
            keyTopics: null,
            topicAnalysisResult: null
          }
          break
        case 'semantic_frame':
          updateData = {
            semanticFrameResults: null
          }
          break
        default:
          return NextResponse.json({ error: "Tipo di analisi non supportato" }, { status: 400 })
      }

      await prisma.analysis.update({
        where: { sessionId },
        data: updateData
      })
    } else {
      // Cancella tutta l'analisi
      await prisma.analysis.delete({
        where: { sessionId }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Analisi cancellata con successo"
    })

  } catch (error) {
    console.error("Errore nella cancellazione analisi:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
