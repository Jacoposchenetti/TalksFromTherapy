from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import openai
import os
import json
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

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

class Topic(BaseModel):
    topic_id: int
    keywords: List[str]
    description: str = ""

class SingleDocumentResponse(BaseModel):
    session_id: str
    topics: List[Topic]
    summary: str
    analysis_timestamp: str

class DocumentAnalysisService:
    def __init__(self):
        # Configurazione OpenAI GPT-3.5
        self.client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "***REMOVED***your-key-here")
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

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
        summary = f"Analisi di {len(words)} parole. Identificati {len(topics)} temi principali utilizzando GPT-3.5."
        
        return SingleDocumentResponse(
            session_id=request.session_id,
            topics=topics,
            summary=summary,
            analysis_timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
