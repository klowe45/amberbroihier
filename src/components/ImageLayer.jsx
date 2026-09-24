import { useEffect, useReducer, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { isVideoFileUrl } from '../lib/embedUrl.js'
import './ImageLayer.css'

// Free-positioned images Amber can drag ANYWHERE over the page — with SEPARATE
// staged positions for desktop and mobile, since one px coordinate can't be
// right for both widths. Each image is stored in site_content under
// `images_<page>` as { id, src, x, y, w, mx, my, mw } (+ type: 'video' for an
// embedded YouTube/Vimeo player or a video file): x/y/w are the desktop
// placement; mx/my/mw the mobile placement (falling back to desktop until set).
// You edit whichever view the browser is currently showing, so moving it on one
// never disturbs the other. Persists on Publish.
//
// x is measured from the left edge of the centered content column, not the
// window: the text sits in a max-width column that re-centers as the window
// changes width, so a window-relative x left images stranded away from the
// copy they were placed beside whenever the page was viewed at another width.
// Images saved before that change have no `anchor` and a window-relative x;
// they render exactly where they always did until Amber next moves or resizes
// them on desktop, which re-saves them as `anchor: 'column'`.

const MOBILE_MQ = '(max-width: 640px)'

// Left edge of the `.container` column inside a layer of the given width.
function columnLeftFor(width) {
  const max = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--max-content')
  )
  return Number.isFinite(max) ? Math.max(0, (width - max) / 2) : 0
}

const parseList = (raw) => {
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

export default function ImageLayer({ page, content = {} }) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const [, force] = useReducer((n) => n + 1, 0)
  const dragRef = useRef(null) // { id, cur:{x,y,w} } during an active move/resize

  // Which staged position we're editing/showing — follows the viewport width.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const on = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Where the content column starts, tracked as the layer (full page width)
  // resizes. Seeded from the viewport so the first paint is already right.
  const [layerEl, setLayerEl] = useState(null)
  const [colLeft, setColLeft] = useState(() =>
    typeof window === 'undefined' ? 0 : columnLeftFor(document.documentElement.clientWidth)
  )
  useEffect(() => {
    if (!layerEl) return
    const measure = () => setColLeft(columnLeftFor(layerEl.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(layerEl)
    return () => ro.disconnect()
  }, [layerEl])

  const listKey = `images_${page}`
  const images = parseList(pending[listKey] ?? content[listKey] ?? '[]')
  if (!images.length && !isAdmin) return null

  // Desktop x in column coordinates, converting a legacy window-relative x.
  // (mx needs no conversion: at mobile widths the column starts at 0, so the
  // two coordinate systems coincide.)
  const colX = (img) => (img.anchor === 'column' ? img.x : img.x - colLeft)

  // The position for the current view (mobile falls back to desktop until set).
  const posFor = (img) =>
    isMobile
      ? { x: img.mx ?? colX(img), y: img.my ?? img.y, w: img.mw ?? img.w }
      : { x: colX(img), y: img.y, w: img.w }

  const liveOf = (img) => {
    const base = posFor(img)
    return dragRef.current?.id === img.id ? { ...base, ...dragRef.current.cur } : base
  }

  const remove = (id) =>
    set(listKey, JSON.stringify(images.filter((i) => i.id !== id)))

  const startGesture = (e, img, mode) => {
    if (!isAdmin) return
    // Left button / touch / pen only — a right-click opens the page menu.
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    // A YouTube iframe (and a <video> with controls) swallows every pointer
    // event that lands on it, so the moment the cursor crossed the player the
    // drag stopped following it. Capturing the pointer on the handle routes
    // the whole gesture back to us no matter what it passes over.
    const handle = e.currentTarget
    try {
      handle.setPointerCapture(e.pointerId)
    } catch {
      // Not fatal — older browsers just fall back to the window listeners.
    }

    const startX = e.clientX
    const startY = e.clientY
    const orig = posFor(img)
    const cur = { ...orig }
    const move = (ev) => {
      if (mode === 'move') {
        cur.x = Math.round(orig.x + (ev.clientX - startX))
        cur.y = Math.round(orig.y + (ev.clientY - startY))
      } else {
        cur.w = Math.max(60, Math.round(orig.w + (ev.clientX - startX)))
      }
      dragRef.current = { id: img.id, cur, mode }
      force()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        // Already released (pointercancel, element re-rendered) — nothing to do.
      }
      // Write only the CURRENT view's fields, leaving the other view untouched.
      set(listKey, JSON.stringify(images.map((im) => {
        if (im.id !== img.id) return im
        return isMobile
          ? { ...im, mx: cur.x, my: cur.y, mw: cur.w }
          : { ...im, x: cur.x, y: cur.y, w: cur.w, anchor: 'column' }
      })))
      dragRef.current = null
      force()
    }
    dragRef.current = { id: img.id, cur, mode }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div ref={setLayerEl} className={`image-layer${isAdmin ? ' is-admin' : ''}`}>
      {images.map((img) => {
        const p = liveOf(img)
        return (
          <figure
            key={img.id}
            className={`image-item${dragRef.current?.id === img.id ? ' is-dragging' : ''}`}
            style={{ left: colLeft + p.x, top: p.y, width: p.w }}
          >
            {img.type === 'video' ? (
              <div className="image-video">
                {/* A player swallows pointer events, so the admin drag handle
                    is a bar across the top; the player itself stays usable. */}
                {isAdmin && (
                  <div
                    className="image-video-handle"
                    onPointerDown={(e) => startGesture(e, img, 'move')}
                    title="Drag to move"
                  >
                    ⠿ drag to move
                  </div>
                )}
                {isVideoFileUrl(img.src) ? (
                  <video src={img.src} controls playsInline preload="metadata" />
                ) : (
                  <iframe
                    src={img.src}
                    title="Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <img
                src={img.src}
                alt=""
                draggable={false}
                onPointerDown={(e) => startGesture(e, img, 'move')}
              />
            )}
            {isAdmin && (
              <>
                <span className="image-view-badge">{isMobile ? 'Mobile' : 'Desktop'}</span>
                <button
                  type="button"
                  className="image-remove"
                  onClick={() => remove(img.id)}
                  aria-label={img.type === 'video' ? 'Remove video' : 'Remove image'}
                  title={img.type === 'video' ? 'Remove video' : 'Remove image'}
                >
                  ×
                </button>
                <span
                  className="image-resize"
                  onPointerDown={(e) => startGesture(e, img, 'resize')}
                  aria-label="Drag to resize"
                  title="Drag to resize"
                />
              </>
            )}
          </figure>
        )
      })}
    </div>
  )
}
