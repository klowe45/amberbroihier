import ReactQuill from 'react-quill-new'
import DOMPurify from 'dompurify'
import { FONTS } from './theme.js'

// Rich-text support for the inline site editor (EditableText). Amber
// highlights text and formats it from a floating toolbar — the same
// Quill toolbar kit InfyNote uses (undo/redo, headings, bold/italic/
// underline, size, alignment, lists) plus links, since this is a
// website. Values are stored as HTML in site_content; legacy plain-
// text values still render as-is.

const Quill = ReactQuill.Quill

// Font size as an inline style so it survives outside the editor.
const Size = Quill.import('attributors/style/size')
Size.whitelist = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px']
Quill.register(Size, true)

// Font family as a class (`ql-font-<id>`), using the same curated list
// as the theme editor so the two stay in step. The matching CSS rules
// (class → font stack, plus the picker's labels) are generated below.
const Font = Quill.import('attributors/class/font')
Font.whitelist = FONTS.map((f) => f.id)
Quill.register(Font, true)

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

// Quill's snow theme looks up toolbar button SVGs by name; undo/redo
// aren't built in, so register icons or the buttons render empty.
const icons = Quill.import('ui/icons')
icons.undo = `<svg viewBox="0 0 18 18">
  <polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon>
  <path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path>
</svg>`
icons.redo = `<svg viewBox="0 0 18 18">
  <polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon>
  <path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path>
</svg>`

const handlers = {
  undo() { this.quill.history.undo() },
  redo() { this.quill.history.redo() },
}

// Keyboard bindings live in this shared, module-level config and only
// get `this.quill` at call time, so commit/revert are looked up from the
// wrapping .editable-editor element, which EditableText tags with an
// `__editable` handle. (Hanging them off the Quill instance doesn't
// survive StrictMode's simulated remount, which recreates the editor.)
const hostOf = (quill) => quill.container.closest('.editable-editor')?.__editable

const bindings = {
  // Plain Enter finishes a single-line field; in multiline fields it
  // inserts a paragraph as usual (return true → Quill's default runs).
  enterCommit: {
    key: 'Enter',
    handler() {
      const host = hostOf(this.quill)
      if (host?.singleLine) { host.commit(); return false }
      return true
    },
  },
  // ⌘/Ctrl+Enter finishes a multiline field.
  shortEnterCommit: {
    key: 'Enter',
    shortKey: true,
    handler() { hostOf(this.quill)?.commit(); return false },
  },
  escapeRevert: {
    key: 'Escape',
    handler() { hostOf(this.quill)?.revert(); return false },
  },
}

// Single-line fields (nav labels, headlines) only get inline formats —
// block formats like headings/lists would be stripped on commit anyway.
export const singleLineModules = {
  toolbar: {
    container: [
      ['undo', 'redo'],
      ['bold', 'italic', 'underline'],
      [{ font: [false, ...Font.whitelist] }],
      [{ size: [false, ...Size.whitelist] }],
      ['link', 'clean'],
    ],
    handlers,
  },
  keyboard: { bindings },
}

export const multilineModules = {
  toolbar: {
    container: [
      ['undo', 'redo'],
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ font: [false, ...Font.whitelist] }],
      [{ size: [false, ...Size.whitelist] }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
    handlers,
  },
  keyboard: { bindings },
}

export const richFormats = [
  'header', 'bold', 'italic', 'underline', 'font', 'size', 'align', 'list', 'link',
]

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ol', 'ul', 'li',
  'h1', 'h2', 'h3', 'blockquote', 'span', 'sub', 'sup',
]
// `style` carries font-size; `class` carries ql-align-*; `data-list`
// tells bullet <li>s apart from numbered ones (Quill 2 uses <ol> for both).
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style', 'data-list']

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
  if (typeof window === 'undefined') return v.replace(/<[^>]+>/g, '')
  return new DOMParser().parseFromString(v, 'text/html').body.textContent ?? ''
}
