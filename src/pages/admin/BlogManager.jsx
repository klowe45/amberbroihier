import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const BLANK = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  published: false,
}

export default function BlogManager() {
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')

  const load = () =>
    api
      .get('/api/posts')
      .then((data) => setPosts(data ?? []))
      .catch(() => setPosts([]))

  useEffect(() => {
    load()
  }, [])

  const onSave = async (e) => {
    e.preventDefault()
    setStatus('Saving…')
    try {
      if (editing.id) {
        await api.put(`/api/posts/${editing.id}`, editing)
      } else {
        await api.post('/api/posts', editing)
      }
      setStatus('Saved.')
      setEditing(null)
      load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    await api.del(`/api/posts/${id}`)
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
            onChange={(e) =>
              setEditing({ ...editing, title: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Slug (URL — lowercase, dashes)</span>
          <input
            type="text"
            required
            pattern="[a-z0-9-]+"
            value={editing.slug}
            onChange={(e) =>
              setEditing({ ...editing, slug: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Excerpt (short blurb for the list page)</span>
          <textarea
            rows={2}
            value={editing.excerpt ?? ''}
            onChange={(e) =>
              setEditing({ ...editing, excerpt: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Body</span>
          <textarea
            required
            rows={16}
            value={editing.body ?? ''}
            onChange={(e) =>
              setEditing({ ...editing, body: e.target.value })
            }
          />
        </label>
        <label
          className="field"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={editing.published}
            onChange={(e) =>
              setEditing({ ...editing, published: e.target.checked })
            }
          />
          <span style={{ marginBottom: 0 }}>Published</span>
        </label>
        <div className="save-row">
          <button type="submit" className="btn">
            {editing.id ? 'Save' : 'Create post'}
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
          New post
        </button>
        <span className="save-status">{status}</span>
      </div>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No posts yet.</p>
      ) : (
        <ul className="admin-list">
          {posts.map((p) => (
            <li key={p.id}>
              <div className="row-title">
                {p.title}
                <span
                  className={`status-pill ${p.published ? 'published' : ''}`}
                  style={{ marginLeft: '0.75rem' }}
                >
                  {p.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="row-meta">/{p.slug}</div>
              <div className="row-actions">
                <button className="text-btn" onClick={() => setEditing(p)}>
                  Edit
                </button>
                <button
                  className="text-btn danger"
                  onClick={() => onDelete(p.id)}
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
