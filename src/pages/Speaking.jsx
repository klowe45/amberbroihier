import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useSiteContent } from '../lib/useSiteContent.js'
import BookingForm from '../components/BookingForm.jsx'
import EditableText from '../components/EditableText.jsx'
import './Speaking.css'

const FALLBACK = {
  speaking_headline: 'Speaking',
  speaking_lede:
    'Keynotes, panels, and workshops on communication, leadership, and telling the truth about the work.',
  speaking_cta: 'hello@amberbroihier.com',
}

export default function Speaking() {
  const { content } = useSiteContent(FALLBACK)
  const [videos, setVideos] = useState([])

  useEffect(() => {
    api
      .get('/api/videos')
      .then((data) => setVideos(data ?? []))
      .catch(() => setVideos([]))
  }, [])

  return (
    <div className="container speaking">
      <div className="speaking-intro">
        <p className="eyebrow">Speaking</p>
        <h1>
          <EditableText
            field="speaking_headline"
            value={content.speaking_headline}
          />
        </h1>
        <p className="speaking-lede">
          <EditableText
            field="speaking_lede"
            value={content.speaking_lede}
            multiline
          />
        </p>
      </div>

      {videos.length > 0 && (
        <section className="speaking-videos">
          <h2>Recent talks</h2>
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      <section className="speaking-booking">
        <h2>Book Amber</h2>
        <p className="speaking-lede">
          Send Amber a note about your event. She’ll reply within a few
          business days. Prefer email? Write to{' '}
          <a href={`mailto:${content.speaking_cta}`}>{content.speaking_cta}</a>.
        </p>
        <BookingForm />
      </section>
    </div>
  )
}

function VideoCard({ video }) {
  const embed = toEmbedUrl(video.embed_url)
  return (
    <article className="video-card">
      {embed && (
        <div className="video-frame">
          <iframe
            src={embed}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <h3 className="video-title">{video.title}</h3>
      {video.description && (
        <p className="video-desc">{video.description}</p>
      )}
    </article>
  )
}

function toEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return `https://player.vimeo.com/video/${id}`
    }
    return url
  } catch {
    return null
  }
}
