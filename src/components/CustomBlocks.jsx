import { useReducer, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { useConfirm } from '../lib/ConfirmContext.jsx'
import { stripHtml } from '../lib/richText.js'
import EditableText from './EditableText.jsx'
import Adjustable from './Adjustable.jsx'
import './CustomBlocks.css'

// Per-page flow of Amber-added blocks — text OR image — in one ordered list so
// they sit in the normal document flow and push each other apart (drop an image
// between two blocks and they make room). The list lives in site_content under
// `blocks_<page>` as a JSON array of { id, type, w? }; each block's payload
// (text, or image src) lives under `block_<id>`. Reorder/resize use pointer
// events (reliable in React, unlike native HTML5 drag). Rides the Publish flow.

const genBlockId = (prefix = 'blk_') =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)

// Normalize the stored list: legacy entries are bare id strings (all text).
const normalizeBlocks = (raw) => {
  let arr = []
  try {
    const a = JSON.parse(raw)
    if (Array.isArray(a)) arr = a
  } catch {
    arr = []
  }
  return arr
    .map((e) => (typeof e === 'string' ? { id: e, type: 'text' } : e))
    .filter((e) => e && e.id)
}

// `slot` renders a list that belongs to a specific element (the blocks
// Amber right-clicked "Add text below" onto), stored under
// blocks_slot_<id>; it has no "Add text block" button of its own — the
// right-click menu is how things get into it.
export default function CustomBlocks({ page, content = {}, slot }) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const confirm = useConfirm()
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [, force] = useReducer((n) => n + 1, 0)
  const resizeRef = useRef(null)
  const overRef = useRef(null)
  const blockEls = useRef(new Map())

  const listKey = slot ? `blocks_slot_${slot}` : `blocks_${page}`
  // Text blocks only — images live in the free-positioned ImageLayer now.
  const blocks = normalizeBlocks(pending[listKey] ?? content[listKey] ?? '[]').filter(
    (b) => b.type !== 'image'
  )

  const writeList = (next) => set(listKey, JSON.stringify(next))
  const payloadOf = (id) => pending[`block_${id}`] ?? content[`block_${id}`] ?? ''

  const addText = () => writeList([...blocks, { id: genBlockId(), type: 'text' }])
  // Confirm first — the text is gone from the page on Publish (though
  // Undo in the edit bar brings it back until then).
  const removeBlock = async (id) => {
    const text = stripHtml(payloadOf(id)).trim()
    const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text
    const ok = await confirm({
      title: 'Remove this text block?',
      message: preview
        ? `"${preview}" will be removed from the page.`
        : 'This empty block will be removed from the page.',
      confirmLabel: 'Remove block',
      danger: true,
    })
    if (!ok) return
    writeList(blocks.filter((b) => b.id !== id))
    set(`block_${id}`, '')
  }

  // Pointer-based drag on the ⠿ handle. Up/down reorders (the block is
  // spliced into the slot under the pointer on release); sideways shifts
  // the block left/right, stored as shift_<id> — the same key the block's
  // Adjustable wrapper reads — so one handle does both.
  const beginDrag = (e, id) => {
    if (!isAdmin) return
    e.preventDefault()
    setDragId(id)
    overRef.current = null
    setOverId(null)
    const startX = e.clientX
    const shiftKey = `shift_${id}`
    const savedShift = Number(pending[shiftKey] ?? content[shiftKey] ?? 0) || 0
    const wrapper = blockEls.current.get(id)?.closest('.adjustable')
    let dx = 0
    const SNAP = 6
    const move = (ev) => {
      dx = Math.round(ev.clientX - startX)
      // Live sideways preview straight on the wrapper (committed on release).
      if (wrapper) {
        const next = Math.abs(savedShift + dx) < SNAP ? 0 : savedShift + dx
        wrapper.style.left = next ? `${next}px` : ''
      }
      let target = null
      for (const [bid, el] of blockEls.current) {
        if (!el || bid === id) continue
        const r = el.getBoundingClientRect()
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) { target = bid; break }
      }
      overRef.current = target
      setOverId(target)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (wrapper) wrapper.style.left = ''
      const targetId = overRef.current
      const from = blocks.findIndex((b) => b.id === id)
      const to = targetId != null ? blocks.findIndex((b) => b.id === targetId) : -1
      if (from >= 0 && to >= 0 && to !== from) {
        const next = [...blocks]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        writeList(next)
      }
      const nextShift = Math.abs(savedShift + dx) < SNAP ? 0 : savedShift + dx
      if (nextShift !== savedShift) set(shiftKey, String(nextShift))
      overRef.current = null
      setDragId(null)
      setOverId(null)
    }
    window.addEventListener('pointercancel', end)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  // Image resize via the corner handle.
  const widthOf = (b) => (resizeRef.current?.id === b.id ? resizeRef.current.w : b.w || 400)
  const startResize = (e, block) => {
    if (!isAdmin) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const origW = block.w || 400
    let curW = origW
    const move = (ev) => {
      curW = Math.max(80, Math.round(origW + (ev.clientX - startX)))
      resizeRef.current = { id: block.id, w: curW }
      force()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      writeList(blocks.map((b) => (b.id === block.id ? { ...b, w: curW } : b)))
      resizeRef.current = null
      force()
    }
    resizeRef.current = { id: block.id, w: origW }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const visible = isAdmin ? blocks : blocks.filter((b) => payloadOf(b.id).trim())
  if (!visible.length && (!isAdmin || slot)) return null

  return (
    <div
      className={`custom-blocks${isAdmin ? ' is-admin' : ''}${slot ? ' custom-blocks-slot' : ''}`}
      data-list-key={listKey}
    >
      {visible.map((b) => (
        // Each block gets the ▲/▼ spacing arrows (no grip — the block's own
        // ⠿ handle reorders it). Space is stored as space_blk_<id>.
        <Adjustable key={b.id} id={b.id} content={content} grip={false} className="custom-block-adjust">
        <div
          ref={(el) => { if (el) blockEls.current.set(b.id, el); else blockEls.current.delete(b.id) }}
          className={`custom-block${overId === b.id ? ' is-over' : ''}${dragId === b.id ? ' is-dragging' : ''}`}
          data-block-id={b.id}
        >
          {isAdmin && (
            <span
              className="custom-block-handle"
              onPointerDown={(e) => beginDrag(e, b.id)}
              aria-label="Drag to move: up/down reorders, left/right shifts"
              title="Drag to move · up/down reorders, left/right shifts"
            >
              ⠿
            </span>
          )}

          {b.type === 'image' ? (
            <figure className="custom-block-image" style={{ width: widthOf(b) }}>
              {payloadOf(b.id) ? (
                <img
                  src={payloadOf(b.id)}
                  alt=""
                  draggable={false}
                  onPointerDown={isAdmin ? (e) => beginDrag(e, b.id) : undefined}
                />
              ) : (
                <div className="custom-block-image-empty">Image not set</div>
              )}
              {isAdmin && (
                <span
                  className="custom-block-resize"
                  onPointerDown={(e) => startResize(e, b)}
                  aria-label="Drag to resize"
                  title="Drag to resize"
                />
              )}
            </figure>
          ) : (
            <EditableText
              as="div"
              field={`block_${b.id}`}
              value={content[`block_${b.id}`]}
              multiline
              placeholder="Click to add text…"
              className="custom-block-text"
              onRemove={isAdmin ? () => removeBlock(b.id) : undefined}
            />
          )}
        </div>
        </Adjustable>
      ))}

      {isAdmin && !slot && (
        <button type="button" className="custom-block-add" onClick={addText}>
          <span aria-hidden="true">+</span> Add text block
        </button>
      )}
    </div>
  )
}
