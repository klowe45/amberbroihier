import { useEffect, useRef, useState } from 'react'
import EditableText from './EditableText.jsx'
import './ContactLink.css'

// Footer "Contact". A bare mailto: link does nothing at all for anyone without
// a desktop mail app set up (e.g. Gmail-in-the-browser users), so clicking
// opens a small box with the address to copy plus a link to open it in a
// mail app. For Amber, clicking the label still edits it, as elsewhere.
export default function ContactLink({ email, label }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the address is selectable text right there.
    }
  }

  return (
    <span className="contact-link" ref={wrapRef}>
      <button
        type="button"
        className="link-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <EditableText field="footer_contact_label" value={label} />
      </button>
      {open && (
        <span className="contact-pop" role="dialog" aria-label="Contact">
          <span className="contact-pop-email">{email}</span>
          <span className="contact-pop-actions">
            <button type="button" className="contact-pop-btn" onClick={copy}>
              {copied ? 'Copied!' : 'Copy email'}
            </button>
            <a className="contact-pop-btn" href={`mailto:${email}`}>Open in email app</a>
          </span>
        </span>
      )}
    </span>
  )
}
