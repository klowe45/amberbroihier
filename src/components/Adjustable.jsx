import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import './Adjustable.css'

// Wraps a page element with admin-only up/down arrows in the left gutter that
// nudge the space ABOVE it. Clicking ▼ adds top margin (pushing this element —
// and everything below it in the flow — down, e.g. to open a gap for an image);
// ▲ removes it. The amount is stored per element in site_content as
// `space_<id>` (px) and rides the normal Publish flow.
export default function Adjustable({ id, content = {}, step = 32, children }) {
  const { isAdmin } = useAuth()
  const { pending, set } = useEdit()

  const key = `space_${id}`
  const gap = Math.max(0, Number(pending[key] ?? content[key] ?? 0) || 0)
  const nudge = (delta) => set(key, String(Math.max(0, gap + delta)))

  return (
    <div className="adjustable" style={gap ? { marginTop: gap } : undefined}>
      {isAdmin && (
        <div className="adjustable-controls">
          <button type="button" className="adjustable-btn" onClick={() => nudge(-step)} aria-label="Reduce space above" title="Move up">▲</button>
          {gap > 0 && <span className="adjustable-val">{gap}</span>}
          <button type="button" className="adjustable-btn" onClick={() => nudge(step)} aria-label="Add space above" title="Move down">▼</button>
        </div>
      )}
      {children}
    </div>
  )
}
