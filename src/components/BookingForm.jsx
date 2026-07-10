import { useState } from 'react'
import { api } from '../lib/api.js'
import './BookingForm.css'

const BLANK = {
  name: '',
  email: '',
  event_date: '',
  event_type: '',
  budget: '',
  message: '',
  // Honeypot — see backend /api/bookings for the drop logic. Real users
  // never see or fill this input.
  website: '',
}

export default function BookingForm() {
  const [values, setValues] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const onChange = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      await api.post('/api/bookings', values)
      setStatus({
        kind: 'success',
        text:
          'Thank you — your note is on its way to Amber. Expect a reply within a few business days.',
      })
      setValues(BLANK)
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <div className="booking-row">
        <label className="field">
          <span>Your name</span>
          <input
            type="text"
            required
            value={values.name}
            onChange={onChange('name')}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={values.email}
            onChange={onChange('email')}
          />
        </label>
      </div>

      <div className="booking-row">
        <label className="field">
          <span>Event date (approximate)</span>
          <input
            type="date"
            value={values.event_date}
            onChange={onChange('event_date')}
          />
        </label>
        <label className="field">
          <span>Event type</span>
          <input
            type="text"
            placeholder="Keynote, panel, workshop…"
            value={values.event_type}
            onChange={onChange('event_type')}
          />
        </label>
      </div>

      <label className="field">
        <span>Budget (optional)</span>
        <input
          type="text"
          placeholder="A ballpark helps"
          value={values.budget}
          onChange={onChange('budget')}
        />
      </label>

      <label className="field">
        <span>Tell Amber about the event</span>
        <textarea
          required
          rows={5}
          placeholder="Audience, format, dates, anything else worth knowing."
          value={values.message}
          onChange={onChange('message')}
        />
      </label>

      {/* Honeypot: visually hidden but present in the DOM. */}
      <label className="honeypot" aria-hidden="true">
        Website
        <input
          type="text"
          tabIndex="-1"
          autoComplete="off"
          value={values.website}
          onChange={onChange('website')}
        />
      </label>

      {status && (
        <p className={`booking-status ${status.kind}`}>{status.text}</p>
      )}

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  )
}
