import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { createPortal } from 'react-dom'
import { isVideoFileUrl } from '../lib/embedUrl.js'
import { PHONE_MODES, phoneLayout } from '../lib/phoneLayout.js'
import './PhoneImages.css'

// On phones, free-positioned images would land on top of the text (the copy
// rewraps much taller than on desktop), so instead of floating over the page
// they're placed IN the text flow next to the block they sit beside on
// desktop: either wrapped, newspaper-style, with the text flowing around them,
// or full width between paragraphs. Amber chooses per image under "On phones"
// (stored as `phone` on the image); Automatic decides from her desktop layout.
// An image she has dragged to a spot on a phone (mx/mrel) keeps that spot and
// isn't handled here.

const HOST = 'phone-img-host'
const isHost = (n) => n?.nodeType === 1 && n.classList.contains(HOST)
const skipHosts = (n) => { while (n && isHost(n)) n = n.nextSibling; return n }

// The rendered rich text of a text block (EditableText's wrapper, or a post).
const richOf = (el) =>
  el.querySelector(':scope > .rich-text') ?? (el.classList.contains('post-body') ? el : null)

// Wrapped text needs at least this much copy after the image to flow
// around; with less, the picture would sit beside a line or two and a gap.
const MIN_WRAP_TEXT = 160
const isHeading = (n) => /^H[1-6]$/.test(n.tagName)
const textFrom = (kids, i) => kids.slice(i).reduce((n, k) => n + k.textContent.trim().length, 0)

// The paragraph to put an image before, near `i` in a block's paragraphs.
// A wrapped image prefers a spot that isn't a heading and has enough text
// after it, looking upward first so it stays near where Amber put it.
function pick(rt, i, wrapping) {
  const kids = [...rt.children].filter((k) => !isHost(k))
  if (!kids.length) return { parent: rt, before: null, room: 0 }
  i = Math.min(kids.length - 1, Math.max(0, i))
  if (wrapping) {
    const order = [...Array(kids.length).keys()].sort((a, b) =>
      (a > i) - (b > i) || Math.abs(a - i) - Math.abs(b - i))
    const j = order.find((k) => !isHeading(kids[k]) && textFrom(kids, k) >= MIN_WRAP_TEXT)
    if (j !== undefined) i = j
  }
  return { parent: rt, before: kids[i], room: textFrom(kids, i) }
}

// Where an image goes in the flow: { parent, before, room } (room = chars of
// text after it in that block), or null.
function spotFor(img, scope, wrapping) {
  const anchors = [...scope.querySelectorAll('[data-anchor]')].filter((a) => !a.closest(`.${HOST}`))
  const rel = img.rel
  const blocks = (a) => richOf(a)?.children.length ?? 0
  let i = rel?.key ? anchors.findIndex((a) => a.dataset.anchor === rel.key) : -1
  if (i < 0) {
    // Placed before positions were saved relative to the text: put it in the
    // first multi-paragraph block (Amber can re-place it on desktop).
    const a = anchors.find((x) => blocks(x) > 1)
    return a ? pick(richOf(a), Math.floor(blocks(a) / 2), wrapping) : null
  }
  const a = anchors[i]
  const rt = richOf(a)
  if (rt && rel.at === 'in') return pick(rt, Math.round(rel.off * blocks(a)), wrapping)
  if (rt && rel.at === 'before') return pick(rt, 0, wrapping)
  // Below the block (or beside a block with no paragraphs, like a headline):
  // the start of the next block with paragraphs. Floats stay inside text
  // blocks — floated among the page's sections they'd narrow everything
  // after them.
  for (const b of anchors.slice(i + 1)) {
    if (richOf(b)) return pick(richOf(b), 0, wrapping)
  }
  const outer = a.closest('.adjustable') ?? a
  return { parent: outer.parentNode, before: outer.nextSibling, room: 0 }
}

export function PhoneModeSelect({ value, onChange, className = '' }) {
  return (
    <label className={`phone-mode ${className}`.trim()} title="How this image shows on phones">
      <span>On phones</span>
      <select value={value ?? 'auto'} onChange={(e) => onChange(e.target.value)}>
        {PHONE_MODES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    </label>
  )
}

// Renders `images` into the page flow inside `scope` (the main content).
export default function PhoneImages({ images, scope, colMax, isAdmin, onSetPhone }) {
  const hosts = useRef(new Map())
  const fits = useRef(new Map()) // id → 'alone' when there's no text to wrap
  const [, force] = useReducer((n) => n + 1, 0)

  // Place (or re-place) a host element per image at its spot. Runs after every
  // render: the page's text arrives and re-renders on its own schedule. No
  // deps on purpose; it only sets state when it creates a host.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!scope) return
    let created = false
    for (const img of images) {
      let host = hosts.current.get(img.id)
      if (!host) {
        host = document.createElement('div')
        host.className = HOST
        hosts.current.set(img.id, host)
        created = true
      }
      const wrapping = phoneLayout(img, colMax).mode === 'wrap'
      const spot = spotFor(img, scope, wrapping)
      if (!spot) { host.remove(); continue }
      // Too little text to wrap here: photos go full width, decorations sit
      // small and centred.
      const fit = wrapping && spot.room < MIN_WRAP_TEXT ? 'alone' : ''
      if (fits.current.get(img.id) !== fit) { fits.current.set(img.id, fit); created = true }
      const before = skipHosts(spot.before)
      if (host.parentNode !== spot.parent || skipHosts(host.nextSibling) !== before) {
        spot.parent.insertBefore(host, spot.before)
      }
    }
    for (const [id, host] of hosts.current) {
      if (!images.some((i) => i.id === id)) {
        host.remove()
        hosts.current.delete(id)
      }
    }
    // Only when a host was created or a fit changed: re-render the portals.
    if (created) force()
  })

  // Rich text replaced wholesale (new copy, an edit) takes our hosts with it;
  // put them back.
  useEffect(() => {
    if (!scope) return undefined
    const mo = new MutationObserver(() => {
      for (const host of hosts.current.values()) {
        if (!host.isConnected) { force(); return }
      }
    })
    mo.observe(scope, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [scope])

  useEffect(() => () => {
    for (const host of hosts.current.values()) host.remove()
  }, [])

  return images.map((img) => {
    const host = hosts.current.get(img.id)
    if (!host) return null
    let layout = phoneLayout(img, colMax)
    if (layout.mode === 'wrap' && fits.current.get(img.id) === 'alone') {
      layout = layout.width < 40 ? { mode: 'center', width: layout.width } : { mode: 'full' }
    }
    return createPortal(
      <figure
        className={`phone-img is-${layout.mode}${layout.side ? ` is-${layout.side}` : ''}`}
        style={layout.width ? { width: `${layout.width}%` } : undefined}
      >
        {img.type === 'video' ? (
          <div className="image-video">
            {isVideoFileUrl(img.src) ? (
              <video src={img.src} controls playsInline preload="metadata" />
            ) : (
              <iframe src={img.src} title="Video" frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            )}
          </div>
        ) : (
          <img src={img.src} alt="" />
        )}
        {isAdmin && (
          <PhoneModeSelect value={img.phone} onChange={(v) => onSetPhone(img.id, v)} className="phone-img-mode" />
        )}
      </figure>,
      host,
      img.id
    )
  })
}
