-- Migrazione per aggiornare il sistema crediti con rollover
-- Eseguire DOPO aver applicato il nuovo schema (payments-and-credits-schema.sql)

-- 0. INIZIALIZZA CREDITI PER TUTTI GLI UTENTI ESISTENTI
INSERT INTO user_credits (user_id, credits_balance, monthly_credits, rollover_limit, purchased_credits, last_reset_date)
SELECT 
  id as user_id,
  1000 as credits_balance,      -- 1000 crediti iniziali
  1000 as monthly_credits,      -- 1000 crediti mensili
  2000 as rollover_limit,       -- Limite rollover 2000
  0 as purchased_credits,       -- Nessun credito acquistato
  CURRENT_DATE as last_reset_date
FROM auth.users 
WHERE NOT EXISTS (
  SELECT 1 FROM user_credits uc WHERE uc.user_id = auth.users.id
);

-- 1. Prima aggiungi le colonne mancanti se non esistono (per sicurezza)
ALTER TABLE user_credits 
ADD COLUMN IF NOT EXISTS monthly_credits INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS rollover_limit INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS purchased_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Aggiorna utenti esistenti con rollover limits
UPDATE user_credits 
SET 
  monthly_credits = 1000,
  rollover_limit = 2000,
  purchased_credits = 0,
  credits_balance = CASE 
    WHEN credits_balance < 100 THEN 1000  -- Se hanno pochi crediti, dà il bonus completo
    ELSE credits_balance + 900            -- Altrimenti aggiunge la differenza
  END,
  updated_at = NOW()
WHERE monthly_credits IS NULL OR monthly_credits != 1000;

-- 3. Inserisci o aggiorna i pacchetti crediti con nuovi prezzi
-- Metodo alternativo: elimina e reinserisci
DELETE FROM credit_packages WHERE name IN ('Small Pack', 'Medium Pack', 'Large Pack');

INSERT INTO credit_packages (name, credits, price_cents, sort_order) VALUES
('Small Pack', 200, 800, 1),     -- €8 per 200 crediti
('Medium Pack', 500, 1700, 2),   -- €17 per 500 crediti  
('Large Pack', 1000, 3000, 3);   -- €30 per 1000 crediti

-- 4. Log della migrazione per tutti gli utenti inizializzati
INSERT INTO credit_transactions (user_id, type, amount, description)
SELECT 
  user_id,
  'bonus' as type,
  1000 as amount,
  'Inizializzazione sistema crediti - 1000 crediti di benvenuto' as description
FROM user_credits 
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.user_id = user_credits.user_id 
  AND ct.description LIKE '%Inizializzazione sistema crediti%'
);

-- 5. Verifica risultati con dettagli utenti
SELECT 
  'Totale utenti nel sistema' as descrizione,
  COUNT(*) as valore
FROM auth.users
UNION ALL
SELECT 
  'Utenti con crediti inizializzati' as descrizione,
  COUNT(*) as valore
FROM user_credits
UNION ALL
SELECT 
  'Media crediti per utente' as descrizione,
  ROUND(AVG(credits_balance)) as valore
FROM user_credits;

-- 6. Dettaglio per utente (primi 10)
SELECT 
  u.email,
  uc.credits_balance,
  uc.monthly_credits,
  uc.rollover_limit,
  uc.created_at as crediti_creati
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
ORDER BY uc.created_at DESC
LIMIT 10;

-- 7. Mostra distribuzione crediti
SELECT 
  categoria_crediti,
  COUNT(*) as utenti
FROM (
  SELECT 
    CASE 
      WHEN credits_balance < 500 THEN 'Bassi (< 500)'
      WHEN credits_balance < 1000 THEN 'Medi (500-999)'
      WHEN credits_balance < 1500 THEN 'Alti (1000-1499)'
      ELSE 'Molto alti (1500+)'
    END as categoria_crediti
  FROM user_credits
) AS categorized
GROUP BY categoria_crediti
ORDER BY 
  CASE categoria_crediti
    WHEN 'Bassi (< 500)' THEN 1
    WHEN 'Medi (500-999)' THEN 2
    WHEN 'Alti (1000-1499)' THEN 3
    ELSE 4
  END;
