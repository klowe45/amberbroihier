import { api } from './api.js'
import { looksLikeHtml } from './richTextView.js'

// Admin → Proofread. Collects every piece of visible text on the site (page
// copy, text blocks, blog posts, video titles/descriptions), has the backend
// check it with LanguageTool, and maps each finding to an exact spot so the
// page can highlight it and a suggestion can be applied in place.
//
// Positions are character offsets into the *plain text* of a value, built by
// textMap() below. The same walk runs over the stored HTML (to apply a fix)
// and over the rendered element on the page (to highlight it), so an offset
// means the same character in both.

const BLOCK_TAGS = /^(P|DIV|H[1-6]|LI|UL|OL|BLOCKQUOTE|PRE|TR|TABLE|SECTION|FIGURE)$/

// Plain text of a DOM subtree plus where each text node sits in it. Block
// elements and <br> become line breaks so paragraphs don't run together.
export function textMap(root, skip) {
  let text = ''
  const nodes = []
  const lineBreak = () => { if (text && !text.endsWith('\n')) text += '\n' }
  const walk = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        nodes.push({ node: n, start: text.length })
        text += n.nodeValue
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        if (skip?.(n)) continue
        if (n.tagName === 'BR') { text += '\n'; continue }
        const block = BLOCK_TAGS.test(n.tagName)
        if (block) lineBreak()
        walk(n)
        if (block) lineBreak()
      }
    }
  }
  walk(root)
  return { text, nodes }
}

const parseHtml = (html) => new DOMParser().parseFromString(html, 'text/html').body

export const plainText = (value) =>
  looksLikeHtml(value) ? textMap(parseHtml(value)).text : String(value ?? '')

// ---------------------------------------------------------------------------
// What gets checked

const PAGES = {
  home: { path: '/', name: 'Home' },
  about: { path: '/about', name: 'Workshops (About)' },
  speaking: { path: '/speaking', name: 'Speaking' },
  retreats: { path: '/retreats', name: 'Retreats' },
  prices: { path: '/prices', name: 'Prices' },
  blog: { path: '/blog', name: 'Writing' },
  inquiry: { path: '/inquiry', name: 'Inquiry' },
  waivers: { path: '/waivers', name: 'Waivers' },
  book: { path: '/book', name: 'Book' },
}

// Settings that live in site_content but aren't words on the page.
const NOT_COPY =
  /^(images_|blocks_|shift_|space_|size_|theme_|nav_order|proofread_|site_|admin_|price_|socials$)|_(email|featured_video_id)$/

const FIELD_NAMES = {
  eyebrow: 'small heading',
  headline: 'headline',
  lede: 'intro',
  body: 'main text',
  email_line: 'email line',
}
const fieldName = (rest) =>
  FIELD_NAMES[rest] ?? (/^p\d+$/.test(rest) ? `paragraph ${rest.slice(1)}` : rest.replace(/_/g, ' '))

// Which page each text block is on: blocks_<page> lists, and blocks_slot_<id>
// lists hung under an element of a page (the slot id starts with the page).
function blockPages(content) {
  const pageOf = {}
  for (const [key, value] of Object.entries(content)) {
    const m = key.match(/^blocks_(?:slot_)?([a-z]+)/)
    if (!m || !PAGES[m[1]]) continue
    try {
      for (const b of JSON.parse(value || '[]')) if (b?.id) pageOf[`block_${b.id}`] = m[1]
    } catch { /* not a list */ }
  }
  return pageOf
}

