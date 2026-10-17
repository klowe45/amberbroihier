import { useState } from 'react'
import { api } from '../../lib/api.js'
import { useEdit } from '../../lib/EditContext.jsx'
import { useConfirm } from '../../lib/ConfirmContext.jsx'

// The "Under construction" switch. Saves straight away (no Publish step):
// while it's on, every visitor sees the sign instead of the site; Amber,
// signed in, still sees and edits the real pages.
export default function SiteStatus({ value }) {
  const { refresh } = useEdit()
  const confirm = useConfirm()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const on = value === '1'

  const toggle = async () => {
    if (!on) {
      const ok = await confirm({
        title: 'Put the site under construction?',
        message: 'Visitors will only see an “Under construction” sign until you switch this off. You’ll still see the full site while signed in.',
        confirmLabel: 'Turn on',
      })
      if (!ok) return
    }
    setSaving(true)
    setError('')
    try {
      await api.put('/api/content', {
        entries: [{ key: 'site_under_construction', value: on ? '0' : '1' }],
      })
      refresh()
    } catch (err) {
      setError(`Couldn’t save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`site-status${on ? ' is-on' : ''}`}
      title={on
        ? 'Visitors see an “Under construction” sign instead of your pages.'
        : 'Everyone can see your pages.'}
    >
      {error && <span className="site-status-error">{error}</span>}
      <span className="site-status-label">{on ? 'Under construction' : 'Site is live'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Under construction"
        className="site-status-switch"
        onClick={toggle}
        disabled={saving}
      >
        <span />
      </button>
    </div>
  )
}
