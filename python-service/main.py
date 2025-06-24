from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from datetime import datetime
from collections import defaultdict

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
    max_words: Optional[int] = 100  # Numero massimo di parole nel network

class Topic(BaseModel):
    topic_id: int
    keywords: List[str]
    description: str = ""

class NetworkNode(BaseModel):
    id: str
    label: str
    type: str  # 'topic' or 'keyword'
    size: float
    color: str
    cluster: int
    weight: float = 0.0

class NetworkEdge(BaseModel):
    source: str
    target: str
    weight: float
    type: str = "default"

class NetworkData(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]

class SingleDocumentResponse(BaseModel):
    session_id: str
    topics: List[Topic]
    keywords: List[str]
    summary: str
    analysis_timestamp: str
    network_data: NetworkData
    topic_similarities: dict = {}
    total_available_words: int = 0  # Numero totale di parole disponibili

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
    
    def extract_keywords_tfidf(self, text, max_features=20):
        try:
            # Pre-processamento robusto del testo
            words = text.lower().split()
            # Filtra parole significative (almeno 3 caratteri)
            filtered_words = [w for w in words if len(w) >= 3 and not w.isdigit() and w.isalpha()]
            filtered_text = ' '.join(filtered_words)
            
            # Configurazione robusta per analisi di qualità
            vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words=self.italian_stopwords,
                lowercase=True,
                ngram_range=(1, 2),  # Include bigrammi per concetti più complessi
                min_df=1,
                max_df=0.7,  # Esclude parole troppo comuni
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{3,}\b'  # Solo parole significative
            )
            
            tfidf_matrix = vectorizer.fit_transform([filtered_text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            # Filtra solo parole con score significativo per qualità
            keywords_with_scores = [
                {"keyword": feature_names[i], "score": float(tfidf_scores[i])}
                for i in range(len(feature_names)) 
                if tfidf_scores[i] > 0.05  # Soglia per rilevanza
            ]
            
            return sorted(keywords_with_scores, key=lambda x: x['score'], reverse=True)
            
        except Exception as e:
            print(f"Error in keyword extraction: {e}")
            return [{"keyword": "analisi", "score": 0.5}]
    
    def extract_topics_nmf(self, text, n_topics=3):
        # Analisi robusta su frasi significative
        sentences = []
        for s in text.replace('!', '.').replace('?', '.').split('.'):
            s = s.strip()
            if len(s) > 20:  # Solo frasi con contenuto significativo
                sentences.append(s)
        
        if len(sentences) < 2:
            # Se ci sono poche frasi, usa l'intero testo
            sentences = [text]
            
        try:
            # Configurazione robusta per analisi di qualità
            vectorizer = TfidfVectorizer(
                max_features=100,  # Più features per analisi robusta
                stop_words=self.italian_stopwords,
                lowercase=True,
                min_df=1,
                max_df=0.8,  # Bilanciato per catturare pattern significativi
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{3,}\b'  # Solo parole di almeno 3 caratteri
            )
            
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Calcola numero ottimale di topic
            effective_topics = min(n_topics, len(sentences), tfidf_matrix.shape[1] // 4)
            if effective_topics < 1:
                effective_topics = 1
                
            nmf = NMF(n_components=effective_topics, random_state=42, max_iter=200)
            nmf.fit(tfidf_matrix)
            feature_names = vectorizer.get_feature_names_out()
            
            topics = []
            for topic_idx, topic in enumerate(nmf.components_):
                # Seleziona le parole più significative
                significant_words_idx = topic.argsort()[-10:][::-1]
                top_words = []
                
                for i in significant_words_idx:
                    word = feature_names[i]
                    weight = topic[i]
                    if weight > 0.05:  # Solo parole con peso significativo
                        top_words.append(word)
                
                if len(top_words) > 0:
                    topics.append({
                        "theme": f"Tema {topic_idx + 1}",
                        "keywords": top_words[:8],  # Fino a 8 parole per tema
                        "topic_id": topic_idx
                    })
            
            return topics if topics else [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0}]
            
        except Exception as e:
            print(f"Error in topic extraction: {e}")
            return [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0}]

    def calculate_cooccurrence_matrix(self, text, window_size=8):
        """Calcola matrice di co-occorrenza robusta delle parole"""        # Pulizia robusta del testo
        import re
        text_clean = re.sub(r'[^\w\sàèéìòùÀÈÉÌÒÙ]', ' ', text.lower())
        words = text_clean.split()
        
        # Filtro rigoroso per parole significative
        filtered_words = []
        for w in words:
            w = w.strip()
            if (len(w) >= 3 and 
                not w.isdigit() and 
                w.isalpha() and 
                w not in self.italian_stopwords):
                filtered_words.append(w)
        
        print(f"Parole filtrate per co-occorrenza: {len(filtered_words)} da {len(words)} originali")
        
        cooccurrence = defaultdict(lambda: defaultdict(int))
        
        # Finestra di co-occorrenza più ampia per catturare relazioni semantiche
        for i, word in enumerate(filtered_words):
            for j in range(max(0, i - window_size), min(len(filtered_words), i + window_size + 1)):
                if i != j:
                    cooccurrence[word][filtered_words[j]] += 1
        
        print(f"Matrice co-occorrenza: {len(cooccurrence)} parole uniche")
        return cooccurrence
    
    def create_network_data(self, topics_data, cooccurrence, max_words=100):
        """Crea dati per la visualizzazione network con limite rigoroso"""
        nodes = []
        edges = []
        topic_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        
        print(f"DEBUG: Inizio create_network_data con max_words={max_words}")
        
        # 1. Raccogli TUTTE le parole candidate con i loro punteggi
        word_scores = {}
        word_to_cluster = {}
        
        # Topic words hanno priorità massima
        for i, topic in enumerate(topics_data):
            for j, keyword in enumerate(topic["keywords"]):
                if keyword not in word_scores:
                    word_scores[keyword] = 1000 - j  # Priorità alta per topic words
                    word_to_cluster[keyword] = i
        
        print(f"DEBUG: Topic words raccolte: {len(word_scores)}")
        
        # Aggiungi parole dalla co-occorrenza
        cooc_count = 0
        for word, cooc_dict in cooccurrence.items():
            if len(word) >= 3 and word.isalpha():
                total_cooc = sum(cooc_dict.values())
                if total_cooc > 0 and word not in word_scores:
                    word_scores[word] = total_cooc
                    cooc_count += 1
                    # Assegna al topic più correlato
                    best_cluster = len(topics_data)
                    max_correlation = 0
                    for i, topic in enumerate(topics_data):
                        correlation = sum(cooccurrence[word].get(kw, 0) for kw in topic["keywords"])
                        if correlation > max_correlation:
                            max_correlation = correlation
                            best_cluster = i
                    word_to_cluster[word] = best_cluster
        
        print(f"DEBUG: Parole co-occorrenza aggiunte: {cooc_count}")
        print(f"DEBUG: Totale parole candidate: {len(word_scores)}")
        
        # 2. Calcola total_available_words PRIMA del taglio
        total_available_words = len(word_scores)
        
        # 3. Ordina per punteggio e prendi ESATTAMENTE max_words
        sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)
        final_words = [word for word, score in sorted_words[:max_words]]
        
        print(f"DEBUG: Parole finali selezionate: {len(final_words)} (dovrebbe essere <= {max_words})")
        
        # 4. Crea nodi
        for word in final_words:
            cluster = word_to_cluster.get(word, len(topics_data))
            # Normalizza il peso basato sul punteggio
            score = word_scores[word]
            if score >= 1000:  # Topic words
                weight = 1.0
            else:
                weight = min(score / 10.0, 1.0)  # Co-occurrence words
            
            size = 8 + (weight * 15)
            color = topic_colors[cluster % len(topic_colors)] if cluster < len(topic_colors) else '#6b7280'
            
            nodes.append(NetworkNode(
                id=f"word_{word}",
                label=word,
                type="keyword",
                size=size,
                color=color,
                cluster=cluster,
                weight=weight
            ))
        
        # 5. Crea edges basati su co-occorrenza
        edge_count = 0
        for i, word1 in enumerate(final_words):
            for word2 in final_words[i+1:]:
                cooc_score = cooccurrence.get(word1, {}).get(word2, 0)
                if cooc_score >= 1:
                    edges.append(NetworkEdge(
                        source=f"word_{word1}",
                        target=f"word_{word2}",
                        weight=float(min(cooc_score / 3, 1.0)),
                        type="cooccurrence"
                    ))
                    edge_count += 1
        
        print(f"DEBUG: Creati {len(nodes)} nodi e {edge_count} edges")
        print(f"DEBUG: total_available_words = {total_available_words}")
        
        # Verifica che il limite sia rispettato
        assert len(nodes) <= max_words, f"Troppi nodi: {len(nodes)} > {max_words}"
        
        return NetworkData(nodes=nodes, edges=edges), total_available_words

