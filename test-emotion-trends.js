// Test del componente EmotionTrends con dati mock più realistici
const mockData = {
  individual_sessions: [
    {
      session_id: "test-1",
      session_title: "Prima sessione - Valutazione iniziale", 
      analysis: {
        z_scores: {
          joy: -0.5,        // Gioia bassa (sotto la media)
          trust: -1.2,      // Poca fiducia
          fear: 2.8,        // Paura alta (significativa)
          surprise: 0.3,    // Sorpresa normale
          sadness: 3.1,     // Tristezza molto alta (significativa)
          disgust: 1.5,     // Disgusto moderato
          anger: 2.2,       // Rabbia alta (significativa)
          anticipation: -0.8 // Poca anticipazione positiva
        },
        emotional_valence: -2.8,  // Molto negativo
        positive_score: 1.2,       // Poche emozioni positive
        negative_score: 4.5        // Molte emozioni negative
      }
    },
    {
      session_id: "test-2", 
      session_title: "Seconda sessione - Dopo 2 settimane",
      analysis: {
        z_scores: {
          joy: 0.8,         // Gioia migliorata
          trust: 0.5,       // Fiducia in crescita
          fear: 1.9,        // Paura ancora presente ma meno
          surprise: 0.1,    // Sorpresa normale
          sadness: 2.1,     // Tristezza ancora significativa ma ridotta
          disgust: 0.8,     // Disgusto ridotto
          anger: 1.5,       // Rabbia ridotta
          anticipation: 1.2 // Anticipazione positiva in crescita
        },
        emotional_valence: -0.8,  // Ancora negativo ma migliorato
        positive_score: 2.6,       // Emozioni positive in crescita
        negative_score: 3.2        // Emozioni negative ridotte
      }
    },
    {
      session_id: "test-3", 
      session_title: "Terza sessione - Dopo 1 mese",
      analysis: {
        z_scores: {
          joy: 2.1,         // Gioia significativa!
          trust: 1.8,       // Fiducia cresciuta
          fear: 0.8,        // Paura molto ridotta
          surprise: 0.5,    // Sorpresa normale
          sadness: 0.9,     // Tristezza non più significativa
          disgust: 0.2,     // Disgusto quasi assente
          anger: 0.5,       // Rabbia molto ridotta
          anticipation: 2.3 // Anticipazione positiva significativa
        },
        emotional_valence: 1.9,   // Positivo! 
        positive_score: 4.2,      // Emozioni positive dominanti
        negative_score: 1.8       // Emozioni negative ridotte
      }
    }
  ]
}

console.log('Test EmotionTrends con progressione realistica:')
console.log('Sessione 1: Paziente depresso, ansioso')
console.log('Sessione 2: Primi miglioramenti')
console.log('Sessione 3: Progresso significativo')
console.log('')
console.log('Dati:', JSON.stringify(mockData, null, 2))
