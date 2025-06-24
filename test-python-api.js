// Test script per verificare l'API del servizio Python
async function testPythonAPI() {
  try {
    const response = await fetch('http://localhost:8001/single-document-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: 'test123',
        transcript: 'Oggi ho parlato con il mio terapeuta della mia ansia e delle preoccupazioni per il lavoro. Mi sento molto stressato ultimamente e ho difficoltà a dormire. Il terapeuta mi ha suggerito alcune tecniche di rilassamento e strategie per gestire lo stress quotidiano.',
        n_topics: 3
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Risposta ricevuta:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verifica se ci sono i dati di rete
    if (result.network_data) {
      console.log('✅ Network data presente!');
      console.log('Nodi:', result.network_data.nodes?.length || 0);
      console.log('Collegamenti:', result.network_data.edges?.length || 0);
    } else {
      console.log('❌ Network data mancante!');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

testPythonAPI();
