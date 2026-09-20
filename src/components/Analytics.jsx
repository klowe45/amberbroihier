import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { startAnalytics, trackPageview } from '../lib/analytics.js'

// Mounts the visitor tracker for the public site. Off entirely while
// Amber is signed in as admin (her own clicks would pollute the numbers)
// and on the login/admin pages.
const SKIP = /^\/(admin|login)(\/|$)/

export default function Analytics() {
  const { isAdmin, loading } = useAuth()
  const { pathname } = useLocation()
  const active = !loading && !isAdmin

  useEffect(() => {
    if (!active) return
    return startAnalytics()
  }, [active])

  useEffect(() => {
    if (!active || SKIP.test(pathname)) return
    // Title updates a tick after navigation in most pages; read it lazily.
    const t = setTimeout(() => trackPageview(pathname, document.title), 50)
    return () => clearTimeout(t)
  }, [active, pathname])

  return null
}
