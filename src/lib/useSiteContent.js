import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './api.js'
import { useEdit } from './EditContext.jsx'
import { pageKeyFor } from './pageKey.js'

// Reads editable copy from GET /api/content ({ key: value }) and layers
// the response over the caller's fallback map. Fallbacks let the site
// render even before the DB is seeded or when the API is unreachable.
//
// Re-fetches on any successful Publish from the EditContext (tracked
// via the `publishTick` counter) so inline edits become the new
// authoritative copy without a page reload.
//
// Every render of a route calls this twice — once in Layout for the nav and
// theme, once in the page itself — and more if a leaf component wants a key.
// They all share ONE request: the fetch is keyed by page, de-duplicated while
// in flight, and cached afterwards, so a navigation costs a single GET rather
// than one per caller.

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

// What's cached, and for which (page, publish) pair. A publish bumps the tick,
// which invalidates the cache for every page.
let cache = null // { key, data }
let inFlight = null // { key, promise }

const cacheKeyFor = (page, tick) => `${page ?? ''}@${tick}`

function loadContent(page, tick) {
  const key = cacheKeyFor(page, tick)
  if (cache?.key === key) return Promise.resolve(cache.data)
  if (inFlight?.key === key) return inFlight.promise

  const path = page ? `/api/content?page=${encodeURIComponent(page)}` : '/api/content'
  const promise = api
    .get(path)
    .then((data) => {
      if (!data) return null
      cache = { key, data }
      latest = data
      listeners.forEach((fn) => fn())
      return data
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null
    })

  inFlight = { key, promise }
  return promise
}

export function useSiteContent(fallback) {
  const { pathname } = useLocation()
  const page = pageKeyFor(pathname)
  const { publishTick } = useEdit()

  // Start from whatever's already cached so a second caller on the same route
  // renders the real copy immediately instead of flashing the fallback.
  const [content, setContent] = useState(() => ({ ...fallback, ...(cache?.data ?? {}) }))
  const [loading, setLoading] = useState(() => cache === null)

  useEffect(() => {
    let cancelled = false
    loadContent(page, publishTick)
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
  }, [page, publishTick])

  return { content, loading }
}
