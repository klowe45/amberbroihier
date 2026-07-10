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
export default function EditableText({
  field,
  value,
  as: Tag = 'span',
  multiline = false,
  placeholder,
  className = '',
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
    // Autofocus + select on entering edit mode.
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select?.()
    if (multiline) {
      // Grow the textarea to fit the incoming text; keeps entry from
      // feeling cramped when the field is a paragraph.
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editing, multiline])

  if (!isAdmin) {
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
    const commonProps = {
      ref: inputRef,
      value: draft,
      onChange: (e) => {
        setDraft(e.target.value)
        if (multiline) {
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }
      },
      onBlur: commit,
      onKeyDown,
      className: 'editable-input',
      placeholder,
    }
    return multiline ? (
      <textarea rows={3} {...commonProps} />
    ) : (
      <input type="text" {...commonProps} />
    )
  }

  return (
    <Tag
      className={`editable ${isDirty ? 'editable-dirty' : ''} ${className}`}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${field}`}
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          startEditing()
        }
      }}
    >
      {displayed || <span className="editable-empty">{placeholder}</span>}
      <span className="editable-pencil" aria-hidden="true">✎</span>
    </Tag>
  )
}
