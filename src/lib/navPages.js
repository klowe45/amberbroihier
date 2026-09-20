import { useEdit } from './EditContext.jsx'
import { useContentMap } from './useSiteContent.js'
import { stripHtml } from './richText.js'

// The site's public pages, in header order. One list drives both the
// header nav and the "Goes to" choices when Amber adds a button, so the
// button dialog always shows exactly what the tabs say — including any
// label she has renamed (the nav_* keys in site_content).
export const NAV_PAGES = [
  { path: '/', key: 'nav_home', fallback: 'Home', end: true },
  { path: '/about', key: 'nav_about', fallback: 'About' },
  { path: '/speaking', key: 'nav_speaking', fallback: 'Speaking' },
  { path: '/prices', key: 'nav_prices', fallback: 'Prices' },
  { path: '/retreats', key: 'nav_retreats', fallback: 'Retreats' },
  { path: '/blog', key: 'nav_writing', fallback: 'Writing' },
  { path: '/inquiry', key: 'nav_inquiry', fallback: 'Inquiry' },
]

// [{ path, label }] with live labels, for the button dialog. A label is
// the unsaved edit if there is one, else the saved copy, else the
// fallback — as plain text.
export function useSitePages() {
  const { pending } = useEdit()
  const saved = useContentMap()
  return NAV_PAGES.map((p) => ({
    path: p.path,
    label: stripHtml(pending[p.key] ?? saved[p.key] ?? p.fallback).trim() || p.fallback,
  }))
}
