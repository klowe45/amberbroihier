import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from './EditableText.jsx'
import EditBar from './EditBar.jsx'
import EditModeToggle from './EditModeToggle.jsx'
import './Layout.css'

const NAV_FALLBACK = {
  brand: 'Amber Broihier',
  nav_home: 'Home',
  nav_about: 'About',
  nav_speaking: 'Speaking',
  nav_writing: 'Writing',
  nav_admin: 'Admin',
  footer_contact_label: 'Contact',
  footer_contact_email: 'hello@amberbroihier.com',
}

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const { content } = useSiteContent(NAV_FALLBACK)
  // Nav labels default to plain navigation. Amber opts in to editing
  // them by clicking the pencil toggle to the left of the nav — the
  // rest of the time clicking "Home" actually goes home.
  const [navEditMode, setNavEditMode] = useState(false)

  return (
    <div className="site">
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
            {isAdmin && (
              <NavLink to="/admin">
                <EditableText
                  field="nav_admin"
                  value={content.nav_admin}
                  enabled={navEditMode}
                />
              </NavLink>
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
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

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

