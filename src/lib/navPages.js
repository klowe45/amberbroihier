import { useEdit } from './EditContext.jsx'
import { useContentMap } from './useSiteContent.js'
import { stripHtml } from './richTextView.js'

// The site's public pages, in header order. One list drives both the
// header nav and the "Goes to" choices when Amber adds a button, so the
// button dialog always shows exactly what the tabs say — including any
// label she has renamed (the nav_* keys in site_content).
//
// Pages with a `group` are collected under one dropdown tab in the header
// (see NAV_GROUPS); the dropdown sits where the group's first page falls
// in this order. The button dialog still lists them flat.
export const NAV_PAGES = [
  { path: '/', key: 'nav_home', fallback: 'Home', end: true },
  // /about is Amber's Workshops page — she relabeled the tab in place.
  { path: '/about', key: 'nav_about', fallback: 'About', group: 'experiences' },
  { path: '/speaking', key: 'nav_speaking', fallback: 'Speaking', group: 'experiences' },
  { path: '/retreats', key: 'nav_retreats', fallback: 'Retreats', group: 'experiences' },
  { path: '/prices', key: 'nav_prices', fallback: 'Prices' },
  { path: '/blog', key: 'nav_writing', fallback: 'Writing' },
  { path: '/inquiry', key: 'nav_inquiry', fallback: 'Inquiry' },
  { path: '/waivers', key: 'nav_waivers', fallback: 'Waivers' },
]

// Header dropdowns. A group is a label only — it has no page of its own.
export const NAV_GROUPS = {
  experiences: { key: 'nav_experiences', fallback: 'Experiences' },
}

// Header order: ungrouped pages as-is, each group folded into a single
// { group, key, fallback, pages } entry at its first page's position.
export const NAV_ITEMS = NAV_PAGES.reduce((items, p) => {
  if (!p.group) return [...items, p]
  const existing = items.find((i) => i.group === p.group)
  if (existing) {
    existing.pages.push(p)
    return items
  }
  return [...items, { group: p.group, ...NAV_GROUPS[p.group], pages: [p] }]
}, [])

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

// Amber can drag tabs into a new order (nav-edit mode). The order is saved
// as JSON arrays of ids: nav_order for the header row, nav_order_<group>
// for the pages inside a dropdown. Anything not in the saved list keeps
// its default relative position after the ordered ones.
export const navItemId = (item) => (item.group ? `group:${item.group}` : item.path)

export function sortByNavOrder(items, orderJson) {
  let order = []
  try {
    const a = JSON.parse(orderJson || '[]')
    if (Array.isArray(a)) order = a
  } catch { /* unsaved / malformed → default order */ }
  if (!order.length) return items
  const rank = (it) => {
    const i = order.indexOf(navItemId(it))
    return i < 0 ? Infinity : i
  }
  return [...items].sort((a, b) => rank(a) - rank(b))
}

// NAV_ITEMS in Amber's saved order. `get(key)` reads a content value,
// letting the caller layer unsaved edits over saved ones.
export function orderedNavItems(get) {
  return sortByNavOrder(NAV_ITEMS, get('nav_order')).map((it) =>
    it.group ? { ...it, pages: sortByNavOrder(it.pages, get(`nav_order_${it.group}`)) } : it
  )
}
