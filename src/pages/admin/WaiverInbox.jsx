import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useConfirm } from '../../lib/ConfirmContext.jsx'

// Admin → Waivers: everyone who signed (or declined) the waiver.
export default function WaiverInbox() {
  const confirm = useConfirm()
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('all') // all | agreed | declined

  const load = () =>
    api.get('/api/waivers').then((d) => setRows(d ?? [])).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const remove = async (r) => {
    const ok = await confirm({
      title: `Delete ${r.full_name}’s waiver record?`,
      message: 'This removes the signed record permanently.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    await api.del(`/api/waivers/${r.id}`)
    load()
  }

  if (!rows) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
  const shown = rows.filter((r) => filter === 'all' || (filter === 'agreed' ? r.agreed : !r.agreed))
  const agreed = rows.filter((r) => r.agreed).length

  return (
    <div>
      <div className="save-row" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="inbox-count">
          {rows.length} signature{rows.length === 1 ? '' : 's'} · {agreed} agreed · {rows.length - agreed} declined
        </span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-btn">
          <option value="all">Show all</option>
          <option value="agreed">Agreed only</option>
          <option value="declined">Declined only</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No waivers {filter === 'all' ? 'signed yet' : 'match'}.</p>
      ) : (
        <ul className="admin-list">
          {shown.map((r) => (
            <li key={r.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{r.full_name}</strong>
                {r.email && <span style={{ color: 'var(--text-muted)' }}> · {r.email}</span>}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Signed “<em>{r.signature}</em>” · {new Date(r.created_at).toLocaleString()}
                </div>
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
                <button type="button" className="text-btn danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
