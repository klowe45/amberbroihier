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

// Font size as an inline style so it survives outside the editor. Any
// whole pixel value from 8 to 120 is allowed (typed into the toolbar's
// size box); the dropdown just offers the common steps.
export const MIN_SIZE = 8
export const MAX_SIZE = 120
const Size = Quill.import('attributors/style/size')
Size.whitelist = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => `${i + MIN_SIZE}px`)
Quill.register(Size, true)
const SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96, 120].map((n) => `${n}px`)

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

// ---- Blocks the gutter "+" can insert -----------------------------------

// A horizontal rule. Stored as a bare <hr>.
const BlockEmbed = Quill.import('blots/block/embed')
// A horizontal rule. Full width by default; dragging it sideways makes it
// a shorter rule sitting left / centre / right, and clicking it cycles the
// length (full → ½ → ⅓). Stored as classes on the <hr>.
const HR_ALIGNS = ['left', 'center', 'right']
const HR_SIZES = ['full', 'half', 'third']
class Divider extends BlockEmbed {
  static blotName = 'divider'
  static tagName = 'hr'
  static create(value) {
    const node = super.create()
    const v = value && typeof value === 'object' ? value : {}
    if (HR_ALIGNS.includes(v.align)) node.classList.add(`rt-hr-${v.align}`)
    if (HR_SIZES.includes(v.size) && v.size !== 'full') node.classList.add(`rt-hr-${v.size}`)
    return node
  }
  static value(node) {
    const align = HR_ALIGNS.find((a) => node.classList.contains(`rt-hr-${a}`)) || null
    const size = HR_SIZES.find((z) => node.classList.contains(`rt-hr-${z}`)) || 'full'
    return { align, size }
  }
}
Quill.register(Divider, true)

// A call-to-action button that links to another page (or any URL). Stored
// as <a class="rt-button" href="…">Label</a>; matched back by class so the
// ordinary link format doesn't claim it. Not editable inline — Amber sets
// the label + destination in a small dialog.
class SiteButton extends BlockEmbed {
  static blotName = 'site-button'
  static tagName = 'a'
  static className = 'rt-button'
  static create(value) {
    const node = super.create()
    node.setAttribute('href', value?.href || '#')
    node.textContent = value?.label || 'Button'
    node.setAttribute('contenteditable', 'false')
    return node
  }
  static value(node) {
    return { href: node.getAttribute('href') || '#', label: node.textContent || '' }
  }
}
Quill.register(SiteButton, true)


// The "+" menu, in display order. Mirrors InfyNote's gutter plus, with a
// Button entry on top.
export const INSERT_BLOCKS = [
  { key: 'text', label: 'Text', hint: 'Plain paragraph' },
  { key: 'h1', label: 'Heading 1', hint: 'Section title' },
  { key: 'h2', label: 'Heading 2', hint: 'Sub-section' },
  { key: 'h3', label: 'Heading 3', hint: 'Smaller heading' },
  { key: 'bullet', label: 'Bulleted list', hint: 'A simple list' },
  { key: 'number', label: 'Numbered list', hint: 'An ordered list' },
  { key: 'todo', label: 'To-do list', hint: 'A checklist you can tick' },
  { key: 'table', label: 'Table', hint: 'Two rows, three columns' },
  { key: 'quote', label: 'Quote', hint: 'Set text apart' },
  { key: 'divider', label: 'Divider', hint: 'A line across the page' },
  { key: 'button', label: 'Button', hint: 'Link to another page' },
]

// Where the caret is, or the end of the document when the editor has no
// selection yet (e.g. the "+" was clicked before typing anywhere).
const caretOf = (quill) => quill.getSelection(true)?.index ?? Math.max(0, quill.getLength() - 1)

// A block dropped into the middle of a table would split it in two, so when
// the caret is inside a cell the insertion moves to just after the table.
function outsideTable(quill, index) {
  const [line] = quill.getLine(index)
  const tableEl = line?.domNode?.closest?.('table')
  if (!tableEl) return index
  const table = Quill.find(tableEl)
  if (!table) return index
  const after = quill.getIndex(table) + table.length()
  // Make sure there's a line after the table to land on.
  if (after >= quill.getLength()) quill.insertText(after, '\n', 'silent')
  quill.setSelection(after, 0, 'silent')
  return after
}

