import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { useContentValue } from '../lib/useSiteContent.js'
import {
  singleLineModules,
  multilineModules,
  richFormats,
  looksLikeHtml,
  sanitize,
  toEditorHtml,
  fromEditorHtml,
  ensureFontsFor,
  preloadAllFonts,
  installToolbarExtras,
  insertBlock,
  installButtonDrag,
  replaceButton,
  INSERT_BLOCKS,
} from '../lib/richText.js'
import { useSitePages } from '../lib/navPages.js'
import './EditableText.css'

// Wraps a piece of site_content copy. When Amber is signed in as
// admin, hovering shows a border + edit affordance; clicking swaps
// the text for an inline rich-text editor with a floating toolbar
// (bold/italic/underline, size, headings, alignment, lists, links —
// the same kit as InfyNote). The edited HTML goes into the
// EditContext pending buffer — nothing is saved until she clicks
// Publish in the EditBar.
//
// Props:
//   field       — site_content key (e.g. "home_headline")
//   value       — the currently-saved copy from useSiteContent
//   as          — HTML tag to render as when not editing (default 'span')
//   multiline   — allow paragraphs / block formats (headings, lists,
//                 alignment). Enter inserts a paragraph; ⌘/Ctrl+Enter
//                 finishes. Single-line fields finish on Enter.
//   placeholder — placeholder shown when the value is empty
//   className   — extra classes for the display element
//   enabled     — override for whether the edit affordance shows.
//                 Defaults to true, so admin-hover-edit is the norm.
//                 The nav uses this: nav items pass `enabled={navEditMode}`
//                 so labels are only editable while Amber has flipped
//                 on the nav edit toggle.
//   pencil      — whether to render the inline ✎ icon. Set false when
//                 the wrapping element already carries a strong visual
//                 (a .btn, for example) and a pencil-inside-a-button
//                 looks noisy.
//   onRemove    — when given, a × button renders beside the "+" at the
//                 top-right (custom blocks use it to remove themselves).
//   resizable   — show a drag handle in the bottom-right corner so Amber
//                 can set the box's width/height. Defaults to `multiline`.
//                 The size is stored in site_content as `size_<field>`
//                 (JSON {w, h} in px) and rides the Publish flow.

const parseSize = (raw) => {
  try {
    const o = JSON.parse(raw)
    if (o && typeof o === 'object') {
      return { w: Number(o.w) || 0, h: Number(o.h) || 0 }
    }
  } catch { /* unset */ }
  return null
}

