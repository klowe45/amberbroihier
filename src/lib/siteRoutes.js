// Plain data, no React imports, so vite.config.js can read the route list
// at build time (per-route HTML files, sitemap). navPages.js re-exports it.

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
