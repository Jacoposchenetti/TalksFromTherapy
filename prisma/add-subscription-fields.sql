-- Aggiunta campi per gestione abbonamenti nella tabella users
-- Esegui questo script nel tuo database Supabase

-- Aggiunta delle colonne una per volta
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_stripe_id VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON public.users(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_stripe_id ON public.users(subscription_stripe_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON COLUMN public.users.subscription_status IS 'Stato abbonamento: active, expired, canceled, inactive';
COMMENT ON COLUMN public.users.subscription_expires_at IS 'Data scadenza abbonamento';
COMMENT ON COLUMN public.users.subscription_stripe_id IS 'ID subscription o session Stripe';
