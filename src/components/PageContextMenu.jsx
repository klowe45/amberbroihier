import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { useContentMap } from '../lib/useSiteContent.js'
import './PageContextMenu.css'

// Admin right-click menu for the page. Instead of "Add text block" at the
// bottom and dragging it up, Amber right-clicks where she wants the text:
//   on an element        → Add text below it (goes into that element's slot)
//   on a custom block    → Add text above / below it (same list, right index)
//   on empty page space  → Add text at the end of the page
// plus "Add image or video…" anywhere. Inside the rich-text editor the
// browser's own menu is left alone (spellcheck, paste).

const genBlockId = () =>
  'blk_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)

const parseList = (raw) => {
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a)
      ? a.map((e) => (typeof e === 'string' ? { id: e, type: 'text' } : e)).filter((e) => e && e.id)
      : []
  } catch {
    return []
  }
}

export default function PageContextMenu({ pageKey, onAddMedia }) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()
  const saved = useContentMap()
  const [menu, setMenu] = useState(null) // { x, y, items: [{label, run}] }

  useEffect(() => {
    if (!isAdmin || !pageKey) return
    const main = document.querySelector('.site-main')
    if (!main) return

    const listOf = (key) => parseList(pending[key] ?? saved[key] ?? '[]')
    const insert = (key, index) => {
      const list = listOf(key)
      const at = index == null ? list.length : Math.max(0, Math.min(index, list.length))
      list.splice(at, 0, { id: genBlockId(), type: 'text' })
      set(key, JSON.stringify(list))
    }

    const onContext = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      // Leave the native menu for typing surfaces.
      if (t.closest('.editable-editor, input, textarea, select, .ql-toolbar')) return
      e.preventDefault()

      const items = []
      const block = t.closest('.custom-block')
      const adjust = t.closest('.adjustable')
      if (block) {
        const key = block.closest('.custom-blocks')?.dataset.listKey
        const id = block.dataset.blockId
        const idx = listOf(key).findIndex((b) => b.id === id)
        if (key && idx >= 0) {
          items.push({ label: 'Add text above', run: () => insert(key, idx) })
          items.push({ label: 'Add text below', run: () => insert(key, idx + 1) })
        }
      } else if (adjust?.dataset.adjustId) {
        const id = adjust.dataset.adjustId
        items.push({ label: 'Add text below this', run: () => insert(`blocks_slot_${id}`, null) })
      }
      items.push({ label: 'Add text at end of page', run: () => insert(`blocks_${pageKey}`, null) })
      if (onAddMedia) items.push({ label: 'Add image or video…', run: onAddMedia })

      // Keep the menu on-screen.
      const W = 220, H = items.length * 36 + 12
      const x = Math.min(e.clientX, window.innerWidth - W - 8)
      const y = Math.min(e.clientY, window.innerHeight - H - 8)
      setMenu({ x, y, items })
    }

    main.addEventListener('contextmenu', onContext)
    return () => main.removeEventListener('contextmenu', onContext)
  }, [isAdmin, pageKey, pending, saved, set, onAddMedia])

  // Close on any click elsewhere, scroll, or Escape.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  if (!menu) return null
  return (
    <div
      className="page-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {menu.items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          className="page-menu-item"
          onClick={() => { setMenu(null); it.run() }}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
