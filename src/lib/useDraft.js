import { useCallback, useEffect, useState } from 'react'

// localStorage-backed useState. Preserves whatever the user was
// typing across refresh, tab close, laptop sleep, etc. Callers must
// call `clear()` explicitly when the draft is done (form submitted,
// or user cancelled) so it doesn't leak into the next session.
//
// All keys are namespaced under `ab-draft:` so a) they're visible in
// DevTools if we ever need to debug, b) we can wipe them all in one
// pass later if the shape changes.

const PREFIX = 'ab-draft:'

export function useDraft(key, initialValue) {
  const storageKey = `${PREFIX}${key}`

  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return initialValue
      const parsed = JSON.parse(raw)
      // Merge onto initialValue so newly-added fields (e.g. we add a
      // new form input in a later release) get their default rather
      // than becoming `undefined`.
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? { ...initialValue, ...parsed }
        : parsed
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Storage may be full or blocked (private mode). Fine — we
      // just don't persist. The UI still works from in-memory state.
    }
  }, [storageKey, value])

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setValue(initialValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  return [value, setValue, clear]
}
