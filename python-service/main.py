from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import re
from collections import Counter, defaultdict
import itertools

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
    weight: float = 0.0
    centrality: float = 0.0

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
    topic_similarities: Dict[str, float]

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
            'faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno', 'vado', 'vai', 'va', 'andiamo', 'andate', 'vanno',            # Altri
            'tutto', 'tutti', 'tutta', 'tutte', 'altro', 'altri', 'altra', 'altre', 'ogni', 'alcuni', 'alcune', 'qualche',
            'stesso', 'stessa', 'stessi', 'stesse', 'proprio', 'propria', 'propri', 'proprie', 'tale', 'tali',
            'così', 'abbastanza', 'proprio', 'davvero', 'veramente', 'davvero'
        ]
    
    def extract_keywords_tfidf(self, text, max_features=15):
        try:            # Pre-processamento del testo
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
                max_df=0.6,  # Aumentato per includere più parole
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{2,}\b'  # Ridotto a 2 caratteri per più parole
            )
            
            tfidf_matrix = vectorizer.fit_transform([filtered_text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
              # Filtra solo parole con score significativo
            keywords_with_scores = [
                {"keyword": feature_names[i], "score": float(tfidf_scores[i])}
                for i in range(len(feature_names)) 
                if tfidf_scores[i] > 0.05  # Soglia ridotta per più parole
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
                max_features=100,  # Aumentato per più parole
                stop_words=self.italian_stopwords,
                lowercase=True,
                min_df=1,
                max_df=0.8,  # Più permissivo
                token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{2,}\b'  # Parole da 2 caratteri
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
                word_weights = []
                
                for i in significant_words_idx:
                    word = feature_names[i]
                    weight = topic[i]
                    if weight > 0.05:  # Soglia ridotta per più parole
                        top_words.append(word)
                        word_weights.append(float(weight))
                
                if len(top_words) > 0:
                    # Calcola peso del topic come media dei pesi delle parole
                    topic_weight = np.mean(word_weights)
                    topics.append({
                        "theme": f"Tema {topic_idx + 1}",
                        "keywords": top_words[:8],  # Aumentato a 8 parole per tema
                        "topic_id": topic_idx,
                        "weight": topic_weight,
                        "word_weights": word_weights[:8]
                    })
            
            return topics if topics else [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0, "weight": 0.5, "word_weights": [0.5]}]
            
        except Exception as e:
            print(f"Error in topic extraction: {e}")
            return [{"theme": "Contenuto Generale", "keywords": ["contenuto"], "topic_id": 0, "weight": 0.5, "word_weights": [0.5]}]

    def calculate_cooccurrence_matrix(self, text, window_size=8):
        """Calcola matrice di co-occorrenza delle parole - versione espansa"""
        # Pulizia più aggressiva del testo
        import re
        
        # Rimuovi punteggiatura ma mantieni lettere accentate
        text_clean = re.sub(r'[^\w\sàèéìòùÀÈÉÌÒÙ]', ' ', text.lower())
        words = text_clean.split()
        
        # Filtro meno restrittivo - parole da 2+ caratteri
        filtered_words = []
        for w in words:
            w = w.strip()
            if (len(w) >= 2 and 
                not w.isdigit() and 
                w.isalpha() and 
                w not in self.italian_stopwords and
                not w in ['sono', 'essere', 'avere', 'fare', 'dire', 'andare', 'potere', 'dovere', 'volere']):  # Stopwords aggiuntive
                filtered_words.append(w)
        
        print(f"Parole filtrate per co-occorrenza: {len(filtered_words)} da {len(words)} originali")
        
        cooccurrence = defaultdict(lambda: defaultdict(int))
        
        # Finestra più ampia per catturare più relazioni
        for i, word in enumerate(filtered_words):
            for j in range(max(0, i - window_size), min(len(filtered_words), i + window_size + 1)):
                if i != j:
                    cooccurrence[word][filtered_words[j]] += 1
        
        # Mostra statistiche
        print(f"Matrice co-occorrenza: {len(cooccurrence)} parole uniche")
        return cooccurrence

    def calculate_topic_similarities(self, topics_data, tfidf_matrix, nmf_model):
        """Calcola similarità tra topic usando cosine similarity"""
        if len(topics_data) < 2:
            return {}
        
        similarities = {}
        topic_vectors = nmf_model.components_
        
        for i, j in itertools.combinations(range(len(topics_data)), 2):
            similarity = cosine_similarity([topic_vectors[i]], [topic_vectors[j]])[0][0]
            similarities[f"topic_{i+1}_topic_{j+1}"] = float(similarity)
        return similarities
    
    def create_network_data(self, topics_data, cooccurrence, topic_similarities, max_words=100):
        """Crea dati per la visualizzazione network - solo parole, no nodi tema artificiali"""
        print(f"DEBUG: create_network_data chiamata con max_words={max_words}")
        
        nodes = []
        edges = []
        
        topic_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        
        # Raccogli TUTTE le parole significative dal testo originale
        all_words = set()
        word_to_cluster = {}
        word_weights = {}
        
        # Parole dai topic (con cluster assegnato) - SEMPRE incluse
        topic_words = set()
        for i, topic in enumerate(topics_data):
            for j, keyword in enumerate(topic["keywords"]):
                all_words.add(keyword)
                topic_words.add(keyword)
                word_to_cluster[keyword] = i
                # Peso dalla posizione nel topic (primi pesi maggiori)
                weight = topic.get("word_weights", [1.0] * len(topic["keywords"]))[j]
                word_weights[keyword] = weight
        
        # Calcola scores per tutte le parole da co-occorrenza
        word_scores = {}
        for word1, cooc_dict in cooccurrence.items():
            if len(word1) >= 3 and word1.isalpha():  # Parole da 3+ caratteri per qualità
                total_cooc = sum(cooc_dict.values())
                topic_correlation = 0
                
                # Calcola correlazione con topic words
                for i, topic in enumerate(topics_data):
                    correlation = sum(cooc_dict.get(kw, 0) for kw in topic["keywords"])
                    topic_correlation = max(topic_correlation, correlation)
                
                # Score combinato: co-occorrenza totale + correlazione topic
                score = total_cooc + (topic_correlation * 2)
                word_scores[word1] = score
                
                if word1 not in word_to_cluster:
                    # Trova il topic più correlato
                    best_cluster = len(topics_data)  # Default: cluster neutro
                    max_correlation = 0
                    
                    for i, topic in enumerate(topics_data):
                        correlation = sum(cooc_dict.get(kw, 0) for kw in topic["keywords"])
                        if correlation > max_correlation:
                            max_correlation = correlation
                            best_cluster = i
                    
                    word_to_cluster[word1] = best_cluster
                    word_weights[word1] = min(score / 20, 1.0)  # Peso basato su score
          # Seleziona le top words per score (escludendo quelle già nei topic)
        available_slots = max(0, max_words - len(topic_words))
        
        print(f"DEBUG: max_words={max_words}, topic_words={len(topic_words)}, available_slots={available_slots}")
        
        if available_slots > 0:
            # Ordina per score e prendi le migliori
            sorted_words = sorted(
                [(word, score) for word, score in word_scores.items() if word not in topic_words],
                key=lambda x: x[1], 
                reverse=True
            )
            
            print(f"DEBUG: Candidate words from cooccurrence: {len(sorted_words)}")
            
            for word, score in sorted_words[:available_slots]:
                all_words.add(word)
                
        print(f"DEBUG: Final word count: {len(all_words)} (should be <= {max_words})")
        
        # Controllo finale: se abbiamo troppe parole, mantieni solo le più importanti
        if len(all_words) > max_words:
            print(f"WARNING: Troppo parole ({len(all_words)}), riducendo a {max_words}")
            
            # Combina topic words (priorità assoluta) + altre parole per score
            final_words = list(topic_words)  # Inizia con le parole dei topic
            other_words = [w for w in all_words if w not in topic_words]
            
            # Ordina le altre parole per score
            other_words_scored = [(w, word_scores.get(w, 0)) for w in other_words]
            other_words_scored.sort(key=lambda x: x[1], reverse=True)
            
            # Aggiungi le migliori fino al limite
            remaining_slots = max_words - len(final_words)
            for word, score in other_words_scored[:remaining_slots]:
                final_words.append(word)
            
            all_words = set(final_words)
            print(f"DEBUG: After reduction: {len(all_words)} words")
        
        print(f"Creando network con {len(all_words)} parole totali (limite: {max_words})")
        print(f"- {len(topic_words)} parole dai topic (sempre incluse)")
        print(f"- {len(all_words) - len(topic_words)} parole aggiuntive per importanza")
        
        # Crea nodi solo per le parole (NO nodi artificiali per i topic)
        for word in all_words:
            cluster = word_to_cluster.get(word, len(topics_data))
            weight = word_weights.get(word, 0.2)
            
            # Dimensione basata su peso e importanza
            size = 6 + (weight * 25)
            
            # Colore basato su cluster/topic
            if cluster < len(topic_colors):
                color = topic_colors[cluster]
            else:
                color = '#6b7280'  # Grigio per parole non categorizzate
            
            nodes.append(NetworkNode(
                id=f"word_{word}",
                label=word,
                type="keyword",  # Tutte sono parole/keyword
                size=size,
                color=color,
                cluster=cluster,
                weight=weight
            ))
        
        # Edges basati SOLO su co-occorrenza tra parole
        word_list = list(all_words)
        edge_count = 0
        for i, word1 in enumerate(word_list):
            for word2 in word_list[i+1:]:
                cooc_score = cooccurrence.get(word1, {}).get(word2, 0)
                if cooc_score >= 1:  # Soglia molto bassa per più connessioni
                    edges.append(NetworkEdge(
                        source=f"word_{word1}",
                        target=f"word_{word2}",
                        weight=float(min(cooc_score / 5, 1.0)),  # Normalizzazione più permissiva
                        type="cooccurrence"
                    ))
                    edge_count += 1
        
        print(f"Creati {len(nodes)} nodi e {edge_count} edges")
        return NetworkData(nodes=nodes, edges=edges)

analysis_service = DocumentAnalysisService()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/single-document-analysis")
async def single_document_analysis(request: SingleDocumentRequest):
    try:
        print(f"=== INIZIO ANALISI ===")
        print(f"DEBUG: Received request - session_id: {request.session_id}")
        print(f"DEBUG: max_words: {request.max_words} (type: {type(request.max_words)})")
        print(f"DEBUG: n_topics: {request.n_topics}")
        print(f"DEBUG: transcript_length: {len(request.transcript)}")
        print(f"=== ===")
        
        if not request.transcript or len(request.transcript.strip()) < 20:
            raise HTTPException(status_code=400, detail="Transcript too short")
          # Estrai keywords con TF-IDF
        keywords_data = analysis_service.extract_keywords_tfidf(request.transcript, max_features=30)  # Aumentato
        keywords = [kw["keyword"] for kw in keywords_data[:20]]  # Più keywords
        
        # Estrai topics con NMF avanzato
        topics_data = analysis_service.extract_topics_nmf(request.transcript, n_topics=request.n_topics)
        
        # Calcola co-occorrenza delle parole
        cooccurrence = analysis_service.calculate_cooccurrence_matrix(request.transcript)
        
        # Per calcolare similarità tra topic, riesegui NMF per ottenere il modello
        sentences = []
        for s in request.transcript.replace('!', '.').replace('?', '.').split('.'):
            s = s.strip()
            if len(s) > 30:
                sentences.append(s)
        
        if len(sentences) < 2:
            sentences = [request.transcript]
        
        vectorizer = TfidfVectorizer(
            max_features=50,
            stop_words=analysis_service.italian_stopwords,
            lowercase=True,
            min_df=1,
            max_df=0.7,
            token_pattern=r'\b[a-zA-ZàèéìòùÀÈÉÌÒÙ]{3,}\b'
        )
        
        tfidf_matrix = vectorizer.fit_transform(sentences)
        effective_topics = min(request.n_topics, len(sentences), tfidf_matrix.shape[1] // 3)
        if effective_topics < 1:
            effective_topics = 1
            
        nmf_model = NMF(n_components=effective_topics, random_state=42, max_iter=100)
        nmf_model.fit(tfidf_matrix)
          # Calcola similarità tra topic
        topic_similarities = analysis_service.calculate_topic_similarities(topics_data, tfidf_matrix, nmf_model)
        
        # Crea network data
        print(f"=== CHIAMATA create_network_data ===")
        print(f"DEBUG: Passando max_words={request.max_words} a create_network_data")
        network_data = analysis_service.create_network_data(topics_data, cooccurrence, topic_similarities, max_words=request.max_words)
        print(f"DEBUG: create_network_data ha restituito {len(network_data.nodes)} nodi")
        print(f"=== ===")
        
        
        # Prepara topics per response
        topics = []
        for i, topic_data in enumerate(topics_data):
            # Calcola centralità come numero di connessioni
            topic_centrality = len([edge for edge in network_data.edges if edge.source == f"topic_{topic_data['topic_id'] + 1}"])
            
            topics.append(Topic(
                topic_id=i + 1,
                keywords=topic_data["keywords"][:5],
                description=topic_data["theme"],
                weight=topic_data["weight"],
                centrality=float(topic_centrality)
            ))
        
        words = request.transcript.split()
        summary = f"Analisi di {len(words)} parole. Identificati {len(topics)} temi con {len(network_data.nodes)} nodi e {len(network_data.edges)} connessioni nella rete."
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            keywords=keywords,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat(),
            network_data=network_data,
            topic_similarities=topic_similarities
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
