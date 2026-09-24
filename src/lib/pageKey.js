// The site_content suffix for a route: "/" → home, "/retreats" → retreats,
// "/blog/my-post" → blog_my-post. Functional routes (login, admin) have no
// page of editable copy, so they get null.
//
// Shared by Layout (which decides whether the add-media affordance and the
// image layer belong on this route) and useSiteContent (which asks the API
// for only this page's images).
export function pageKeyFor(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/login') || pathname.startsWith('/admin')) return null
  return pathname.replace(/^\/+/, '').replace(/\//g, '_')
}
