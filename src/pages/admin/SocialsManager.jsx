import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useEdit } from '../../lib/EditContext.jsx'
import { useConfirm } from '../../lib/ConfirmContext.jsx'
import { PLATFORMS, platformById, parseSocials, genSocialId, isSafeUrl } from '../../lib/socials.js'
import SocialIcon from '../../components/SocialIcon.jsx'
import './SocialsManager.css'

// Admin → Socials. Add / reorder / remove social links; each one shows
// as an icon in the site footer. Saves straight to site_content
// (`socials`) like the theme editor does, then refreshes the site copy.
export default function SocialsManager() {
  const { refresh } = useEdit()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [saved, setSaved] = useState('')
  const [status, setStatus] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0].id)
  const [url, setUrl] = useState(PLATFORMS[0].home)

  useEffect(() => {
    api
      .get('/api/content')
      .then((data) => {
        const raw = data?.socials ?? '[]'
        setItems(parseSocials(raw))
        setSaved(JSON.stringify(parseSocials(raw)))
      })
      .catch(() => { setItems([]); setSaved('[]') })
  }, [])

  const dirty = items && JSON.stringify(items) !== saved

  const onPlatform = (id) => {
    setPlatform(id)
    // Pre-fill the URL with the platform's home so she only types the handle.
    const p = platformById(id)
    if (p && (!url.trim() || PLATFORMS.some((q) => url === q.home))) setUrl(p.home)
  }

  const add = (e) => {
    e.preventDefault()
    const u = url.trim()
    if (!isSafeUrl(u) || PLATFORMS.some((q) => u === q.home)) {
      setStatus('Enter the full link, e.g. https://instagram.com/yourname')
      return
    }
    setItems([...items, { id: genSocialId(), platform, url: u }])
    setUrl(platformById(platform)?.home || '')
    setStatus('')
  }

  const remove = async (item) => {
    const ok = await confirm({
      title: `Remove ${platformById(item.platform)?.label || item.platform}?`,
      message: 'The icon disappears from the footer once you save.',
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    setItems(items.filter((s) => s.id !== item.id))
  }

  const move = (idx, dir) => {
    const next = [...items]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setItems(next)
  }

  const updateUrl = (id, value) =>
    setItems(items.map((s) => (s.id === id ? { ...s, url: value } : s)))

  const save = async () => {
    const bad = items.find((s) => !isSafeUrl(s.url))
    if (bad) {
      setStatus(`Check the ${platformById(bad.platform)?.label || bad.platform} link — it needs to start with https://`)
      return
    }
    setStatus('Saving…')
    try {
      const value = JSON.stringify(items.map((s) => ({ ...s, url: s.url.trim() })))
      await api.put('/api/content', { entries: [{ key: 'socials', value }] })
      setSaved(value)
      setItems(JSON.parse(value))
      setStatus('Saved — the footer is updated.')
      refresh()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  if (!items) return <p className="socials-empty">Loading…</p>

  return (
    <div className="socials">
      <p className="socials-help">
        Each link shows as an icon in the footer of every page, in this order.
      </p>

      {items.length === 0 ? (
        <p className="socials-empty">No socials yet — add one below.</p>
      ) : (
        <ul className="socials-list">
          {items.map((s, i) => (
            <li key={s.id} className="socials-item">
              <span className="socials-item-icon"><SocialIcon platform={s.platform} size={22} /></span>
              <span className="socials-item-name">{platformById(s.platform)?.label || s.platform}</span>
              <input
                type="url"
                className="socials-item-url"
                value={s.url}
                onChange={(e) => updateUrl(s.id, e.target.value)}
                aria-label={`${platformById(s.platform)?.label || s.platform} link`}
              />
              <span className="socials-item-actions">
                <button type="button" className="text-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">▲</button>
                <button type="button" className="text-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" title="Move down">▼</button>
                <button type="button" className="text-btn danger" onClick={() => remove(s)}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form className="socials-add" onSubmit={add}>
        <label>
          <span>Platform</span>
          <select value={platform} onChange={(e) => onPlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="socials-add-url">
          <span>Link</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <button type="submit" className="text-btn">+ Add</button>
      </form>

      <div className="save-row socials-save">
        <button type="button" className="btn" onClick={save} disabled={!dirty}>
          Save socials
        </button>
        {status && <span className="socials-status">{status}</span>}
      </div>
    </div>
  )
}
