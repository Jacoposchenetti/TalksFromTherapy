"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestCreditsPage() {
  const { data: session } = useSession()
  const [credits, setCredits] = useState('300')
  const [description, setDescription] = useState('Test manual credit addition')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTestAddCredits = async () => {
    if (!session) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: parseInt(credits),
          description
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Request failed', details: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return <div>Please login to test credits</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Test Credit Addition</CardTitle>
            <CardDescription>
              Test manual credit addition (simulates webhook)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="credits">Credits to Add</Label>
              <Input
                id="credits"
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="300"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Test manual credit addition"
              />
            </div>

            <Button 
              onClick={handleTestAddCredits}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Adding Credits...' : 'Add Credits'}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <pre className="text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>User ID:</strong> {session.user?.id}<br/>
                <strong>Email:</strong> {session.user?.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
