import { useEffect, useState } from 'react'
import { toEmbedUrl, isVideoFileUrl } from '../lib/embedUrl.js'
import './ImageAddModal.css'

// Small modal for adding an image or a video to the current page.
//   Image: paste a URL or upload a file (read as a data URL so it needs no
//          separate file storage).
//   Video: paste a YouTube / Vimeo link (embedded player) or a direct link
//          to a video file (.mp4 / .webm / .mov).
// onAdd is called with { type: 'image' | 'video', src }; the caller places
// it on the page.
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — keeps the content payload sane

// Every image on a page is stored inline as a base64 data URL inside one
// `images_<page>` row, and the whole row is re-sent on every Publish. So a
// handful of full-size phone photos will blow past any request body limit and
// the publish fails. Downscale raster uploads to something a web page actually
// needs before they ever enter the payload.
const MAX_EDGE = 1600 // px on the longest side
const JPEG_QUALITY = 0.85

// GIFs (animation) and SVGs (vector) would be ruined by a canvas round-trip.
const passThrough = (type) => type === 'image/gif' || type === 'image/svg+xml'

function downscaleToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      // Already small enough and not a heavyweight format — keep the original
      // bytes rather than re-encoding (and re-compressing) for nothing.
      if (scale === 1 && file.size <= 400 * 1024) {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      // PNGs with transparency would go black on a JPEG background, so paint
      // white underneath — the site's surfaces are light anyway.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode failed'))
    }
    img.src = url
  })
}

export default function ImageAddModal({ onAdd, onClose }) {
  const [kind, setKind] = useState('image')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = async (e) => {
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
    setError('')
    if (passThrough(file.type)) {
      const reader = new FileReader()
      reader.onload = () => onAdd({ type: 'image', src: String(reader.result) })
      reader.onerror = () => setError('Couldn’t read that file.')
      reader.readAsDataURL(file)
      return
    }
    try {
      onAdd({ type: 'image', src: await downscaleToDataUrl(file) })
    } catch {
      setError('Couldn’t read that file.')
    }
  }

  const addUrl = () => {
    const v = url.trim()
    if (!v) return
    if (kind === 'image') {
      onAdd({ type: 'image', src: v })
      return
    }
    if (isVideoFileUrl(v)) {
      onAdd({ type: 'video', src: v })
      return
    }
    const embed = toEmbedUrl(v)
    if (!embed || !/^https?:\/\//i.test(embed) || embed === v && !/youtube|vimeo/i.test(v)) {
      setError('Paste a YouTube or Vimeo link, or a direct link to a video file (.mp4).')
      return
    }
    onAdd({ type: 'video', src: embed })
  }

  const switchKind = (k) => { setKind(k); setError(''); setUrl('') }

  return (
    <div className="imgadd-overlay" onClick={onClose} role="presentation">
      <div className="imgadd" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add image">
        <div className="imgadd-head">
          <h2>{kind === 'image' ? 'Add an image' : 'Add a video'}</h2>
          <button className="imgadd-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="imgadd-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={kind === 'image'} className={kind === 'image' ? 'is-active' : ''} onClick={() => switchKind('image')}>Image</button>
          <button type="button" role="tab" aria-selected={kind === 'video'} className={kind === 'video' ? 'is-active' : ''} onClick={() => switchKind('video')}>Video</button>
        </div>

        {error && <p className="imgadd-error">{error}</p>}

        {kind === 'image' ? (
          <>
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
          </>
        ) : (
          <>
            <label className="imgadd-field">
              <span>Paste a video link</span>
              <div className="imgadd-url-row">
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addUrl() }}
                />
                <button className="imgadd-add" onClick={addUrl} disabled={!url.trim()}>Add</button>
              </div>
              <small>
                YouTube or Vimeo links play in an embedded player (an “unlisted” YouTube
                upload works well). A direct .mp4 link plays in the browser’s own player.
              </small>
            </label>

            <p className="imgadd-hint">Once added, drag the video by its top bar to place it. Publish to save.</p>
          </>
        )}
      </div>
    </div>
  )
}
