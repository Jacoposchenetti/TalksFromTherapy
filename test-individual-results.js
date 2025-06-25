// Test per verificare se i risultati individuali vengono visualizzati
// Questo simula la struttura dati che dovrebbe arrivare dall'API

const mockAnalysisResult = {
  success: true,
  analysis: {
    individual_sessions: [
      {
        session_id: "test-1",
        session_title: "Prima sessione - Test visualizzazione",
        analysis: {
          emotions: {
            joy: 0.12,
            trust: 0.08,
            fear: 0.35,
            surprise: 0.15,
            sadness: 0.42,
            disgust: 0.18,
            anger: 0.28,
            anticipation: 0.09
          },
          z_scores: {
            joy: -0.5,
            trust: -1.2,
            fear: 2.8,
            surprise: 0.3,
            sadness: 3.1,
            disgust: 1.5,
            anger: 2.2,
            anticipation: -0.8
          },
          significant_emotions: {
            fear: 2.8,
            sadness: 3.1,
            anger: 2.2
          },
          dominant_emotions: [
            ["sadness", 0.42],
            ["fear", 0.35],
            ["anger", 0.28]
          ],
          emotional_valence: -2.8,
          positive_score: 1.2,
          negative_score: 4.5,
          text_length: 1250
        },
        flower_plot: null
      },
      {
        session_id: "test-2", 
        session_title: "Seconda sessione - Miglioramento",
        analysis: {
          emotions: {
            joy: 0.25,
            trust: 0.20,
            fear: 0.22,
            surprise: 0.12,
            sadness: 0.28,
            disgust: 0.10,
            anger: 0.18,
            anticipation: 0.22
          },
          z_scores: {
            joy: 0.8,
            trust: 0.5,
            fear: 1.9,
            surprise: 0.1,
            sadness: 2.1,
            disgust: 0.8,
            anger: 1.5,
            anticipation: 1.2
          },
          significant_emotions: {
            sadness: 2.1
          },
          dominant_emotions: [
            ["sadness", 0.28],
            ["joy", 0.25],
            ["fear", 0.22]
          ],
          emotional_valence: -0.8,
          positive_score: 2.6,
          negative_score: 3.2,
          text_length: 980
        },
        flower_plot: null
      }
    ],
    combined_analysis: {
      analysis: {
        emotions: {
          joy: 0.18,
          trust: 0.14,
          fear: 0.28,
          surprise: 0.13,
          sadness: 0.35,
          disgust: 0.14,
          anger: 0.23,
          anticipation: 0.15
        },
        z_scores: {
          joy: 0.2,
          trust: -0.4,
          fear: 2.3,
          surprise: 0.2,
          sadness: 2.6,
          disgust: 1.1,
          anger: 1.8,
          anticipation: 0.2
        },
        significant_emotions: {
          fear: 2.3,
          sadness: 2.6
        },
        dominant_emotions: [
          ["sadness", 0.35],
          ["fear", 0.28],
          ["anger", 0.23]
        ],
        emotional_valence: -1.8,
        positive_score: 1.9,
        negative_score: 3.8,
        text_length: 2230
      },
      flower_plot: null
    },
    total_sessions: 2
  },
  processed_sessions: 2
}

console.log('🧪 Test Individual Results Structure:')
console.log('✅ Success:', mockAnalysisResult.success)
console.log('✅ Has analysis:', !!mockAnalysisResult.analysis)
console.log('✅ Has individual_sessions:', !!mockAnalysisResult.analysis.individual_sessions)
console.log('✅ Individual sessions count:', mockAnalysisResult.analysis.individual_sessions.length)
console.log('✅ Has combined_analysis:', !!mockAnalysisResult.analysis.combined_analysis)
console.log('')

console.log('🔍 Individual Sessions Details:')
mockAnalysisResult.analysis.individual_sessions.forEach((session, index) => {
  console.log(`Session ${index + 1}:`, {
    id: session.session_id,
    title: session.session_title,
    hasAnalysis: !!session.analysis,
    significantEmotions: Object.keys(session.analysis.significant_emotions),
    valence: session.analysis.emotional_valence
  })
})

console.log('')
console.log('📊 Combined Analysis:')
console.log({
  significantEmotions: Object.keys(mockAnalysisResult.analysis.combined_analysis.analysis.significant_emotions),
  valence: mockAnalysisResult.analysis.combined_analysis.analysis.emotional_valence,
  totalSessions: mockAnalysisResult.analysis.total_sessions
})

console.log('')
console.log('🎯 This data structure should render both:')
console.log('1. Combined analysis (EmotionVisualizer)')
console.log('2. Individual sessions (EmotionVisualizer for each)')
console.log('3. Trend chart (EmotionTrends)')
