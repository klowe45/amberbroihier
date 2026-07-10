import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import './EditBar.css'

// Sticky admin toolbar. Renders nothing for non-admins, and nothing
// when there's nothing pending — stays out of the way until Amber
// actually starts editing something.
export default function EditBar() {
  const { isAdmin } = useAuth()
  const { pending, isDirty, publishing, publish, cancel } = useEdit()

  if (!isAdmin || !isDirty) return null

  const count = Object.keys(pending).length

  return (
    <div className="edit-bar" role="status" aria-live="polite">
      <div className="edit-bar-inner">
        <span className="edit-bar-count">
          {count} unsaved edit{count === 1 ? '' : 's'}
        </span>
        <div className="edit-bar-actions">
          <button
            type="button"
            className="edit-bar-btn edit-bar-btn-ghost"
            onClick={cancel}
            disabled={publishing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="edit-bar-btn"
            onClick={publish}
            disabled={publishing}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
