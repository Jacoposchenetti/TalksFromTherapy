# Test delle Nuove Funzionalità Custom Topics

## 🧪 Test del Menu a Tendina e View in Text

### Prerequisiti
1. ✅ Server in esecuzione su http://localhost:3000
2. ⚠️  **IMPORTANTE**: Esegui prima la migrazione del database in Supabase

### Migrazione Database (DA FARE PRIMA)
```sql
-- Copia e incolla questo nel SQL Editor di Supabase:

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'customTopicAnalysisResults'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."analyses" 
        ADD COLUMN "customTopicAnalysisResults" TEXT;
        
        COMMENT ON COLUMN "public"."analyses"."customTopicAnalysisResults" 
        IS 'JSON contenente i risultati delle ricerche di topic personalizzati';
        
        RAISE NOTICE 'Colonna customTopicAnalysisResults aggiunta con successo';
    ELSE
        RAISE NOTICE 'Colonna customTopicAnalysisResults esiste già';
    END IF;
END $$;
```

## 🎯 Passi per Testare

### 1. Test Menu a Tendina (Ricerche Passate)
1. Vai su http://localhost:3000
2. Fai login
3. Vai alla pagina di analisi di un paziente
4. Seleziona una o più sessioni
5. **Attiva il toggle "Custom Topics"**
6. Se ci sono ricerche passate, dovrebbe apparire il menu "Load Previous Search"
7. Se non ci sono ricerche passate, il menu non apparirà (normale la prima volta)

### 2. Test Nuova Ricerca Custom
1. Nella modalità "Custom Topics", inserisci alcuni topic (es: "ansia", "famiglia")
2. Clicca "Search Topics"
3. Aspetta che la ricerca completi
4. **Verifica che i risultati vengano salvati** (per test futuri del menu)

### 3. Test Pulsante "View in Text"
1. Dopo una ricerca custom completata
2. **Cerca il pulsante "View in Text"** nell'header dei risultati
3. Clicca per attivare la vista testo
4. Verifica che:
   - Appaia una legenda dei colori per i topic
   - Il testo sia evidenziato con colori diversi per ogni topic
   - Il pulsante cambi in "Hide Text"
5. Clicca "Hide Text" per tornare alla vista normale

### 4. Test Menu Ricerche Passate (Dopo Prima Ricerca)
1. Fai una nuova analisi o ricarica la pagina
2. Attiva di nuovo "Custom Topics"
3. **Ora dovrebbe apparire il menu "Load Previous Search"**
4. Seleziona una ricerca precedente dal dropdown
5. Verifica che i risultati si carichino immediatamente

## 🐛 Risoluzione Problemi

### Menu non appare
- Assicurati di aver fatto almeno una ricerca custom prima
- Controlla che il campo `customTopicAnalysisResults` sia stato aggiunto al database

### Pulsante "View in Text" non funziona
- Assicurati che ci siano risultati di ricerca custom visibili
- Il pulsante appare solo nell'header dei "Custom Topic Search Results"

### Errori di compilazione
- Riavvia il server con `npm run dev`
- Controlla la console del browser per errori JavaScript

## ✅ Cosa Aspettarsi

### Comportamento Corretto
- **Prima volta**: Nessun menu ricerche passate (normale)
- **Dopo ricerche**: Menu dropdown con ricerche precedenti
- **Vista testo**: Toggle fluido tra vista normale e evidenziata
- **Salvataggio**: Ricerche salvate automaticamente nel database

### UI Aspettata
- Menu dropdown elegante con data e preview
- Pulsante "View in Text" / "Hide Text" nell'header
- Colori coordinati tra legenda e evidenziazioni
- Indicatori di caricamento durante fetch ricerche

## 📝 Note di Test
- Le ricerche sono salvate per utente (ogni utente vede solo le sue)
- Massimo 20 ricerche più recenti nel menu
- I colori sono consistenti tra topic e evidenziazioni
- Compatibile con analisi automatica esistente
