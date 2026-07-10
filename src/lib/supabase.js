import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaces immediately in dev if the .env.local file is missing.
  // We still create a client so the app doesn't hard-crash on load.
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in values.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')
