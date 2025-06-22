"""
Single Document Analysis Service
FastAPI service for analyzing therapy session transcripts as single documents
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import NMF
import json
import re
from datetime import datetime

app = FastAPI(title="Single Document Analysis Service", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
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

class DocumentAnalysisService:
    def __init__(self):
        # Italian stopwords for therapy context
        self.italian_stopwords = [
            'di', 'da', 'in', 'un', 'il', 'del', 'della', 'dei', 'delle', 'che',
            'sono', 'essere', 'avere', 'fare', 'dire', 'andare', 'venire', 'stare',
            'dare', 'mettere', 'quando', 'dove', 'come', 'perché', 'molto', 'più',
            'anche', 'ancora', 'già', 'sempre', 'mai', 'oggi', 'ieri', 'domani',
            'poi', 'però', 'quindi', 'mentre', 'invece', 'proprio', 'tutto', 'tutti',
            'cosa', 'cose', 'volta', 'volte', 'anno', 'anni', 'tempo', 'parte',
            'casa', 'vita', 'persone', 'persona', 'momento', 'modo', 'insieme'
        ]
    
    def extract_keywords_tfidf(self, text, max_features=15):
        """
        Extract keywords using TF-IDF (professional NLP method)
        """
        try:
            vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),  # Unigrams and bigrams
                min_df=1,
                max_df=0.8,
                token_pattern=r'\b[a-zA-ZÀ-ÿ]{3,}\b'
            )
            
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            keywords_with_scores = [
                {
                    "keyword": feature_names[i], 
                    "score": float(tfidf_scores[i]), 
                    "frequency": text.lower().count(feature_names[i])
                }
                for i in range(len(feature_names))
                if tfidf_scores[i] > 0
            ]
            
            return sorted(keywords_with_scores, key=lambda x: x['score'], reverse=True)
            
        except Exception as e:
            print(f"TF-IDF extraction failed: {e}")
            return self.extract_keywords_simple(text, max_features)
    
    def extract_keywords_simple(self, text, max_features=15):
        """
        Fallback method for keyword extraction
        """
        words = text.lower().split()
        word_freq = {}
        for word in words:
            word_clean = word.strip('.,!?;:"()')
            if (len(word_clean) > 3 and 
                word_clean not in self.italian_stopwords and
                word_clean.isalpha()):
                word_freq[word_clean] = word_freq.get(word_clean, 0) + 1
        
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:max_features]
        return [
            {"keyword": kw[0], "score": kw[1]/len(words), "frequency": kw[1]} 
            for kw in top_keywords
        ]
    
    def extract_topics_nmf(self, text, n_topics=3):
        """
        Extract topics from single document using NMF
        Perfect for analyzing entire session transcripts
        """
        # Split document into sentences to create pseudo-documents
        sentences = [s.strip() for s in text.split('.') if s.strip() and len(s.strip()) > 20]
        
        if len(sentences) < 3:
            return self.extract_topics_fallback(text)
            
        try:
            # TF-IDF vectorization (NMF works better with TF-IDF)
            vectorizer = TfidfVectorizer(
                max_features=100,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.9,
                token_pattern=r'\b[a-zA-ZÀ-ÿ]{3,}\b'
            )
            
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Apply NMF (Non-negative Matrix Factorization)
            nmf = NMF(
                n_components=min(n_topics, len(sentences) // 2),
                random_state=42,
                max_iter=200,
                alpha=0.1,
                l1_ratio=0.5
            )
            
            nmf.fit(tfidf_matrix)
            feature_names = vectorizer.get_feature_names_out()
            
            topics = []
            for topic_idx, topic in enumerate(nmf.components_):
                # Get top 5 words per topic
                top_words_idx = topic.argsort()[-5:][::-1]
                top_words = [feature_names[i] for i in top_words_idx]
                top_scores = [topic[i] for i in top_words_idx]
                
                # Calculate confidence based on NMF scores
                confidence = float(np.mean(top_scores))
                
                # Assign semantic name to topic
                topic_name = self.assign_topic_name(top_words)
                
                topics.append({
                    "theme": topic_name,
                    "keywords": top_words,
                    "confidence": min(confidence * 0.3, 1.0),  # Normalize confidence
                    "topic_id": topic_idx,
                    "method": "NMF"
                })
            
            return topics
            
        except Exception as e:
            print(f"NMF topic extraction failed: {e}")
            return self.extract_topics_fallback(text)
    
    def assign_topic_name(self, keywords):
        """
        Assign semantic name to topic based on keywords
        """
        keywords_str = ' '.join(keywords).lower()
        
        # Semantic mapping for therapeutic context
        if any(word in keywords_str for word in ['lavoro', 'ufficio', 'colleghi', 'capo', 'professione', 'carriera']):
            return "Ambito Lavorativo"
        elif any(word in keywords_str for word in ['famiglia', 'genitori', 'madre', 'padre', 'fratello', 'sorella']):
            return "Dinamiche Familiari"
        elif any(word in keywords_str for word in ['ansia', 'paura', 'preoccupazione', 'stress', 'nervoso', 'tensione']):
            return "Gestione Ansia"
        elif any(word in keywords_str for word in ['relazione', 'partner', 'amore', 'coppia', 'matrimonio', 'fidanzato']):
            return "Relazioni Sentimentali"
        elif any(word in keywords_str for word in ['studio', 'università', 'ricerca', 'progetto', 'dati', 'tesi']):
            return "Percorso Accademico"
        elif any(word in keywords_str for word in ['aiuto', 'volontariato', 'supporto', 'sociale', 'comunità', 'servizio']):
            return "Impegno Sociale"
        elif any(word in keywords_str for word in ['salute', 'corpo', 'sonno', 'fisico', 'benessere', 'malattia']):
            return "Benessere Fisico"
        elif any(word in keywords_str for word in ['futuro', 'obiettivi', 'sogni', 'speranza', 'cambiamento', 'crescita']):
            return "Prospettive Future"
        elif any(word in keywords_str for word in ['emozioni', 'sentimenti', 'tristezza', 'gioia', 'rabbia']):
            return "Elaborazione Emotiva"
        else:
            return "Riflessione Generale"
    
    def extract_topics_fallback(self, text):
        """
        Fallback method for topic extraction
        """
        return [{
            "theme": "Contenuto Generale",
            "keywords": ["esperienza", "riflessione", "vita"],
            "confidence": 0.5,
            "topic_id": 0,
            "method": "fallback"
        }]

# Initialize service
analysis_service = DocumentAnalysisService()

@app.get("/")
async def root():
    return {"message": "Single Document Analysis Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "single-document-analysis"}

@app.post("/single-document-analysis", response_model=SingleDocumentResponse)
async def single_document_analysis(request: SingleDocumentRequest):
    """
    Analyze entire transcript as single document using NMF
    Extract topics and keywords from complete session
    """
    try:
        if not request.transcript or len(request.transcript.strip()) < 50:
            raise HTTPException(status_code=400, detail="Transcript too short or empty")
          # Extract keywords using TF-IDF (return just the keyword strings)
        keywords_data = analysis_service.extract_keywords_tfidf(
            request.transcript, 
            max_features=15
        )
        keywords = [kw["keyword"] for kw in keywords_data[:10]]
        
        # Extract topics using NMF (convert to frontend format)
        topics_data = analysis_service.extract_topics_nmf(
            request.transcript, 
            n_topics=request.n_topics
        )
        
        topics = []
        for i, topic_data in enumerate(topics_data):
            topics.append(Topic(
                topic_id=i + 1,
                keywords=topic_data["keywords"][:5],
                description=topic_data["theme"]
            ))
        
        # Calculate summary
        words = request.transcript.split()
        total_words = len(words)
        
        summary = f"Analisi di {total_words} parole. Identificati {len(topics)} temi principali utilizzando NMF e TF-IDF. Estratte {len(keywords)} parole chiave significative."
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            keywords=keywords,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Document analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
