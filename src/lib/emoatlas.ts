// EmoAtlas Service - TypeScript client for emotion analysis
export interface SessionData {
    id: string
    title: string
    transcript: string
    sessionDate: string
  }
  
  export interface EmotionScores {
    joy: number
    trust: number
    fear: number
    surprise: number
    sadness: number
    disgust: number
    anger: number
    anticipation: number
  }
  
  export interface SessionAnalysis {
    session_id: string
    session_title: string
    analysis: {
      z_scores: EmotionScores
      emotional_valence: number
      positive_score: number
      negative_score: number
      language: string
      flower_plot?: string
      word_count: number
      emotion_words: Record<string, string[]>
      significant_emotions: Record<string, number>
    }
    processing_time: number
  }
  
  export interface EmotionTrendsResponse {
    success: boolean
    error?: string
    individual_sessions: SessionAnalysis[]
    combined_analysis?: {
      analysis: {
        z_scores: EmotionScores
        emotional_valence: number
        positive_score: number
        negative_score: number
        language: string
        text_length: number
        emotion_words: Record<string, string[]>
        significant_emotions: Record<string, number>
        dominant_emotions: [string, number][]
      }
      flower_plot?: string
    }
    trends?: Record<string, any>
    summary?: Record<string, any>
  }
  
  export interface EmotionAnalysisRequest {
    sessions: SessionData[]
    language?: string
  }
  
  class EmoAtlasService {
    private baseUrl: string
  
    constructor() {
      this.baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001'
    }
  
    async analyzeEmotions(sessions: SessionData[], language: string = 'italian'): Promise<EmotionTrendsResponse> {
      try {
        console.log(`🌸 Starting emotion analysis for ${sessions.length} sessions`)
        
        const request: EmotionAnalysisRequest = {
          sessions,
          language
        }
  
        const response = await fetch(`${this.baseUrl}/emotion-trends`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        })
  
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
  
        const result: EmotionTrendsResponse = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Analysis failed')
        }
  
        console.log(`✅ Emotion analysis completed successfully`)
        return result
  
      } catch (error) {
        console.error('❌ EmoAtlas service error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          individual_sessions: []
        }
      }
    }
  
    async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
  
        if (!response.ok) {
          throw new Error(`Health check failed: HTTP ${response.status}`)
        }
  
        const result = await response.json()
        return { healthy: true }
  
      } catch (error) {
        console.error('❌ EmoAtlas health check failed:', error)
        return {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  
    async analyzeSemanticFrame(text: string, targetWord: string, sessionId?: string, language: string = 'italian'): Promise<any> {
      try {
        console.log(`🔍 Starting semantic frame analysis for word "${targetWord}"`)
        
        const request = {
          text,
          target_word: targetWord,
          session_id: sessionId || 'unknown',
          language
        }
  
        const response = await fetch(`${this.baseUrl}/semantic-frame-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        })
  
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
  
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Semantic analysis failed')
        }
  
        console.log(`✅ Semantic frame analysis completed for "${targetWord}"`)
        return result
  
      } catch (error) {
        console.error('❌ Semantic frame analysis error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          session_id: sessionId || 'unknown',
          target_word: targetWord,
          semantic_frame: {
            connected_words: [],
            frame_text: '',
            total_connections: 0
          },
          emotional_analysis: {
            z_scores: {
              joy: 0, trust: 0, fear: 0, surprise: 0,
              sadness: 0, disgust: 0, anger: 0, anticipation: 0
            },
            emotional_valence: 0,
            positive_score: 0,
            negative_score: 0,
            significant_emotions: {}
          },
          context_analysis: {
            emotional_context: 'neutral',
            semantic_similarity: 0,
            average_valence: 0,
            total_occurrences: 0,
            analyzed_contexts: 0
          },
          statistics: {
            connected_words: 0,
            total_connections: 0,
            emotional_valence: 0
          },
          network_plot: null
        }
      }
    }
  }
  
  // Export singleton instance
  export const emoatlasService = new EmoAtlasService()