import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import ContentEditor from './admin/ContentEditor.jsx'
import BlogManager from './admin/BlogManager.jsx'
import VideoManager from './admin/VideoManager.jsx'
import BookingInbox from './admin/BookingInbox.jsx'
import './Admin.css'

const TABS = [
  { id: 'bookings', label: 'Inquiries' },
  { id: 'content', label: 'Site copy' },
  { id: 'blog', label: 'Writing' },
  { id: 'videos', label: 'Videos' },
]

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('bookings')

  return (
    <div className="container admin">
      <header className="admin-header">
        <p className="eyebrow">Admin</p>
        <h1>Welcome back{user?.email ? `, ${user.email}` : ''}.</h1>
        <p className="admin-lede">
          Read inquiries, edit site copy, publish writing, and update your talks.
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
        {tab === 'content' && <ContentEditor />}
        {tab === 'blog' && <BlogManager />}
        {tab === 'videos' && <VideoManager />}
      </section>
    </div>
  )
}
