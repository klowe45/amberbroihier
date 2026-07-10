import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const BLANK = {
  title: '',
  description: '',
  embed_url: '',
  display_order: 0,
}

export default function VideoManager() {
  const [videos, setVideos] = useState([])
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')

  const load = () =>
    api
      .get('/api/videos')
      .then((data) => setVideos(data ?? []))
      .catch(() => setVideos([]))

  useEffect(() => {
    load()
  }, [])

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
      setEditing(null)
      load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Remove this video?')) return
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
          <span>YouTube / Vimeo URL</span>
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
        <label className="field">
          <span>Display order (lower = shown first)</span>
          <input
            type="number"
            value={editing.display_order ?? 0}
            onChange={(e) =>
              setEditing({
                ...editing,
                display_order: Number(e.target.value),
              })
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
            onClick={() => {
              setEditing(null)
              setStatus('')
            }}
          >
            Cancel
          </button>
          <span className="save-status">{status}</span>
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
        <span className="save-status">{status}</span>
      </div>
      {videos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No videos yet.</p>
      ) : (
        <ul className="admin-list">
          {videos.map((v) => (
            <li key={v.id}>
              <div className="row-title">{v.title}</div>
              <div className="row-meta">order: {v.display_order ?? 0}</div>
              <div className="row-actions">
                <button className="text-btn" onClick={() => setEditing(v)}>
                  Edit
                </button>
                <button
                  className="text-btn danger"
                  onClick={() => onDelete(v.id)}
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
