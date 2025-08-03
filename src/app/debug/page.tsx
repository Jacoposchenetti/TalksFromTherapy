"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Play, FileText, Check, X, Loader2 } from "lucide-react"

interface ConfigStatus {
  openai: {
    configured: boolean
    apiKey: string
  }
  database: {
    configured: boolean
  }
  auth: {
    configured: boolean
  }
}

interface AudioFile {
  name: string
  path: string
}

export default function DebugPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string>("")

  useEffect(() => {
    fetchConfig()
    fetchAudioFiles()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Errore caricamento configurazione:", error)
    }
  }

  const fetchAudioFiles = async () => {
    // Simula la lista dei file audio disponibili
    const files = [
      "1749684953168-WhatsApp-Ptt-2025-06-05-at-23.08.46.mp3",
      "1749685110955-WhatsApp-Ptt-2025-06-05-at-23.08.46.mp3", 
      "1749685645382-WhatsApp-Ptt-2025-06-05-at-23.08.46.mp3"
    ]
    setAudioFiles(files.map(name => ({ name, path: `/uploads/audio/${name}` })))
    if (files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const testTranscription = async () => {
    if (!selectedFile) return

    setLoading(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/test-transcription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: selectedFile }),
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: "Errore di rete",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      })
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = ({ status }: { status: boolean }) => (
    status ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-600" />
    )
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Debug & Test Panel</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurazione */}
        <Card>
          <CardHeader>
            <CardTitle>Stato Configurazione</CardTitle>
            <CardDescription>
              Verifica che tutti i componenti siano configurati correttamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config ? (
              <>
                <div className="flex items-center justify-between">
                  <span>OpenAI API</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={config.openai.configured} />
                    <Badge variant={config.openai.configured ? "default" : "destructive"}>
                      {config.openai.configured ? "Configurata" : "Non configurata"}
                    </Badge>
                  </div>
                </div>
                {config.openai.configured && (
                  <div className="text-sm text-gray-600 ml-6">
                    API Key: {config.openai.apiKey}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={config.database.configured} />
                    <Badge variant={config.database.configured ? "default" : "destructive"}>
                      {config.database.configured ? "Configurato" : "Non configurato"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span>Autenticazione</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={config.auth.configured} />
                    <Badge variant={config.auth.configured ? "default" : "destructive"}>
                      {config.auth.configured ? "Configurata" : "Non configurata"}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Caricamento configurazione...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Trascrizione */}
        <Card>
          <CardHeader>
            <CardTitle>Test Trascrizione</CardTitle>
            <CardDescription>
              Testa la trascrizione con un file audio esistente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">File Audio Disponibili:</label>
              <select 
                value={selectedFile} 
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                {audioFiles.map((file) => (
                  <option key={file.name} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <Button 
              onClick={testTranscription} 
              disabled={loading || !selectedFile || !config?.openai.configured}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Trascrizione in corso...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Testa Trascrizione
                </>
              )}
            </Button>

            {testResult && (
              <div className="mt-4 p-3 border rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon status={testResult.success} />
                  <span className="font-medium">
                    {testResult.success ? "Successo" : "Errore"}
                  </span>
                </div>
                
                {testResult.success ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      File: {testResult.fileName}
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <strong>Trascrizione:</strong>
                      <p className="mt-1">{testResult.transcript}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600 text-sm">{testResult.error}</p>
                    {testResult.details && (
                      <p className="text-gray-600 text-xs mt-1">{testResult.details}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Istruzioni */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Istruzioni per la Configurazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Per configurare OpenAI:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Ottieni una API key da OpenAI (https://platform.openai.com/api-keys)</li>
              <li>Aggiungi la chiave nel file .env: <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY=***REMOVED***...</code></li>
              <li>Riavvia il server di sviluppo</li>
              <li>Testa la trascrizione con il pulsante sopra</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
