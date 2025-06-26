'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface Transcript {
  id: string;
  content: string;
}

interface Topic {
  id: number;
  name: string;
  keywords: string[];
  associatedWords: {
    transcriptId: string;
    words: string[];
  }[];
}

interface TopicModelingGPTProps {
  selectedTranscripts: Transcript[];
  onTopicsGenerated?: (topics: Topic[]) => void;
}

export default function TopicModelingGPT({ selectedTranscripts, onTopicsGenerated }: TopicModelingGPTProps) {
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateTopics = async () => {
    if (selectedTranscripts.length === 0) {
      setError('Seleziona almeno un transcript');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/topics/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptIds: selectedTranscripts.map(t => t.id),
          maxTopics: 5
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTopics(data.topics);
        onTopicsGenerated?.(data.topics);
      } else {
        setError(data.message || 'Errore nella generazione dei topic');
      }
    } catch (error) {
      setError('Errore di rete: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Topic Modeling con GPT-3.5</h2>
        <p className="text-gray-600">
          Transcript selezionati: {selectedTranscripts.length}
        </p>
      </div>

      <Button
        onClick={generateTopics}
        disabled={loading || selectedTranscripts.length === 0}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando topic...
          </>
        ) : (
          'Genera Topic'
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {topics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Topic Identificati</h3>
          
          {topics.map((topic, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">
                  {topic.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Parole chiave:</h4>
                  <div className="flex flex-wrap gap-2">
                    {topic.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="border-blue-200">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {topic.associatedWords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Parole associate dai transcript:</h4>
                    <div className="space-y-2">
                      {topic.associatedWords.map((assoc, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-3">
                          <p className="text-sm text-gray-500 mb-1">
                            Transcript {assoc.transcriptId}:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {assoc.words.map((word, wordIdx) => (
                              <Badge
                                key={wordIdx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
