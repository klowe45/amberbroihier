import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import './EditBar.css'

// Sticky admin toolbar. Renders nothing for non-admins, and nothing
// when there's nothing pending and no history — stays out of the way
// until Amber actually starts editing something. (It stays up after
// she undoes everything so Redo is still reachable.)
export default function EditBar() {
  const { isAdmin } = useAuth()
  const { pending, isDirty, publishing, publish, cancel, undo, redo, canUndo, canRedo } = useEdit()

  if (!isAdmin || (!isDirty && !canUndo && !canRedo)) return null

  const count = Object.keys(pending).length

  return (
    <div className="edit-bar" role="status" aria-live="polite">
      <div className="edit-bar-inner">
        <span className="edit-bar-count">
          {count ? `${count} unsaved edit${count === 1 ? '' : 's'}` : 'No unsaved edits'}
        </span>
        <div className="edit-bar-actions">
          <button
            type="button"
            className="edit-bar-btn edit-bar-btn-ghost edit-bar-btn-icon"
            onClick={undo}
            disabled={publishing || !canUndo}
            title="Undo last change (⌘Z)"
            aria-label="Undo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
            Undo
          </button>
          <button
            type="button"
            className="edit-bar-btn edit-bar-btn-ghost edit-bar-btn-icon"
            onClick={redo}
            disabled={publishing || !canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 14l5-5-5-5" />
              <path d="M20 9H10a6 6 0 0 0 0 12h3" />
            </svg>
            Redo
          </button>
          <button
            type="button"
            className="edit-bar-btn edit-bar-btn-ghost"
            onClick={cancel}
            disabled={publishing || !isDirty}
          >
            Cancel
          </button>
          <button
            type="button"
            className="edit-bar-btn"
            onClick={publish}
            disabled={publishing || !isDirty}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
