import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import {
  THEME_COLORS,
  THEME_FONTS,
  FONTS,
  BORDER_SIDES,
  BORDER_WIDTHS,
  BORDER_DEFAULTS,
  applyTheme,
  pickTheme,
} from '../lib/theme.js'
import './ThemeSettings.css'

// Admin-only theme editor. Colors + fonts apply LIVE to the whole site as
// Amber tweaks them (so she sees the real thing behind the panel); Cancel
// reverts to what was saved, Save persists to site_content via /api/content.
export default function ThemeSettings({ open, initial, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => pickTheme(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const savedRef = useRef(pickTheme(initial))

  // Re-seed when opened (initial may have loaded after first mount).
  useEffect(() => {
    if (!open) return
    const seed = pickTheme(initial)
    savedRef.current = seed
    setDraft(seed)
  }, [open, initial])

  // Live preview: every draft change re-applies to :root.
  useEffect(() => {
    if (open) applyTheme(draft)
  }, [open, draft])

  // Escape closes (reverting).
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') cancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const cancel = () => {
    applyTheme(savedRef.current) // revert the live preview
    onClose?.()
  }

  const isOn = (key) => draft[key] === '1' || draft[key] === 'true'
  const toggle = (key) => set(key, isOn(key) ? '' : '1')

  const reset = () => {
    const defaults = {}
    for (const c of THEME_COLORS) defaults[c.key] = c.def
    for (const f of THEME_FONTS) defaults[f.key] = f.def
    for (const [k, def] of Object.entries(BORDER_DEFAULTS)) defaults[k] = def
    setDraft(defaults)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const entries = [
        ...THEME_COLORS.map((c) => ({ key: c.key, value: draft[c.key] || '' })),
        ...THEME_FONTS.map((f) => ({ key: f.key, value: draft[f.key] || '' })),
        ...Object.keys(BORDER_DEFAULTS).map((k) => ({ key: k, value: draft[k] || '' })),
      ]
      await api.put('/api/content', { entries })
      savedRef.current = { ...draft }
      onSaved?.(draft)
      onClose?.()
    } catch (e) {
      setError(e.message || "Couldn't save your theme.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="theme-overlay" onClick={cancel} role="presentation">
      <div className="theme-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Site appearance">
        <div className="theme-panel-head">
          <h2>Site appearance</h2>
          <button className="theme-x" onClick={cancel} aria-label="Close">×</button>
        </div>
        <p className="theme-hint">Changes preview live on the site behind this panel. Nothing sticks until you Save.</p>

        <section className="theme-section">
          <h3>Colors</h3>
          <div className="theme-colors">
            {THEME_COLORS.map((c) => (
              <label key={c.key} className="theme-color">
                <input
                  type="color"
                  value={draft[c.key] || c.def}
                  onChange={(e) => set(c.key, e.target.value)}
                  aria-label={c.label}
                />
                <span className="theme-color-label">{c.label}</span>
                <input
                  type="text"
                  className="theme-hex"
                  value={draft[c.key] || ''}
                  onChange={(e) => set(c.key, e.target.value)}
                  placeholder={c.def}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="theme-section">
          <h3>Border frame</h3>
          <div className="theme-sides">
            {BORDER_SIDES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`theme-side${isOn(s.key) ? ' is-on' : ''}`}
                onClick={() => toggle(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="theme-border-opts">
            <label className="theme-color">
              <input
                type="color"
                value={draft.theme_border_color || BORDER_DEFAULTS.theme_border_color}
                onChange={(e) => set('theme_border_color', e.target.value)}
                aria-label="Border color"
              />
              <span className="theme-color-label">Color</span>
            </label>
            <label className="theme-font">
              <span className="theme-font-label">Thickness</span>
              <select
                value={draft.theme_border_width || BORDER_DEFAULTS.theme_border_width}
                onChange={(e) => set('theme_border_width', e.target.value)}
              >
                {BORDER_WIDTHS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="theme-section">
          <h3>Fonts</h3>
          {THEME_FONTS.map((f) => (
            <label key={f.key} className="theme-font">
              <span className="theme-font-label">{f.label}</span>
              <select value={draft[f.key] || f.def} onChange={(e) => set(f.key, e.target.value)}>
                {FONTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <span className="theme-font-sample" style={{ fontFamily: FONTS.find((x) => x.id === (draft[f.key] || f.def))?.stack }}>
                Aa
              </span>
            </label>
          ))}
        </section>

        {error && <p className="theme-error">{error}</p>}

        <div className="theme-actions">
          <button className="theme-reset" onClick={reset} disabled={saving}>Reset to default</button>
          <div className="theme-actions-right">
            <button className="theme-cancel" onClick={cancel} disabled={saving}>Cancel</button>
            <button className="theme-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
