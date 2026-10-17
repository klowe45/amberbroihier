import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { NAV_PAGES } from './src/lib/siteRoutes.js'

const SITE = 'https://amberbroihier.com'

const plain = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// GitHub Pages only knows the files in dist/, so every route but "/" used to
// be served by 404.html (status 404) and bounced to the app — fine for a
// browser, but search engines and link previews saw a 404. GitHub Pages
// serves /inquiry from inquiry.html with a 200, so write one copy of the
// built index.html per page, each with its own title and URL. Titles use
// Amber's current tab labels (fetched from the API at build time, falling
// back to the defaults if it can't be reached). Blog posts still use the
// 404 fallback. Also writes sitemap.xml.
function routePages(apiBase) {
  let outDir = 'dist'
  let labels = {}
  return {
    name: 'route-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async buildStart() {
      try {
        const res = await fetch(`${apiBase}/api/content?page=seo`, {
          signal: AbortSignal.timeout(90_000),
        })
        if (res.ok) labels = await res.json()
        else this.warn(`route-pages: API returned ${res.status}; using default tab labels`)
      } catch (err) {
        this.warn(`route-pages: ${err.message}; using default tab labels`)
      }
    },
    async closeBundle() {
      const html = await readFile(join(outDir, 'index.html'), 'utf8')
      for (const p of NAV_PAGES) {
        if (p.path === '/') continue
        const title = escapeHtml(`${plain(labels[p.key]) || p.fallback} · Amber Broihier`)
        const url = `"${SITE}${p.path}"`
        const page = html
          .replace('<title>Amber Broihier</title>', `<title>${title}</title>`)
          .replace('property="og:title" content="Amber Broihier"', `property="og:title" content="${title}"`)
          .replaceAll(`"${SITE}/"`, url)
        await writeFile(join(outDir, `${p.path.slice(1)}.html`), page)
      }
      const urls = NAV_PAGES.map((p) => `  <url><loc>${SITE}${p.path}</loc></url>`).join('\n')
      await writeFile(
        join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      )
    },
  }
}

// Custom domain (amberbroihier.com) served from root, so base is '/'.
export default defineConfig(({ mode }) => ({
  plugins: [react(), routePages(loadEnv(mode, process.cwd()).VITE_API_BASE_URL)],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // React and the router change only when we upgrade them, while the app
        // chunk changes on every deploy. Keeping them apart means a returning
        // visitor re-downloads the app code, not the framework underneath it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) {
            return 'react-vendor'
          }
        },
      },
    },
  },
}))
