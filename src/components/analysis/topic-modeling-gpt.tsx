"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Brain, Loader2, MessageCircle, FileText, Eye, EyeOff } from "lucide-react"

interface Session {
  id: string
  title: string
  transcript: string
}

interface Topic {
  topic_id: number
  keywords: string[]
  description: string
}

interface AnalysisResult {
  session_id: string
  topics: Topic[]
  summary: string
  analysis_timestamp: string
  text_segments?: TextSegment[]
}

interface TextSegment {
  text: string
  topic_id: number | null
  confidence: number
}

interface TopicAnalysisProps {
  selectedSessions: Session[]
  combinedTranscript: string
  onAnalysisComplete?: (result: AnalysisResult) => void
}

export default function TopicAnalysisComponent({ 
  selectedSessions, 
  combinedTranscript, 
  onAnalysisComplete 
}: TopicAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTextView, setShowTextView] = useState(false)

  const runTopicAnalysis = async () => {
    if (!combinedTranscript || combinedTranscript.trim().length === 0) {
      setError("Nessuna trascrizione disponibile per l'analisi")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      let allTopics: Topic[] = []
      let allSummaries: string[] = []

      // Se ci sono più sessioni, analizza ognuna separatamente per i topic
      if (selectedSessions.length > 1) {
        console.log(`Analyzing ${selectedSessions.length} sessions separately for topics`)
        
        for (let i = 0; i < selectedSessions.length; i++) {
          const session = selectedSessions[i]
          console.log(`Analyzing session ${i + 1}/${selectedSessions.length}: ${session.title}`)

          const response = await fetch('/api/single-session-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: session.id,
              transcript: session.transcript
            }),
          })

          if (response.ok) {
            const sessionResult = await response.json()
            
            // Aggiungi i topic di questa sessione con ID univoci
            const sessionTopics = sessionResult.topics.map((topic: Topic) => ({
              ...topic,
              topic_id: allTopics.length + topic.topic_id, // Rendi univoco l'ID
              description: topic.description // Rimuovi riferimento al documento
            }))
            
            allTopics.push(...sessionTopics)
            allSummaries.push(`${session.title}: ${sessionResult.summary}`)
            
            console.log(`Session ${i + 1}: Found ${sessionTopics.length} topics`)
          } else {
            console.error(`Session ${i + 1} analysis failed:`, response.status)
          }

          // Pausa tra le analisi
          if (i < selectedSessions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        // Se abbiamo troppi topic, consolida quelli simili
        if (allTopics.length > 8) {
          console.log(`Consolidating ${allTopics.length} topics`)
          allTopics = await consolidateTopics(allTopics)
        }

      } else {
        // Sessione singola: usa l'approccio originale
        const response = await fetch('/api/single-session-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: `combined_${Date.now()}`,
            transcript: combinedTranscript
          }),
        })

        if (!response.ok) {
          throw new Error(`Errore API: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        allTopics = result.topics
        allSummaries = [result.summary]
      }

      // Crea il risultato combinato
      const result = {
        session_id: `multi_session_${Date.now()}`,
        topics: allTopics,
        summary: allSummaries.join(' | '),
        analysis_timestamp: new Date().toISOString()
      }

      setAnalysisResult(result)
      onAnalysisComplete?.(result)

      // Classifica automaticamente il testo se l'analisi è riuscita
      if (result.topics && result.topics.length > 0) {
        console.log('Starting text classification...')
        const segments = await classifyTextToTopicsSeparately(selectedSessions, result.topics)
        console.log('Classification completed, segments:', segments)
        setAnalysisResult(prev => prev ? { ...prev, text_segments: segments } : null)
      }

    } catch (error) {
      console.error('Errore durante l\'analisi:', error)
      setError(error instanceof Error ? error.message : 'Errore sconosciuto durante l\'analisi')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const consolidateTopics = async (topics: Topic[]): Promise<Topic[]> => {
    // Se abbiamo 8 o meno topic, non consolidare
    if (topics.length <= 8) {
      return topics
    }

    console.log(`Consolidating ${topics.length} topics into max 8`)

    try {
      const topicDescriptions = topics.map(t => 
        `${t.topic_id}: ${t.description} (${t.keywords.join(', ')})`
      ).join('\n')

      const consolidationPrompt = `
Analizza questi topic e raggruppa quelli simili per ridurre il numero totale a massimo 8 topic principali.

TOPIC DA CONSOLIDARE:
${topicDescriptions}

ISTRUZIONI:
- Raggruppa topic simili o correlati
- Mantieni i topic più importanti e specifici
- Crea descrizioni che rappresentino i topic consolidati
- Combina le parole chiave dei topic raggruppati
- Massimo 8 topic finali

Rispondi SOLO con JSON:
{
  "consolidated_topics": [
    {
      "topic_id": 1,
      "description": "descrizione_consolidata",
      "keywords": ["parola1", "parola2", "parola3", "parola4"]
    }
  ]
}
`

      const response = await fetch('/api/classify-text-segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: [consolidationPrompt],
          topics: "consolidation",
          session_id: `consolidate_${Date.now()}`,
          isTopicConsolidation: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.segments?.[0]?.text || '{}'
        
        try {
          const parsed = JSON.parse(content)
          if (parsed.consolidated_topics && Array.isArray(parsed.consolidated_topics)) {
            console.log(`Consolidated to ${parsed.consolidated_topics.length} topics`)
            return parsed.consolidated_topics
          }
        } catch (parseError) {
          console.error('Failed to parse consolidation result:', parseError)
        }
      }
    } catch (error) {
      console.error('Topic consolidation failed:', error)
    }

    // Fallback: prendi i primi 8 topic
    console.log('Using fallback: taking first 8 topics')
    return topics.slice(0, 8)
  }
  
  const getTopicColor = (topicId: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-orange-100 text-orange-800'
    ]
    return colors[(topicId - 1) % colors.length]
  }

  const getTopicBackgroundColor = (topicId: number | null) => {
    if (topicId === null) return 'bg-gray-100 text-gray-600'
    
    const backgroundColors = [
      'bg-blue-100 text-blue-900',
      'bg-green-100 text-green-900', 
      'bg-yellow-100 text-yellow-900',
      'bg-red-100 text-red-900',
      'bg-purple-100 text-purple-900',
      'bg-indigo-100 text-indigo-900',
      'bg-pink-100 text-pink-900',
      'bg-orange-100 text-orange-900'
    ]
    return backgroundColors[(topicId - 1) % backgroundColors.length]
  }

  const classifyTextToTopicsSeparately = async (sessions: Session[], topics: Topic[]) => {
    if (sessions.length === 0 || topics.length === 0) {
      console.log('No sessions or topics found')
      return []
    }

    const topicList = topics.map(t => `${t.topic_id}: ${t.description} (parole chiave: ${t.keywords.join(', ')})`).join('\n')
    console.log(`Processing ${sessions.length} sessions separately`)

    let allSegments: TextSegment[] = []

    try {
      // Processa ogni sessione separatamente
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i]
        console.log(`Processing session ${i + 1}/${sessions.length}: ${session.title}`)

        // Dividi il testo della sessione in frasi
        const allSentences = session.transcript
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 15)

        console.log(`Session ${i + 1}: ${allSentences.length} total sentences`)

        if (allSentences.length === 0) {
          console.log(`Session ${i + 1}: No sentences found, skipping`)
          continue
        }

        // Aggiungi un separatore tra le sessioni se non è la prima
        if (i > 0) {
          allSegments.push({
            text: `\n--- ${session.title} ---\n`,
            topic_id: null,
            confidence: 0
          })
        }

        // Classificazione sequenziale con contesto crescente
        const sessionSegments = await classifyWithContext(allSentences, topicList, session.id)
        allSegments.push(...sessionSegments)

        // Pausa tra le sessioni per evitare rate limiting
        if (i < sessions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`Total segments from all sessions: ${allSegments.length}`)
      console.log(`Segments with topics: ${allSegments.filter(s => s.topic_id !== null).length}`)
      
      return allSegments

    } catch (error) {
      console.error('Error in separate classification:', error)
      
      // Fallback: processamento semplice del testo combinato
      return sessions.flatMap((session, sessionIndex) => {
        const sentences = session.transcript
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 15)

        const segments = sentences.map(sentence => ({
          text: sentence,
          topic_id: null,
          confidence: 0
        }))

        if (sessionIndex > 0) {
          return [
            {
              text: `\n--- ${session.title} ---\n`,
              topic_id: null,
              confidence: 0
            },
            ...segments
          ]
        }
        
        return segments
      })
    }
  }

  const classifyWithContext = async (sentences: string[], topicList: string, sessionId: string): Promise<TextSegment[]> => {
    const segments: TextSegment[] = []
    
    // Processa i blocchi di frasi
    const chunkSize = 20 // Processa 20 frasi alla volta
    for (let chunkIndex = 0; chunkIndex < sentences.length; chunkIndex += chunkSize) {
      const sentenceChunk = sentences.slice(chunkIndex, chunkIndex + chunkSize)
      console.log(`Processing chunk ${Math.floor(chunkIndex / chunkSize) + 1}: ${sentenceChunk.length} sentences`)

      try {
        // Prima classificazione: prova a classificare tutte le frasi del blocco
        const response = await fetch('/api/classify-text-segments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sentences: sentenceChunk,
            topics: topicList,
            session_id: `${sessionId}_chunk_${chunkIndex}_${Date.now()}`
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const initialClassifications = result.segments || []

          // Processa ogni frase del blocco sequenzialmente
          for (let sentenceIndex = 0; sentenceIndex < sentenceChunk.length; sentenceIndex++) {
            const sentence = sentenceChunk[sentenceIndex]
            const initialClassification = initialClassifications[sentenceIndex]
            
            let finalSegment: TextSegment

            // Se la classificazione iniziale ha un topic valido, usala
            if (initialClassification?.topic_id && initialClassification.topic_id > 0) {
              finalSegment = {
                text: sentence,
                topic_id: initialClassification.topic_id,
                confidence: initialClassification.confidence || 0.5
              }
              console.log(`Sentence ${chunkIndex + sentenceIndex + 1}: Direct classification -> Topic ${finalSegment.topic_id}`)
            } else {
              // Altrimenti, prova la classificazione con contesto
              console.log(`Sentence ${chunkIndex + sentenceIndex + 1}: Needs context classification`)
              finalSegment = await classifySingleWithContext(
                sentence, 
                segments, 
                topicList, 
                sessionId, 
                chunkIndex + sentenceIndex
              )
            }

            segments.push(finalSegment)
          }
        } else {
          console.error(`Chunk classification error:`, response.status, response.statusText)
          
          // Fallback per il blocco
          sentenceChunk.forEach(sentence => {
            segments.push({
              text: sentence,
              topic_id: null,
              confidence: 0
            })
          })
        }
      } catch (error) {
        console.error('Error in chunk classification:', error)
        
        // Fallback per il blocco
        sentenceChunk.forEach(sentence => {
          segments.push({
            text: sentence,
            topic_id: null,
            confidence: 0
          })
        })
      }

      // Pausa tra i blocchi
      if (chunkIndex + chunkSize < sentences.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    return segments
  }

  const classifySingleWithContext = async (
    sentence: string, 
    previousSegments: TextSegment[], 
    topicList: string, 
    sessionId: string, 
    sentenceIndex: number
  ): Promise<TextSegment> => {
    
    // Prova con contesto crescente: 1 frase, poi 2 frasi precedenti
    for (let contextSize = 1; contextSize <= 2; contextSize++) {
      const contextSegments = previousSegments.slice(-contextSize)
      
      if (contextSegments.length === 0) {
        // Nessun contesto disponibile
        break
      }

      const contextSentences = contextSegments.map(seg => seg.text)
      const contextTopics = contextSegments.map(seg => 
        seg.topic_id ? `Topic ${seg.topic_id}` : 'Non classificato'
      )

      console.log(`Trying context classification for sentence ${sentenceIndex + 1} with ${contextSize} previous sentences`)

      try {
        const contextPrompt = `
CONTESTO PRECEDENTE:
${contextSentences.map((sent, i) => `${i + 1}. "${sent}" -> ${contextTopics[i]}`).join('\n')}

FRASE DA CLASSIFICARE:
"${sentence}"

TOPIC DISPONIBILI:
${topicList}

Considerando il contesto delle frasi precedenti e i loro topic assegnati, classifica la frase corrente. 
Se il contesto suggerisce un topic specifico, usalo. Altrimenti assegna il topic più appropriato basandoti sul contenuto.

Rispondi SOLO con JSON:
{"topic_id": numero_o_null, "confidence": valore_0_a_1, "reasoning": "breve_spiegazione"}
`

        const response = await fetch('/api/classify-text-segments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sentences: [contextPrompt],
            topics: topicList,
            session_id: `${sessionId}_context_${contextSize}_${Date.now()}`,
            isContextClassification: true
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const classification = result.segments?.[0]
          
          if (classification?.topic_id && classification.topic_id > 0) {
            console.log(`Context classification (${contextSize} sentences) successful -> Topic ${classification.topic_id}`)
            return {
              text: sentence,
              topic_id: classification.topic_id,
              confidence: classification.confidence || 0.4
            }
          }
        }
      } catch (error) {
        console.error(`Context classification failed for context size ${contextSize}:`, error)
      }

      // Piccola pausa tra i tentativi
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Se tutti i tentativi falliscono, cerca di ereditare il topic dalla frase precedente se ha senso
    const lastSegmentWithTopic = previousSegments.slice().reverse().find(seg => seg.topic_id !== null)
    
    if (lastSegmentWithTopic && previousSegments.length > 0) {
      console.log(`Inheriting topic ${lastSegmentWithTopic.topic_id} from previous context`)
      return {
        text: sentence,
        topic_id: lastSegmentWithTopic.topic_id,
        confidence: 0.2 // Bassa confidence per topic ereditato
      }
    }

    // Ultimo fallback: non classificato
    console.log(`No classification possible for sentence ${sentenceIndex + 1}`)
    return {
      text: sentence,
      topic_id: null,
      confidence: 0
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Section - Consistent with Sentiment Analysis */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Analisi dei Topic Semantici
        </h2>
        
        <p className="text-gray-600 text-center max-w-2xl">
          Identifica automaticamente i temi principali e le aree semantiche nelle sessioni selezionate
        </p>
      </div>

      {/* Sessions Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">
          Sessioni da Analizzare:
        </h3>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          {selectedSessions.length > 0 ? (
            <div className="space-y-2">
              {selectedSessions.map((session, index) => (
                <div key={session.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{session.title}</span>
                  <span className="text-gray-500">
                    {session.transcript ? `${Math.round(session.transcript.split(' ').length)} parole` : 'No transcript'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Nessuna sessione selezionata</p>
          )}
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={runTopicAnalysis}
            disabled={isAnalyzing || !combinedTranscript || combinedTranscript.trim().length === 0}
            className="px-8 py-3 text-lg"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Analizzando Topic...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Avvia Analisi Topic
              </>
            )}
          </Button>
        </div>
        
        {/* Additional Info */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            L'analisi utilizza GPT-3.5 per identificare temi principali, parole chiave<br/>
            e aree semantiche con classificazione automatica del testo.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Errore:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!combinedTranscript || combinedTranscript.trim().length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nessuna trascrizione selezionata
            </h4>
            <p className="text-gray-600 text-center">
              Seleziona una o più sessioni per avviare l'analisi dei topic.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1">
          {/* Risultati dell'analisi */}
          {analysisResult && (
            <Card className="relative">
              {/* Overlay del titolo in alto a sinistra */}
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">Topic Identificati</span>
                  {analysisResult.text_segments && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTextView(!showTextView)}
                      className="ml-2 h-7 px-2"
                    >
                      {showTextView ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Nascondi
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Nel Testo
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Overlay dei topic badges in alto a destra */}
              <div className="absolute top-4 right-4 z-10">
                <div className="flex flex-wrap gap-1.5 max-w-md justify-end">
                  {analysisResult.topics.map((topic) => (
                    <Badge
                      key={topic.topic_id}
                      className={`${getTopicColor(topic.topic_id)} text-xs shadow-sm bg-white/90 backdrop-blur-sm`}
                    >
                      {topic.description.replace(/\s*\([^)]*\)$/, '')}
                    </Badge>
                  ))}
                </div>
              </div>

              <CardHeader className="pt-16">
                <CardDescription>
                  {analysisResult.summary}
                </CardDescription>
              </CardHeader>              <CardContent>
                {!showTextView ? (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {analysisResult.topics.map((topic, index) => (
                      <div key={topic.topic_id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-lg">
                              {topic.description}
                            </h4>
                          </div>
                          <Badge className={getTopicColor(topic.topic_id)}>
                            {topic.description.replace(/\s*\([^)]*\)$/, '')}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Parole chiave:</p>
                          <div className="flex flex-wrap gap-2">
                            {topic.keywords.map((keyword, keywordIndex) => (
                              <Badge 
                                key={keywordIndex} 
                                variant="outline"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto pr-2">
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Legenda Topic:</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.topics.map((topic, index) => (
                          <Badge key={topic.topic_id} className={getTopicColor(topic.topic_id)}>
                            {topic.description.replace(/\s*\([^)]*\)$/, '')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm leading-relaxed">
                      {analysisResult.text_segments ? (
                        analysisResult.text_segments.map((segment, index) => {
                          // Controlla se è un separatore di sessione
                          const isSessionSeparator = segment.text.includes('---') && segment.topic_id === null
                          
                          if (isSessionSeparator) {
                            return (
                              <div
                                key={index}
                                className="py-3 my-4 text-center font-medium text-gray-700 border-t border-b border-gray-300 bg-gray-50"
                              >
                                {segment.text.replace(/\n/g, '').trim()}
                              </div>
                            )
                          }
                          
                          return (
                            <span
                              key={index}
                              className={`inline-block p-1 rounded ${getTopicBackgroundColor(segment.topic_id)} ${
                                segment.topic_id ? 'border-l-2 border-gray-400' : ''
                              }`}
                              title={segment.topic_id ? `${analysisResult.topics.find(t => t.topic_id === segment.topic_id)?.description.replace(/\s*\([^)]*\)$/, '') || `Topic ${segment.topic_id}`} (${Math.round(segment.confidence * 100)}% confidence)` : 'Non classificato'}
                            >
                              {segment.text}
                            </span>
                          )
                        })
                      ) : (
                        <p className="text-gray-500 italic">
                          Classificazione del testo in corso...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}