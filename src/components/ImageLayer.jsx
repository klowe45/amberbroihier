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
// Placement is RELATIVE, so an image stays beside the copy it was placed next
// to at any window width. Each view's placement lives in `rel` (desktop) /
// `mrel` (mobile) as { fx, fw, key, at, off }:
//   fx, fw — left edge and width as fractions of the content column, so the
//            image re-centers and scales with the text column;
//   key    — the site_content key of the text block it was dropped beside
//            (EditableText marks its element with data-anchor), so when text
//            above it rewraps and grows, the image moves down with it;
//   at/off — where vertically relative to that block: 'in' = fraction of the
//            block's height, 'after' = px below its bottom, 'before' = px
//            above its top.
// x/y/w (and mx/my/mw) are still written, as absolute px, for the fallback
// when the anchor block isn't on the page. Images saved before `rel` existed
// keep their old placement until Amber next moves or resizes them.

const MOBILE_MQ = '(max-width: 640px)'

const parseList = (raw) => {
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

const round4 = (n) => Math.round(n * 10000) / 10000

// Everything placement depends on, read from the live DOM: the content
// column's left edge and width, and every text block's box — all in the
// layer's coordinates.
function measure(layerEl) {
  const W = layerEl.clientWidth
  const max = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--max-content')
  )
  const colW = Number.isFinite(max) ? Math.min(W, max) : W
  const origin = layerEl.getBoundingClientRect()
  const anchors = []
  const scope = layerEl.parentElement ?? layerEl
  scope.querySelectorAll('[data-anchor]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (!r.height) return
    anchors.push({ key: el.dataset.anchor, top: r.top - origin.top, bottom: r.bottom - origin.top })
  })
  return { W, max: Number.isFinite(max) ? max : W, colLeft: (W - colW) / 2, colW, anchors }
}

// Absolute box → relative placement.
function toRel(g, { x, y, w }) {
  const rel = { fx: round4((x - g.colLeft) / g.colW), fw: round4(w / g.colW) }
  // The block whose top is closest above the image's top edge (the smaller
  // one on a tie — a paragraph beats the section wrapping it).
  let best = null
  for (const a of g.anchors) {
    if (a.top > y) continue
    if (!best || a.top > best.top || (a.top === best.top && a.bottom < best.bottom)) best = a
  }
  if (!best) {
    // Above every block: hang it off the first one.
    const first = g.anchors.reduce((m, a) => (!m || a.top < m.top ? a : m), null)
    if (!first) return rel
    return { ...rel, key: first.key, at: 'before', off: Math.round(first.top - y) }
  }
  if (y <= best.bottom) {
    return { ...rel, key: best.key, at: 'in', off: round4((y - best.top) / (best.bottom - best.top)) }
  }
  return { ...rel, key: best.key, at: 'after', off: Math.round(y - best.bottom) }
}

// Relative placement → absolute box. `fallbackY` is used when the anchor
// block isn't on the page (or none was recorded).
function fromRel(g, rel, fallbackY) {
  const w = Math.max(40, rel.fw * g.colW)
  const x = g.colLeft + rel.fx * g.colW
  const a = rel.key ? g.anchors.find((b) => b.key === rel.key) : null
  let y = fallbackY
  if (a) {
    if (rel.at === 'in') y = a.top + rel.off * (a.bottom - a.top)
    else if (rel.at === 'after') y = a.bottom + rel.off
    else if (rel.at === 'before') y = a.top - rel.off
  }
  return { x, y, w }
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

  // Placement is computed from the live layout, so re-render whenever it can
  // have shifted: the page resizing (window width, copy arriving from the
  // API, text rewrapping — the layer spans the whole main area) and web
  // fonts finishing loading.
  const [layerEl, setLayerEl] = useState(null)
  useEffect(() => {
    if (!layerEl) return
    const ro = new ResizeObserver(() => force())
    ro.observe(layerEl)
    let alive = true
    document.fonts?.ready.then(() => { if (alive) force() })
    return () => { alive = false; ro.disconnect() }
  }, [layerEl])

  const listKey = `images_${page}`
  const images = parseList(pending[listKey] ?? content[listKey] ?? '[]')
  if (!images.length && !isAdmin) return null

  const g = layerEl ? measure(layerEl) : null

  // Absolute box for the current view.
  const posFor = (img) => {
    if (isMobile) {
      if (img.mrel) return fromRel(g, img.mrel, img.my ?? img.y)
      if (img.mx != null) return { x: img.mx, y: img.my ?? img.y, w: img.mw ?? img.w }
      // No mobile placement yet: follow the desktop one, scaled to this column.
    }
    if (img.rel) return fromRel(g, img.rel, img.y)
    // Legacy: `anchor: 'column'` stored px from the column's left edge at
    // full column width; older images px from the window's left edge.
    if (img.anchor === 'column') {
      const k = g.colW / g.max
      return { x: g.colLeft + img.x * k, y: img.y, w: img.w * k }
    }
    return { x: img.x, y: img.y, w: img.w }
  }

  // Never let an image hang off either side of the window.
  const clampX = (p) => ({ ...p, x: Math.max(0, Math.min(p.x, g.W - Math.min(p.w, g.W))) })

  const liveOf = (img) => {
    const base = clampX(posFor(img))
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
    const orig = clampX(posFor(img))
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
      // Measured fresh: the layout may have shifted since the gesture began.
      const box = { x: Math.round(cur.x), y: Math.round(cur.y), w: Math.round(cur.w) }
      const rel = layerEl ? toRel(measure(layerEl), box) : null
      set(listKey, JSON.stringify(images.map((im) => {
        if (im.id !== img.id) return im
        if (isMobile) return { ...im, mx: box.x, my: box.y, mw: box.w, mrel: rel ?? undefined }
        // eslint-disable-next-line no-unused-vars
        const { anchor, ...rest } = im
        return { ...rest, x: box.x, y: box.y, w: box.w, rel: rel ?? undefined }
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
      {g && images.map((img) => {
        const p = liveOf(img)
        return (
          <figure
            key={img.id}
            className={`image-item${dragRef.current?.id === img.id ? ' is-dragging' : ''}`}
            style={{ left: p.x, top: p.y, width: p.w }}
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
