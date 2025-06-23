# 🤖 BERTopic Analysis Service

Servizio Python per l'analisi dei topic utilizzando BERTopic sulle trascrizioni delle sessioni terapeutiche.

## 🎯 Caratteristiche

- **Topic Modeling**: Identificazione automatica dei temi principali
- **Ottimizzato per Italiano**: Stopwords e preprocessing specifici
- **API REST**: Interfaccia semplice con Next.js
- **Visualizzazioni**: Grafici interattivi dei risultati

## 🚀 Avvio Rapido

### Windows
```cmd
# Vai nella cartella del servizio
cd python-service

# Esegui lo script di avvio
start.bat
```

### Linux/Mac
```bash
# Vai nella cartella del servizio
cd python-service

# Rendi eseguibile lo script
chmod +x start.sh

# Esegui lo script di avvio
./start.sh
```

### Manuale
```bash
# Crea ambiente virtuale
python -m venv venv

# Attiva ambiente (Windows)
venv\Scripts\activate
# Oppure (Linux/Mac)
source venv/bin/activate

# Installa dipendenze
pip install -r requirements.txt

# Avvia servizio
python main.py
```

## 🔧 Configurazione

Il servizio gira su **http://localhost:8000** di default.

### Variabili d'Ambiente

Puoi personalizzare il comportamento creando un file `.env`:

```env
HOST=0.0.0.0
PORT=8000
MIN_TOPIC_SIZE=5
LANGUAGE=italian
```

## 📊 API Endpoints

### Health Check
```http
GET /health
```

### Analisi Topic
```http
POST /analyze-topics
Content-Type: application/json

{
  "texts": ["testo della sessione 1", "testo della sessione 2"],
  "session_ids": ["session_1", "session_2"],
  "min_topic_size": 5,
  "language": "italian"
}
```

## 🧠 Come Funziona

1. **Preprocessing**: Pulizia e normalizzazione dei testi
2. **Embedding**: Conversione in vettori con SentenceTransformers
3. **Clustering**: Raggruppamento con HDBSCAN
4. **Topic Extraction**: Identificazione parole chiave con c-TF-IDF
5. **Visualizzazione**: Grafici interattivi con Plotly

## 📦 Dipendenze Principali

- **BERTopic**: Framework per topic modeling
- **FastAPI**: API web framework
- **SentenceTransformers**: Modelli di embedding multilingue
- **HDBSCAN**: Algoritmo di clustering
- **Plotly**: Visualizzazioni interattive

## 🐛 Troubleshooting

### Errore: "Servizio non disponibile"
- Verifica che il servizio Python sia in esecuzione
- Controlla la porta 8000 sia libera
- Guarda i log del servizio per errori

### Errore: "Impossibile installare dipendenze"
- Aggiorna pip: `pip install --upgrade pip`
- Verifica la connessione internet
- Su Windows, installa Microsoft C++ Build Tools

### Performance lente
- Riduci `min_topic_size` per dataset piccoli
- Usa meno testi per test iniziali
- Il primo avvio è più lento (download modelli)

## 📈 Ottimizzazioni

### Per Dataset Piccoli (< 20 documenti)
```python
min_topic_size = 2
nr_topics = 5
```

### Per Dataset Grandi (> 1000 documenti)
```python
min_topic_size = 50
calculate_probabilities = False  # Più veloce
```

## 🔮 Sviluppi Futuri

- [ ] Cache dei risultati
- [ ] Topic tracking nel tempo  
- [ ] Sentiment analysis integrata
- [ ] Export in PDF/Excel
- [ ] Configurazione via interfaccia web

## 📝 Log e Debugging

I log sono stampati sulla console. Per debug più dettagliato:

```python
# In main.py, aggiungi:
import logging
logging.basicConfig(level=logging.DEBUG)
```
