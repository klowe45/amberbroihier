import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Reads editable copy from the site_content table (key/value strings).
// Falls back to the `fallback` map so pages render before Supabase is
// populated or when it's unreachable. Amber's admin panel writes into
// this same table so edits show up on the next page load.
export function useSiteContent(fallback) {
  const [content, setContent] = useState(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('site_content')
      .select('key, value')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setLoading(false)
          return
        }
        const map = { ...fallback }
        for (const row of data) map[row.key] = row.value
        setContent(map)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // fallback is captured once on mount by design; callers should
    // pass a stable object literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { content, loading }
}
