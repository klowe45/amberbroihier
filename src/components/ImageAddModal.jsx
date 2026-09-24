import { useEffect, useState } from 'react'
import { toEmbedUrl, isVideoFileUrl, isKnownVideoHost } from '../lib/embedUrl.js'
import './ImageAddModal.css'

// Small modal for adding an image or a video to the current page.
//   Image: paste a URL or upload a file (read as a data URL so it needs no
//          separate file storage).
//   Video: paste a YouTube / Vimeo link (embedded player) or a direct link
//          to a video file (.mp4 / .webm / .mov). Video FILES aren't uploaded
//          — a real video inlined as base64 would ride along in every
//          visitor's /api/content response.
// onAdd is called with { type: 'image' | 'video', src }; the caller places
// it on the page.

// Every image on a page is stored inline as a base64 data URL inside one
// `images_<page>` row, and the whole row is re-sent on every Publish — so an
// upload is downscaled to what a web page actually needs before it ever
// enters the payload. Because of that we can accept a straight-off-the-phone
// photo: 100 MB in, a couple hundred KB out.
const MAX_BYTES = 100 * 1024 * 1024

// GIF (animation) and SVG (vector) would be ruined by a canvas round-trip, so
// they go in untouched — which means they need a tighter cap is
// really the backend's: 100 MB is ~133 MB once base64'd, which is what the
// /api/content body limit is sized for.
const MAX_PASSTHROUGH_BYTES = 100 * 1024 * 1024
const passThrough = (type) => type === 'image/gif' || type === 'image/svg+xml'

const MAX_EDGE = 1600 // px on the longest side
const QUALITY = 0.85

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = src
  })

// Encode the canvas, keeping transparency when the source had any. JPEG can't
// hold an alpha channel — a logo with a transparent background would come out
// on a white box — so anything that isn't already a JPEG is encoded as WebP,
// falling back to PNG on browsers whose canvas won't write WebP.
function encode(canvas, sourceType) {
  if (sourceType === 'image/jpeg' || sourceType === 'image/jpg') {
    return canvas.toDataURL('image/jpeg', QUALITY)
  }
  const webp = canvas.toDataURL('image/webp', QUALITY)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
}

// Returns a data URL no larger than simply inlining the original file.
async function toStoredDataUrl(file) {
  const original = await readAsDataUrl(file)
  const img = await loadImage(original)

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const encoded = encode(canvas, file.type)
  // Re-encoding a small, already-optimised file can make it bigger. Keep
  // whichever is smaller.
  return encoded.length < original.length ? encoded : original
}

export default function ImageAddModal({ onAdd, onClose }) {
  const [kind, setKind] = useState('image')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  // A big photo takes a moment to decode + re-encode; say so rather than
  // looking frozen.
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Some phones hand over a HEIC with an empty `type`, so don't reject on
    // the MIME type alone — let the decode be the judge.
    if (file.type && !file.type.startsWith('image/')) {
      setError('That file isn’t an image.')
      return
    }
    setError('')
    setBusy(true)
    try {
      if (passThrough(file.type)) {
        if (file.size > MAX_PASSTHROUGH_BYTES) {
          setError(
            file.type === 'image/gif'
              ? 'That GIF is over 100 MB. Animated GIFs are saved as-is, so please use a smaller one or host it and paste the link.'
              : 'That SVG is over 100 MB. Please use a smaller one or host it and paste the link.'
          )
          return
        }
        onAdd({ type: 'image', src: await readAsDataUrl(file) })
        return
      }
      if (file.size > MAX_BYTES) {
        setError('That image is over 100 MB. Please use a smaller one, or paste a hosted image link instead.')
        return
      }
      onAdd({ type: 'image', src: await toStoredDataUrl(file) })
    } catch {
      // Chrome and Firefox can't decode HEIC/HEIF — the format iPhones shoot
      // by default. Tell her what to actually do about it.
      if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || '')) {
        setError(
          'This browser can’t read iPhone HEIC photos. On your iPhone: Settings → Camera → Formats → Most Compatible, or open the photo and share it as a JPEG. Safari can read HEIC directly.'
        )
      } else {
        setError('Couldn’t read that file. Try a PNG or JPG.')
      }
    } finally {
      setBusy(false)
      // Let her pick the same file again after a failure.
      e.target.value = ''
    }
  }

  const addUrl = () => {
    let v = url.trim()
    if (!v) return
    // Copying from the address bar often drops the scheme ("youtube.com/…").
    // Add it back rather than making her retype the whole thing.
    if (!/^https?:\/\//i.test(v)) {
      if (/^[\w-]+(\.[\w-]+)+(?:[/:?#]|$)/.test(v)) {
        v = `https://${v}`
      } else {
        setError('Paste the full web address, starting with https://')
        return
      }
    }
    if (kind === 'image') {
      onAdd({ type: 'image', src: v })
      return
    }
    if (isVideoFileUrl(v)) {
      onAdd({ type: 'video', src: v })
      return
    }
    if (isKnownVideoHost(v)) {
      const embed = toEmbedUrl(v)
      if (!embed) {
        setError(
          'That’s a YouTube or Vimeo address, but there’s no video in it. Open the video itself and use Share → Copy link.'
        )
        return
      }
      onAdd({ type: 'video', src: embed })
      return
    }
    setError('Paste a YouTube or Vimeo link, or a direct link to a video file (.mp4, .webm, .mov).')
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
              <input type="file" accept="image/*,.heic,.heif" onChange={onFile} disabled={busy} />
              <small>
                {busy
                  ? 'Preparing your image…'
                  : 'PNG, JPG, WebP, AVIF or HEIC up to 12 MB — resized automatically. Animated GIF and SVG up to 2 MB, saved as-is.'}
              </small>
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

            <p className="imgadd-hint">Once added, drag the image anywhere on the page, and drag its bottom-right corner to resize. Publish to save.</p>
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
                Any YouTube address works — watch, youtu.be, Shorts, live, or a playlist —
                and so does any Vimeo one, including unlisted links. They play in an
                embedded player (an “unlisted” YouTube upload works well). A direct link to
                a video file (.mp4, .webm, .mov) plays in the browser’s own player.
              </small>
            </label>

            <p className="imgadd-hint">Once added, drag the video by its top bar to place it, and drag its bottom-right corner to resize. Publish to save.</p>
          </>
        )}
      </div>
    </div>
  )
}
