'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SlidingWindowProps {
  sessionId: string
  sessionDate: string
  patientName: string
}

interface KeywordData {
  keyword: string
  score: number
  frequency: number
  context: string[]
}

interface ThemeData {
  theme: string
  keywords: string[]
  confidence: number
  sentences: string[]
}

interface WindowData {
  segment: number
  time_range: string
  text: string
  sentences: string[]
  keywords: string[]
  main_theme: string
  keyword_scores: KeywordData[]
}

interface AnalysisResults {
  session_id: string
  keywords: KeywordData[]
  themes: ThemeData[]
  sliding_windows: WindowData[]
  summary: {
    total_words: number
    total_sentences: number
    main_themes: string[]
    key_topics: string[]
    session_structure: number
    estimated_duration: string
  }
}

interface AnalysisResponse {
  success: boolean
  session: {
    id: string
    date: string
    patient: string
  }
  analysis: AnalysisResults
}

export default function SlidingWindowAnalysis({ sessionId, sessionDate, patientName }: SlidingWindowProps) {
  const [analysis, setAnalysis] = useState<AnalysisResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<number | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/single-session-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore durante l\'analisi')
      }

      const data: AnalysisResponse = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      'Work': 'bg-blue-100 text-blue-800',
      'Emotions': 'bg-red-100 text-red-800',
      'Relationships': 'bg-green-100 text-green-800',
      'Health': 'bg-purple-100 text-purple-800',
      'Coping': 'bg-yellow-100 text-yellow-800',
      'Therapy': 'bg-indigo-100 text-indigo-800'
    }
    return colors[theme] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Analisi Sliding Window</span>
            <Button 
              onClick={runAnalysis} 
              disabled={loading}
              className="ml-4"
            >
              {loading ? 'Analizzando...' : 'Avvia Analisi'}
            </Button>
          </CardTitle>
          <div className="text-sm text-gray-600">
            <p>Sessione del {new Date(sessionDate).toLocaleDateString('it-IT')}</p>
            <p>Paziente: {patientName}</p>
          </div>
        </CardHeader>
        
        {error && (
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        {analysis && (
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysis.summary.total_words}</div>
                <div className="text-sm text-gray-600">Parole</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.summary.total_sentences}</div>
                <div className="text-sm text-gray-600">Frasi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analysis.summary.session_structure}</div>
                <div className="text-sm text-gray-600">Segmenti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysis.summary.estimated_duration}</div>
                <div className="text-sm text-gray-600">Durata Est.</div>
              </div>
            </div>

            {/* Main Themes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Temi Principali</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.themes.map((theme, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getThemeColor(theme.theme)}>
                          {theme.theme}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {(theme.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <strong className="text-sm">Parole chiave:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {theme.keywords.map((keyword, kIndex) => (
                              <Badge key={kIndex} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Top Keywords */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Parole Chiave Principali</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {analysis.keywords.slice(0, 10).map((keyword, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-sm">{keyword.keyword}</div>
                    <div className="text-xs text-gray-500">
                      {(keyword.score * 100).toFixed(1)}% ({keyword.frequency}x)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sliding Windows */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Analisi Temporale (Sliding Windows)</h3>
              <div className="space-y-2">
                {analysis.sliding_windows.map((window, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all ${
                      selectedWindow === index ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedWindow(selectedWindow === index ? null : index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">Segmento {window.segment}</Badge>
                          <span className="text-sm text-gray-600">{window.time_range}</span>
                        </div>
                        <Badge className={getThemeColor(window.main_theme)}>
                          {window.main_theme}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {window.keywords.map((keyword, kIndex) => (
                          <Badge key={kIndex} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>

                      {selectedWindow === index && (
                        <div className="mt-4 p-3 bg-gray-50 rounded border-t">
                          <h4 className="font-medium text-sm mb-2">Contenuto del segmento:</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {window.text}
                          </p>
                          
                          {window.keyword_scores.length > 0 && (
                            <div className="mt-3">
                              <h5 className="font-medium text-xs text-gray-600 mb-2">Punteggi parole chiave:</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {window.keyword_scores.slice(0, 6).map((kw, kwIndex) => (
                                  <div key={kwIndex} className="text-xs">
                                    <span className="font-medium">{kw.keyword}</span>
                                    <span className="text-gray-500 ml-1">({(kw.score * 100).toFixed(1)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
