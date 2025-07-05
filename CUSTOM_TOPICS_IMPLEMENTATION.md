# Custom Topic Analysis Feature Implementation

## 📋 Nuova Funzionalità: Ricerca Topic Personalizzati

È stata implementata la possibilità di cercare topic specifici all'interno delle trascrizioni delle sessioni di terapia, in aggiunta all'analisi automatica dei topic esistente.

## 🔧 Modifiche Implementate

### 1. Database Schema Update
**IMPORTANTE**: Devi eseguire questo comando SQL nel tuo database Supabase:

```sql
-- Aggiungi il campo per i topic personalizzati alla tabella analyses
ALTER TABLE "analyses" ADD COLUMN "customTopicAnalysisResults" TEXT;

-- Aggiungi un commento per documentare il campo
COMMENT ON COLUMN "analyses"."customTopicAnalysisResults" IS 'JSON contenente i risultati delle ricerche di topic personalizzati, con struttura: {"searches": [{"query": "query_utente", "timestamp": "ISO_date", "results": {...}}]}';
```

### 2. Nuova API Endpoint
- **POST** `/api/custom-topic-search` - Permette di cercare topic personalizzati nelle sessioni selezionate

### 3. Aggiornamenti Frontend
- Toggle tra "Auto Discovery" e "Custom Topics" nel componente di analisi dei topic
- Interfaccia per inserire fino a 5 topic personalizzati
- Visualizzazione dedicata dei risultati delle ricerche personalizzate
- Salvataggio automatico dei risultati nel database
- Indicatori di progresso e gestione errori migliorata

## 🎯 Come Usare la Nuova Funzionalità

1. **Accedi all'analisi dei topic** nella pagina di analisi del paziente
2. **Attiva il toggle "Custom Topics"** per passare dalla modalità automatica a quella personalizzata
3. **Inserisci i topic** che vuoi cercare (es: "ansia", "relazioni", "stress lavorativo")
4. **Clicca "Search Topics"** per avviare la ricerca
5. **Visualizza i risultati** con i segmenti rilevanti trovati per ogni topic

## 📊 Struttura dei Dati

### Analisi Automatica (keyTopics e topicAnalysisResult)
Continua a funzionare come prima, salvando i risultati dell'analisi GPT automatica.

### Ricerche Personalizzate (customTopicAnalysisResults)
```json
{
  "searches": [
    {
      "query": "ansia, depressione",
      "timestamp": "2025-01-07T10:30:00Z",
      "sessions": [{"id": "session1", "title": "Sessione 1"}],
      "results": [
        {
          "topic": "ansia",
          "relevantSegments": [...],
          "totalMatches": 5,
          "confidence": 0.85
        }
      ],
      "summary": "Ricerca completata..."
    }
  ]
}
```

## 🔄 Compatibilità

- ✅ **Retrocompatibile**: Le analisi esistenti continuano a funzionare
- ✅ **Doppio storage**: Analisi automatiche e ricerche personalizzate sono separate
- ✅ **Cache intelligente**: I risultati vengono salvati e possono essere recuperati

## 🛠️ Troubleshooting

### Problema: Errore 404 durante la ricerca
**Causa**: Timeout dell'API OpenAI o servizio temporaneamente non disponibile
**Soluzione**: Il sistema ora include retry automatico (2 tentativi per topic)

### Problema: Nessun risultato trovato
**Cause possibili**:
- Topic troppo specifico o non presente nel testo
- Soglia di confidence troppo alta
**Soluzioni**:
- Prova termini più generali (es: "famiglia" invece di "conflitti familiari")
- Il sistema ora usa confidence > 0.4 per maggiore sensibilità

### Problema: Ricerca molto lenta
**Cause**: Trascrizioni molto lunghe
**Ottimizzazioni implementate**:
- Limite di 30 frasi per ricerca per evitare timeout
- Pause tra i topic per evitare rate limiting
- Indicatori di progresso per feedback utente

### Problema: Campo database non trovato
**Soluzione**: Assicurati di aver eseguito la migrazione SQL mostrata sopra

## 🚀 Prossimi Sviluppi

- [ ] Storico delle ricerche personalizzate per utente
- [ ] Export dei risultati delle ricerche
- [ ] Confronto tra sessioni per topic specifici
- [ ] Notifiche quando vengono trovati topic critici
- [ ] Ricerca semantica avanzata con embedding
