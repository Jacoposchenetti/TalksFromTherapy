"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"

interface TopicWord {
  word: string
  weight: number
}

interface Topic {
  topic_id: number
  keywords: string[]
  description?: string
}

interface SingleDocumentAnalysisResult {
  session_id: string
  topics: Topic[]
  keywords: string[]
  summary: string
  analysis_timestamp: string
}

interface TopicAnalysisComponentProps {
  selectedSessions?: {
    id: string
    title: string
    transcript: string
  }[]
  combinedTranscript?: string
  onAnalysisComplete?: (result: SingleDocumentAnalysisResult) => void
}

export default function TopicAnalysisComponent({ 
  selectedSessions = [], 
  combinedTranscript = "",
  onAnalysisComplete 
}: TopicAnalysisComponentProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<SingleDocumentAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())
  const runTopicAnalysis = async () => {
    if (!selectedSessions || selectedSessions.length === 0 || !combinedTranscript) {
      setError("Seleziona una o più sessioni con trascrizione per l'analisi")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const response = await fetch('/api/single-session-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: selectedSessions.length === 1 ? selectedSessions[0].id : `combined_${selectedSessions.map(s => s.id).join('_')}`,
          transcript: combinedTranscript
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result: SingleDocumentAnalysisResult = await response.json()
      setAnalysisResult(result)
      onAnalysisComplete?.(result)

    } catch (error) {
      console.error('Errore analisi session:', error)
      setError(error instanceof Error ? error.message : 'Errore sconosciuto')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleTopicExpansion = (topicId: number) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
    }
    setExpandedTopics(newExpanded)
  }

  const getTopicColor = (topicId: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ]
    return colors[topicId % colors.length]
  }
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analisi Tematiche
        </CardTitle>
        <CardDescription>
          Analisi automatica dei temi principali nella trascrizione selezionata
        </CardDescription>
      </CardHeader>
      <CardContent>        {!analysisResult && !isAnalyzing && !error && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {selectedSessions && selectedSessions.length > 0 ? 
                "Clicca su 'Analizza Sessioni' per estrarre i temi principali" :
                "Seleziona una o più sessioni per iniziare l'analisi"
              }
            </p>
            <Button 
              onClick={runTopicAnalysis}
              disabled={!selectedSessions || selectedSessions.length === 0 || !combinedTranscript}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analizza Sessioni
            </Button>
          </div>
        )}        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600 mb-2">Analisi in corso...</p>
            <p className="text-sm text-gray-500">
              Sto analizzando {selectedSessions?.length} {selectedSessions?.length === 1 ? 'sessione' : 'sessioni'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={runTopicAnalysis}
              variant="outline"
              className="flex items-center gap-2"
            >
              Riprova
            </Button>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Riassunto dell'Analisi</h3>
              <p className="text-sm text-gray-700">{analysisResult.summary}</p>
            </div>

            {/* Keywords */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Parole Chiave Principali</h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.keywords.map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-sm"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Temi Identificati</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runTopicAnalysis}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Rigenera Analisi
                </Button>
              </div>

              {analysisResult.topics.map((topic) => (
                <Card key={topic.topic_id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getTopicColor(topic.topic_id)}>
                          Tema {topic.topic_id}
                        </Badge>
                        {topic.description && (
                          <span className="text-sm text-gray-600">
                            {topic.description}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTopicExpansion(topic.topic_id)}
                      >
                        {expandedTopics.has(topic.topic_id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Keywords for this topic */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topic.keywords.map((keyword, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>            {/* Analysis Info */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p>
                Analisi completata il {new Date(analysisResult.analysis_timestamp).toLocaleString('it-IT')}
              </p>
              <p>
                {selectedSessions && selectedSessions.length > 0 && (
                  selectedSessions.length === 1 ? 
                    `Sessione analizzata: ${selectedSessions[0].title}` :
                    `Analisi combinata di ${selectedSessions.length} sessioni: ${selectedSessions.map(s => s.title).join(', ')}`
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