// Line-level formats apply to the caret's line (like InfyNote's formatBlock);
// embeds and tables go in at the caret.
export function insertBlock(quill, key, payload) {
  const index = outsideTable(quill, caretOf(quill))
  switch (key) {
    case 'text':
      quill.formatLine(index, 1, { header: false, list: false, blockquote: false }, 'user')
      break
    case 'h1': case 'h2': case 'h3':
      quill.formatLine(index, 1, 'header', Number(key[1]), 'user')
      break
    case 'bullet':
      quill.formatLine(index, 1, 'list', 'bullet', 'user')
      break
    case 'number':
      quill.formatLine(index, 1, 'list', 'ordered', 'user')
      break
    case 'todo':
      quill.formatLine(index, 1, 'list', 'unchecked', 'user')
      break
    case 'quote':
      quill.formatLine(index, 1, 'blockquote', true, 'user')
      break
    case 'table':
      quill.setSelection(index, 0, 'silent')
      quill.getModule('table')?.insertTable(2, 3)
      break
    case 'divider':
      quill.insertEmbed(index, 'divider', true, 'user')
      quill.setSelection(index + 1, 0, 'silent')
      break
    case 'button':
      quill.insertEmbed(index, 'site-button', payload, 'user')
      quill.setSelection(index + 1, 0, 'silent')
      break
    default:
      return
  }
  quill.focus()
}

// Move a block (by document index) to a new spot, optionally setting its
// alignment. Used for dragging an inserted button around the box.
function moveBlockEmbed(quill, fromIndex, toIndex, align) {
  const [blot] = quill.getLine(fromIndex)
  if (!blot || !blot.statics?.blotName) return
  const name = blot.statics.blotName
  const value = blot.statics.value ? blot.statics.value(blot.domNode) : true
  let to = toIndex
  quill.deleteText(fromIndex, 1, 'user')
  if (to > fromIndex) to -= 1
  quill.insertEmbed(to, name, value, 'user')
  quill.formatLine(to, 1, 'align', align || false, 'user')
  quill.setSelection(to, 1, 'silent')
}

// Buttons inside the editor: click to edit (label / destination), drag to
// move — vertically between lines, and the horizontal drop position sets
// the alignment (left / centre / right thirds of the box). Returns a
// cleanup function.
export function installButtonDrag(quill, onClickButton) {
  const root = quill.root
  const DRAG_THRESHOLD = 4
  let indicator = null
  const clearIndicator = () => {
    if (indicator) indicator.classList.remove('rt-drop-before', 'rt-drop-after')
    indicator = null
  }

  // The line under the pointer and whether the drop goes before or after it.
  const dropTarget = (x, y) => {
    const el = document.elementFromPoint(x, y)
    const line = el && root.contains(el)
      ? el.closest('.ql-editor p, .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor li, .ql-editor blockquote, .ql-editor hr, .ql-editor a.rt-button, .ql-editor table')
      : null
    if (!line || !root.contains(line)) {
      // Blank space (or outside): before the first line if above, else the end.
      const r = root.getBoundingClientRect()
      const first = root.firstElementChild
      if (y < r.top && first) return { el: first, before: true }
      return { el: null, before: false }
    }
    const r = line.getBoundingClientRect()
    return { el: line, before: y < r.top + r.height / 2 }
  }

  const onPointerDown = (e) => {
    const btn = e.target.closest?.('a.rt-button, hr')
    if (!btn || e.button !== 0) return
    const isRule = btn.tagName === 'HR'
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false
    const move = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return
        dragging = true
        btn.classList.add('rt-dragging')
        root.classList.add('rt-drag-active')
      }
      clearIndicator()
      const t = dropTarget(ev.clientX, ev.clientY)
      if (t.el && t.el !== btn) {
        indicator = t.el
        indicator.classList.add(t.before ? 'rt-drop-before' : 'rt-drop-after')
      }
    }
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      clearIndicator()
      btn.classList.remove('rt-dragging')
      root.classList.remove('rt-drag-active')
      const blot = Quill.find(btn)
      if (!blot) return
      const fromIndex = quill.getIndex(blot)
      if (!dragging) {
        if (isRule) {
          // Click: cycle the rule's length, keeping where it sits.
          const v = Divider.value(btn)
          const size = HR_SIZES[(HR_SIZES.indexOf(v.size) + 1) % HR_SIZES.length]
          const align = size === 'full' ? null : v.align || 'center'
          replaceEmbed(quill, fromIndex, 'divider', { align, size })
        } else {
          onClickButton?.(fromIndex, SiteButton.value(btn))
        }
        return
      }
      const t = dropTarget(ev.clientX, ev.clientY)
      let toIndex
      if (!t.el) toIndex = quill.getLength() - 1
      else {
        const target = Quill.find(t.el)
        if (!target) return
        toIndex = quill.getIndex(target) + (t.before ? 0 : target.length())
      }
      const r = root.getBoundingClientRect()
      const rel = (ev.clientX - r.left) / r.width
      if (isRule) {
        // Sideways drop: left / centre / right thirds. A rule that's still
        // full width becomes a half-width one so the position shows.
        const v = Divider.value(btn)
        const align = rel < 1 / 3 ? 'left' : rel < 2 / 3 ? 'center' : 'right'
        const size = v.size === 'full' ? 'half' : v.size
        let to = toIndex
        quill.deleteText(fromIndex, 1, 'user')
        if (to > fromIndex) to -= 1
        quill.insertEmbed(to, 'divider', { align, size }, 'user')
        quill.setSelection(to, 1, 'silent')
        return
      }
      const align = rel < 1 / 3 ? false : rel < 2 / 3 ? 'center' : 'right'
      moveBlockEmbed(quill, fromIndex, toIndex, align)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  root.addEventListener('pointerdown', onPointerDown)
  return () => root.removeEventListener('pointerdown', onPointerDown)
}

