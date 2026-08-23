import { useState } from 'react'
import { api } from '../lib/api.js'
import { useDraft } from '../lib/useDraft.js'
import './BookingForm.css'

const BLANK = {
  org_name: '',
  address: '',
  contact_person: '',
  preferred_contact: '',
  num_employees: '',
  description: '',
  // Honeypot — see backend /api/inquiries for the drop logic. Real users
  // never see or fill this input.
  website: '',
}

const EMPLOYEE_RANGES = ['1–10', '11–50', '51–200', '201–500', '500+']

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
        <span>Address</span>
        <input
          type="text"
          placeholder="Street, city, state"
          value={values.address}
          onChange={onChange('address')}
        />
      </label>

      <div className="booking-row">
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
          <span>Preferred contact</span>
          <input
            type="text"
            placeholder="Email or phone number"
            value={values.preferred_contact}
            onChange={onChange('preferred_contact')}
          />
        </label>
      </div>

      <label className="field">
        <span>Number of employees</span>
        <select
          value={values.num_employees}
          onChange={onChange('num_employees')}
        >
          <option value="">Select a range…</option>
          {EMPLOYEE_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          required
          rows={5}
          placeholder="Tell Amber what you’re looking for."
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
