import { useEffect, useReducer, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import './ImageLayer.css'

// Free-positioned images Amber can drag ANYWHERE over the page — with SEPARATE
// staged positions for desktop and mobile, since one px coordinate can't be
// right for both widths. Each image is stored in site_content under
// `images_<page>` as { id, src, x, y, w, mx, my, mw }: x/y/w are the desktop
// placement; mx/my/mw the mobile placement (falling back to desktop until set).
// You edit whichever view the browser is currently showing, so moving it on one
// never disturbs the other. Persists on Publish.

const MOBILE_MQ = '(max-width: 640px)'

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

  const listKey = `images_${page}`
  const images = parseList(pending[listKey] ?? content[listKey] ?? '[]')
  if (!images.length && !isAdmin) return null

  // The position for the current view (mobile falls back to desktop until set).
  const posFor = (img) =>
    isMobile
      ? { x: img.mx ?? img.x, y: img.my ?? img.y, w: img.mw ?? img.w }
      : { x: img.x, y: img.y, w: img.w }

  const liveOf = (img) => {
    const base = posFor(img)
    return dragRef.current?.id === img.id ? { ...base, ...dragRef.current.cur } : base
  }

  const remove = (id) =>
    set(listKey, JSON.stringify(images.filter((i) => i.id !== id)))

  const startGesture = (e, img, mode) => {
    if (!isAdmin) return
    e.preventDefault()
    e.stopPropagation()
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
      dragRef.current = { id: img.id, cur }
      force()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      // Write only the CURRENT view's fields, leaving the other view untouched.
      set(listKey, JSON.stringify(images.map((im) => {
        if (im.id !== img.id) return im
        return isMobile
          ? { ...im, mx: cur.x, my: cur.y, mw: cur.w }
          : { ...im, x: cur.x, y: cur.y, w: cur.w }
      })))
      dragRef.current = null
      force()
    }
    dragRef.current = { id: img.id, cur }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className={`image-layer${isAdmin ? ' is-admin' : ''}`}>
      {images.map((img) => {
        const p = liveOf(img)
        return (
          <figure
            key={img.id}
            className="image-item"
            style={{ left: p.x, top: p.y, width: p.w }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              onPointerDown={(e) => startGesture(e, img, 'move')}
            />
            {isAdmin && (
              <>
                <span className="image-view-badge">{isMobile ? 'Mobile' : 'Desktop'}</span>
                <button
                  type="button"
                  className="image-remove"
                  onClick={() => remove(img.id)}
                  aria-label="Remove image"
                  title="Remove image"
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
