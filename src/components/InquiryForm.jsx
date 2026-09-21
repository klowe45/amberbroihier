import { useState } from 'react'
import { api } from '../lib/api.js'
import { trackSubmit } from '../lib/analytics.js'
import { useDraft } from '../lib/useDraft.js'
import './BookingForm.css'

const BLANK = {
  org_name: '',
  address: '',
  contact_person: '',
  preferred_contact: '',
  event_type: '',
  num_employees: '',
  description: '',
  // Honeypot — see backend /api/inquiries for the drop logic. Real users
  // never see or fill this input.
  website: '',
}

const EVENT_TYPES = [
  { value: 'speaker', label: 'Speaker' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'workshop', label: 'Workshop' },
]

export default function InquiryForm() {
  // Draft-persisted: a refresh or accidental close restores the
  // in-progress inquiry from localStorage.
  const [values, setValues, clearDraft] = useDraft('inquiry-form', BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const onChange = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      await api.post('/api/inquiries', values)
      trackSubmit('inquiry')
      setStatus({
        kind: 'success',
        text: 'Thank you — your inquiry is on its way to Amber. Expect a reply within a few business days.',
      })
      clearDraft()
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Organization name</span>
        <input
          type="text"
          required
          value={values.org_name}
          onChange={onChange('org_name')}
        />
      </label>

      <label className="field">
        <span>Contact person</span>
        <input
          type="text"
          required
          value={values.contact_person}
          onChange={onChange('contact_person')}
        />
      </label>

      <label className="field">
        <span>Address</span>
        <input
          type="text"
          placeholder="Street, city, state"
          value={values.address}
          onChange={onChange('address')}
        />
      </label>

      <label className="field">
        <span>Preferred contact</span>
        <input
          type="text"
          placeholder="Email or phone number"
          value={values.preferred_contact}
          onChange={onChange('preferred_contact')}
        />
      </label>

      <label className="field">
        <span>Approximate number of people</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 25"
          value={values.num_employees}
          onChange={onChange('num_employees')}
        />
      </label>

      <fieldset className="field radio-group">
        <legend>What are you looking for?</legend>
        {EVENT_TYPES.map((t) => (
          <label key={t.value} className="radio">
            <input
              type="radio"
              name="event_type"
              required
              value={t.value}
              checked={values.event_type === t.value}
              onChange={onChange('event_type')}
            />
            {t.label}
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span>Description</span>
        <textarea
          required
          rows={5}
          placeholder="Tell Amber what you’re looking for. This might include your goals, what you hope to get out of it, and any areas your employees are struggling with — paint a picture for her."
          value={values.description}
          onChange={onChange('description')}
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
