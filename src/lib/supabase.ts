import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Crie athenas/.env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do Supabase.'
  )
}

export const supabase = createBrowserClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
