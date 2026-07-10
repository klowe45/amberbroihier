import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import './EditableText.css'

// Wraps a piece of site_content copy. When Amber is signed in as
// admin, hovering shows a border + edit affordance; clicking swaps
// the text for an inline input (or textarea if `multiline`). The
// edited value goes into the EditContext pending buffer — nothing
// is saved until she clicks Publish in the EditBar.
//
// Props:
//   field       — site_content key (e.g. "home_headline")
//   value       — the currently-saved copy from useSiteContent
//   as          — HTML tag to render as when not editing (default 'span')
//   multiline   — use a <textarea> instead of a single-line <input>
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
export default function EditableText({
  field,
  value,
  as: Tag = 'span',
  multiline = false,
  placeholder,
  className = '',
  enabled = true,
  pencil = true,
}) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  // Effective display value: prefer pending, then saved, then placeholder.
  const displayed = pending[field] ?? value ?? ''

  useEffect(() => {
    if (!editing) return
    // Autofocus + select on entering edit mode. Also size the textarea
    // to fit the current draft so single-line entry starts at one line
    // and multi-line paragraphs open at their real height.
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select?.()
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editing, multiline])

  if (!isAdmin || !enabled) {
    return <Tag className={className}>{displayed || placeholder}</Tag>
  }

  const isDirty = pending[field] !== undefined

  const startEditing = () => {
    setDraft(displayed)
    setEditing(true)
  }

  const commit = () => {
    if (draft === (value ?? '')) {
      // No net change — clear any pending entry for this field.
      set(field, null)
    } else {
      set(field, draft)
    }
    setEditing(false)
  }

  const revert = () => {
    setEditing(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      revert()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      // ⌘/Ctrl+Enter commits in multiline; plain Enter inserts a newline.
      e.preventDefault()
      commit()
    }
  }

  if (editing) {
    // Always render a textarea (even for single-line fields) so long
    // text wraps into the visible box instead of scrolling horizontally
    // and hiding the start. Auto-grows to fit content on every change.
    return (
      <textarea
        ref={inputRef}
        rows={multiline ? 3 : 1}
        value={draft}
        onChange={(e) => {
          const nextVal = multiline
            ? e.target.value
            : e.target.value.replace(/\n+/g, ' ')
          setDraft(nextVal)
          // Auto-grow height to fit the new content. `auto` first so
          // the textarea can shrink if the user deletes lines.
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={`editable-input ${multiline ? '' : 'editable-input-single'}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <Tag
      className={`editable ${isDirty ? 'editable-dirty' : ''} ${className}`}
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
      {displayed || <span className="editable-empty">{placeholder}</span>}
      {pencil && (
        <span className="editable-pencil" aria-hidden="true">✎</span>
      )}
    </Tag>
  )
}