// Swap the embed at `index` for one with a new value (same spot).
function replaceEmbed(quill, index, name, value) {
  quill.deleteText(index, 1, 'user')
  quill.insertEmbed(index, name, value, 'user')
  quill.setSelection(index, 1, 'silent')
}

// Replace the button at `index` with new label/destination, or remove it.
export function replaceButton(quill, index, payload) {
  const [blot] = quill.getLine(index)
  const align = blot?.domNode?.className?.match(/ql-align-(\w+)/)?.[1] || false
  quill.deleteText(index, 1, 'user')
  if (payload) {
    quill.insertEmbed(index, 'site-button', payload, 'user')
    quill.formatLine(index, 1, 'align', align, 'user')
  }
  quill.setSelection(index, 0, 'silent')
}

// Extras the stock toolbar can't express, added once the editor exists:
//  - the Font picker's "default" entry shows which font the field is
//    actually inheriting (from the theme) instead of the word Default;
//  - a small text box next to the Size dropdown to type any px value.
const firstFamily = (stack) => stack.split(',')[0].replace(/["']/g, '').trim().toLowerCase()

export function installToolbarExtras(quill) {
  const bar = quill.getModule('toolbar')?.container
  if (!bar) return

  // Keep the editor's highlight while using the toolbar. Quill's pickers
  // (Size, Font, heading, align) take focus on mousedown, which blanks
  // the selection until the value is applied — it looked like the
  // highlight was lost. Swallowing the default keeps focus in the editor;
  // the pickers still open (they listen for mousedown, not focus). The
  // typed-size box is the one thing that genuinely needs focus.
  if (!bar.__keepSelection) {
    bar.__keepSelection = true
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('input, textarea')) return
      e.preventDefault()
      // Opening one dropdown closes any other that's open.
      const label = e.target.closest('.ql-picker-label')
      if (label) {
        const mine = label.closest('.ql-picker')
        bar.querySelectorAll('.ql-picker.ql-expanded').forEach((p) => {
          if (p !== mine) {
            p.classList.remove('ql-expanded')
            p.querySelector('.ql-picker-label')?.setAttribute('aria-expanded', 'false')
            p.querySelector('.ql-picker-options')?.setAttribute('aria-hidden', 'true')
          }
        })
      }
    })
  }

  // Default-font label.
  const inherited = getComputedStyle(quill.root).fontFamily
  const match = FONTS.find((f) => firstFamily(f.stack) === firstFamily(inherited))
  const name = match ? match.label : inherited.split(',')[0].replace(/["']/g, '').trim()
  const fontLabel = bar.querySelector('.ql-picker.ql-font .ql-picker-label')
  const fontDefault = bar.querySelector('.ql-picker.ql-font .ql-picker-item:not([data-value])')
  if (fontLabel) {
    fontLabel.dataset.defaultLabel = name
    fontLabel.style.fontFamily = inherited
  }
  if (fontDefault) {
    fontDefault.dataset.defaultLabel = `${name} (default)`
    fontDefault.style.fontFamily = inherited
  }

  // Typed font size.
  if (bar.querySelector('.ql-size-input')) return
  const group = bar.querySelector('.ql-picker.ql-size')?.closest('.ql-formats') ?? bar
  const input = document.createElement('input')
  input.type = 'number'
  input.className = 'ql-size-input'
  input.min = String(MIN_SIZE)
  input.max = String(MAX_SIZE)
  input.step = '1'
  input.placeholder = 'px'
  input.title = `Font size in px (${MIN_SIZE}–${MAX_SIZE})`
  input.setAttribute('aria-label', 'Font size in pixels')
  group.appendChild(input)

  const apply = () => {
    const n = Math.round(Number(input.value))
    if (!n) return
    const px = Math.min(MAX_SIZE, Math.max(MIN_SIZE, n))
    input.value = String(px)
    // format() restores the editor's saved selection (lost when the
    // input took focus) before applying.
    quill.format('size', `${px}px`, 'user')
  }
  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      apply()
      quill.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      quill.focus()
    }
  })
  input.addEventListener('change', apply)
  // Mirror the size under the cursor / selection into the box.
  quill.on('editor-change', () => {
    if (document.activeElement === input) return
    const range = quill.getSelection()
    if (!range) return
    const v = quill.getFormat(range).size
    input.value = typeof v === 'string' ? String(parseInt(v, 10) || '') : ''
  })
}

