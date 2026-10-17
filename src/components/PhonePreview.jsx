import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import './PhonePreview.css'

// Admin: show the current page at phone width in a panel beside the editor,
// so Amber can check (and set "On phones" for images) without a phone. The
// frame is the real site; unpublished edits reach it through localStorage
// (EditContext syncs across windows), and its admin chrome is hidden (see
// PhonePreview.css) so it looks the way visitors will see it.
const inPhonePreview =
  typeof window !== 'undefined' && window.self !== window.top &&
  new URLSearchParams(window.location.search).has('phone-preview')

if (inPhonePreview) document.documentElement.classList.add('is-phone-preview')

export default function PhonePreview() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (inPhonePreview) return null

  return (
    <>
      <button
        type="button"
        className="theme-gear phone-preview-btn"
        onClick={() => setOpen((v) => !v)}
        aria-pressed={open}
        aria-label="Phone preview"
        title="Phone preview"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M11 18h2" />
        </svg>
      </button>
      {/* Portalled to <body>: the header's styling would otherwise trap a
          position:fixed panel inside it. */}
      {open && createPortal(
        <aside className="phone-preview" aria-label="Phone preview">
          <div className="phone-preview-head">
            <span>Phone preview</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close phone preview">×</button>
          </div>
          <iframe
            key={pathname}
            title="This page on a phone"
            src={`${pathname}?phone-preview`}
            className="phone-preview-frame"
          />
          <p className="phone-preview-hint">
            Shows your unpublished edits too. To change how a picture shows on phones, hover it on the page and use its “On phones” menu.
          </p>
        </aside>,
        document.body
      )}
    </>
  )
}
