import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
} from '../lib/richText.js'
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
}) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const [editing, setEditing] = useState(false)
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
    const t = setTimeout(() => {
      const quill = quillRef.current?.getEditor?.()
      if (!quill) return
      installToolbarExtras(quill)
      quill.focus()
      quill.setSelection(quill.getLength(), 0)
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
      delete host.__editable
    }
  }, [editing, multiline])

  // Clicking anywhere outside the editor + its toolbar finishes the edit
  // (the toolbar steals focus, so a plain blur listener can't be used).
  useEffect(() => {
    if (!editing) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) commitRef.current()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [editing])

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
      <Tag className={`${blockClass} ${className}`.trim()} style={sizeStyle}>
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
