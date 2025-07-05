// Test per verificare la nuova funzionalità di ricerca topic personalizzati
// Eseguire questo test dopo aver aggiunto il campo customTopicAnalysisResults al database

const testCustomTopicSearch = async () => {
  console.log('🧪 Testing Custom Topic Search API...')
  
  const mockRequest = {
    sessionIds: ['test-session-1'], // Sostituisci con ID di sessioni reali
    customTopics: ['ansia', 'depressione', 'relazioni']
  }
  
  try {
    const response = await fetch('/api/custom-topic-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockRequest)
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Custom Topic Search API Response:', result)
      
      if (result.success && result.data) {
        console.log('📊 Search Results:')
        result.data.results.forEach((topicResult, index) => {
          console.log(`  ${index + 1}. Topic: "${topicResult.topic}"`)
          console.log(`     Matches: ${topicResult.totalMatches}`)
          console.log(`     Confidence: ${Math.round(topicResult.confidence * 100)}%`)
          console.log(`     Segments found: ${topicResult.relevantSegments.length}`)
          
          if (topicResult.error) {
            console.log(`     ❌ Error: ${topicResult.error}`)
          }
        })
      }
    } else {
      const error = await response.json()
      console.error('❌ API Error:', error)
    }
  } catch (error) {
    console.error('❌ Network Error:', error)
  }
}

// Test per verificare il salvataggio nel database
const testAnalysisStorage = async () => {
  console.log('🧪 Testing Analysis Storage...')
  
  const mockAnalysisData = {
    query: 'test search',
    timestamp: new Date().toISOString(),
    results: [
      {
        topic: 'test topic',
        relevantSegments: [],
        totalMatches: 0,
        confidence: 0
      }
    ]
  }
  
  try {
    const response = await fetch('/api/analyses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session-id',
        analysisType: 'custom_topics',
        analysisData: mockAnalysisData
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Analysis Storage Response:', result)
    } else {
      const error = await response.json()
      console.error('❌ Storage Error:', error)
    }
  } catch (error) {
    console.error('❌ Storage Network Error:', error)
  }
}

console.log('🚀 Custom Topic Analysis Test Suite')
console.log('Run these functions in the browser console after logging in:')
console.log('- testCustomTopicSearch()')
console.log('- testAnalysisStorage()')

// Esporta le funzioni per test manuali
if (typeof window !== 'undefined') {
  window.testCustomTopicSearch = testCustomTopicSearch
  window.testAnalysisStorage = testAnalysisStorage
}