analysis_service = DocumentAnalysisService()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/single-document-analysis")
async def single_document_analysis(request: SingleDocumentRequest):
    try:
        print(f"DEBUG: Received request - max_words: {request.max_words}")
        
        # Controllo severo sulla lunghezza minima per analisi robuste
        words = request.transcript.split()
        if not request.transcript or len(words) < 50:
            raise HTTPException(status_code=400, detail="Transcript troppo breve per un'analisi significativa. Minimo 50 parole richieste.")
        
        keywords_data = analysis_service.extract_keywords_tfidf(request.transcript, max_features=15)
        keywords = [kw["keyword"] for kw in keywords_data[:10]]
        
        topics_data = analysis_service.extract_topics_nmf(request.transcript, n_topics=request.n_topics)
        
        # Calcola co-occorrenza
        cooccurrence = analysis_service.calculate_cooccurrence_matrix(request.transcript)
        
        # Crea network data
        network_data, total_available_words = analysis_service.create_network_data(
            topics_data, cooccurrence, max_words=request.max_words
        )
        
        topics = []
        for i, topic_data in enumerate(topics_data):
            topics.append(Topic(
                topic_id=i + 1,
                keywords=topic_data["keywords"][:5],
                description=topic_data["theme"]
            ))
        
        words = request.transcript.split()
        summary = f"Analisi di {len(words)} parole. Identificati {len(topics)} temi con {len(network_data.nodes)} nodi nel network."
        
        print(f"DEBUG: Returning total_available_words: {total_available_words}")
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            keywords=keywords,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat(),
            network_data=network_data,
            topic_similarities={},
            total_available_words=total_available_words
        )
        
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
