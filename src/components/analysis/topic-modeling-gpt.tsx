"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Brain, Loader2, MessageCircle } from "lucide-react"

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
      }

      const result = await response.json()
      setAnalysisResult(result)
      onAnalysisComplete?.(result)

    } catch (error) {
      console.error('Errore durante l\'analisi:', error)
      setError(error instanceof Error ? error.message : 'Errore sconosciuto durante l\'analisi')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getTopicColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800'
    ]
    return colors[index % colors.length]
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Topic Identificati
                </CardTitle>
                <CardDescription>
                  {analysisResult.summary}
                </CardDescription>
              </CardHeader>              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                  {analysisResult.topics.map((topic, index) => (
                    <div key={topic.topic_id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">
                            Topic {topic.topic_id}: {topic.description}
                          </h4>
                        </div>
                        <Badge className={getTopicColor(index)}>
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
              </CardContent>            </Card>
          )}
        </div>
      )}
    </div>
  )
}