import './EditModeToggle.css'

// Small pencil-icon button used to unlock inline editing on a group
// of otherwise-clickable elements (nav links, CTA buttons, etc.).
// Neutral in its default state, filled with the accent color when
// active so it's obvious the group is in "edit labels" mode.
//
// Props:
//   active  — whether the group is currently editable
//   onClick — flip the mode
//   label   — accessible + tooltip label describing what will be edited
export default function EditModeToggle({ active, onClick, label = 'Edit labels' }) {
  return (
    <button
      type="button"
      className={`edit-mode-toggle ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Done ${label.toLowerCase()}` : label}
      title={active ? `Done ${label.toLowerCase()}` : label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 3l4 4L8 20H4v-4L17 3z" />
      </svg>
    </button>
  )
}
