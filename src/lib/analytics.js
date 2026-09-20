// Anonymous visitor analytics for the Admin → Analytics tab.
//
// Records, per visitor (random id in localStorage) and session (random id
// per tab, sessionStorage): page views, time on page + how far down they
// scrolled (sent when they leave the page), what they click (link/button
// text + destination) and form submissions. Nothing personal is stored.
//
// Events queue up and go out in small batches (every few seconds, and on
// tab hide / close with `keepalive` so the last page's time isn't lost).
// Amber's own admin sessions are never tracked.

const BASE = import.meta.env.VITE_API_BASE_URL || ''
const FLUSH_MS = 4000
const MAX_BATCH = 40

const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const storage = (kind, key) => {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage
    let v = s.getItem(key)
    if (!v) { v = rid(); s.setItem(key, v) }
    return v
  } catch {
    return rid()
  }
}

let visitor = null
let session = null
let queue = []
let timer = null
let enabled = false

// Current page state, for the "leave" event.
let page = null // { path, title, startedAt, depth }

function send(useKeepalive) {
  if (!queue.length) return
  const events = queue.splice(0, MAX_BATCH)
  try {
    fetch(`${BASE}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: !!useKeepalive,
    }).catch(() => {})
  } catch { /* offline, ignore */ }
  if (queue.length) send(useKeepalive)
}

function push(type, fields = {}) {
  if (!enabled || !page) return
  queue.push({
    visitor,
    session,
    type,
    path: page.path,
    title: page.title,
    referrer: type === 'pageview' ? document.referrer || null : null,
    ...fields,
  })
  if (queue.length >= MAX_BATCH) send()
  else if (!timer) timer = setTimeout(() => { timer = null; send() }, FLUSH_MS)
}

function depthNow() {
  const doc = document.documentElement
  const total = Math.max(doc.scrollHeight, 1)
  const seen = window.scrollY + window.innerHeight
  return Math.min(100, Math.round((seen / total) * 100))
}

function leavePage(useKeepalive) {
  if (!page) return
  const duration = Date.now() - page.startedAt
  push('leave', { duration_ms: duration, depth: Math.max(page.depth, depthNow()) })
  page = null
  send(useKeepalive)
}

// Public API ---------------------------------------------------------------

export function trackPageview(path, title) {
  if (!enabled) return
  leavePage(false)
  page = { path, title: title || document.title, startedAt: Date.now(), depth: 0 }
  // Let the new page paint before measuring depth.
  setTimeout(() => { if (page) page.depth = Math.max(page.depth, depthNow()) }, 500)
  push('pageview')
}

export function trackSubmit(target, meta) {
  push('submit', { target, meta })
}

export function trackClick(target, meta) {
  push('click', { target, meta })
}

// Wire the document-level listeners once. Returns a stop function.
export function startAnalytics() {
  if (enabled || typeof window === 'undefined') return () => {}
  enabled = true
  visitor = storage('local', 'ab-visitor')
  session = storage('session', 'ab-session')

  const onScroll = () => {
    if (page) page.depth = Math.max(page.depth, depthNow())
  }
  const onClick = (e) => {
    const el = e.target.closest?.('a, button')
    if (!el) return
    const text = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!text) return
    const href = el.getAttribute('href')
    push('click', { target: text, meta: href ? { href } : null })
    // A click that leaves the site would lose the batch; get it out now.
    if (href && /^https?:/i.test(href)) send(true)
  }
  const onHide = () => {
    if (document.visibilityState === 'hidden') {
      // Count the time so far, then start a fresh timer if they come back.
      if (page) {
        push('leave', { duration_ms: Date.now() - page.startedAt, depth: Math.max(page.depth, depthNow()) })
        page.startedAt = Date.now()
      }
      send(true)
    }
  }
  const onPageHide = () => { leavePage(true) }

  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', onClick, true)
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onPageHide)

  return () => {
    enabled = false
    leavePage(true)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', onPageHide)
  }
}
