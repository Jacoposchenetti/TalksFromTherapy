"""
Single Session Analysis - Keyword Extraction and Theme Detection
For analyzing topics within a single therapy session
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import re
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk
from nltk.tree import Tree

class SingleSessionAnalysisRequest(BaseModel):
    text: str
    session_id: str
    language: Optional[str] = "italian"

class KeywordResult(BaseModel):
    keyword: str
    score: float
    frequency: int
    context: List[str]  # Frasi dove appare la keyword

class ThemeResult(BaseModel):
    theme: str
    keywords: List[str]
    confidence: float
    sentences: List[str]

class SingleSessionAnalysisResponse(BaseModel):
    session_id: str
    keywords: List[KeywordResult]
    themes: List[ThemeResult]
    sentiment_overview: Dict[str, Any]
    summary: Dict[str, Any]

class SingleSessionAnalyzer:
    def __init__(self):
        self.italian_stopwords = [
            'che', 'di', 'da', 'in', 'un', 'il', 'del', 'della', 'dei', 'delle',
            'le', 'la', 'lo', 'gli', 'una', 'uno', 'per', 'con', 'su', 'tra',
            'fra', 'a', 'e', 'o', 'ma', 'se', 'anche', 'come', 'quando', 'dove',
            'cosa', 'chi', 'cui', 'quale', 'quanto', 'molto', 'poco', 'tutto',
            'niente', 'sempre', 'mai', 'più', 'meno', 'bene', 'male', 'allora',
            'quindi', 'però', 'invece', 'infatti', 'cioè', 'ecco', 'sì', 'no',
            'eh', 'ah', 'oh', 'beh', 'insomma', 'diciamo', 'credo', 'penso',
            'mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'ne',
            'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'sono', 'sei', 'è',
            'siamo', 'siete', 'ero', 'eri', 'era', 'eravamo', 'eravate', 'erano',
            'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'essere', 'avere',
            'fare', 'dire', 'andare', 'venire', 'stare', 'dare', 'sapere', 'vedere'
        ]
        
        # Temi terapeutici comuni
        self.therapy_themes = {
            'ansia': ['ansia', 'ansioso', 'preoccupazione', 'paura', 'nervoso', 'tensione', 'stress'],
            'depressione': ['triste', 'depresso', 'melanconico', 'abbattuto', 'sconforto', 'tristezza'],
            'lavoro': ['lavoro', 'ufficio', 'collega', 'capo', 'professionale', 'carriera', 'stress lavorativo'],
            'famiglia': ['famiglia', 'genitori', 'fratello', 'sorella', 'madre', 'padre', 'figlio', 'figlia'],
            'relazioni': ['relazione', 'partner', 'fidanzato', 'fidanzata', 'amico', 'amica', 'coppia'],
            'emozioni': ['emozione', 'sentimento', 'rabbia', 'gioia', 'felicità', 'tristezza', 'paura'],
            'obiettivi': ['obiettivo', 'meta', 'progetto', 'futuro', 'pianificare', 'raggiungere'],
            'passato': ['passato', 'ricordo', 'infanzia', 'bambino', 'giovane', 'prima', 'tempo fa'],
            'corpo': ['corpo', 'fisico', 'salute', 'dolore', 'stanchezza', 'energia', 'sonno'],
            'pensieri': ['pensiero', 'idea', 'mente', 'riflettere', 'considerare', 'ragionare']
        }

    def extract_keywords(self, text: str, top_n: int = 15) -> List[KeywordResult]:
        """
        Extract keywords using TF-IDF
        """
        # Preprocessa il testo
        sentences = sent_tokenize(text)
        
        # TF-IDF
        vectorizer = TfidfVectorizer(
            stop_words=self.italian_stopwords,
            max_features=500,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.8
        )
        
        try:
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            # Crea lista keywords con scores
            keywords_with_scores = list(zip(feature_names, tfidf_scores))
            keywords_with_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Crea risultati con contesto
            results = []
            for keyword, score in keywords_with_scores[:top_n]:
                if score > 0:
                    # Trova frasi che contengono la keyword
                    context_sentences = [
                        sent for sent in sentences 
                        if keyword.lower() in sent.lower()
                    ][:3]  # Max 3 esempi
                    
                    # Conta frequenza
                    frequency = text.lower().count(keyword.lower())
                    
                    results.append(KeywordResult(
                        keyword=keyword,
                        score=float(score),
                        frequency=frequency,
                        context=context_sentences
                    ))
            
            return results
            
        except Exception as e:
            # Fallback: usa frequenza semplice
            words = re.findall(r'\b\w{4,}\b', text.lower())
            word_freq = Counter(words)
            
            results = []
            for word, freq in word_freq.most_common(top_n):
                if word not in self.italian_stopwords:
                    context_sentences = [
                        sent for sent in sentences 
                        if word in sent.lower()
                    ][:3]
                    
                    results.append(KeywordResult(
                        keyword=word,
                        score=float(freq / len(words)),
                        frequency=freq,
                        context=context_sentences
                    ))
            
            return results

    def identify_themes(self, text: str, keywords: List[KeywordResult]) -> List[ThemeResult]:
        """
        Identify therapeutic themes based on keywords and predefined categories
        """
        text_lower = text.lower()
        sentences = sent_tokenize(text)
        themes_found = []
        
        for theme_name, theme_keywords in self.therapy_themes.items():
            # Conta occorrenze delle parole del tema
            theme_matches = []
            theme_sentences = []
            
            for theme_keyword in theme_keywords:
                if theme_keyword in text_lower:
                    theme_matches.append(theme_keyword)
                    # Trova frasi correlate
                    matching_sentences = [
                        sent for sent in sentences 
                        if theme_keyword in sent.lower()
                    ]
                    theme_sentences.extend(matching_sentences)
            
            if theme_matches:
                # Calcola confidence basata su:
                # 1. Numero di parole tema trovate
                # 2. Frequenza totale
                # 3. Presenza nei keywords estratti
                confidence = len(theme_matches) / len(theme_keywords)
                
                # Bonus se le keywords del tema sono anche nelle top keywords
                keyword_words = [kw.keyword.lower() for kw in keywords]
                theme_in_keywords = sum(1 for tm in theme_matches if tm in keyword_words)
                confidence += theme_in_keywords * 0.1
                
                # Limita a massimo 1.0
                confidence = min(confidence, 1.0)
                
                if confidence > 0.1:  # Soglia minima
                    themes_found.append(ThemeResult(
                        theme=theme_name.title(),
                        keywords=theme_matches,
                        confidence=confidence,
                        sentences=list(set(theme_sentences))[:5]  # Max 5 frasi uniche
                    ))
        
        # Ordina per confidence
        themes_found.sort(key=lambda x: x.confidence, reverse=True)
        return themes_found[:8]  # Top 8 temi

    def analyze_sentiment_overview(self, text: str) -> Dict[str, Any]:
        """
        Basic sentiment analysis (can be enhanced with more sophisticated models)
        """
        # Parole positive e negative di base
        positive_words = [
            'bene', 'buono', 'felice', 'contento', 'soddisfatto', 'tranquillo',
            'sereno', 'positivo', 'migliorato', 'meglio', 'ottimo', 'eccellente'
        ]
        
        negative_words = [
            'male', 'cattivo', 'triste', 'preoccupato', 'ansioso', 'nervoso',
            'depresso', 'difficile', 'problema', 'stress', 'peggio', 'terribile'
        ]
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        total_sentiment_words = positive_count + negative_count
        
        if total_sentiment_words > 0:
            sentiment_score = (positive_count - negative_count) / total_sentiment_words
        else:
            sentiment_score = 0.0
        
        # Classifica sentiment
        if sentiment_score > 0.2:
            sentiment_label = "Prevalentemente Positivo"
        elif sentiment_score < -0.2:
            sentiment_label = "Prevalentemente Negativo"
        else:
            sentiment_label = "Neutro/Misto"
        
        return {
            'sentiment_score': sentiment_score,
            'sentiment_label': sentiment_label,
            'positive_indicators': positive_count,
            'negative_indicators': negative_count,
            'total_words': len(text.split())
        }

    def analyze_session(self, text: str, session_id: str) -> Dict[str, Any]:
        """
        Complete analysis of a single session
        """
        if not text or len(text.strip()) < 10:
            raise ValueError("Text troppo corto per l'analisi")
        
        # 1. Extract keywords
        keywords = self.extract_keywords(text)
        
        # 2. Identify themes
        themes = self.identify_themes(text, keywords)
        
        # 3. Sentiment analysis
        sentiment = self.analyze_sentiment_overview(text)
        
        # 4. Summary statistics
        summary = {
            'total_characters': len(text),
            'total_words': len(text.split()),
            'total_sentences': len(sent_tokenize(text)),
            'keywords_found': len(keywords),
            'themes_identified': len(themes),
            'avg_words_per_sentence': len(text.split()) / max(len(sent_tokenize(text)), 1)
        }
        
        return {
            'session_id': session_id,
            'keywords': keywords,
            'themes': themes,
            'sentiment_overview': sentiment,
            'summary': summary
        }

# Aggiungi alla tua FastAPI app esistente
analyzer = SingleSessionAnalyzer()

@app.post("/analyze-single-session", response_model=SingleSessionAnalysisResponse)
async def analyze_single_session(request: SingleSessionAnalysisRequest):
    """
    Analyze themes and keywords within a single therapy session
    """
    try:
        result = analyzer.analyze_session(request.text, request.session_id)
        return SingleSessionAnalysisResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
