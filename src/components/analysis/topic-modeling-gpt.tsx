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

    try {      const response = await fetch('/api/single-session-analysis', {
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
      }      const result = await response.json()
      setAnalysisResult(result)
      onAnalysisComplete?.(result)

      // Classifica automaticamente il testo se l'analisi è riuscita
      if (result.topics && result.topics.length > 0) {
        console.log('Starting text classification...')
        const segments = await classifyTextToTopics(combinedTranscript, result.topics)
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

  const classifyTextToTopics = async (transcript: string, topics: Topic[]) => {
    // Dividi il testo in frasi significative
    const sentences = transcript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)

    if (sentences.length === 0 || topics.length === 0) {
      return []
    }

    try {
      // Crea il prompt per la classificazione
      const topicList = topics.map(t => `${t.topic_id}: ${t.description} (${t.keywords.join(', ')})`).join('\n')
      
      console.log('Calling classify-text-segments with:', {
        sentences: sentences.length,
        topicList,
        session_id: `classify_${Date.now()}`
      })
      
      const response = await fetch('/api/classify-text-segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences,
          topics: topicList,
          session_id: `classify_${Date.now()}`
        }),
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Classification result:', result)
        console.log('Segments received:', result.segments?.length || 0)
        return result.segments || []
      } else {
        console.error('Classification API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
    } catch (error) {
      console.error('Errore nella classificazione del testo:', error)
    }

    // Fallback: nessuna classificazione
    return sentences.map(sentence => ({
      text: sentence,
      topic_id: null,
      confidence: 0
    }))
  }

  return (
    <div className="h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analisi Topic GPT-3.5
          </h3>
          <p className="text-sm text-gray-600">
            {selectedSessions.length > 0 
              ? `${selectedSessions.length} sessioni selezionate` 
              : 'Nessuna sessione selezionata'}
          </p>
        </div>
        
        <Button 
          onClick={runTopicAnalysis}
          disabled={isAnalyzing || !combinedTranscript || combinedTranscript.trim().length === 0}
          className="flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizzando...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Avvia Analisi Topic
            </>
          )}
        </Button>
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
        <div className="grid gap-6">
          {/* Informazioni sulla trascrizione */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informazioni Trascrizione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Lunghezza:</span> {combinedTranscript.length} caratteri
                </div>
                <div>
                  <span className="font-medium">Parole:</span> {combinedTranscript.split(' ').length} parole
                </div>
              </div>
            </CardContent>
          </Card>          {/* Risultati dell'analisi */}
          {analysisResult && (
            <Card>              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Topic Identificati
                  </div>
                  {analysisResult.text_segments && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTextView(!showTextView)}
                      className="flex items-center gap-2"
                    >
                      {showTextView ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Nascondi Testo
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Visualizza nel Testo
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
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
                              Topic {topic.topic_id}: {topic.description}
                            </h4>
                          </div>                          <Badge className={getTopicColor(topic.topic_id)}>
                            Topic {topic.topic_id}
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
                      <div className="flex flex-wrap gap-2">                        {analysisResult.topics.map((topic, index) => (
                          <Badge key={topic.topic_id} className={getTopicColor(topic.topic_id)}>
                            Topic {topic.topic_id}: {topic.description}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm leading-relaxed">
                      {analysisResult.text_segments ? (
                        analysisResult.text_segments.map((segment, index) => (
                          <span
                            key={index}
                            className={`inline-block p-1 rounded ${getTopicBackgroundColor(segment.topic_id)} ${
                              segment.topic_id ? 'border-l-2 border-gray-400' : ''
                            }`}
                            title={segment.topic_id ? `Topic ${segment.topic_id} (${Math.round(segment.confidence * 100)}% confidence)` : 'Non classificato'}
                          >
                            {segment.text}
                          </span>
                        ))
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