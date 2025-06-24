from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
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

analysis_service = DocumentAnalysisService()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
