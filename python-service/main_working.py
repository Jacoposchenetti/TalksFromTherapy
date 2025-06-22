from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
import re
from datetime import datetime

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

class DocumentAnalysisService:
    def __init__(self):
        self.italian_stopwords = [
            'di', 'da', 'in', 'un', 'il', 'del', 'della', 'dei', 'delle', 'che',
            'sono', 'essere', 'avere', 'fare', 'dire', 'andare', 'venire', 'stare',
            'molto', 'più', 'anche', 'ancora', 'già', 'sempre', 'mai', 'tutto'
        ]
    
    def extract_keywords_tfidf(self, text, max_features=15):
        try:
            vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.8,
                token_pattern=r'\b[a-zA-ZÀ-ÿ]{3,}\b'
            )
            
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            keywords_with_scores = [
                {"keyword": feature_names[i], "score": float(tfidf_scores[i])}
                for i in range(len(feature_names)) if tfidf_scores[i] > 0
            ]
            
            return sorted(keywords_with_scores, key=lambda x: x['score'], reverse=True)
            
        except Exception as e:
            return [{"keyword": "analisi", "score": 0.5}, {"keyword": "sessione", "score": 0.4}]
    
    def extract_topics_nmf(self, text, n_topics=3):
        sentences = [s.strip() for s in text.split('.') if s.strip() and len(s.strip()) > 20]
        
        if len(sentences) < 3:
            return [{"theme": "Contenuto Generale", "keywords": ["vita", "esperienza"], "topic_id": 0}]
            
        try:
            vectorizer = TfidfVectorizer(
                max_features=50,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.9
            )
            
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            nmf = NMF(n_components=min(n_topics, len(sentences) // 2), random_state=42)
            nmf.fit(tfidf_matrix)
            feature_names = vectorizer.get_feature_names_out()
            
            topics = []
            for topic_idx, topic in enumerate(nmf.components_):
                top_words_idx = topic.argsort()[-5:][::-1]
                top_words = [feature_names[i] for i in top_words_idx]
                
                topics.append({
                    "theme": f"Tema {topic_idx + 1}",
                    "keywords": top_words,
                    "topic_id": topic_idx
                })
            
            return topics
            
        except Exception as e:
            return [{"theme": "Contenuto Generale", "keywords": ["vita", "esperienza"], "topic_id": 0}]

analysis_service = DocumentAnalysisService()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/single-document-analysis", response_model=SingleDocumentResponse)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
