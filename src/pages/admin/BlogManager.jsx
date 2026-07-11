import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { api } from '../../lib/api.js'
import { quillModules, quillFormats } from '../../lib/quill.js'
import { useConfirm } from '../../lib/ConfirmContext.jsx'

// localStorage key for an in-progress blog draft. A single slot works
// because only one form can be open at a time (list view otherwise).
// The draft object is the whole `editing` state, so on refresh we
// re-open the form with everything Amber had typed.
const DRAFT_KEY = 'ab-draft:blog-editing'

function loadBlogDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function clearBlogDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

const BLANK = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  published: false,
}

// Turn "How to Give a Great Keynote!" into "how-to-give-a-great-keynote".
// Strips accents, then any character that isn't a-z / 0-9 / space / dash,
// collapses whitespace into single dashes, and trims stray edge dashes.
function slugify(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function BlogManager() {
  const confirm = useConfirm()
  const [posts, setPosts] = useState([])
  // Restore any in-progress post from a previous session so a refresh
  // doesn't wipe her draft. Slug is treated as "touched" whenever a
  // restored draft comes back — she's already been on this form once.
  const [editing, setEditing] = useState(loadBlogDraft)
  const [slugTouched, setSlugTouched] = useState(
    () => loadBlogDraft() != null
  )
  const [status, setStatus] = useState('')

  // Persist the form as she types. When editing is null (back on the
  // list view) the draft is cleared explicitly by the save/cancel
  // handlers below — so we don't wipe it here on the null transition.
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
      clearBlogDraft()
      setEditing(null)
      load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  const onDelete = async (id, title) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      message: 'This will remove the post permanently and cannot be undone.',
      confirmLabel: 'Delete post',
      danger: true,
    })
    if (!ok) return
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
            onChange={(e) => {
              const title = e.target.value
              setEditing((prev) => ({
                ...prev,
                title,
                // Auto-sync the slug from the title until she touches it
                // manually. Also skip the sync when editing an existing
                // post — changing the slug on a live post would break any
                // links she's already shared.
                slug: slugTouched || prev.id ? prev.slug : slugify(title),
              }))
            }}
          />
        </label>
        <label className="field">
          <span>Web address</span>
          <input
            type="text"
            required
            pattern="[a-z0-9-]+"
            value={editing.slug}
            onChange={(e) => {
              const slug = e.target.value
              setSlugTouched(true)
              setEditing((prev) => ({ ...prev, slug }))
            }}
          />
          <small className="field-help">
            {editing.slug ? (
              <>
                Post will live at{' '}
                <code>amberbroihier.com/blog/{editing.slug}</code>
              </>
            ) : (
              'Filled in automatically from the title.'
            )}
          </small>
        </label>
        <label className="field">
          <span>Summary</span>
          <textarea
            rows={2}
            value={editing.excerpt ?? ''}
            onChange={(e) => {
              const excerpt = e.target.value
              setEditing((prev) => ({ ...prev, excerpt }))
            }}
          />
          <small className="field-help">
            Shows under the title on the writing list page. Leave blank
            to auto-use the opening of the post.
          </small>
        </label>
        <label className="field">
          <span>Body</span>
          <div className="quill-wrapper">
            <ReactQuill
              theme="snow"
              value={editing.body ?? ''}
              // Functional setState guards against Quill firing onChange
              // with a closure that captured a stale `editing` — that
              // pattern silently overwrites concurrent field updates
              // and (we suspect) was zeroing the body back to '<p></p>'
              // on save.
              onChange={(html) =>
                setEditing((prev) => ({ ...prev, body: html }))
              }
              modules={quillModules}
              formats={quillFormats}
              placeholder="Write the post…"
            />
          </div>
        </label>
        <label
          className="field"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={editing.published}
            onChange={(e) => {
              const published = e.target.checked
              setEditing((prev) => ({ ...prev, published }))
            }}
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
            onClick={async () => {
              const ok = await confirm({
                title: 'Discard this draft?',
                message: 'Any unsaved changes will be lost.',
                confirmLabel: 'Discard',
                cancelLabel: 'Keep editing',
                danger: true,
              })
              if (!ok) return
              clearBlogDraft()
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
        <button
          className="btn"
          onClick={() => {
            setEditing({ ...BLANK })
            // Fresh post starts in "auto-slug" mode; she'll only mark
            // it touched if she edits the URL field directly.
            setSlugTouched(false)
          }}
        >
          New post
        </button>
      </div>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No posts yet.</p>
      ) : (
        <ul className="admin-list">
          {posts.map((p) => (
            <li key={p.id}>
              <div className="row-title">{p.title}</div>
              <div className="row-meta">/{p.slug}</div>
              <div className="row-actions">
                <span
                  className={`status-pill ${p.published ? 'published' : ''}`}
                >
                  {p.published ? 'Published' : 'Draft'}
                </span>
                <button
                  className="text-btn"
                  onClick={() => {
                    setEditing(p)
                    // Existing posts already have their slug — don't
                    // let a title tweak silently rewrite it.
                    setSlugTouched(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-btn danger"
                  onClick={() => onDelete(p.id, p.title)}
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
