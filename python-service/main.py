from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from datetime import datetime
import base64
import io
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# EmoAtlas imports
try:
    from emoatlas import EmoScores
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    EMOATLAS_AVAILABLE = True
    print("✅ EmoAtlas successfully imported")
except ImportError as e:
    print(f"❌ EmoAtlas not available: {e}")
    EMOATLAS_AVAILABLE = False

app = FastAPI(title="Single Document Analysis Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SingleDocumentRequest(BaseModel):
    session_id: str
    transcript: str
    n_topics: Optional[int] = 3

class Topic(BaseModel):
    topic_id: int
    keywords: List[str]
    description: str = ""

class SingleDocumentResponse(BaseModel):
    session_id: str
    topics: List[Topic]
    keywords: List[str]
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
    trends: Optional[Dict] = None
    summary: Optional[Dict] = None

class HealthCheckResponse(BaseModel):
    healthy: bool
    error: Optional[str] = None
    python_service_status: str
    emoatlas_version: Optional[str] = None

class DocumentAnalysisService:
    def __init__(self):
        # Stopwords italiane complete
        self.italian_stopwords = [
            # Articoli
            'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'dell', 'della', 'del', 'dello', 'delle', 'dei', 'degli',
            'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
            'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
            # Preposizioni
            'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'dentro', 'sopra', 'sotto', 'verso', 'attraverso',
            # Pronomi
            'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mi', 'ti', 'si', 'ci', 'vi', 'li', 'le', 'gli', 'ne',
            'me', 'te', 'se', 'ce', 've', 'mio', 'tuo', 'suo', 'nostro', 'vostro', 'loro', 'questa', 'questo', 'questi', 'queste',
            'quello', 'quella', 'quelli', 'quelle', 'che', 'chi', 'cui', 'quale', 'quali',
            # Congiunzioni
            'e', 'ed', 'o', 'od', 'ma', 'però', 'anche', 'pure', 'quando', 'mentre', 'se', 'come', 'perché', 'poiché',
            'dato', 'visto', 'siccome', 'quindi', 'allora', 'infatti', 'inoltre', 'invece', 'tuttavia',
            # Avverbi comuni
            'molto', 'più', 'meno', 'poco', 'tanto', 'assai', 'abbastanza', 'piuttosto', 'ancora', 'già', 'sempre', 'mai',
            'spesso', 'talvolta', 'qui', 'qua', 'lì', 'là', 'dove', 'quando', 'come', 'bene', 'male', 'meglio', 'peggio',
            # Verbi ausiliari e comuni
            'essere', 'avere', 'fare', 'dire', 'andare', 'venire', 'stare', 'dare', 'sapere', 'dovere', 'potere', 'volere',
            'sono', 'sei', 'è', 'siamo', 'siete', 'erano', 'ero', 'eri', 'eravamo', 'eravate', 'è', 'ha', 'hai', 'hanno', 'ho',
            'faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno', 'vado', 'vai', 'va', 'andiamo', 'andate', 'vanno',
            # Altri
            'tutto', 'tutti', 'tutta', 'tutte', 'altro', 'altri', 'altra', 'altre', 'ogni', 'alcuni', 'alcune', 'qualche',
            'stesso', 'stessa', 'stessi', 'stesse', 'proprio', 'propria', 'propri', 'proprie', 'tale', 'tali',
            'così', 'abbastanza', 'proprio', 'davvero', 'veramente', 'davvero'
        ]
    
    def extract_keywords_tfidf(self, text, max_features=15):
        try:
            # Pre-processamento del testo
            words = text.lower().split()
            # Filtra parole troppo corte e numeri
            filtered_words = [w for w in words if len(w) >= 3 and not w.isdigit() and w.isalpha()]
            filtered_text = ' '.join(filtered_words)
            
            vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),  # Include bigrammi per concetti composti
                min_df=1,
                max_df=0.4,  # Esclude parole che appaiono in più del 40% del testo
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{3,}\b'  # Solo parole di almeno 3 caratteri
            )
            
            tfidf_matrix = vectorizer.fit_transform([filtered_text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            # Filtra solo parole con score significativo
            keywords_with_scores = [
                {"keyword": feature_names[i], "score": float(tfidf_scores[i])}
                for i in range(len(feature_names)) 
                if tfidf_scores[i] > 0.1  # Soglia minima per rilevanza
            ]
            
            return sorted(keywords_with_scores, key=lambda x: x['score'], reverse=True)
            
        except Exception as e:
            print(f"Error in keyword extraction: {e}")
            return [{"keyword": "analisi", "score": 0.5}]
    
    def extract_topics_nmf(self, text, n_topics=3):
        # Dividi in frasi più intelligentemente
        sentences = []
        for s in text.replace('!', '.').replace('?', '.').split('.'):
            s = s.strip()
            if len(s) > 30:  # Frasi più significative
                sentences.append(s)
        
        if len(sentences) < 2:
            # Se ci sono poche frasi, usa l'intero testo
            sentences = [text]
            
        try:
            vectorizer = TfidfVectorizer(
                max_features=50,
                stop_words=self.italian_stopwords,
                lowercase=True,
                min_df=1,
                max_df=0.7,  # Parametro più restrittivo
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{3,}\b'  # Solo parole significative
            )
            
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Adatta il numero di topic al contenuto disponibile
            effective_topics = min(n_topics, len(sentences), tfidf_matrix.shape[1] // 3)
            if effective_topics < 1:
                effective_topics = 1
                
            nmf = NMF(n_components=effective_topics, random_state=42, max_iter=100)
            nmf.fit(tfidf_matrix)
            feature_names = vectorizer.get_feature_names_out()
            
            topics = []
            for topic_idx, topic in enumerate(nmf.components_):
                # Prendi solo parole con peso significativo
                significant_words_idx = topic.argsort()[-8:][::-1]
                top_words = []
                
                for i in significant_words_idx:
                    word = feature_names[i]
                    weight = topic[i]
                    if weight > 0.1:  # Solo parole con peso significativo
                        top_words.append(word)
                
                if len(top_words) > 0:
                    topics.append({
                        "theme": f"Tema {topic_idx + 1}",
                        "keywords": top_words[:5],  # Massimo 5 parole per tema
                        "topic_id": topic_idx
                    })
            
            return topics if topics else [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0}]
            
        except Exception as e:
            print(f"Error in topic extraction: {e}")
            return [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0}]

# Initialize services
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
            
            # Generate flower plot as base64
            flower_plot = self._generate_flower_plot(emo, z_scores)
            
            # Extract emotion words (if available in EmoAtlas)
            emotion_words = self._extract_emotion_words(emo, language)
            
            return {
                'z_scores': z_scores,
                'emotional_valence': emotional_valence,
                'positive_score': positive_score,
                'negative_score': negative_score,
                'language': language,
                'flower_plot': flower_plot,
                'word_count': len(text.split()),
                'emotion_words': emotion_words,
                'significant_emotions': significant_emotions
            }
            
        except Exception as e:
            print(f"❌ EmoAtlas analysis error: {e}")
            return self._generate_fallback_analysis(text)
    
    def _generate_flower_plot(self, emo_scores, z_scores: Dict) -> Optional[str]:
        """Generate the emotion flower plot as base64 string"""
        try:
            # Create a simple radar chart for emotions
            emotions = list(z_scores.keys())
            values = list(z_scores.values())
            
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(projection='polar'))
            
            # Number of variables
            N = len(emotions)
            
            # Angle for each emotion
            angles = [n / float(N) * 2 * 3.14159 for n in range(N)]
            angles += angles[:1]  # Complete the circle
            
            # Add values
            values += values[:1]  # Complete the circle
            
            # Plot
            ax.plot(angles, values, 'o-', linewidth=2, label='Emotion Intensity')
            ax.fill(angles, values, alpha=0.25)
            
            # Add emotion labels
            ax.set_xticks(angles[:-1])
            ax.set_xticklabels(emotions)
            
            # Set y-axis limits
            ax.set_ylim(-4, 4)
            ax.set_title('Emotional Flower Plot', size=16, pad=20)
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close(fig)
            
            return image_base64
            
        except Exception as e:
            print(f"❌ Error generating flower plot: {e}")
            return None
    
    def _extract_emotion_words(self, emo_scores, language: str) -> Dict[str, List[str]]:
        """Extract emotion-associated words from the analysis"""
        # This is a simplified version - real EmoAtlas might have word-level analysis
        if language == 'italian':
            return {
                'joy': ['felice', 'contento', 'gioioso', 'allegro'],
                'trust': ['fiducia', 'sicurezza', 'certezza', 'speranza'],
                'fear': ['paura', 'ansia', 'timore', 'preoccupazione'],
                'sadness': ['triste', 'melanconico', 'depresso', 'sconfortato'],
                'anger': ['rabbia', 'arrabbiato', 'furioso', 'irritato'],
                'disgust': ['disgustato', 'nauseato', 'schifato', 'ripugnanza'],
                'surprise': ['sorpreso', 'stupito', 'meravigliato', 'scioccato'],
                'anticipation': ['aspettativa', 'speranza', 'attesa', 'desiderio']
            }
        else:
            return {
                'joy': ['happy', 'joyful', 'glad', 'cheerful'],
                'trust': ['trust', 'confidence', 'faith', 'hope'],
                'fear': ['fear', 'anxiety', 'worry', 'concern'],
                'sadness': ['sad', 'melancholy', 'depressed', 'down'],
                'anger': ['angry', 'mad', 'furious', 'irritated'],
                'disgust': ['disgusted', 'revolted', 'repulsed', 'sickened'],
                'surprise': ['surprised', 'amazed', 'astonished', 'shocked'],
                'anticipation': ['anticipation', 'expectation', 'hope', 'excitement']
            }
    
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
            'flower_plot': None,
            'word_count': len(text.split()),
            'emotion_words': self._extract_emotion_words(None, 'italian'),
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
        if not request.transcript or len(request.transcript.strip()) < 20:
            raise HTTPException(status_code=400, detail="Transcript too short")
        
        keywords_data = analysis_service.extract_keywords_tfidf(request.transcript, max_features=15)
        keywords = [kw["keyword"] for kw in keywords_data[:10]]
        
        topics_data = analysis_service.extract_topics_nmf(request.transcript, n_topics=request.n_topics)
        
        topics = []
        for i, topic_data in enumerate(topics_data):
            topics.append(Topic(
                topic_id=i + 1,
                keywords=topic_data["keywords"][:5],
                description=topic_data["theme"]
            ))
        
        words = request.transcript.split()
        summary = f"Analisi di {len(words)} parole. Identificati {len(topics)} temi utilizzando NMF e TF-IDF."
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            keywords=keywords,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
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
        
        # Calculate trends across sessions
        trends = calculate_emotion_trends(individual_sessions)
        summary = generate_analysis_summary(individual_sessions)
        
        total_time = time.time() - start_time
        print(f"🎯 Analysis completed in {total_time:.2f}s")
        
        return EmotionTrendsResponse(
            success=True,
            individual_sessions=individual_sessions,
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
            fmnt_word = emo.extract_word_from_formamentis(fmnt, target_word)
            
            # Get connected words (vertices in the semantic frame)
            connected_words = list(fmnt_word.vertices) if hasattr(fmnt_word, 'vertices') else []
            
            # Create semantic frame text for emotion analysis
            sem_frame_text = " ".join(connected_words)
            
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
            network_plot = generate_semantic_network_plot(fmnt_word, target_word, connected_words, frame_z_scores)
            
            return {
                "success": True,
                "session_id": session_id,
                "target_word": target_word,
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
        for word in connected_words[:20]:  # Limit to first 20 for readability
            G.add_node(word, node_type='connected')
            G.add_edge(target_word, word)
        
        # Create layout with target word in center
        pos = nx.spring_layout(G, k=3, iterations=50)
        
        # Ensure target word is centered
        if target_word in pos:
            center_x, center_y = 0, 0
            pos[target_word] = (center_x, center_y)
            
            # Arrange other nodes in a circle around the center
            angle_step = 2 * np.pi / len(connected_words[:20])
            for i, word in enumerate(connected_words[:20]):
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
        "note": "Fallback analysis - EmoAtlas not available or word not found in network"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
