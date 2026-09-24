import DOMPurify from 'dompurify'
import { FONTS } from './theme.js'

// The half of the rich-text kit that RENDERING needs — sanitising stored
// HTML, turning it back into plain text, and loading the Google fonts a
// piece of copy references.
//
// It lives apart from richText.js on purpose: that module pulls in Quill
// (~139 KB, 40 KB gzipped, plus its stylesheet), and only Amber ever edits.
// Everything a visitor needs is here, so the editor can load on demand.

const fontCss = FONTS.map(
  (f) => `.ql-font-${f.id} { font-family: ${f.stack}; }
.ql-picker.ql-font .ql-picker-label[data-value="${f.id}"]::before,
.ql-picker.ql-font .ql-picker-item[data-value="${f.id}"]::before { content: '${f.label}'; font-family: ${f.stack}; }`
).join('\n')
if (typeof document !== 'undefined' && !document.getElementById('rich-text-fonts')) {
  const style = document.createElement('style')
  style.id = 'rich-text-fonts'
  style.textContent = fontCss
  document.head.appendChild(style)
}

// Google-hosted families used by rich text are loaded through their own
// <link> (separate from the theme's, which loadGoogleFonts rebuilds
// wholesale). Accumulates across calls so nothing already shown unloads.
const loadedFamilies = new Set()
function loadFamilies(families) {
  let added = false
  for (const f of families) if (f && !loadedFamilies.has(f)) { loadedFamilies.add(f); added = true }
  if (!added || typeof document === 'undefined') return
  const id = 'rich-text-google-fonts'
  let link = document.getElementById(id)
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href =
    'https://fonts.googleapis.com/css2?' +
    [...loadedFamilies].map((f) => 'family=' + f).join('&') +
    '&display=swap'
}

// Load whatever Google fonts a piece of stored HTML references.
export function ensureFontsFor(html) {
  if (!html || !html.includes('ql-font-')) return
  const ids = new Set()
  for (const m of html.matchAll(/ql-font-([a-z0-9-]+)/g)) ids.add(m[1])
  loadFamilies(FONTS.filter((f) => ids.has(f.id) && f.google).map((f) => f.google))
}

// Load every family so the picker previews and applies fonts instantly
// while Amber is editing.
export function preloadAllFonts() {
  loadFamilies(FONTS.filter((f) => f.google).map((f) => f.google))
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ol', 'ul', 'li',
  'h1', 'h2', 'h3', 'blockquote', 'span', 'sub', 'sup',
  'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]
// `style` carries font-size; `class` carries ql-align-*; `data-list`
// tells bullet <li>s apart from numbered ones (Quill 2 uses <ol> for both).
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style', 'data-list', 'data-row']

export const looksLikeHtml = (s) => /<[a-z][\s\S]*>/i.test(s ?? '')

export const sanitize = (html) =>
  DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR })

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// What the editor opens with. Legacy plain text becomes one <p> per
// line so line breaks Amber typed before survive the upgrade.
export function toEditorHtml(value) {
  const v = value ?? ''
  if (!v) return ''
  if (looksLikeHtml(v)) return v
  return v
    .split('\n')
    .map((line) => `<p>${line ? escapeHtml(line) : '<br>'}</p>`)
    .join('')
}

const EMPTY_RE = /^(<p>(<br\s*\/?>|\s|&nbsp;)*<\/p>)*$/i

// What gets stored after editing. Empty docs collapse to '' (so
// "is this block empty?" checks keep working) and single-line fields
// drop their paragraph wrapper so the HTML stays inline inside an
// <h1>, <a>, etc.
export function fromEditorHtml(html, multiline) {
  // Quill emits &nbsp; for ordinary spaces; browsers won't wrap lines at
  // those, so a long headline would run off the page. Real spaces back.
  let out = (html ?? '').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').trim()
  if (!out || EMPTY_RE.test(out)) return ''
  if (!multiline) {
    out = out
      .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
      .replace(/^<p[^>]*>/i, '')
      .replace(/<\/p>$/i, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .trim()
  }
  return out
}

// Plain text for places that can't render HTML (document titles,
// admin tab labels, aria strings).
export function stripHtml(value) {
  const v = value ?? ''
  if (!looksLikeHtml(v)) return v
  // Block boundaries become spaces so "line one</p><p>line two" doesn't
  // run together.
  const spaced = v.replace(/<\/(p|li|h[1-6]|td|th|tr|a|blockquote|div)>|<br\s*\/?>|<hr\s*\/?>/gi, '$& ')
  if (typeof window === 'undefined') return spaced.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return (new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}
