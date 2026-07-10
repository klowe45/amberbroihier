import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// Editable copy the site knows about. Adding a new field is a two-step
// change: read it in the page component via useSiteContent, and add it
// here so Amber has a place to type the new value.
const FIELDS = [
  { key: 'home_eyebrow', label: 'Home — eyebrow', type: 'text' },
  { key: 'home_headline', label: 'Home — headline', type: 'text' },
  { key: 'home_lede', label: 'Home — lede', type: 'textarea' },
  { key: 'home_cta_primary', label: 'Home — primary button', type: 'text' },
  { key: 'home_cta_secondary', label: 'Home — secondary button', type: 'text' },
  { key: 'about_headline', label: 'About — headline', type: 'text' },
  { key: 'about_p1', label: 'About — paragraph 1', type: 'textarea' },
  { key: 'about_p2', label: 'About — paragraph 2', type: 'textarea' },
  { key: 'about_p3', label: 'About — paragraph 3', type: 'textarea' },
  { key: 'speaking_headline', label: 'Speaking — headline', type: 'text' },
  { key: 'speaking_lede', label: 'Speaking — lede', type: 'textarea' },
  { key: 'speaking_cta', label: 'Speaking — booking email', type: 'text' },
]

export default function ContentEditor() {
  const [values, setValues] = useState({})
  const [status, setStatus] = useState('')

  useEffect(() => {
    api
      .get('/api/content')
      .then((data) => setValues(data ?? {}))
      .catch(() => setValues({}))
  }, [])

  const onChange = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSave = async (e) => {
    e.preventDefault()
    setStatus('Saving…')
    try {
      await api.put('/api/content', {
        entries: FIELDS.map(({ key }) => ({ key, value: values[key] ?? '' })),
      })
      setStatus('Saved.')
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  return (
    <form className="admin-form" onSubmit={onSave}>
      {FIELDS.map((f) => (
        <label key={f.key} className="field">
          <span>{f.label}</span>
          {f.type === 'textarea' ? (
            <textarea
              value={values[f.key] ?? ''}
              onChange={onChange(f.key)}
              rows={4}
            />
          ) : (
            <input
              type="text"
              value={values[f.key] ?? ''}
              onChange={onChange(f.key)}
            />
          )}
        </label>
      ))}
      <div className="save-row">
        <button type="submit" className="btn">
          Save changes
        </button>
        <span className="save-status">{status}</span>
      </div>
    </form>
  )
}
