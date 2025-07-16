-- Soluzione semplice: elimina la tabella users personalizzata
-- e usa solo auth.users con metadati

-- 1. Elimina la tabella users problematica
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. I dati utente vanno in auth.users.user_metadata
-- Esempio nel codice:
/*
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
      license_number: licenseNumber,
      consent_terms_accepted: acceptTerms,
      consent_privacy_accepted: acceptPrivacy,
      consent_date: new Date().toISOString(),
      consent_ip_address: clientIP
    }
  }
})
*/

-- 3. Per leggere i dati utente:
/*
const { data: { user } } = await supabase.auth.getUser()
console.log(user.user_metadata.name)
console.log(user.user_metadata.license_number)
*/
