import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useConfirm } from '../../lib/ConfirmContext.jsx'

const BLANK = {
  title: '',
  description: '',
  embed_url: '',
  display_order: 0,
}

// Same pattern as BlogManager: single-slot localStorage draft, restored
// on mount, cleared on save or explicit cancel.
const DRAFT_KEY = 'ab-draft:video-editing'
function loadVideoDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function clearVideoDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

// Extract the host label ("youtube.com", "vimeo.com") for the list row.
// Falls back to a friendly '—' if the URL is missing or malformed
// rather than crashing when Amber pastes something odd.
function urlHost(url) {
  if (!url) return '—'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return '—'
  }
}

export default function VideoManager({ initialEditId = null }) {
  const confirm = useConfirm()
  const [videos, setVideos] = useState([])
  const [editing, setEditing] = useState(loadVideoDraft)
  const [status, setStatus] = useState('')
  // Track whether we've already honored the initialEditId intent, so
  // going back to the list and forward again doesn't re-open the form.
  const initialIntentHandled = useRef(false)

  useEffect(() => {
    if (editing) {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(editing))
      } catch {
        // ignore
      }
    }
  }, [editing])

  const load = () =>
    api
      .get('/api/videos')
      .then((data) => setVideos(data ?? []))
      .catch(() => setVideos([]))

  useEffect(() => {
    load()
  }, [])

  // When routed here from the Speaking page's Edit button, open the
  // requested video's form as soon as the video list arrives.
  useEffect(() => {
    if (initialIntentHandled.current) return
    if (!initialEditId) return
    if (!videos.length) return
    const target = videos.find((v) => v.id === initialEditId)
    if (target) {
      setEditing(target)
      initialIntentHandled.current = true
    }
  }, [initialEditId, videos])

  const onSave = async (e) => {
    e.preventDefault()
    setStatus('Saving…')
    try {
      if (editing.id) {
        await api.put(`/api/videos/${editing.id}`, editing)
      } else {
        await api.post('/api/videos', editing)
      }
      setStatus('Saved.')
      clearVideoDraft()
      setEditing(null)
      load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  const onDelete = async (id, title) => {
    const ok = await confirm({
      title: `Remove "${title}"?`,
      message: 'The video embed will disappear from the Speaking page.',
      confirmLabel: 'Remove video',
      danger: true,
    })
    if (!ok) return
    await api.del(`/api/videos/${id}`)
    load()
  }

  if (editing) {
    return (
      <form className="admin-form" onSubmit={onSave}>
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            required
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Video URL</span>
          <input
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=…"
            value={editing.embed_url}
            onChange={(e) =>
              setEditing({ ...editing, embed_url: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <textarea
            rows={3}
            value={editing.description ?? ''}
            onChange={(e) =>
              setEditing({ ...editing, description: e.target.value })
            }
          />
        </label>
        <div className="save-row">
          <button type="submit" className="btn">
            {editing.id ? 'Save' : 'Add video'}
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={async () => {
              const ok = await confirm({
                title: 'Discard this video?',
                message: 'Any unsaved changes will be lost.',
                confirmLabel: 'Discard',
                cancelLabel: 'Keep editing',
                danger: true,
              })
              if (!ok) return
              clearVideoDraft()
              setEditing(null)
              setStatus('')
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div className="save-row" style={{ marginBottom: '1.5rem' }}>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>
          Add video
        </button>
      </div>
      {videos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No videos yet.</p>
      ) : (
        <ul className="admin-list">
          {videos.map((v) => (
            <li key={v.id}>
              <div className="row-title">{v.title}</div>
              <div className="row-meta">{urlHost(v.embed_url)}</div>
              <div className="row-actions">
                <button className="text-btn" onClick={() => setEditing(v)}>
                  Edit
                </button>
                <button
                  className="text-btn danger"
                  onClick={() => onDelete(v.id, v.title)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