// Line spacing and paragraph gap, as block classes so they survive on the
// public page: <p class="ql-lh-15 ql-gap-16">. Values are whitelisted;
// the matching CSS lives in EditableText.css.
const Parchment = Quill.import('parchment')
export const LINE_HEIGHTS = [
  { v: '08', label: '0.8' }, { v: '09', label: '0.9' }, { v: '10', label: '1.0' }, { v: '115', label: '1.15' }, { v: '13', label: '1.3' },
  { v: '15', label: '1.5' }, { v: '18', label: '1.8' }, { v: '20', label: '2.0' }, { v: '25', label: '2.5' },
]
// Negative gaps pull the next line up (a title tight against its
// paragraph, even overlapping); 'n' prefix because a class can't hold '-'.
export const PARA_GAPS = [
  { v: 'n24', label: '-24px' }, { v: 'n16', label: '-16px' }, { v: 'n12', label: '-12px' },
  { v: 'n8', label: '-8px' }, { v: 'n4', label: '-4px' },
  { v: '0', label: 'None' }, { v: '2', label: '2px' }, { v: '4', label: '4px' }, { v: '8', label: '8px' }, { v: '16', label: '16px' },
  { v: '24', label: '24px' }, { v: '32', label: '32px' }, { v: '48', label: '48px' },
]
const LineHeight = new Parchment.ClassAttributor('lineheight', 'ql-lh', {
  scope: Parchment.Scope.BLOCK,
  whitelist: LINE_HEIGHTS.map((o) => o.v),
})
const ParaGap = new Parchment.ClassAttributor('paragap', 'ql-gap', {
  scope: Parchment.Scope.BLOCK,
  whitelist: PARA_GAPS.map((o) => o.v),
})
Quill.register({ 'formats/lineheight': LineHeight, 'formats/paragap': ParaGap }, true)

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
      [{ size: [false, ...SIZE_PRESETS] }],
      ['link', 'clean'],
    ],
    handlers,
  },
  keyboard: { bindings },
}

export const multilineModules = {
  toolbar: {
    container: [
      // Two tidy rows at the toolbar's max width:
      //   undo/redo · style · font · size
      //   B I U · align · line/gap · lists · link/clear
      ['undo', 'redo'],
      [{ header: [1, 2, 3, false] }],
      [{ font: [false, ...Font.whitelist] }],
      [{ size: [false, ...SIZE_PRESETS] }],
      ['bold', 'italic', 'underline'],
      [{ align: [] }],
      [{ lineheight: [false, ...LINE_HEIGHTS.map((o) => o.v)] }, { paragap: [false, ...PARA_GAPS.map((o) => o.v)] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
    handlers,
  },
  keyboard: { bindings },
  table: true,
}

export const richFormats = [
  'header', 'bold', 'italic', 'underline', 'font', 'size', 'align', 'list', 'link',
  'blockquote', 'table', 'divider', 'site-button', 'lineheight', 'paragap',
]

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