export default function EditableText({
  field,
  value,
  as: Tag = 'span',
  multiline = false,
  placeholder,
  className = '',
  enabled = true,
  pencil = true,
  resizable = multiline,
  onRemove,
}) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  // Gutter "+" menu (multiline fields) and the Button dialog it can open.
  const [menuOpen, setMenuOpen] = useState(false)
  // Fixed-position anchor for the menu: below the + when there's room,
  // otherwise above it. Set when the menu opens.
  const [menuPos, setMenuPos] = useState(null)
  const [buttonDialog, setButtonDialog] = useState(false)
  // A block chosen from the "+" before the editor has mounted (the + also
  // opens the editor); applied once the Quill instance exists.
  const queuedInsert = useRef(null)
  // Saved box size (if Amber has dragged the corner), with a live
  // override while a drag is in progress.
  const sizeKey = `size_${field}`
  const savedSizeRaw = useContentValue(sizeKey)
  const [liveSize, setLiveSize] = useState(null)
  const size = liveSize ?? parseSize(pending[sizeKey] ?? savedSizeRaw)
  const sizeStyle = size && (size.w || size.h)
    ? {
        display: 'block',
        maxWidth: '100%',
        ...(size.w ? { width: size.w } : {}),
        ...(size.h ? { minHeight: size.h } : {}),
      }
    : undefined
  // While editing, the height goes on the Quill container (via a CSS
  // variable) rather than the wrapper so the typing area itself grows.
  const editorStyle = sizeStyle
    ? {
        ...(size.w ? { width: size.w, maxWidth: '100%' } : {}),
        ...(size.h ? { '--editable-h': `${size.h}px` } : {}),
      }
    : undefined
  const displayRef = useRef(null)
  const quillRef = useRef(null)
  const wrapRef = useRef(null)
  // Latest editor HTML; a ref (not state) so the click-outside and
  // keyboard commit handlers always see the current draft.
  const draftRef = useRef('')

  // Effective display value: prefer pending, then saved, then placeholder.
  const displayed = pending[field] ?? value ?? ''
  const isHtml = looksLikeHtml(displayed)
  const safeHtml = useMemo(() => (isHtml ? sanitize(displayed) : ''), [displayed, isHtml])
  // Pull in any Google font the stored HTML uses (no-op otherwise).
  useEffect(() => { ensureFontsFor(safeHtml) }, [safeHtml])

  const commit = () => {
    const next = fromEditorHtml(draftRef.current, multiline)
    if (next === (value ?? '')) {
      // No net change — clear any pending entry for this field.
      set(field, null)
    } else {
      set(field, next)
    }
    setEditing(false)
  }
  const revert = () => setEditing(false)
  // Keep the handlers the Quill instance calls pointing at the latest
  // closure (value / multiline can change while editing is open).
  const commitRef = useRef(commit)
  const revertRef = useRef(revert)
  commitRef.current = commit
  revertRef.current = revert

  // Wire the editor once it mounts. The keyboard bindings (Enter /
  // ⌘Enter / Esc) find commit + revert via this handle on the wrapper.
  // Focus + toolbar placement run on a timeout: StrictMode recreates
  // the Quill instance right after mount, so grab it fresh.
  useLayoutEffect(() => {
    if (!editing) return
    const host = wrapRef.current
    if (!host) return
    host.__editable = {
      singleLine: !multiline,
      commit: () => commitRef.current(),
      revert: () => revertRef.current(),
    }
    let cleanupDrag = null
    const t = setTimeout(() => {
      const quill = quillRef.current?.getEditor?.()
      if (!quill) return
      installToolbarExtras(quill)
      // Click a button in the editor to edit it; drag to move it.
      cleanupDrag = installButtonDrag(quill, (index, initial) =>
        setButtonDialog({ index, initial })
      )
      quill.focus()
      quill.setSelection(quill.getLength(), 0)
      if (queuedInsert.current) {
        const { key, payload } = queuedInsert.current
        queuedInsert.current = null
        insertBlock(quill, key, payload)
      }
      // Toolbar floats above the field. If that runs off the right edge
      // of the window, anchor it to the field's right side; if it ends up
      // off-screen or under the sticky header / edit bar, flip it below.
      const bar = host.querySelector('.ql-toolbar')
      if (bar) {
        let r = bar.getBoundingClientRect()
        if (r.right > window.innerWidth - 8) {
          bar.classList.add('is-right-anchored')
          r = bar.getBoundingClientRect()
        }
        const probe = document.elementFromPoint(r.left + 8, r.top + 8)
        if (r.top < 0 || !bar.contains(probe)) bar.classList.add('is-below')
      }
    }, 0)
    return () => {
      clearTimeout(t)
      cleanupDrag?.()
      delete host.__editable
    }
  }, [editing, multiline])

  // Clicking anywhere outside the editor + its toolbar finishes the edit
  // (the toolbar steals focus, so a plain blur listener can't be used).
  useEffect(() => {
    if (!editing) return
    const onDown = (e) => {
      if (buttonDialog) return
      if (e.target.closest?.('.editable-plus, .editable-plus-menu')) return
      if (wrapRef.current && !wrapRef.current.contains(e.target)) commitRef.current()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [editing, buttonDialog])

  // Close the "+" menu on any click outside it.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (!e.target.closest?.('.editable-plus, .editable-plus-menu')) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [menuOpen])

  // Corner-handle drag: live-preview the size, then write it to the
  // pending buffer on release. Double-click clears it (back to natural).
  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = displayRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    let cur = { w: Math.round(rect.width), h: Math.round(rect.height) }
    const move = (ev) => {
      cur = {
        w: Math.max(60, Math.round(rect.width + (ev.clientX - startX))),
        h: Math.max(24, Math.round(rect.height + (ev.clientY - startY))),
      }
      setLiveSize(cur)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      set(sizeKey, JSON.stringify(cur))
      setLiveSize(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const clearSize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    set(sizeKey, savedSizeRaw ? '' : null)
  }

  // Pick from the "+": apply to the open editor, or open the editor and
  // apply once it's ready.
  const applyInsert = (key, payload) => {
    setMenuOpen(false)
    const quill = editing ? quillRef.current?.getEditor?.() : null
    if (quill) insertBlock(quill, key, payload)
    else {
      queuedInsert.current = { key, payload }
      if (!editing) startEditing()
    }
  }
  const chooseBlock = (key) => {
    if (key === 'button') { setMenuOpen(false); setButtonDialog(true); return }
    applyInsert(key)
  }

  // Buttons that point inside the site use the router (no full reload).
  const onDisplayClick = (e) => {
    const a = e.target.closest?.('a.rt-button')
    if (!a) return
    const href = a.getAttribute('href') || ''
    if (href.startsWith('/')) { e.preventDefault(); navigate(href) }
  }

  // Inline content wrapper for the HTML branch (the pencil has to be a
  // sibling, so the markup can't go straight on the outer tag).
  const Inner = Tag === 'div' ? 'div' : 'span'
  const body = isHtml ? (
    <Inner className="rich-text" dangerouslySetInnerHTML={{ __html: safeHtml }} />
  ) : (
    displayed
  )

  // Multiline values carry <p> blocks, so their wrapper must lay out as a
  // block even when it's a <span> inside a <p> (ledes, blurbs).
  const blockClass = multiline ? 'editable-block' : ''

  if (!isAdmin || !enabled) {
    return (
      <Tag className={`${blockClass} ${className}`.trim()} style={sizeStyle} onClick={onDisplayClick}>
        {body || placeholder}
      </Tag>
    )
  }

  const isDirty = pending[field] !== undefined

  const startEditing = () => {
    draftRef.current = toEditorHtml(displayed)
    preloadAllFonts()
    setEditing(true)
  }

  // Top-right controls: "+" (multiline fields only) inserts a block at the
  // caret; × (when the host provides onRemove) removes the element.
  const plus = (multiline || onRemove) && (
    <>
      {multiline && <button
        type="button"
        className={`editable-plus${menuOpen ? ' is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (menuOpen) { setMenuOpen(false); return }
          const r = e.currentTarget.getBoundingClientRect()
          const MENU_H = 480
          const below = r.bottom + 6 + MENU_H <= window.innerHeight
          setMenuPos(below
            ? { left: r.left, top: r.bottom + 6 }
            : { left: r.left, bottom: window.innerHeight - r.top + 6 })
          setMenuOpen(true)
        }}
        aria-label="Insert a block"
        aria-expanded={menuOpen}
        title="Insert a block"
      >
        +
      </button>}
      {onRemove && (
        <button
          type="button"
          className="editable-remove"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove() }}
          aria-label="Remove this block"
          title="Remove block"
        >
          ×
        </button>
      )}
      {menuOpen && (
        <span className="editable-plus-menu" role="menu" style={menuPos ?? undefined}>
          {INSERT_BLOCKS.map((b) => (
            <button
              key={b.key}
              type="button"
              role="menuitem"
              className="editable-plus-item"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); chooseBlock(b.key) }}
            >
              <span className="editable-plus-item-label">{b.label}</span>
              <span className="editable-plus-item-hint">{b.hint}</span>
            </button>
          ))}
        </span>
      )}
      {buttonDialog && createPortal(
        <ButtonDialog
          initial={buttonDialog.initial}
          onCancel={() => setButtonDialog(false)}
          onRemove={buttonDialog.initial ? () => {
            const idx = buttonDialog.index
            setButtonDialog(false)
            const quill = quillRef.current?.getEditor?.()
            if (quill) replaceButton(quill, idx, null)
          } : undefined}
          onSave={(payload) => {
            const editingExisting = buttonDialog.initial ? buttonDialog.index : null
            setButtonDialog(false)
            if (editingExisting != null) {
              const quill = quillRef.current?.getEditor?.()
              if (quill) replaceButton(quill, editingExisting, payload)
            } else {
              applyInsert('button', payload)
            }
          }}
        />,
        document.body
      )}
    </>
  )

  if (editing) {
    return (
      <div
        ref={wrapRef}
        className={`editable-editor ${multiline ? 'editable-editor-multi' : 'editable-editor-single'}`}
        style={editorStyle}
        // Wrapping <Link>/<NavLink>/<a> ancestors must not navigate
        // while Amber is clicking around in the toolbar.
        onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
      >
        {plus}
        <ReactQuill
          ref={quillRef}
          theme="snow"
          defaultValue={draftRef.current}
          onChange={(html) => { draftRef.current = html }}
          modules={multiline ? multilineModules : singleLineModules}
          formats={richFormats}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <Tag
      ref={displayRef}
      className={`editable ${blockClass} ${isDirty ? 'editable-dirty' : ''} ${className}`}
      style={sizeStyle}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${field}`}
      // stopPropagation so wrapping <Link>/<NavLink>/<a> ancestors
      // (nav items, mailto links, home CTA buttons) don't navigate
      // while Amber is trying to edit their label.
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        // A call-to-action button works for Amber too — click it to follow
        // the link; click anywhere else in the box to edit.
        const a = e.target.closest?.('a.rt-button')
        if (a) {
          const href = a.getAttribute('href') || ''
          if (href.startsWith('/')) navigate(href)
          else if (href) window.open(href, '_blank', 'noopener')
          return
        }
        startEditing()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          startEditing()
        }
      }}
    >
      {body || <span className="editable-empty">{placeholder}</span>}
      {pencil && (
        <span className="editable-pencil" aria-hidden="true">✎</span>
      )}
      {plus}
      {resizable && (
        <span
          className="editable-resize"
          onPointerDown={startResize}
          onDoubleClick={clearSize}
          onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
          role="separator"
          aria-label="Drag to resize; double-click to reset"
          title="Drag to resize · double-click to reset"
        />
      )}
    </Tag>
  )
}

