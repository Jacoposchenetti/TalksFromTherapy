-- Schema completo per sistema pagamenti e crediti con transazioni atomiche
-- Esegui questo script su Supabase

-- 1. Tabella subscriptions per gestire abbonamenti Stripe
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, canceled, past_due, trialing, incomplete
  plan_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella user_credits per gestire saldo crediti con rollover
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  credits_balance INTEGER DEFAULT 0 CHECK (credits_balance >= 0),
  monthly_credits INTEGER DEFAULT 1000, -- 1000 crediti inclusi nell'abbonamento
  rollover_limit INTEGER DEFAULT 2000, -- Massimo crediti accumulabili
  purchased_credits INTEGER DEFAULT 0, -- Crediti acquistati separatamente
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella credit_transactions per audit trail completo con rollover
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('monthly_reset', 'monthly_add', 'rollover', 'purchase', 'usage', 'refund', 'bonus', 'expired')),
  amount INTEGER NOT NULL, -- positivo per aggiunta, negativo per utilizzo
  description TEXT NOT NULL,
  feature_used TEXT, -- 'transcription', 'topic_modelling', 'custom_topic_modelling', 'sentiment_analysis', 'semantic_frame', 'ai_insights'
  reference_id TEXT, -- ID della sessione/operazione collegata
  stripe_payment_intent_id TEXT, -- per acquisti
  expires_at TIMESTAMP WITH TIME ZONE, -- per crediti acquistati con scadenza
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabella credit_packages per i pacchetti acquistabili
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- prezzo in centesimi
  stripe_price_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inserimento pacchetti crediti di default (prezzi aggiornati)
INSERT INTO credit_packages (name, credits, price_cents, sort_order) VALUES
('Small Pack', 200, 800, 1),     -- €8 per 200 crediti (€0.04/credito)
('Medium Pack', 500, 1700, 2),   -- €17 per 500 crediti (€0.034/credito)  
('Large Pack', 1000, 3000, 3)    -- €30 per 1000 crediti (€0.03/credito)
ON CONFLICT DO NOTHING;

-- 6. Indici per performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 7. FUNZIONE ATOMICA PER DEDUZIONE CREDITI (CRITICAL IMPROVEMENT)
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_feature_used TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Transazione atomica: deduci crediti solo se sufficienti
  UPDATE user_credits 
  SET 
    credits_balance = credits_balance - p_amount,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;
  
  -- Se nessuna riga aggiornata, crediti insufficienti
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crediti insufficienti';
  END IF;
  
  -- Log della transazione
  INSERT INTO credit_transactions (
    user_id, type, amount, description, feature_used, reference_id
  ) VALUES (
    p_user_id, 'usage', -p_amount, p_description, p_feature_used, p_reference_id
  );
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNZIONE ATOMICA PER AGGIUNTA CREDITI
CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Assicurati che l'utente abbia un record crediti
  INSERT INTO user_credits (user_id, credits_balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Aggiungi crediti
  UPDATE user_credits 
  SET 
    credits_balance = credits_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO v_new_balance;
  
  -- Log della transazione
  INSERT INTO credit_transactions (
    user_id, type, amount, description, stripe_payment_intent_id
  ) VALUES (
    p_user_id, p_type, p_amount, p_description, p_stripe_payment_intent_id
  );
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNZIONE PER RESET MENSILE CON ROLLOVER (MIGLIORATA)
CREATE OR REPLACE FUNCTION reset_monthly_credits_with_rollover(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_current_balance INTEGER;
  v_monthly_credits INTEGER;
  v_rollover_limit INTEGER;
  v_new_balance INTEGER;
  v_rollover_amount INTEGER;
BEGIN
  -- Ottieni dati attuali utente
  SELECT credits_balance, monthly_credits, rollover_limit 
  INTO v_current_balance, v_monthly_credits, v_rollover_limit
  FROM user_credits 
  WHERE user_id = p_user_id;
  
  -- Calcola rollover (crediti avanzati fino al limite)
  v_rollover_amount := LEAST(v_current_balance, v_rollover_limit - v_monthly_credits);
  v_rollover_amount := GREATEST(v_rollover_amount, 0); -- Non negativo
  
  -- Nuovo saldo = crediti mensili + rollover
  v_new_balance := v_monthly_credits + v_rollover_amount;
  
  -- Aggiorna crediti
  UPDATE user_credits 
  SET 
    credits_balance = v_new_balance,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log del reset mensile
  INSERT INTO credit_transactions (
    user_id, type, amount, description
  ) VALUES (
    p_user_id, 'monthly_add', v_monthly_credits, 
    'Reset mensile: +' || v_monthly_credits || ' crediti'
  );
  
  -- Log del rollover se applicabile
  IF v_rollover_amount > 0 THEN
    INSERT INTO credit_transactions (
      user_id, type, amount, description
    ) VALUES (
      p_user_id, 'rollover', v_rollover_amount,
      'Rollover crediti precedenti: +' || v_rollover_amount || ' crediti'
    );
  END IF;
  
  -- Log crediti persi se superano il limite
  IF v_current_balance > (v_rollover_limit - v_monthly_credits) THEN
    INSERT INTO credit_transactions (
      user_id, type, amount, description
    ) VALUES (
      p_user_id, 'expired', -(v_current_balance - v_rollover_amount),
      'Crediti scaduti (limite rollover superato)'
    );
  END IF;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS (Row Level Security) per sicurezza
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti vedono solo i propri dati (DROP IF EXISTS per evitare errori)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR ALL USING (auth.uid() = user_id);
