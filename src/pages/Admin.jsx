import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import BlogManager from './admin/BlogManager.jsx'
import VideoManager from './admin/VideoManager.jsx'
import BookingInbox from './admin/BookingInbox.jsx'
import './Admin.css'

const TABS = [
  { id: 'bookings', label: 'Inquiries' },
  { id: 'blog', label: 'Writing' },
  { id: 'videos', label: 'Videos' },
]

const FALLBACK = {
  admin_eyebrow: 'Admin',
  admin_headline: 'Welcome back, Amber',
  admin_subtitle: 'Kenneth Loves You!',
}

export default function Admin() {
  const { content } = useSiteContent(FALLBACK)
  const location = useLocation()
  // Speaking-page "Edit" buttons route here with a specific video in
  // mind. Detect that here and jump straight to the Videos tab; the
  // VideoManager receives the id as a prop and auto-opens the form.
  const editVideoId = location.state?.editVideoId ?? null
  const [tab, setTab] = useState(editVideoId ? 'videos' : 'bookings')

  return (
    <div className="container admin">
      <header className="admin-header">
        <p className="eyebrow">
          <EditableText field="admin_eyebrow" value={content.admin_eyebrow} />
        </p>
        <h1>
          <EditableText field="admin_headline" value={content.admin_headline} />
        </h1>
        <p className="admin-subtitle">
          <EditableText field="admin_subtitle" value={content.admin_subtitle} />
        </p>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="admin-panel">
        {tab === 'bookings' && <BookingInbox />}
        {tab === 'blog' && <BlogManager />}
        {tab === 'videos' && <VideoManager initialEditId={editVideoId} />}
      </section>
    </div>
  )
}
