import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { api } from './api.js'
import { useEdit } from './EditContext.jsx'

// Reads editable copy from GET /api/content ({ key: value }) and layers
// the response over the caller's fallback map. Fallbacks let the site
// render even before the DB is seeded or when the API is unreachable.
//
// Re-fetches on any successful Publish from the EditContext (tracked
// via the `publishTick` counter) so inline edits become the new
// authoritative copy without a page reload.
// Tiny shared store of the last-fetched DB map so leaf components
// (EditableText's per-field size, for instance) can read a key without
// each firing its own GET /api/content.
let latest = {}
const listeners = new Set()
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function useContentValue(key) {
  return useSyncExternalStore(subscribe, () => latest[key])
}
// The whole saved map (new object identity after every fetch).
export function useContentMap() {
  return useSyncExternalStore(subscribe, () => latest)
}

export function useSiteContent(fallback) {
  const [content, setContent] = useState(fallback)
  const [loading, setLoading] = useState(true)
  const { publishTick } = useEdit()

  const load = useCallback(() => {
    let cancelled = false
    api
      .get('/api/content')
      .then((data) => {
        if (cancelled || !data) return
        latest = data
        listeners.forEach((fn) => fn())
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

  useEffect(() => load(), [load, publishTick])

  return { content, loading }
}
