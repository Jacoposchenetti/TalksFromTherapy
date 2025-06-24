"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Loader2, AlertCircle, Eye, EyeOff, Network } from "lucide-react"
import NetworkTopicVisualization from "./network-topic-visualization"

interface TopicWord {
  word: string
  weight: number
}

interface Topic {
  topic_id: number
  keywords: string[]
  description?: string
  weight?: number
  centrality?: number
}

interface NetworkNode {
  id: string
  label: string
  type: string
  size: number
  color: string
  cluster: number
  weight?: number
}

interface NetworkEdge {
  source: string
  target: string
  weight: number
  type?: string
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

interface SingleDocumentAnalysisResult {
  session_id: string
  topics: Topic[]
  keywords: string[]
  summary: string
  analysis_timestamp: string
  network_data: NetworkData
  topic_similarities: Record<string, number>
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
  const [viewMode, setViewMode] = useState<'list' | 'network'>('list')
  const [maxWords, setMaxWords] = useState<number>(100)

  const runTopicAnalysis = async () => {
    if (!selectedSessions || selectedSessions.length === 0 || !combinedTranscript) {
      setError("Seleziona una o più sessioni con trascrizione per l'analisi")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    console.log('DEBUG: Starting analysis with maxWords:', maxWords)

    try {
      const requestBody = {
        session_id: selectedSessions.length === 1 ? selectedSessions[0].id : `combined_${selectedSessions.map(s => s.id).join('_')}`,
        transcript: combinedTranscript,
        max_words: maxWords,
        timestamp: Date.now() // Aggiungi timestamp per evitare cache
      }
      
      console.log('DEBUG: Request body:', requestBody)

      const response = await fetch('/api/single-session-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Previene cache
        },
        body: JSON.stringify(requestBody),
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
      'bg-indigo-100 text-indigo-800'
    ]
    return colors[topicId % colors.length]
  }
  return (
    <div className="h-full flex flex-col"> {/* Aggiunto flex flex-col per il layout verticale */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Topic Modelling
        </h3>        <p className="text-sm text-gray-600">
          {selectedSessions && selectedSessions.length > 0 ? 
            `Analisi tematica di ${selectedSessions.length} ${selectedSessions.length === 1 ? 'sessione' : 'sessioni'}` :
            'Seleziona una o più sessioni per l\'analisi'
          }
        </p>
      </div>      {/* Network Words Control - Always Visible */}
      <div className="mb-4 p-4 bg-blue-100 border-2 border-blue-300 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-base font-bold text-blue-900">
            🎛️ Controllo Parole Network: <span className="text-blue-600">{maxWords}</span>
          </label>
          <span className="text-sm text-blue-700 bg-blue-200 px-3 py-1 rounded-full">
            Da più a meno significative
          </span>
        </div><input
          type="range"
          min="20"
          max="300"
          step="10"
          value={maxWords}
          onChange={(e) => setMaxWords(parseInt(e.target.value))}
          className="w-full h-4 bg-gradient-to-r from-blue-500 to-blue-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        />        <div className="flex justify-between text-sm text-blue-700 mt-3 font-medium">
          <span>📍 20 (Essenziali)</span>
          <span>⚖️ 160 (Bilanciato)</span>
          <span>📊 300 (Completo)</span>
        </div>
        {analysisResult && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800 border border-blue-200">
            📊 Network attuale: <strong>{analysisResult.network_data.nodes.length} parole</strong>, <strong>{analysisResult.network_data.edges.length} connessioni</strong>
          </div>
        )}      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto"> {/* Rimosso h-[320px] fisso per utilizzare tutto lo spazio disponibile */}{!analysisResult && !isAnalyzing && !error && (
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
        )}

        {isAnalyzing && (
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
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Risultati Analisi</h3>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Lista
                </Button>
                <Button
                  variant={viewMode === 'network' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('network')}
                >
                  <Network className="h-4 w-4 mr-1" />
                  Rete
                </Button>
              </div>
            </div>            {/* Network View */}
            {viewMode === 'network' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Network con {analysisResult.network_data.nodes.length} parole
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runTopicAnalysis}
                    className="text-xs"
                  >
                    Aggiorna ({maxWords} parole)
                  </Button>
                </div>                <div className="min-h-[600px] border rounded-lg bg-gray-50 overflow-hidden"> {/* Aumentato a min-h-[600px] e aggiunto overflow-hidden */}
                  <NetworkTopicVisualization
                    key={`network-${maxWords}-${analysisResult.network_data.nodes.length}`} // Forza re-render quando cambiano dati
                    networkData={analysisResult.network_data}
                    width={800}
                    height={590} // Aumentato per usare tutto lo spazio
                  />
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <>
                {/* Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Riassunto dell'Analisi</h3>
                  <p className="text-sm text-gray-700">{analysisResult.summary}</p>
                  {analysisResult.topic_similarities && Object.keys(analysisResult.topic_similarities).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 font-medium">Similarità tra temi:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(analysisResult.topic_similarities).map(([pair, similarity]) => (
                          <Badge key={pair} variant="secondary" className="text-xs">
                            {pair.replace(/_/g, ' ')}: {(similarity * 100).toFixed(1)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
                            {topic.weight && (
                              <Badge variant="outline" className="text-xs">
                                Peso: {(topic.weight * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {topic.centrality && (
                              <Badge variant="outline" className="text-xs">
                                Connessioni: {topic.centrality}
                              </Badge>
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
                </div>
              </>
            )}

            {/* Analysis Info */}
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
              {analysisResult.network_data && (
                <p className="mt-1">
                  Rete: {analysisResult.network_data.nodes.length} nodi, {analysisResult.network_data.edges.length} connessioni
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>  )
}
