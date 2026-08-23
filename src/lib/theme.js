// Site theming. Amber's chosen colors + fonts are stored as `theme_*` keys in
// the same site_content store as her editable copy, so they persist and apply
// for every visitor (GET /api/content is public). Values are applied as CSS
// custom properties on :root, layered over the defaults in index.css.

const SYS_SERIF =
  "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
const SYS_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"

// Editable colors → the CSS variable each maps to, with the index.css default.
export const THEME_COLORS = [
  { key: 'theme_accent', var: '--accent', label: 'Accent', def: '#28351f' },
  { key: 'theme_accent_hover', var: '--accent-hover', label: 'Accent (hover)', def: '#2d5e26' },
  { key: 'theme_bg', var: '--bg', label: 'Page background', def: '#faf7f2' },
  { key: 'theme_bg_alt', var: '--bg-alt', label: 'Section background', def: '#f2ede4' },
  { key: 'theme_text', var: '--text', label: 'Text', def: '#2d2a26' },
  { key: 'theme_text_muted', var: '--text-muted', label: 'Muted text', def: '#6b6763' },
  { key: 'theme_border', var: '--border', label: 'Borders', def: '#e0d9cc' },
]

// Curated font choices. `google` (when set) is loaded on demand from Google
// Fonts; the system options need no network request.
export const FONTS = [
  { id: 'system-serif', label: 'System Serif', stack: SYS_SERIF },
  { id: 'system-sans', label: 'System Sans', stack: SYS_SANS },
  { id: 'playfair', label: 'Playfair Display', stack: "'Playfair Display',Georgia,serif", google: 'Playfair+Display:wght@400;600;700' },
  { id: 'cormorant', label: 'Cormorant Garamond', stack: "'Cormorant Garamond',Georgia,serif", google: 'Cormorant+Garamond:wght@400;500;600;700' },
  { id: 'lora', label: 'Lora', stack: "'Lora',Georgia,serif", google: 'Lora:wght@400;500;600;700' },
  { id: 'fraunces', label: 'Fraunces', stack: "'Fraunces',Georgia,serif", google: 'Fraunces:opsz,wght@9..144,400;9..144,600' },
  { id: 'eb-garamond', label: 'EB Garamond', stack: "'EB Garamond',Georgia,serif", google: 'EB+Garamond:wght@400;500;600' },
  { id: 'inter', label: 'Inter', stack: "'Inter',system-ui,sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'source-sans', label: 'Source Sans 3', stack: "'Source Sans 3',system-ui,sans-serif", google: 'Source+Sans+3:wght@400;600;700' },
  { id: 'nunito', label: 'Nunito Sans', stack: "'Nunito Sans',system-ui,sans-serif", google: 'Nunito+Sans:wght@400;600;700' },
  { id: 'montserrat', label: 'Montserrat', stack: "'Montserrat',system-ui,sans-serif", google: 'Montserrat:wght@400;500;600;700' },
  { id: 'work-sans', label: 'Work Sans', stack: "'Work Sans',system-ui,sans-serif", google: 'Work+Sans:wght@400;500;600;700' },
]

export const THEME_FONTS = [
  { key: 'theme_font_heading', var: '--serif', label: 'Headings', def: 'system-serif' },
  { key: 'theme_font_body', var: '--sans', label: 'Body text', def: 'system-sans' },
]

// Decorative frame border drawn at the viewport edges. Each side toggles
// independently; color + width are shared. Applied to the .site-frame element
// via per-side CSS variables.
export const BORDER_SIDES = [
  { key: 'theme_border_top', var: '--frame-top', label: 'Top' },
  { key: 'theme_border_right', var: '--frame-right', label: 'Right' },
  { key: 'theme_border_bottom', var: '--frame-bottom', label: 'Bottom' },
  { key: 'theme_border_left', var: '--frame-left', label: 'Left' },
]
export const BORDER_WIDTHS = ['2px', '4px', '6px', '10px', '16px']
export const BORDER_DEFAULTS = {
  theme_border_color: '#28351f',
  theme_border_width: '6px',
  theme_border_top: '',
  theme_border_right: '',
  theme_border_bottom: '',
  theme_border_left: '',
}
const isOn = (v) => v === '1' || v === 'true' || v === true

export const fontById = (id) => FONTS.find((f) => f.id === id)

// Inject/update a single <link> for whatever Google font families are in use
// (or remove it when none are). Dedupes and rebuilds only when the URL changes.
export function loadGoogleFonts(families) {
  const uniq = [...new Set((families || []).filter(Boolean))]
  const id = 'theme-google-fonts'
  let link = document.getElementById(id)
  if (!uniq.length) {
    if (link) link.remove()
    return
  }
  const href =
    'https://fonts.googleapis.com/css2?' +
    uniq.map((f) => 'family=' + f).join('&') +
    '&display=swap'
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

// Apply a content map (the { key: value } from /api/content, or a live draft)
// as CSS variables. A blank/absent value falls back to the index.css default.
export function applyTheme(content = {}) {
  const root = document.documentElement
  for (const c of THEME_COLORS) {
    const v = (content[c.key] || '').trim()
    if (v) root.style.setProperty(c.var, v)
    else root.style.removeProperty(c.var)
  }
  const families = []
  for (const f of THEME_FONTS) {
    const font = fontById(content[f.key])
    if (font) {
      root.style.setProperty(f.var, font.stack)
      if (font.google) families.push(font.google)
    } else {
      root.style.removeProperty(f.var)
    }
  }
  loadGoogleFonts(families)

  // Frame border — per side, shared color + width.
  const bw = content.theme_border_width || BORDER_DEFAULTS.theme_border_width
  const bc = (content.theme_border_color || BORDER_DEFAULTS.theme_border_color).trim()
  for (const s of BORDER_SIDES) {
    root.style.setProperty(s.var, isOn(content[s.key]) ? `${bw} solid ${bc}` : 'none')
  }
}

// The theme subset of a content map (only the keys we manage).
export function pickTheme(content = {}) {
  const out = {}
  for (const c of THEME_COLORS) out[c.key] = content[c.key] || c.def
  for (const f of THEME_FONTS) out[f.key] = content[f.key] || f.def
  for (const [k, def] of Object.entries(BORDER_DEFAULTS)) out[k] = content[k] ?? def
  return out
}
