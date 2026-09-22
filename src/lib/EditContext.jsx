import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api.js'

// Tracks Amber's pending inline edits to site_content. Buffered client-
// side so she can preview freely; a single PUT /api/content commits the
// whole batch on Publish. Cancel discards the buffer.

const EditContext = createContext({
  pending: {},
  isDirty: false,
  publishTick: 0,
  publishError: '',
  canUndo: false,
  canRedo: false,
  set: () => {},
  undo: () => {},
  redo: () => {},
  publish: async () => {},
  cancel: () => {},
  refresh: () => {},
})

// Undo history depth (snapshots of the pending map).
const HISTORY_LIMIT = 100

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

// Turn an API error into something Amber can act on.
function explainPublishFailure(err) {
  if (err?.status === 413) {
    return 'Too much to save at once — usually a very large image. Remove the newest image, publish, then re-add it smaller.'
  }
  if (err?.status === 401 || err?.status === 403) {
    return 'Your sign-in expired. Open the login page in another tab, sign in, then come back and press Publish again — your edits are still here.'
  }
  if (err?.status >= 500) {
    return 'The server had a problem saving. Your edits are still here — wait a moment and press Publish again.'
  }
  if (err?.status === undefined) {
    return "Couldn't reach the server. Your edits are still here — check your connection and press Publish again."
  }
  return `${err.message || 'Publish failed'} — your edits are still here. Try Publish again.`
}

export function EditProvider({ children }) {
  // Initialize from localStorage so a refresh doesn't discard Amber's
  // in-progress inline edits. Nothing gets published to the DB until
  // she hits Publish — the persistence is purely a "don't lose typing"
  // safety net.
  const [pending, setPending] = useState(loadPending)
  const [publishing, setPublishing] = useState(false)
  // Last failed publish, surfaced in the EditBar. A failed publish used to
  // reject into the void: the button went back to "Publish", the edits stayed
  // in the pending buffer (and so kept rendering from localStorage), and it
  // looked saved to whoever was editing while the live site never changed.
  const [publishError, setPublishError] = useState('')
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

  // Undo/redo over the pending buffer. Each user action (a text commit,
  // a drag, a block removal…) snapshots the buffer before it changes.
  // Several set() calls from one handler — a drag writes space + shift,
  // removing a block writes the list + its payload — are coalesced into
  // one step by keeping the "batch" open until the current tick ends.
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  const undoStack = useRef([])
  const redoStack = useRef([])
  const batchOpen = useRef(false)
  const [historyTick, setHistoryTick] = useState(0)

  const snapshot = useCallback(() => {
    if (batchOpen.current) return
    batchOpen.current = true
    undoStack.current.push(pendingRef.current)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
    setTimeout(() => { batchOpen.current = false }, 0)
    setHistoryTick((n) => n + 1)
  }, [])

  const set = useCallback((key, value) => {
    snapshot()
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
  }, [snapshot])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(pendingRef.current)
    setPending(prev)
    setHistoryTick((n) => n + 1)
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(pendingRef.current)
    setPending(next)
    setHistoryTick((n) => n + 1)
  }, [])

  // Cancel is itself undoable — a mis-click shouldn't cost an hour of edits.
  const cancel = useCallback(() => {
    snapshot()
    setPending({})
  }, [snapshot])

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
    setPublishError('')
    try {
      await api.put('/api/content', { entries })
      setPending({})
      // Published edits are in the DB now; undo can't take those back.
      undoStack.current = []
      redoStack.current = []
      setHistoryTick((n) => n + 1)
      setPublishTick((n) => n + 1)
    } catch (err) {
      // Keep the pending buffer — nothing is lost, she can retry once the
      // cause is gone. Just make sure she knows it did NOT save.
      setPublishError(explainPublishFailure(err))
    } finally {
      setPublishing(false)
    }
  }, [pending])

  const dismissPublishError = useCallback(() => setPublishError(''), [])

  const isDirty = Object.keys(pending).length > 0
  // historyTick is read so these recompute after every push/pop.
  const canUndo = historyTick >= 0 && undoStack.current.length > 0
  const canRedo = historyTick >= 0 && redoStack.current.length > 0

  // ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z page-wide, except while typing in an
  // input or the rich-text editor (those have their own undo).
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const t = e.target
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return
      if (t?.closest?.('.ql-container, .ql-toolbar')) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

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
    () => ({ pending, isDirty, publishing, publishTick, publishError, dismissPublishError, canUndo, canRedo, set, undo, redo, publish, cancel, refresh }),
    [pending, isDirty, publishing, publishTick, publishError, dismissPublishError, canUndo, canRedo, set, undo, redo, publish, cancel, refresh]
  )

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>
}

export const useEdit = () => useContext(EditContext)
