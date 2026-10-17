import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useConfirm } from '../../lib/ConfirmContext.jsx'
import { looksLikeHtml, sanitize } from '../../lib/richTextView.js'

// Admin → Waivers: everyone who signed (or declined) the waiver, with the
// exact wording each one signed. Records can be archived (hidden from the
// main list) but never deleted — they're legal records.
export default function WaiverInbox() {
  const confirm = useConfirm()
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('all') // all | agreed | declined | archived
  const [error, setError] = useState('')

  const load = () =>
    api.get('/api/waivers').then((d) => setRows(d ?? [])).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const setArchived = async (r, archived) => {
    if (archived) {
      const ok = await confirm({
        title: `Archive ${r.full_name}’s waiver record?`,
        message: 'It moves to “Archived” and stays on file. You can restore it any time.',
        confirmLabel: 'Archive',
      })
      if (!ok) return
    }
    setError('')
    try {
      await api.patch(`/api/waivers/${r.id}`, { archived })
      load()
    } catch (err) {
      setError(`Couldn’t ${archived ? 'archive' : 'restore'} that record: ${err.message}`)
    }
  }

  if (!rows) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
  const active = rows.filter((r) => !r.archived_at)
  const archivedCount = rows.length - active.length
  const shown = filter === 'archived'
    ? rows.filter((r) => r.archived_at)
    : active.filter((r) => filter === 'all' || (filter === 'agreed' ? r.agreed : !r.agreed))
  const agreed = active.filter((r) => r.agreed).length

  return (
    <div>
      <div className="save-row" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="inbox-count">
          {active.length} signature{active.length === 1 ? '' : 's'} · {agreed} agreed · {active.length - agreed} declined
          {archivedCount > 0 && ` · ${archivedCount} archived`}
        </span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-btn">
          <option value="all">Show all</option>
          <option value="agreed">Agreed only</option>
          <option value="declined">Declined only</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      {shown.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          {filter === 'archived' ? 'No archived waivers.' : `No waivers ${filter === 'all' ? 'signed yet' : 'match'}.`}
        </p>
      ) : (
        <ul className="admin-list">
          {shown.map((r) => (
            <li key={r.id} style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: '1 1 20rem' }}>
                <strong>{r.full_name}</strong>
                {r.email && <span style={{ color: 'var(--text-muted)' }}> · {r.email}</span>}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Signed “<em>{r.signature}</em>” · {new Date(r.created_at).toLocaleString()}
                  {r.archived_at && ` · archived ${new Date(r.archived_at).toLocaleDateString()}`}
                </div>
                <SignedWording versionId={r.waiver_version_id} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem', borderRadius: '999px',
                  color: r.agreed ? 'var(--bg)' : 'var(--danger)',
                  background: r.agreed ? 'var(--accent)' : 'rgba(160,48,48,0.1)',
                }}>
                  {r.agreed ? 'Agreed' : 'Declined'}
                </span>
                {r.archived_at ? (
                  <button type="button" className="text-btn" onClick={() => setArchived(r, false)}>Restore</button>
                ) : (
                  <button type="button" className="text-btn" onClick={() => setArchived(r, true)}>Archive</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// "View signed wording": fetched the first time it's opened. Records from
// before wording was stored only have a fingerprint of it.
function SignedWording({ versionId }) {
  const [version, setVersion] = useState(null)
  const [failed, setFailed] = useState(false)

  if (!versionId) {
    return (
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.4rem 0 0' }}>
        Signed before waiver wording was saved with each record.
      </p>
    )
  }

  const onToggle = (e) => {
    if (!e.currentTarget.open || version) return
    setFailed(false)
    api.get(`/api/waivers/versions/${versionId}`).then(setVersion).catch(() => setFailed(true))
  }

  return (
    <details onToggle={onToggle} style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--accent)' }}>View signed wording</summary>
      <div style={{ marginTop: '0.6rem', padding: '0.9rem 1rem', border: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
        {failed && <p className="form-error" style={{ margin: 0 }}>Couldn’t load the wording. Close and open again to retry.</p>}
        {!failed && !version && <p style={{ margin: 0, color: 'var(--text-muted)' }}>Loading…</p>}
        {version && (
          <>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {version.source === 'default'
                ? 'The built-in sample wording (no waiver of your own was published yet).'
                : `Your published wording, first signed ${new Date(version.created_at).toLocaleDateString()}.`}
            </p>
            {looksLikeHtml(version.body) ? (
              <div dangerouslySetInnerHTML={{ __html: sanitize(version.body) }} />
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{version.body}</p>
            )}
          </>
        )}
      </div>
    </details>
  )
}
