'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SlidingWindowAnalysis from '@/components/analysis/sliding-window-analysis'
import TopicAnalysis from '@/components/analysis/topic-analysis'

interface SessionData {
  id: string
  date: string
  transcript: string | null
  notes: string | null
  status: string
  patient: {
    id: string
    name: string
  }
}

export default function SessionAnalysisPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sliding' | 'topic'>('sliding')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchSessionData()
    }
  }, [status, params.id])

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/sessions/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Sessione non trovata')
        } else {
          setError('Errore nel caricamento della sessione')
        }
        return
      }

      const data = await response.json()
      setSessionData(data.session)
    } catch (err) {
      setError('Errore nella connessione al server')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/sessions')} 
          className="mt-4"
        >
          Torna alle Sessioni
        </Button>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Sessione non trovata
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const hasTranscript = sessionData.transcript && sessionData.transcript.trim().length > 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analisi Sessione</h1>
          <p className="text-gray-600 mt-2">
            {sessionData.patient.name} - {new Date(sessionData.date).toLocaleDateString('it-IT')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge 
            variant={sessionData.status === 'completed' ? 'default' : 'secondary'}
          >
            {sessionData.status === 'completed' ? 'Completata' : 
             sessionData.status === 'in_progress' ? 'In Corso' : 'Programmata'}
          </Badge>
          <Button 
            variant="outline" 
            onClick={() => router.push('/sessions')}
          >
            Torna alle Sessioni
          </Button>
        </div>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Sessione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Dettagli</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Paziente:</strong> {sessionData.patient.name}</p>
                <p><strong>Data:</strong> {new Date(sessionData.date).toLocaleDateString('it-IT')}</p>
                <p><strong>Stato:</strong> {sessionData.status}</p>
                <p><strong>Trascrizione:</strong> {hasTranscript ? 'Disponibile' : 'Non disponibile'}</p>
              </div>
            </div>
            {sessionData.notes && (
              <div>
                <h3 className="font-semibold mb-2">Note</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {sessionData.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Section */}
      {hasTranscript ? (
        <div>
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('sliding')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sliding'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analisi Intra-Sessione (Sliding Window)
            </button>
            <button
              onClick={() => setActiveTab('topic')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'topic'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analisi Topic Modeling (Multi-Sessione)
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'sliding' && (
            <SlidingWindowAnalysis
              sessionId={sessionData.id}
              sessionDate={sessionData.date}
              patientName={sessionData.patient.name}
            />
          )}

          {activeTab === 'topic' && (
            <div>
              <Alert className="mb-4">
                <AlertDescription>
                  L'analisi topic modeling richiede più sessioni per funzionare correttamente. 
                  Sarà disponibile quando ci saranno almeno 3 sessioni per questo paziente.
                </AlertDescription>
              </Alert>
              <TopicAnalysis patientId={sessionData.patient.id} />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessuna trascrizione disponibile
            </h3>
            <p className="text-gray-600 mb-6">
              Per eseguire l'analisi è necessario che la sessione abbia una trascrizione.
            </p>
            <Button onClick={() => router.push(`/sessions/${sessionData.id}/edit`)}>
              Modifica Sessione
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
