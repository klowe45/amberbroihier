import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import CustomBlocks from './CustomBlocks.jsx'
import './Adjustable.css'

// Wraps a page element with admin-only positioning controls in the left
// gutter: a ⠿ grip to drag it anywhere, and ▲/▼ arrows for fine nudges.
//
// Vertical movement is stored as top margin (`space_<id>`, px, may be
// negative) so it stays in the document flow — dragging the lede up
// pulls everything below it up too, and text can sit tighter than the
// stylesheet's default gap. Horizontal movement is a translate
// (`shift_<id>`, px) so the element's width and wrapping don't change.
// Both ride the normal Publish flow. Double-click the grip to reset.
const MIN_SPACE = -600
const MAX_SPACE = 1200
const MAX_SHIFT = 1200
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// `grip` can be turned off where the wrapped element already has a drag
// handle of its own (custom text blocks reorder with theirs); the arrows
// stay. `className` lets a host nudge where the controls sit.
export default function Adjustable({ id, content = {}, step = 8, grip = true, className = '', children }) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const [live, setLive] = useState(null)

  const spaceKey = `space_${id}`
  const shiftKey = `shift_${id}`
  const savedGap = Number(pending[spaceKey] ?? content[spaceKey] ?? 0) || 0
  const savedShift = Number(pending[shiftKey] ?? content[shiftKey] ?? 0) || 0
  const gap = live ? live.gap : savedGap
  const shift = live ? live.shift : savedShift

  const nudge = (delta) => set(spaceKey, String(clamp(savedGap + delta, MIN_SPACE, MAX_SPACE)))

  const startDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    let cur = { gap: savedGap, shift: savedShift }
    // Snap back to the natural position when close to it, so a small
    // wobble doesn't leave a stray 2px offset behind.
    const SNAP = 6
    const snap = (v) => (Math.abs(v) < SNAP ? 0 : v)
    const move = (ev) => {
      cur = {
        gap: clamp(snap(Math.round(savedGap + (ev.clientY - startY))), MIN_SPACE, MAX_SPACE),
        shift: clamp(snap(Math.round(savedShift + (ev.clientX - startX))), -MAX_SHIFT, MAX_SHIFT),
      }
      setLive(cur)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (cur.gap !== savedGap) set(spaceKey, String(cur.gap))
      if (cur.shift !== savedShift) set(shiftKey, String(cur.shift))
      setLive(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const reset = (e) => {
    e.preventDefault()
    e.stopPropagation()
    set(spaceKey, content[spaceKey] ? '0' : null)
    set(shiftKey, content[shiftKey] ? '0' : null)
  }

  // Horizontal shift is a relative `left` offset, NOT a transform: a
  // transform would turn this wrapper into the containing block for any
  // position:fixed child (the "+" block menu), sending it off-screen.
  // Phones ignore the offset (stylesheet !important) — desktop-tuned
  // shifts push text off a narrow screen.
  const style = {}
  if (gap) style.marginTop = gap
  if (shift) style.left = shift

  return (
    <>
    <div
      className={`adjustable${live ? ' is-dragging' : ''} ${className}`.trim()}
      style={style}
      data-adjust-id={id}
    >
      {isAdmin && (
        <div className="adjustable-controls">
          {grip && <span
            className="adjustable-grip"
            onPointerDown={startDrag}
            onDoubleClick={reset}
            role="button"
            tabIndex={-1}
            aria-label="Drag to move; double-click to reset"
            title="Drag to move · double-click to reset"
          >
            ⠿
          </span>}
          <button type="button" className="adjustable-btn" onClick={() => nudge(-step)} aria-label="Move up" title="Move up">▲</button>
          {(gap !== 0 || shift !== 0) && (
            <span className="adjustable-val">
              {gap !== 0 && <span>{gap > 0 ? `↓${gap}` : `↑${-gap}`}</span>}
              {shift !== 0 && <span>{shift > 0 ? `→${shift}` : `←${-shift}`}</span>}
            </span>
          )}
          <button type="button" className="adjustable-btn" onClick={() => nudge(step)} aria-label="Move down" title="Move down">▼</button>
        </div>
      )}
      {children}
    </div>
    {/* Text blocks added "below this" from the right-click menu. Custom
        blocks are already inside CustomBlocks, so they don't get a slot
        of their own (that would recurse). */}
    {!className.includes('custom-block-adjust') && (
      <CustomBlocks page="" content={content} slot={id} />
    )}
    </>
  )
}
