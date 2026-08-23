import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'

// Tracks Amber's pending inline edits to site_content. Buffered client-
// side so she can preview freely; a single PUT /api/content commits the
// whole batch on Publish. Cancel discards the buffer.

const EditContext = createContext({
  pending: {},
  isDirty: false,
  publishTick: 0,
  set: () => {},
  publish: async () => {},
  cancel: () => {},
  refresh: () => {},
})

// localStorage key for the pending-edits buffer. Namespaced under the
// same `ab-draft:` prefix as useDraft so every persisted-draft-thing
// lives in one bucket, easy to eyeball or wipe if needed.
const PENDING_STORAGE_KEY = 'ab-draft:inline-edits'

function loadPending() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function EditProvider({ children }) {
  // Initialize from localStorage so a refresh doesn't discard Amber's
  // in-progress inline edits. Nothing gets published to the DB until
  // she hits Publish — the persistence is purely a "don't lose typing"
  // safety net.
  const [pending, setPending] = useState(loadPending)
  const [publishing, setPublishing] = useState(false)
  // Bumped after every successful publish; useSiteContent subscribes
  // to it so it re-fetches without needing a full page reload.
  const [publishTick, setPublishTick] = useState(0)

  // Sync pending → localStorage on every change. Empty map removes
  // the key entirely so we don't leave a stale `{}` around.
  useEffect(() => {
    try {
      if (Object.keys(pending).length) {
        window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending))
      } else {
        window.localStorage.removeItem(PENDING_STORAGE_KEY)
      }
    } catch {
      // ignore — private mode / quota exceeded / etc.
    }
  }, [pending])

  const set = useCallback((key, value) => {
    setPending((prev) => {
      // Empty out entries whose new value equals the saved one? We
      // don't know the saved value here — the caller sends `null` /
      // `undefined` when it wants to clear a specific field. Any real
      // string, including "", is treated as a pending change.
      if (value === null || value === undefined) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const cancel = useCallback(() => setPending({}), [])

  // Force useSiteContent subscribers to re-fetch — e.g. after the theme editor
  // saves directly to /api/content (bypassing the pending-edit publish path).
  const refresh = useCallback(() => setPublishTick((n) => n + 1), [])

  const publish = useCallback(async () => {
    const entries = Object.entries(pending).map(([key, value]) => ({
      key,
      value,
    }))
    if (!entries.length) return
    setPublishing(true)
    try {
      await api.put('/api/content', { entries })
      setPending({})
      setPublishTick((n) => n + 1)
    } finally {
      setPublishing(false)
    }
  }, [pending])

  const isDirty = Object.keys(pending).length > 0

  // Warn on tab close / navigation if there are unsaved edits.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const value = useMemo(
    () => ({ pending, isDirty, publishing, publishTick, set, publish, cancel, refresh }),
    [pending, isDirty, publishing, publishTick, set, publish, cancel, refresh]
  )

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>
}

export const useEdit = () => useContext(EditContext)