// Every checkable piece of text: { id, kind, label, page, path, anchor,
// value, isHtml, ref }. `ref` says how to save a fix: a content key, or a
// post/video id and field.
export async function collectSources(content) {
  const sources = []
  const add = (s) => {
    const text = plainText(s.value)
    if (text.trim()) sources.push({ ...s, isHtml: looksLikeHtml(s.value) })
  }

  const blockPage = blockPages(content)
  for (const [key, value] of Object.entries(content)) {
    if (!value || typeof value !== 'string' || NOT_COPY.test(key)) continue
    const ref = { type: 'content', key }
    if (key.startsWith('block_')) {
      const page = blockPage[key]
      if (!page) continue // an orphaned block no page shows
      add({ id: key, kind: 'content', page: PAGES[page].name, path: PAGES[page].path, label: 'text block', anchor: key, value, ref })
    } else if (key === 'brand' || key.startsWith('nav_') || key.startsWith('footer_')) {
      add({ id: key, kind: 'content', page: 'Header & footer (every page)', path: '/', label: key === 'brand' ? 'site name' : fieldName(key.replace(/^(nav|footer)_/, '')) + (key.startsWith('nav_') ? ' (menu tab)' : ''), anchor: key, value, ref })
    } else {
      const [page, ...rest] = key.split('_')
      if (!PAGES[page] || !rest.length) continue
      add({ id: key, kind: 'content', page: PAGES[page].name, path: PAGES[page].path, label: fieldName(rest.join('_')), anchor: key, value, ref })
    }
  }

  // Blog posts (drafts too — the admin list includes them) and videos.
  const posts = (await api.get('/api/posts')) ?? []
  for (const p of posts) {
    const full = await api.get(`/api/posts/${encodeURIComponent(p.slug)}`)
    const page = `Post: ${full.title}${full.published ? '' : ' (draft)'}`
    const path = `/blog/${full.slug}`
    for (const field of ['title', 'excerpt', 'body']) {
      add({
        id: `post_${full.id}_${field}`, kind: 'post', page, label: field === 'body' ? 'post text' : field,
        path: field === 'excerpt' ? '/blog' : path, anchor: `post_${full.id}_${field}`,
        value: full[field] ?? '', ref: { type: 'post', id: full.id, field },
      })
    }
  }
  const videos = (await api.get('/api/videos')) ?? []
  for (const v of videos) {
    for (const field of ['title', 'description']) {
      add({
        id: `video_${v.id}_${field}`, kind: 'video', page: 'Speaking videos', label: `video ${field}`,
        path: '/speaking', anchor: `video_${v.id}_${field}`, value: v[field] ?? '', ref: { type: 'video', id: v.id, field },
      })
    }
  }
  return sources
}

// ---------------------------------------------------------------------------
// Scan results live here (module scope) so they survive navigating to a page
// to look at an issue and coming back to the list.

export const scan = { sources: {}, issues: [], at: null }

export async function runScan(content) {
  const sources = await collectSources(content)
  const { issues, skipped } = await api.post('/api/proofread', {
    texts: sources.map((s) => ({ id: s.id, text: plainText(s.value) })),
  })
  scan.sources = Object.fromEntries(sources.map((s) => [s.id, s]))
  scan.issues = issues.map((i, n) => {
    const text = plainText(scan.sources[i.id].value)
    return { ...i, key: `${i.id}:${i.offset}:${n}`, found: text.slice(i.offset, i.offset + i.length) }
  })
  scan.at = new Date()
  return { sourceCount: sources.length, skipped }
}

// Words around an issue, for the list: { before, found, after }.
export function snippet(issue, radius = 45) {
  const text = plainText(scan.sources[issue.id]?.value)
  const a = Math.max(0, issue.offset - radius)
  const b = Math.min(text.length, issue.offset + issue.length + radius)
  return {
    before: (a > 0 ? '…' : '') + text.slice(a, issue.offset).replace(/\s+/g, ' '),
    found: text.slice(issue.offset, issue.offset + issue.length),
    after: text.slice(issue.offset + issue.length, b).replace(/\s+/g, ' ') + (b < text.length ? '…' : ''),
  }
}

// ---------------------------------------------------------------------------
// Fixing

