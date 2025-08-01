# Configurazione Supabase Auth per Reset Password

## Problema Identificato ✅ RISOLTO
Il reset password falliva immediatamente (non per scadenza) perché:
1. ❌ Gli URL di redirect non erano configurati correttamente in Supabase
2. ❌ Il template email non utilizzava il formato URL corretto
3. ❌ La variabile NEXT_PUBLIC_SITE_URL puntava alla porta sbagliata

## Soluzione 1: Configurazione Dashboard Supabase 🔧

### STEP 1: Vai nel dashboard Supabase
1. https://supabase.com/dashboard/project/zmwmxhcpxobgbbtpvaqi
2. Authentication > Settings > General

### STEP 2: Configurazioni CRITICHE da verificare
```
Site URL: http://localhost:3000
Additional redirect URLs (AGGIUNGERE TUTTI): 
- http://localhost:3000/reset-password/confirm
- http://localhost:3001/reset-password/confirm
- http://localhost:3000/auth/callback
- http://localhost:3001/auth/callback
- https://www.talksfromtherapy.com/reset-password/confirm (per produzione)
- https://www.talksfromtherapy.com/auth/callback (per produzione)

Enable email confirmations: ON
Enable email double opt-in: OFF (per sviluppo)
JWT expiry limit: 3600 (1 ora)
```

### STEP 3: Template Email CORRETTO
Authentication > Settings > Email Templates > Reset Password

⚠️ **IMPORTANTE**: Il template deve usare ESATTAMENTE questo formato:

```html
<h2>Reimposta la tua password</h2>
<p>Clicca sul link qui sotto per reimpostare la password:</p>
<a href="{{ .SiteURL }}/reset-password/confirm?access_token={{ .TokenHash }}&type=recovery&refresh_token={{ .RefreshToken }}">Reimposta Password</a>
<p>Questo link scadrà tra 1 ora.</p>
<p>Se non hai richiesto questo reset, ignora questa email.</p>
```

## Diagnostica Errore 🔍

Se ricevi ancora `access_denied` con `otp_expired`:

1. **Controlla l'URL della email ricevuta** - deve contenere:
   - `access_token=...`
   - `refresh_token=...` 
   - `type=recovery`

2. **Verifica che l'URL di redirect sia nella lista** in Supabase Dashboard

3. **Controlla i log del browser** (F12 > Console) per errori dettagliati

## Soluzione 2: Implementazione Alternativa (Magic Link)

Se il problema persiste, possiamo implementare un sistema di "magic link" personalizzato usando Supabase ma con la nostra logica.
