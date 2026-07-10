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
})

export function EditProvider({ children }) {
  const [pending, setPending] = useState({})
  const [publishing, setPublishing] = useState(false)
  // Bumped after every successful publish; useSiteContent subscribes
  // to it so it re-fetches without needing a full page reload.
  const [publishTick, setPublishTick] = useState(0)

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
    () => ({ pending, isDirty, publishing, publishTick, set, publish, cancel }),
    [pending, isDirty, publishing, publishTick, set, publish, cancel]
  )

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>
}

export const useEdit = () => useContext(EditContext)
