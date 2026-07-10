import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import EditBar from './EditBar.jsx'
import './Layout.css'

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth()

  return (
    <div className="site">
      <EditBar />
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            Amber Broihier
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/speaking">Speaking</NavLink>
            <NavLink to="/blog">Writing</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            {user ? (
              <button className="link-btn" onClick={() => signOut()}>
                Sign out
              </button>
            ) : null}
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
            <a href="mailto:hello@amberbroihier.com">Contact</a>
            <span aria-hidden="true"> · </span>
            {!user && <Link to="/login">Sign in</Link>}
          </p>
        </div>
      </footer>
    </div>
  )
}
