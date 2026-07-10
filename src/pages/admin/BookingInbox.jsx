import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const STATUS_OPTIONS = ['new', 'replied', 'booked', 'declined']

export default function BookingInbox() {
  const [bookings, setBookings] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [status, setStatus] = useState('')

  const load = () =>
    api
      .get('/api/bookings')
      .then((data) => setBookings(data ?? []))
      .catch(() => setBookings([]))

  useEffect(() => {
    load()
  }, [])

  const updateStatus = async (id, next) => {
    setStatus('Saving…')
    try {
      await api.put(`/api/bookings/${id}`, { status: next })
      setStatus('')
      load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return
    await api.del(`/api/bookings/${id}`)
    load()
  }

  if (bookings.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No inquiries yet.</p>
  }

  return (
    <div>
      <div className="save-row" style={{ marginBottom: '1rem' }}>
        <span className="save-status">
          {bookings.length} inquir{bookings.length === 1 ? 'y' : 'ies'}. {status}
        </span>
      </div>
      <ul className="admin-list">
        {bookings.map((b) => (
          <li key={b.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div className="row-title">
                {b.name}
                <span
                  className={`status-pill ${b.status === 'booked' ? 'published' : ''}`}
                  style={{ marginLeft: '0.75rem' }}
                >
                  {b.status}
                </span>
              </div>
              <div className="row-meta">
                {new Date(b.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>
            <div className="row-meta" style={{ marginTop: '0.25rem' }}>
              <a href={`mailto:${b.email}`}>{b.email}</a>
              {b.event_date && ` · Event: ${b.event_date}`}
              {b.event_type && ` · ${b.event_type}`}
              {b.budget && ` · Budget: ${b.budget}`}
            </div>
            {expanded === b.id ? (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 0.75rem' }}>
                  {b.message}
                </p>
                <div className="row-actions">
                  <select
                    className="text-btn"
                    value={b.status}
                    onChange={(e) => updateStatus(b.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-btn"
                    onClick={() => setExpanded(null)}
                  >
                    Collapse
                  </button>
                  <button
                    className="text-btn danger"
                    onClick={() => onDelete(b.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="row-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  className="text-btn"
                  onClick={() => setExpanded(b.id)}
                >
                  View
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