// Replaces `length` characters at `offset` (plain-text coordinates) in a
// stored value. HTML keeps all its tags and formatting: only the text nodes
// involved change. Throws if the text there is no longer what was flagged.
export function replaceAt(value, isHtml, offset, length, replacement, expected) {
  if (!isHtml) {
    if (value.slice(offset, offset + length) !== expected) throw new Error('changed')
    return value.slice(0, offset) + replacement + value.slice(offset + length)
  }
  const body = parseHtml(value)
  const { text, nodes } = textMap(body)
  if (text.slice(offset, offset + length) !== expected) throw new Error('changed')
  const end = offset + length
  let inserted = false
  for (const { node, start } of nodes) {
    const nodeEnd = start + node.nodeValue.length
    if (nodeEnd <= offset || start >= end) continue
    const from = Math.max(0, offset - start)
    const to = Math.min(node.nodeValue.length, end - start)
    node.nodeValue = node.nodeValue.slice(0, from) + (inserted ? '' : replacement) + node.nodeValue.slice(to)
    inserted = true
  }
  // A flagged run that's only line breaks between blocks has no text node.
  if (!inserted) throw new Error('changed')
  return body.innerHTML
}

// Applies a suggestion. Site copy becomes a pending edit (Amber reviews it on
// the page and Publishes as usual); posts and videos save straight away, as
// their editors do. Other issues in the same text shift to match.
export async function applyFix(issue, replacement, { setPending }) {
  const source = scan.sources[issue.id]
  const next = replaceAt(source.value, source.isHtml, issue.offset, issue.length, replacement, issue.found)
  const { ref } = source
  if (ref.type === 'content') setPending(ref.key, next)
  else if (ref.type === 'post') await api.put(`/api/posts/${ref.id}`, { [ref.field]: next })
  else await api.put(`/api/videos/${ref.id}`, { [ref.field]: next })
  source.value = next
  const delta = replacement.length - issue.length
  scan.issues = scan.issues
    .filter((i) => i.key !== issue.key)
    .map((i) => (i.id === issue.id && i.offset > issue.offset ? { ...i, offset: i.offset + delta } : i))
  return ref.type
}

// "Ignore" and "Add to dictionary" are remembered in site_content so they
// stick across scans and devices.
export const ignoreSignature = (issue) => `${issue.id}|${issue.ruleId}|${issue.found}`

export function readList(content, key) {
  try {
    const v = JSON.parse(content[key] || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function remember(key, list, entry) {
  const next = [...new Set([...list, entry])]
  await api.put('/api/content', { entries: [{ key, value: JSON.stringify(next) }] })
  return next
}

// ---------------------------------------------------------------------------
// Highlighting on the page

// The text of an element as shown on the page: an EditableText's rich-text
// wrapper if it has one, minus its pencil/resize/placeholder chrome.
function renderedMap(el) {
  const root = el.querySelector(':scope > .rich-text') ?? el
  return textMap(root, (n) =>
    n.getAttribute('aria-hidden') === 'true' || /\b(editable-|phone-img-host)/.test(n.className))
}

// A Range over the flagged characters inside the element with
// data-anchor=<anchor>, or null if it can't be found. Falls back to
// searching for the flagged words with their neighbours when the rendered
// text differs from the stored text (e.g. a post body shown as its excerpt).
export function locate(anchor, issue) {
  const el = document.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`)
  if (!el) return null
  const { text, nodes } = renderedMap(el)
  let offset = issue.offset
  if (text.slice(offset, offset + issue.length) !== issue.found) {
    const source = plainText(scan.sources[issue.id]?.value)
    const probe = source.slice(Math.max(0, issue.offset - 15), issue.offset + issue.length)
    const at = text.indexOf(probe)
    offset = at >= 0 ? at + probe.length - issue.length : text.indexOf(issue.found)
    if (offset < 0) return { el, range: null }
  }
  const end = offset + issue.length
  const range = document.createRange()
  let started = false
  for (const { node, start } of nodes) {
    const nodeEnd = start + node.nodeValue.length
    if (!started && offset >= start && offset <= nodeEnd) {
      range.setStart(node, offset - start)
      started = true
    }
    if (started && end >= start && end <= nodeEnd) {
      range.setEnd(node, end - start)
      return { el, range }
    }
  }
  return { el, range: null }
}
