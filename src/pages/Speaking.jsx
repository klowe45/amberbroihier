import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSiteContent } from '../lib/useSiteContent.js'
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
    supabase
      .from('videos')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data }) => setVideos(data ?? []))
  }, [])

  return (
    <div className="container speaking">
      <div className="speaking-intro">
        <p className="eyebrow">Speaking</p>
        <h1>{content.speaking_headline}</h1>
        <p className="speaking-lede">{content.speaking_lede}</p>
        <p>
          To book Amber, write to{' '}
          <a href={`mailto:${content.speaking_cta}`}>{content.speaking_cta}</a>.
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

// Accepts a raw YouTube or Vimeo URL and returns the embed URL.
// Falls back to whatever the user pasted if the shape isn't recognized —
// this lets Amber paste iframe src URLs directly if she has them.
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
