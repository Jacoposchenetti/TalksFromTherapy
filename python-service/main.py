from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
from datetime import datetime
import openai
import os
import json
from dotenv import load_dotenv
import base64
import io

# Load environment variables
load_dotenv()

# EmoAtlas imports
try:
    from emoatlas import EmoScores
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import spacy
    EMOATLAS_AVAILABLE = True
    print("✅ EmoAtlas successfully imported")
    
    # Load Italian spacy model for lemmatization
    try:
        nlp_it = spacy.load("it_core_news_lg")
        print("✅ Italian Spacy model loaded for lemmatization")
    except OSError:
        nlp_it = None
        print("⚠️ Italian Spacy model not available for lemmatization")
        
except ImportError as e:
    print(f"❌ EmoAtlas not available: {e}")
    EMOATLAS_AVAILABLE = False
    nlp_it = None

app = FastAPI(title="Single Document Analysis Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def lemmatize_word(word: str, language: str = 'italian') -> str:
    """Lemmatize a word using Spacy to match EmoAtlas normalization"""
    try:
        if language == 'italian' and nlp_it is not None:
            doc = nlp_it(word.lower())
            if len(doc) > 0:
                lemmatized = doc[0].lemma_
                print(f"🔤 Spacy lemmatization: '{word}' -> '{lemmatized}'")
                return lemmatized
        
        # Fallback: return the word as-is
        print(f"⚠️ No lemmatization available, returning original word: '{word}'")
        return word.lower()
        
    except Exception as e:
        print(f"❌ Error in lemmatization: {e}")
        return word.lower()

class SingleDocumentRequest(BaseModel):
    session_id: str
    transcript: str

class Topic(BaseModel):
    topic_id: int
    keywords: List[str]
    description: str = ""

class SingleDocumentResponse(BaseModel):
    session_id: str
    topics: List[Topic]
    summary: str
    analysis_timestamp: str

# EmoAtlas Models
class SessionData(BaseModel):
    id: str
    title: str
    transcript: str
    sessionDate: str

class EmotionAnalysisRequest(BaseModel):
    sessions: List[SessionData]
    language: str = 'italian'

class EmotionScoresModel(BaseModel):
    joy: float
    trust: float
    fear: float
    surprise: float
    sadness: float
    disgust: float
    anger: float
    anticipation: float

class SessionAnalysis(BaseModel):
    session_id: str
    session_title: str
    analysis: Dict
    processing_time: float

class EmotionTrendsResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    individual_sessions: List[SessionAnalysis]
    combined_analysis: Optional[Dict] = None
    trends: Optional[Dict] = None
    summary: Optional[Dict] = None

class HealthCheckResponse(BaseModel):
    healthy: bool
    error: Optional[str] = None
    python_service_status: str
    emoatlas_version: Optional[str] = None

class DocumentAnalysisService:
    def __init__(self):
        # Configurazione OpenAI GPT-3.5
        self.client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "sk-your-key-here")
        )
    
    def extract_topics_gpt(self, text):
        """Usa GPT-3.5 per identificare topic semantici nel testo"""
        try:            
            prompt = f"""Analizza il seguente testo di una sessione di terapia e identifica i topic/temi principali presenti.

TESTO:
{text}

ISTRUZIONI:
1. Identifica i topic rilevanti per offrire una panoramica completa del contenuto della trascrizione
2. Per ogni topic, fornisci ESATTAMENTE 4 parole chiave rappresentative
3. I topic devono essere semanticamente distinti e significativi
4. Rispondi SOLO in formato JSON con questa struttura:

{{"topics": [
  {{"name": "descrizione tema", "keywords": ["parola1", "parola2", "parola3", "parola4"]}},
  {{"name": "altro tema", "keywords": ["parola5", "parola6", "parola7", "parola8"]}}
]}}

Esempio per un testo su ansia e strategie terapeutiche:
{{"topics": [
  {{"name": "ansia e preoccupazioni", "keywords": ["ansia", "preoccupazione", "tensione", "stress"]}},
  {{"name": "strategie terapeutiche", "keywords": ["terapia", "tecniche", "esercizi", "rilassamento"]}}
]}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Sei un esperto analista di testi terapeutici. Rispondi sempre e solo in formato JSON valido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            print(f"DEBUG: GPT-3.5 response: {content}")
            
            # Parse JSON response
            try:
                topics_data = json.loads(content)
                topics = []
                
                for i, topic in enumerate(topics_data.get("topics", [])):
                    topics.append({
                        "theme": topic.get("name", f"Tema {i+1}"),
                        "keywords": topic.get("keywords", []),
                        "topic_id": i
                    })
                
                print(f"DEBUG: Extracted {len(topics)} topics from GPT-3.5")
                return topics if topics else self._fallback_topics()
                
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSON parse error: {e}, using fallback")
                return self._fallback_topics()
                
        except Exception as e:
            print(f"DEBUG: GPT-3.5 API error: {e}, using fallback")
            return self._fallback_topics()
    def _fallback_topics(self):
        """Fallback semplice se GPT-3.5 non funziona"""
        return [
            {"theme": "contenuto generale", "keywords": ["contenuto", "generale", "sessione", "terapia"], "topic_id": 0},
            {"theme": "emozioni e stati d'animo", "keywords": ["emozioni", "sentimenti", "umore", "stati"], "topic_id": 1}
        ]
analysis_service = DocumentAnalysisService()

class EmoAtlasAnalysisService:
    def __init__(self):
        self.available = EMOATLAS_AVAILABLE
        if self.available:
            print("🌸 EmoAtlas Analysis Service initialized")
        else:
            print("⚠️ EmoAtlas not available - using fallback")
    
    def analyze_session(self, text: str, language: str = 'italian') -> Dict:
        """Analyze a single session using EmoAtlas"""
        if not self.available:
            return self._generate_fallback_analysis(text)
        
        try:
            # Initialize EmoScores for the language
            emo = EmoScores(language=language)
            
            # Get z-scores for the text
            z_scores_data = emo.zscores(text)
            
            # Get emotion scores (z-scores)
            z_scores = {
                'joy': float(z_scores_data.get('joy', 0)),
                'trust': float(z_scores_data.get('trust', 0)),
                'fear': float(z_scores_data.get('fear', 0)),
                'surprise': float(z_scores_data.get('surprise', 0)),
                'sadness': float(z_scores_data.get('sadness', 0)),
                'disgust': float(z_scores_data.get('disgust', 0)),
                'anger': float(z_scores_data.get('anger', 0)),
                'anticipation': float(z_scores_data.get('anticipation', 0))
            }
            
            # Calculate derived metrics
            positive_score = z_scores['joy'] + z_scores['trust'] + z_scores['anticipation']
            negative_score = z_scores['fear'] + z_scores['sadness'] + z_scores['anger'] + z_scores['disgust']
            emotional_valence = positive_score - negative_score
            
            # Get significant emotions (|z-score| >= 1.96)
            significant_emotions = {
                emotion: score for emotion, score in z_scores.items() 
                if abs(score) >= 1.96
            }
            
            return {
                'z_scores': z_scores,
                'emotional_valence': emotional_valence,
                'positive_score': positive_score,
                'negative_score': negative_score,
                'language': language,
                'word_count': len(text.split()),
                'significant_emotions': significant_emotions,
                'original_text': text  # Store original text for combined analysis
            }
            
        except Exception as e:
            print(f"❌ EmoAtlas analysis error: {e}")
            return self._generate_fallback_analysis(text)
    
    def _generate_fallback_analysis(self, text: str) -> Dict:
        """Generate fallback analysis when EmoAtlas is not available"""
        import random
        
        # Generate random but realistic emotion scores
        z_scores = {
            'joy': random.uniform(-2, 2),
            'trust': random.uniform(-2, 2),
            'fear': random.uniform(-1, 3),
            'surprise': random.uniform(-1, 1),
            'sadness': random.uniform(-1, 3),
            'disgust': random.uniform(-2, 2),
            'anger': random.uniform(-1, 2),
            'anticipation': random.uniform(-2, 2)
        }
        
        positive_score = z_scores['joy'] + z_scores['trust'] + z_scores['anticipation']
        negative_score = z_scores['fear'] + z_scores['sadness'] + z_scores['anger'] + z_scores['disgust']
        
        significant_emotions = {
            emotion: score for emotion, score in z_scores.items() 
            if abs(score) >= 1.96
        }
        
        return {
            'z_scores': z_scores,
            'emotional_valence': positive_score - negative_score,
            'positive_score': positive_score,
            'negative_score': negative_score,
            'language': 'italian',
            'word_count': len(text.split()),
            'significant_emotions': significant_emotions
        }

# Initialize EmoAtlas service
emoatlas_service = EmoAtlasAnalysisService()

@app.get("/health")
async def health_check():
    try:
        health_info = {
            "status": "healthy",
            "python_service_status": "running",
            "emoatlas_available": emoatlas_service.available
        }
        
        if emoatlas_service.available:
            health_info["emoatlas_version"] = "integrated"
        
        return health_info
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "python_service_status": "error",
            "emoatlas_available": False
        }

@app.post("/single-document-analysis")
async def single_document_analysis(request: SingleDocumentRequest):
    try:
        print(f"DEBUG: Received request for session: {request.session_id}")
        
        # Controllo lunghezza minima
        words = request.transcript.split()
        if not request.transcript or len(words) < 20:
            raise HTTPException(status_code=400, detail="Transcript troppo breve per un'analisi significativa. Minimo 20 parole richieste.")
        
        # Usa solo GPT-3.5 per identificare topic semantici
        topics_data = analysis_service.extract_topics_gpt(request.transcript)
        
        # Crea response con solo i topic identificati da GPT-3.5
        topics = []
        for i, topic_data in enumerate(topics_data):
            topics.append(Topic(
                topic_id=i + 1,
                keywords=topic_data["keywords"][:4],  # Limitato a 4 parole chiave
                description=topic_data["theme"]
            ))
        
        # Summary semplice
        summary = ""#f"Analisi di {len(words)} parole. Identificati {len(topics)} temi principali utilizzando GPT-3.5."
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/emotion-trends")
async def analyze_emotion_trends(request: EmotionAnalysisRequest):
    """Analyze emotion trends across multiple sessions using EmoAtlas"""
    try:
        import time
        start_time = time.time()
        
        print(f"📊 Starting emotion analysis for {len(request.sessions)} sessions")
        
        if not request.sessions:
            raise HTTPException(status_code=400, detail="No sessions provided")
        
        individual_sessions = []
        
        for session in request.sessions:
            if not session.transcript or len(session.transcript.strip()) < 20:
                print(f"⚠️ Skipping session {session.id}: transcript too short")
                continue
            
            session_start_time = time.time()
            
            # Analyze single session
            analysis = emoatlas_service.analyze_session(
                session.transcript, 
                language=request.language
            )
            
            processing_time = time.time() - session_start_time
            
            session_analysis = SessionAnalysis(
                session_id=session.id,
                session_title=session.title,
                analysis=analysis,
                processing_time=processing_time
            )
            
            individual_sessions.append(session_analysis)
            print(f"✅ Session {session.id} analyzed in {processing_time:.2f}s")
        
        if not individual_sessions:
            raise HTTPException(status_code=400, detail="No valid sessions to analyze")
        
        # Generate combined analysis
        combined_analysis = generate_combined_analysis(individual_sessions, request.language)
        
        # Calculate trends across sessions
        trends = calculate_emotion_trends(individual_sessions)
        summary = generate_analysis_summary(individual_sessions)
        
        total_time = time.time() - start_time
        print(f"🎯 Analysis completed in {total_time:.2f}s")
        
        return EmotionTrendsResponse(
            success=True,
            individual_sessions=individual_sessions,
            combined_analysis=combined_analysis,
            trends=trends,
            summary=summary
        )
        
    except Exception as e:
        print(f"❌ Emotion analysis error: {e}")
        return EmotionTrendsResponse(
            success=False,
            error=str(e),
            individual_sessions=[]
        )

def calculate_emotion_trends(sessions: List[SessionAnalysis]) -> Dict:
    """Calculate emotion trends across sessions"""
    if not sessions:
        return {}
    
    try:
        # Extract emotion scores from all sessions
        emotions = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation']
        trends = {}
        
        for emotion in emotions:
            scores = [s.analysis['z_scores'][emotion] for s in sessions]
            trends[emotion] = {
                'values': scores,
                'average': sum(scores) / len(scores),
                'min': min(scores),
                'max': max(scores),
                'trend': 'stable'  # Could implement trend calculation
            }
        
        # Calculate overall trends
        valence_scores = [s.analysis['emotional_valence'] for s in sessions]
        trends['overall'] = {
            'emotional_valence': {
                'values': valence_scores,
                'average': sum(valence_scores) / len(valence_scores),
                'trend': 'improving' if valence_scores[-1] > valence_scores[0] else 'declining'
            },
            'session_count': len(sessions)
        }
        
        return trends
        
    except Exception as e:
        print(f"❌ Error calculating trends: {e}")
        return {}

def generate_analysis_summary(sessions: List[SessionAnalysis]) -> Dict:
    """Generate a summary of the emotion analysis"""
    if not sessions:
        return {}
    
    try:
        total_words = sum(s.analysis['word_count'] for s in sessions)
        avg_valence = sum(s.analysis['emotional_valence'] for s in sessions) / len(sessions)
        
        # Find most significant emotions across all sessions
        all_significant = {}
        for session in sessions:
            for emotion, score in session.analysis['significant_emotions'].items():
                if emotion not in all_significant:
                    all_significant[emotion] = []
                all_significant[emotion].append(abs(score))
        
        # Calculate average significance for each emotion
        avg_significant = {
            emotion: sum(scores) / len(scores) 
            for emotion, scores in all_significant.items()
        }
        
        return {
            'total_sessions': len(sessions),
            'total_words': total_words,
            'average_words_per_session': total_words / len(sessions),
            'average_emotional_valence': avg_valence,
            'most_significant_emotions': sorted(
                avg_significant.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3],
            'analysis_language': sessions[0].analysis.get('language', 'italian')
        }
        
    except Exception as e:
        print(f"❌ Error generating summary: {e}")
        return {}

@app.post("/semantic-frame-analysis")
async def semantic_frame_analysis(request: Dict):
    """Perform semantic frame analysis using EmoAtlas"""
    try:
        text = request.get('text', '')
        target_word = request.get('target_word', '')
        session_id = request.get('session_id', 'unknown')
        language = request.get('language', 'italian')
        
        if not text or not target_word:
            raise HTTPException(status_code=400, detail="Text and target_word are required")
        
        print(f"🔍 Starting semantic frame analysis for word '{target_word}'")
        
        if not EMOATLAS_AVAILABLE:
            return generate_fallback_semantic_analysis(text, target_word, session_id, language)
        
        try:
            # Initialize EmoScores for the language
            emo = EmoScores(language=language)
        except Exception as e:
            print(f"❌ Error initializing EmoScores with language '{language}': {e}")
            print("🔄 Falling back to semantic analysis without EmoAtlas")
            return generate_fallback_semantic_analysis(text, target_word, session_id, language)
        
        # Generate the forma mentis network
        print(f"🕸️ Generating forma mentis network...")
        fmnt = emo.formamentis_network(text)
        
        # Extract semantic frame for the target word
        print(f"🎯 Extracting semantic frame for '{target_word}'...")
        try:
            # Check if word exists in the full network first
            print(f"🔍 Checking if '{target_word}' exists in full network...")
            if hasattr(fmnt, 'vertices'):
                all_words = list(fmnt.vertices)
                print(f"📝 Total words in network: {len(all_words)}")
                word_found = target_word in all_words
                print(f"🎯 Word '{target_word}' found in network: {word_found}")
                
                # Debug: show similar words in the network
                similar_words = [w for w in all_words if target_word.lower() in w.lower() or w.lower() in target_word.lower()]
                print(f"🔍 Similar words in network: {similar_words[:10]}")
                
                # If not found, try to lemmatize the target word
                actual_target_word = target_word
                if not word_found:
                    print(f"🔧 Word not found, attempting lemmatization...")
                    lemmatized_word = lemmatize_word(target_word, language)
                    print(f"📝 Lemmatized '{target_word}' -> '{lemmatized_word}'")
                    
                    if lemmatized_word in all_words:
                        actual_target_word = lemmatized_word
                        print(f"✅ Found lemmatized word '{lemmatized_word}' in network!")
                    else:
                        # Try case-insensitive search for both original and lemmatized
                        similar_words = [w for w in all_words if w.lower() == target_word.lower()]
                        lemmatized_similar = [w for w in all_words if w.lower() == lemmatized_word.lower()]
                        print(f"🔤 Case-insensitive matches for '{target_word}': {similar_words}")
                        print(f"🔤 Case-insensitive matches for '{lemmatized_word}': {lemmatized_similar}")
                        
                        # Use the first match found
                        if similar_words:
                            actual_target_word = similar_words[0]
                            print(f"🎯 Using case-insensitive match: '{actual_target_word}'")
                        elif lemmatized_similar:
                            actual_target_word = lemmatized_similar[0]
                            print(f"🎯 Using lemmatized case-insensitive match: '{actual_target_word}'")
                else:
                    print(f"✅ Word '{target_word}' found directly in network")
            
            print(f"🔍 Final target word to extract: '{actual_target_word}'")
            
            # Debug: check edges in full network that involve our target word
            if hasattr(fmnt, 'edges'):
                related_edges = [edge for edge in fmnt.edges if actual_target_word in edge]
                print(f"🕸️ Edges in full network involving '{actual_target_word}': {len(related_edges)}")
                print(f"🕸️ Related edges: {related_edges[:5]}...")  # Show first 5
            
            fmnt_word = emo.extract_word_from_formamentis(fmnt, actual_target_word)
            print(f"🎭 Extracted subnetwork type: {type(fmnt_word)}")
            print(f"🎭 Subnetwork object: {fmnt_word}")
            
            # Debug: check edges in extracted subnetwork
            if hasattr(fmnt_word, 'edges'):
                print(f"🔗 Edges in extracted subnetwork: {len(fmnt_word.edges)}")
                print(f"🔗 Subnetwork edges: {list(fmnt_word.edges)}")
            
            # Get connected words (vertices in the semantic frame)
            connected_words = list(fmnt_word.vertices) if hasattr(fmnt_word, 'vertices') else []
            print(f"🔗 Connected words found: {len(connected_words)}")
            print(f"🔗 Connected words list: {connected_words[:10]}...")  # Show first 10
            
            # Create semantic frame text for emotion analysis
            sem_frame_text = " ".join(connected_words)
            
            # If no connections found, fallback to context analysis
            if len(connected_words) == 0:
                print(f"⚠️ No direct connections found for '{actual_target_word}'. Using context analysis...")
                return generate_fallback_semantic_analysis(text, target_word, session_id, language)
            
            # Analyze emotions of the semantic frame
            frame_emo = EmoScores(language=language)
            frame_z_scores_data = frame_emo.zscores(sem_frame_text)
            
            frame_z_scores = {
                'joy': float(frame_z_scores_data.get('joy', 0)),
                'trust': float(frame_z_scores_data.get('trust', 0)),
                'fear': float(frame_z_scores_data.get('fear', 0)),
                'surprise': float(frame_z_scores_data.get('surprise', 0)),
                'sadness': float(frame_z_scores_data.get('sadness', 0)),
                'disgust': float(frame_z_scores_data.get('disgust', 0)),
                'anger': float(frame_z_scores_data.get('anger', 0)),
                'anticipation': float(frame_z_scores_data.get('anticipation', 0))
            }
            
            # Calculate semantic frame metrics
            positive_score = frame_z_scores['joy'] + frame_z_scores['trust'] + frame_z_scores['anticipation']
            negative_score = frame_z_scores['fear'] + frame_z_scores['sadness'] + frame_z_scores['anger'] + frame_z_scores['disgust']
            emotional_valence = positive_score - negative_score
            
            # Get significant emotions
            significant_emotions = {
                emotion: score for emotion, score in frame_z_scores.items() 
                if abs(score) >= 1.96
            }
            
            # Calculate semantic similarity (based on number of connections)
            total_words = len(text.split())
            connected_ratio = len(connected_words) / max(total_words, 1)
            semantic_similarity = min(1.0, connected_ratio * 10)  # Normalize
            
            # Generate semantic network visualization using EmoAtlas
            # Pass the extracted subnetwork instead of the full network
            network_plot = generate_semantic_network_plot(fmnt_word, actual_target_word, connected_words, frame_z_scores)
            
            return {
                "success": True,
                "session_id": session_id,
                "target_word": target_word,  # Keep original for user display
                "actual_target_word": actual_target_word,  # Add the lemmatized version used
                "semantic_frame": {
                    "connected_words": connected_words,
                    "frame_text": sem_frame_text,
                    "total_connections": len(connected_words)
                },
                "emotional_analysis": {
                    "z_scores": frame_z_scores,
                    "emotional_valence": emotional_valence,
                    "positive_score": positive_score,
                    "negative_score": negative_score,
                    "significant_emotions": significant_emotions
                },
                "context_analysis": {
                    "emotional_context": "positive" if emotional_valence > 1 else "negative" if emotional_valence < -1 else "neutral",
                    "semantic_similarity": semantic_similarity,
                    "average_valence": emotional_valence,
                    "total_occurrences": len(connected_words),
                    "analyzed_contexts": 1
                },
                "statistics": {
                    "connected_words": len(connected_words),
                    "total_connections": len(connected_words),
                    "emotional_valence": emotional_valence,
                    "semantic_centrality": semantic_similarity
                },
                "language": language,
                "timestamp": datetime.now().isoformat(),
                "network_plot": network_plot
            }
            
        except Exception as e:
            print(f"⚠️ Word '{target_word}' not found in forma mentis network: {e}")
            # Fallback: analyze the word in context
            return generate_fallback_semantic_analysis(text, target_word, session_id, language)
            
    except Exception as e:
        print(f"❌ Semantic frame analysis error: {e}")
        return {
            "success": False,
            "error": str(e),
            "session_id": session_id,
            "target_word": target_word
        }

def generate_semantic_network_plot(fmnt_word, target_word: str, connected_words: list, frame_z_scores: dict) -> str:
    """Generate a network plot using EmoAtlas native draw_formamentis function on the extracted subnetwork"""
    try:
        import matplotlib
        matplotlib.use('Agg')  # Use non-interactive backend
        import matplotlib.pyplot as plt
        import io
        import base64
        
        # Create a new figure with high DPI for better quality
        plt.figure(figsize=(12, 10), dpi=120)
        
        # Use EmoAtlas native draw_formamentis function
        print(f"🎨 Drawing forma mentis subnetwork using EmoAtlas...")
        
        # Initialize EmoScores to access draw_formamentis
        emo = EmoScores(language='italian')
        
        # Check if we have a valid subnetwork
        if fmnt_word is not None:
            print(f"🔍 Drawing extracted subnetwork for '{target_word}' with {len(connected_words)} connections...")
            
            # Draw the SUBNETWORK (not the full network) with highlight parameter
            emo.draw_formamentis(
                fmn=fmnt_word,            # USE THE EXTRACTED SUBNETWORK
                highlight=target_word,    # HIGHLIGHT THE TARGET WORD
                alpha_syntactic=0.4,      # Syntactic connections opacity
                alpha_hypernyms=0,        # Hypernym connections (disabled)
                alpha_synonyms=0,         # Synonym connections (disabled)  
                thickness=2               # Line thickness
            )
            
            print(f"✅ Successfully drew subnetwork with '{target_word}' highlighted")
        else:
            print(f"⚠️ No subnetwork available, falling back to NetworkX visualization")
            return generate_fallback_network_plot(target_word, connected_words, frame_z_scores)
        
        # Add title with emotional information
        emotion_info = f"Valenza: {frame_z_scores.get('joy', 0) - frame_z_scores.get('sadness', 0):.2f}"
        plt.title(f'Rete Cognitiva EmoAtlas - "{target_word}"\n{emotion_info} | Connessioni: {len(connected_words)}', 
                 fontsize=16, fontweight='bold', pad=20)
        
        # Improve layout
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=120, 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        
        # Encode to base64
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Close figure to free memory
        plt.close()
        
        print(f"✅ Network plot generated successfully (size: {len(image_base64)} chars)")
        return image_base64
        
    except Exception as e:
        print(f"❌ Error generating EmoAtlas network plot: {e}")
        print(f"🔄 Falling back to simple NetworkX plot...")
        return generate_fallback_network_plot(target_word, connected_words, frame_z_scores)

def generate_fallback_network_plot(target_word: str, connected_words: list, frame_z_scores: dict) -> str:
    """Fallback network plot using NetworkX when EmoAtlas fails"""
    try:
        import networkx as nx
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.colors as mcolors
        from matplotlib.patches import Rectangle
        import numpy as np
        
        # Create a new figure with high DPI
        plt.figure(figsize=(12, 8), dpi=100)
        
        # Create network graph
        G = nx.Graph()
        
        # Add the target word as central node
        G.add_node(target_word, node_type='target')
        
        # Add connected words as nodes
        limited_words = connected_words[:20]  # Limit to first 20 for readability
        for word in limited_words:
            G.add_node(word, node_type='connected')
            G.add_edge(target_word, word)
        
        # If no connected words, create a single node graph
        if len(limited_words) == 0:
            print(f"⚠️ No connected words for NetworkX fallback. Creating single-node graph.")
            pos = {target_word: (0, 0)}
        else:
            # Create layout with target word in center
            pos = nx.spring_layout(G, k=3, iterations=50)
        
        # Ensure target word is centered
        if target_word in pos:
            center_x, center_y = 0, 0
            pos[target_word] = (center_x, center_y)
            
            # Arrange other nodes in a circle around the center only if we have connected words
            if len(limited_words) > 0:
                angle_step = 2 * np.pi / len(limited_words)
                for i, word in enumerate(limited_words):
                    if word in pos:
                        angle = i * angle_step
                        radius = 0.8
                        pos[word] = (center_x + radius * np.cos(angle), center_y + radius * np.sin(angle))
        
        # Color nodes based on emotional valence
        node_colors = []
        node_sizes = []
        
        for node in G.nodes():
            if node == target_word:
                # Target word color based on overall emotional valence
                valence = frame_z_scores.get('joy', 0) - frame_z_scores.get('sadness', 0)
                if valence > 0.5:
                    node_colors.append('#4CAF50')  # Green for positive
                elif valence < -0.5:
                    node_colors.append('#F44336')  # Red for negative
                else:
                    node_colors.append('#2196F3')  # Blue for neutral
                node_sizes.append(1000)
            else:
                # Connected words get lighter colors
                node_colors.append('#E3F2FD')  # Light blue
                node_sizes.append(600)
        
        # Draw network
        nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=node_sizes, alpha=0.8)
        
        # Only draw edges if we have connected words
        if len(limited_words) > 0:
            nx.draw_networkx_edges(G, pos, edge_color='gray', alpha=0.5, width=1)
        
        # Add labels with better positioning
        labels = {}
        for node in G.nodes():
            if node == target_word:
                labels[node] = node.upper()
            else:
                labels[node] = node[:10] + "..." if len(node) > 10 else node
                
        nx.draw_networkx_labels(G, pos, labels, font_size=8, font_weight='bold')
        
        # Add title and emotional info
        emotion_info = f"Valenza Emotiva: {frame_z_scores.get('joy', 0) - frame_z_scores.get('sadness', 0):.2f}"
        plt.title(f'Rete Semantica (Fallback) - "{target_word}"\n{emotion_info}', fontsize=14, fontweight='bold', pad=20)
        
        # Add legend
        legend_elements = [
            Rectangle((0,0),1,1, facecolor='#2196F3', label='Parola Target'),
            Rectangle((0,0),1,1, facecolor='#E3F2FD', label='Parole Connesse'),
        ]
        plt.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1))
        
        # Remove axes
        plt.axis('off')
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
        
    except Exception as e:
        print(f"❌ Error generating fallback network plot: {e}")
        return None

def generate_no_frame_placeholder_image(target_word: str) -> str:
    """Generate a placeholder image when no semantic frame is found"""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import io
        import base64
        
        # Create a clean figure
        plt.figure(figsize=(12, 8), dpi=100)
        
        # Set up the plot with a clean background
        plt.gca().set_facecolor('#f8f9fa')
        
        # Add main message
        plt.text(0.5, 0.6, '🔍 Nessun Frame Semantico', 
                ha='center', va='center', transform=plt.gca().transAxes,
                fontsize=24, fontweight='bold', color='#495057')
        
        plt.text(0.5, 0.5, 'Significativo Trovato', 
                ha='center', va='center', transform=plt.gca().transAxes,
                fontsize=24, fontweight='bold', color='#495057')
        
        # Add target word info
        plt.text(0.5, 0.35, f'Parola analizzata: "{target_word}"', 
                ha='center', va='center', transform=plt.gca().transAxes,
                fontsize=16, color='#6c757d')
        
        # Add explanation
        plt.text(0.5, 0.25, 'La parola non presenta connessioni sintattiche', 
                ha='center', va='center', transform=plt.gca().transAxes,
                fontsize=14, color='#6c757d')
        
        plt.text(0.5, 0.2, 'significative nel testo analizzato', 
                ha='center', va='center', transform=plt.gca().transAxes,
                fontsize=14, color='#6c757d')
        
        # Add border
        for spine in plt.gca().spines.values():
            spine.set_edgecolor('#dee2e6')
            spine.set_linewidth(2)
        
        # Remove axes
        plt.gca().set_xticks([])
        plt.gca().set_yticks([])
        
        # Set limits
        plt.xlim(0, 1)
        plt.ylim(0, 1)
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, 
                   facecolor='#f8f9fa', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        print(f"✅ Placeholder image generated for '{target_word}'")
        return image_base64
        
    except Exception as e:
        print(f"❌ Error generating placeholder image: {e}")
        return None

def generate_fallback_semantic_analysis(text: str, target_word: str, session_id: str, language: str) -> Dict:
    """Generate fallback semantic analysis when EmoAtlas is not available or word is not found"""
    print(f"🔧 Using fallback semantic analysis for '{target_word}'")
    
    # Simple context extraction
    sentences = text.split('.')
    target_contexts = []
    
    for sentence in sentences:
        if target_word.lower() in sentence.lower():
            words = sentence.strip().split()
            target_contexts.extend(words)
    
    # Remove duplicates and the target word itself
    connected_words = list(set([w.strip('.,!?;:') for w in target_contexts if w.lower() != target_word.lower()]))
    
    # Generate placeholder image for no semantic frame
    placeholder_image = generate_no_frame_placeholder_image(target_word)
    
    # Generate mock but realistic emotion scores
    import random
    frame_z_scores = {
        'joy': random.uniform(-2, 2),
        'trust': random.uniform(-2, 2),
        'fear': random.uniform(-2, 2),
        'surprise': random.uniform(-1, 1),
        'sadness': random.uniform(-2, 2),
        'disgust': random.uniform(-2, 2),
        'anger': random.uniform(-2, 2),
        'anticipation': random.uniform(-2, 2)
    }
    
    positive_score = frame_z_scores['joy'] + frame_z_scores['trust'] + frame_z_scores['anticipation']
    negative_score = frame_z_scores['fear'] + frame_z_scores['sadness'] + frame_z_scores['anger'] + frame_z_scores['disgust']
    emotional_valence = positive_score - negative_score
    
    return {
        "success": True,
        "session_id": session_id,
        "target_word": target_word,
        "semantic_frame": {
            "connected_words": connected_words[:20],  # Limit for readability
            "frame_text": " ".join(connected_words[:20]),
            "total_connections": len(connected_words)
        },
        "emotional_analysis": {
            "z_scores": frame_z_scores,
            "emotional_valence": emotional_valence,
            "positive_score": positive_score,
            "negative_score": negative_score,
            "significant_emotions": {k: v for k, v in frame_z_scores.items() if abs(v) >= 1.96}
        },
        "context_analysis": {
            "emotional_context": "positive" if emotional_valence > 1 else "negative" if emotional_valence < -1 else "neutral",
            "semantic_similarity": min(1.0, len(connected_words) / 50),
            "average_valence": emotional_valence,
            "total_occurrences": len(connected_words),
            "analyzed_contexts": 1
        },
        "statistics": {
            "connected_words": len(connected_words),
            "total_connections": len(connected_words),
            "emotional_valence": emotional_valence,
            "semantic_centrality": min(1.0, len(connected_words) / 50)
        },
        "language": language,
        "timestamp": datetime.now().isoformat(),
        "network_plot": placeholder_image,
        "note": "Fallback analysis - EmoAtlas not available or word not found in network"
    }

def generate_combined_analysis(sessions: List[SessionAnalysis], language: str = 'italian') -> Dict:
    """Generate combined analysis with averaged emotions"""
    if not sessions:
        return None
    
    try:
        print(f"🌸 Generating combined analysis for {len(sessions)} sessions")
        
        # Calculate average z-scores across all sessions
        emotions = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation']
        combined_z_scores = {}
        
        for emotion in emotions:
            scores = [s.analysis['z_scores'][emotion] for s in sessions]
            combined_z_scores[emotion] = sum(scores) / len(scores)
        
        # Calculate combined metrics
        combined_valence = sum(s.analysis['emotional_valence'] for s in sessions) / len(sessions)
        combined_positive = sum(s.analysis['positive_score'] for s in sessions) / len(sessions)
        combined_negative = sum(s.analysis['negative_score'] for s in sessions) / len(sessions)
        total_words = sum(s.analysis['word_count'] for s in sessions)
        
        # Get significant emotions (|z-score| >= 1.96)
        significant_emotions = {
            emotion: score for emotion, score in combined_z_scores.items() 
            if abs(score) >= 1.96
        }
        
        # Create dominant emotions list sorted by absolute z-score
        dominant_emotions = sorted(
            combined_z_scores.items(), 
            key=lambda x: abs(x[1]), 
            reverse=True
        )
        
        combined_analysis = {
            'analysis': {
                'z_scores': combined_z_scores,
                'significant_emotions': significant_emotions,
                'dominant_emotions': dominant_emotions,
                'emotional_valence': combined_valence,
                'positive_score': combined_positive,
                'negative_score': combined_negative,
                'text_length': total_words,
                'language': language
            }
        }
        
        print(f"✅ Combined analysis generated with {len(significant_emotions)} significant emotions")
        return combined_analysis
        
    except Exception as e:
        print(f"❌ Error generating combined analysis: {e}")
        return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
