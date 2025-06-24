// Test script per verificare l'analisi automatica
const testTranscript = `
La terapia oggi si è concentrata su aspetti molto importanti della mia vita.
Abbiamo parlato di ansia, stress, relazioni, famiglia e work-life balance.
Il terapeuta mi ha aiutato a comprendere meglio le mie emozioni e pensieri.
Abbiamo discusso di strategie per gestire lo stress quotidiano.
La mindfulness e la meditazione sono tecniche che vorrei esplorare.
Le relazioni interpersonali sono un area dove sento di dover migliorare.
Il supporto sociale è fondamentale per il mio benessere psicologico.
Abbiamo fatto progressi significativi nella comprensione dei miei pattern comportamentali.
La prossima sessione ci concentreremo sulla resilienza emotiva.
`.trim()

async function testAnalysis() {
  console.log('🧪 Testing automatic analysis...')
  
  // Test con diversi parametri max_words
  const testCases = [
    { max_words: 20, expected_min: 15 },
    { max_words: 40, expected_min: 30 },
    { max_words: 60, expected_min: 45 }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing with max_words=${testCase.max_words}`)
    
    try {
      const response = await fetch('http://localhost:8000/analyze-session/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `test_${testCase.max_words}`,
          transcript: testTranscript,
          max_words: testCase.max_words
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      console.log(`✅ Success:`)
      console.log(`   - Nodes: ${result.network_data.nodes.length}`)
      console.log(`   - Edges: ${result.network_data.edges.length}`)
      console.log(`   - Total available: ${result.total_available_words}`)
      console.log(`   - Topics: ${result.topics.length}`)
      
      // Verifica che il numero di nodi sia ragionevole
      if (result.network_data.nodes.length < testCase.expected_min) {
        console.log(`⚠️  Warning: Expected at least ${testCase.expected_min} nodes, got ${result.network_data.nodes.length}`)
      }
      
      if (result.network_data.nodes.length > testCase.max_words) {
        console.log(`❌ Error: Got ${result.network_data.nodes.length} nodes but max_words was ${testCase.max_words}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
}

testAnalysis().then(() => {
  console.log('\n🎯 Test completed!')
}).catch(console.error)