// Label + destination for a call-to-action button. Destination is one of
// the site's pages, or any URL.
function ButtonDialog({ initial, onCancel, onSave, onRemove }) {
  // Destinations are the header tabs, with whatever Amber has named them.
  const SITE_PAGES = useSitePages()
  const known = initial && SITE_PAGES.some((p) => p.path === initial.href)
  const [label, setLabel] = useState(initial?.label || 'Learn more')
  const [page, setPage] = useState(initial ? (known ? initial.href : '__custom') : SITE_PAGES[0].path)
  const [custom, setCustom] = useState(initial && !known ? initial.href : '')
  const isCustom = page === '__custom'
  const href = isCustom ? custom.trim() : page
  const valid = label.trim() && (!isCustom || /^(https?:\/\/|mailto:|tel:|\/)/i.test(href))

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSave({ label: label.trim(), href })
  }

  return (
    <div className="confirm-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <form className="confirm-card editable-button-dialog" onSubmit={submit}>
        <h2 className="confirm-title">{initial ? 'Edit button' : 'Add a button'}</h2>
        <label className="editable-button-field">
          <span>Button text</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            maxLength={60}
          />
        </label>
        <label className="editable-button-field">
          <span>Goes to</span>
          <select value={page} onChange={(e) => setPage(e.target.value)}>
            {SITE_PAGES.map((p) => (
              <option key={p.path} value={p.path}>{p.label} page</option>
            ))}
            <option value="__custom">Custom link…</option>
          </select>
        </label>
        {isCustom && (
          <label className="editable-button-field">
            <span>Link</span>
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="https://…"
            />
          </label>
        )}
        <div className="confirm-actions">
          {onRemove && (
            <button type="button" className="confirm-btn confirm-btn-ghost editable-button-remove" onClick={onRemove}>
              Remove
            </button>
          )}
          <button type="button" className="confirm-btn confirm-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="confirm-btn" disabled={!valid}>{initial ? 'Save' : 'Add button'}</button>
        </div>
      </form>
    </div>
  )
}
