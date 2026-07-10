import { useEffect, useState } from 'react'
import { api } from './api.js'

// Reads editable copy from GET /api/content ({ key: value }) and layers
// the response over the caller's fallback map. Fallbacks let the site
// render even before the DB is seeded or when the API is unreachable.
export function useSiteContent(fallback) {
  const [content, setContent] = useState(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/content')
      .then((data) => {
        if (cancelled || !data) return
        setContent({ ...fallback, ...data })
      })
      .catch(() => {
        // Silently fall back — the caller already has usable copy.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // fallback is captured once on mount by design; callers pass a
    // stable module-level object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { content, loading }
}
