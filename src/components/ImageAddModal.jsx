import { useEffect, useState } from 'react'
import './ImageAddModal.css'

// Small modal for adding an image to the current page — paste a URL or upload
// a file (read as a data URL so it needs no separate file storage). onAdd is
// called with the image src; the caller places it on the page.
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — keeps the content payload sane

export default function ImageAddModal({ onAdd, onClose }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Please use an image under 2 MB, or paste a hosted URL instead.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onAdd(String(reader.result))
    reader.onerror = () => setError('Couldn’t read that file.')
    reader.readAsDataURL(file)
  }

  const addUrl = () => {
    const v = url.trim()
    if (!v) return
    onAdd(v)
  }

  return (
    <div className="imgadd-overlay" onClick={onClose} role="presentation">
      <div className="imgadd" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add image">
        <div className="imgadd-head">
          <h2>Add an image</h2>
          <button className="imgadd-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <p className="imgadd-error">{error}</p>}

        <label className="imgadd-field">
          <span>Upload from your computer</span>
          <input type="file" accept="image/*" onChange={onFile} />
          <small>PNG, JPG, GIF, or SVG up to 2 MB.</small>
        </label>

        <div className="imgadd-or">or</div>

        <label className="imgadd-field">
          <span>Paste an image URL</span>
          <div className="imgadd-url-row">
            <input
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addUrl() }}
            />
            <button className="imgadd-add" onClick={addUrl} disabled={!url.trim()}>Add</button>
          </div>
        </label>

        <p className="imgadd-hint">Once added, drag the image anywhere on the page. Publish to save.</p>
      </div>
    </div>
  )
}
