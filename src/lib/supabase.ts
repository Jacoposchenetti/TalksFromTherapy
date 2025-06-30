import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('SUPABASE URL:', supabaseUrl)
console.log('SUPABASE ANON KEY:', supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '...' : undefined)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Variabili d\'ambiente mancanti: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 