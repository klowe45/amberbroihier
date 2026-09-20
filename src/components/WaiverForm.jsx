import { useState } from 'react'
import { api } from '../lib/api.js'
import { trackSubmit } from '../lib/analytics.js'
import { useDraft } from '../lib/useDraft.js'
import './BookingForm.css'
import './WaiverForm.css'

const BLANK = {
  full_name: '',
  email: '',
  signature: '',
  choice: '', // 'agree' | 'decline'
  website: '', // honeypot
}

// Sign the waiver: name, email (optional), a typed signature, and an
// explicit opt-in / opt-out choice. Stored on the backend; Amber reads
// them in Admin → Waivers. The waiver wording shown is sent along so
// the record can prove which version was signed.
export default function WaiverForm({ waiverText }) {
  const [values, setValues, clearDraft] = useDraft('waiver-form', BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const onChange = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    if (!values.choice) {
      setStatus({ kind: 'error', text: 'Please choose whether you agree or decline.' })
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/waivers', {
        full_name: values.full_name,
        email: values.email,
        signature: values.signature,
        agreed: values.choice === 'agree',
        waiver_text: waiverText,
        website: values.website,
      })
      trackSubmit('waiver')
      setStatus({
        kind: 'success',
        text: values.choice === 'agree'
          ? `Thank you, ${values.full_name.trim()} — your signed waiver has been recorded.`
          : `Recorded — you have opted out. Reach out to Amber if you have questions.`,
      })
      clearDraft()
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <form className="booking-form waiver-form" onSubmit={onSubmit}>
      <h2 className="waiver-form-title">Sign the waiver</h2>

      <div className="booking-row">
        <label className="field">
          <span>Full name</span>
          <input type="text" required autoComplete="name" value={values.full_name} onChange={onChange('full_name')} />
        </label>
        <label className="field">
          <span>Email <em>(optional)</em></span>
          <input type="email" autoComplete="email" value={values.email} onChange={onChange('email')} />
        </label>
      </div>

      <fieldset className="waiver-choice">
        <legend>Your choice</legend>
        <label className={`waiver-option${values.choice === 'agree' ? ' is-selected' : ''}`}>
          <input
            type="checkbox"
            checked={values.choice === 'agree'}
            onChange={() => setValues((v) => ({ ...v, choice: v.choice === 'agree' ? '' : 'agree' }))}
          />
          <span>
            <strong>I agree — opt in.</strong>
            <small>I have read the waiver above and accept its terms.</small>
          </span>
        </label>
        <label className={`waiver-option${values.choice === 'decline' ? ' is-selected' : ''}`}>
          <input
            type="checkbox"
            checked={values.choice === 'decline'}
            onChange={() => setValues((v) => ({ ...v, choice: v.choice === 'decline' ? '' : 'decline' }))}
          />
          <span>
            <strong>I do not agree — opt out.</strong>
            <small>Record that I have declined.</small>
          </span>
        </label>
      </fieldset>

      <label className="field waiver-signature">
        <span>Signature — type your full name</span>
        <input
          type="text"
          required
          placeholder="Your name, as a signature"
          value={values.signature}
          onChange={onChange('signature')}
          autoComplete="off"
        />
        <small className="waiver-date">Dated {today}</small>
      </label>

      {/* Honeypot: visually hidden but present in the DOM. */}
      <label className="honeypot" aria-hidden="true">
        Website
        <input type="text" tabIndex="-1" autoComplete="off" value={values.website} onChange={onChange('website')} />
      </label>

      {status && <p className={`booking-status ${status.kind}`}>{status.text}</p>}

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit waiver'}
      </button>
    </form>
  )
}
