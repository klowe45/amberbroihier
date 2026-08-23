import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { useSiteContent } from '../lib/useSiteContent.js'
import { applyTheme } from '../lib/theme.js'
import EditableText from './EditableText.jsx'
import EditBar from './EditBar.jsx'
import EditModeToggle from './EditModeToggle.jsx'
import ThemeSettings from './ThemeSettings.jsx'
import ImageAddModal from './ImageAddModal.jsx'
import ImageLayer from './ImageLayer.jsx'
import './Layout.css'

const genImgId = () =>
  'img_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)

// The add-image affordance is available on content pages, not functional ones.
function pageKeyFor(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/login') || pathname.startsWith('/admin')) return null
  return pathname.replace(/^\/+/, '').replace(/\//g, '_')
}

const NAV_FALLBACK = {
  brand: 'Amber Broihier',
  nav_home: 'Home',
  nav_about: 'About',
  nav_speaking: 'Speaking',
  nav_writing: 'Writing',
  nav_inquiry: 'Inquiry',
  nav_admin: 'Admin',
  footer_contact_label: 'Contact',
  footer_contact_email: 'amberbroihier@gmail.com',
}

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const { content } = useSiteContent(NAV_FALLBACK)
  const { pending, set, refresh } = useEdit()
  const pageKey = pageKeyFor(useLocation().pathname)
  // Nav labels default to plain navigation. Amber opts in to editing
  // them by clicking the pencil toggle to the left of the nav — the
  // rest of the time clicking "Home" actually goes home.
  const [navEditMode, setNavEditMode] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [addImageOpen, setAddImageOpen] = useState(false)

  // Add a free-positioned image near the top-left of the content; Amber drags
  // it wherever she likes over the page. Rides the normal Publish flow.
  const addImage = (src) => {
    if (!pageKey || !src) return
    const listKey = `images_${pageKey}`
    let list = []
    try {
      const parsed = JSON.parse(pending[listKey] ?? content[listKey] ?? '[]')
      if (Array.isArray(parsed)) list = parsed
    } catch { /* start fresh */ }
    set(listKey, JSON.stringify([...list, { id: genImgId(), src, x: 24, y: 24, w: 320 }]))
    setAddImageOpen(false)
  }

  // Apply Amber's saved colors + fonts site-wide once the content loads
  // (and again whenever it changes after a publish).
  useEffect(() => { applyTheme(content) }, [content])

  return (
    <div className="site">
      <div className="site-frame" aria-hidden="true" />
      <EditBar />
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            <EditableText field="brand" value={content.brand} />
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              <EditableText
                field="nav_home"
                value={content.nav_home}
                enabled={navEditMode}
              />
            </NavLink>
            <NavLink to="/about">
              <EditableText
                field="nav_about"
                value={content.nav_about}
                enabled={navEditMode}
              />
            </NavLink>
            <NavLink to="/speaking">
              <EditableText
                field="nav_speaking"
                value={content.nav_speaking}
                enabled={navEditMode}
              />
            </NavLink>
            <NavLink to="/blog">
              <EditableText
                field="nav_writing"
                value={content.nav_writing}
                enabled={navEditMode}
              />
            </NavLink>
            <NavLink to="/inquiry">
              <EditableText
                field="nav_inquiry"
                value={content.nav_inquiry}
                enabled={navEditMode}
              />
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin">
                <EditableText
                  field="nav_admin"
                  value={content.nav_admin}
                  enabled={navEditMode}
                />
              </NavLink>
            )}
            {/* Add-image sits just left of the edit toggle (CSS order on
                desktop keeps it there; on mobile it flows after Admin). */}
            {isAdmin && pageKey && (
              <button
                type="button"
                className="theme-gear image-add-btn"
                onClick={() => setAddImageOpen(true)}
                aria-label="Add an image to this page"
                title="Add image"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                  <path d="M16 5h5M18.5 2.5v5" />
                </svg>
              </button>
            )}
            {/* Edit toggle lives inside the nav so CSS order can put
                it flush-left on desktop (order: -1) but let it flow
                after Admin on mobile (no order override). */}
            {isAdmin && (
              <EditModeToggle
                active={navEditMode}
                onClick={() => setNavEditMode((v) => !v)}
                label="Edit nav labels"
              />
            )}
            {isAdmin && (
              <button
                type="button"
                className="theme-gear"
                onClick={() => setThemeOpen(true)}
                aria-label="Site appearance"
                title="Colors & fonts"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </nav>
        </div>
      </header>

      {isAdmin && (
        <ThemeSettings
          open={themeOpen}
          initial={content}
          onClose={() => setThemeOpen(false)}
          onSaved={() => { refresh(); setThemeOpen(false) }}
        />
      )}

      <main className="site-main">
        <Outlet />
        {pageKey && <ImageLayer page={pageKey} content={content} />}
      </main>

      {isAdmin && addImageOpen && (
        <ImageAddModal onAdd={addImage} onClose={() => setAddImageOpen(false)} />
      )}

      <footer className="site-footer">
        <div className="container site-footer-inner">
          <p>© {new Date().getFullYear()} Amber Broihier</p>
          <p className="footer-links">
            <a href={`mailto:${content.footer_contact_email}`}>
              <EditableText
                field="footer_contact_label"
                value={content.footer_contact_label}
              />
            </a>
            <span aria-hidden="true"> · </span>
            {/* Auth control lives here (not the nav) so the header
                stays clean. Sign in for anonymous visitors flips to
                Sign out once Amber's authenticated. */}
            {user ? (
              <button className="link-btn" onClick={() => signOut()}>
                Sign out
              </button>
            ) : (
              <Link to="/login">Sign in</Link>
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

