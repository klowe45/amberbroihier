import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useConfirm } from '../lib/ConfirmContext.jsx'
import { useSiteContent } from '../lib/useSiteContent.js'
import { toEmbedUrl } from '../lib/embedUrl.js'
import EditableText from '../components/EditableText.jsx'
import './Speaking.css'

const FALLBACK = {
  speaking_headline: 'Speaking',
  speaking_lede:
    'Keynotes, panels, and workshops on communication, leadership, and telling the truth about the work.',
}

export default function Speaking() {
  const { content } = useSiteContent(FALLBACK)
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])

  // Callback-form load so the Delete handler can trigger a refetch
  // after a successful api.del without needing to duplicate the query.
  const load = useCallback(() => {
    api
      .get('/api/videos')
      .then((data) => setVideos(data ?? []))
      .catch(() => setVideos([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onEdit = (video) =>
    // Route to /admin with an intent flag in location.state so the
    // Admin page opens the Videos tab and VideoManager auto-populates
    // its editing form with this exact video. Saves Amber from having
    // to hunt through the list.
    navigate('/admin', { state: { editVideoId: video.id } })

  const onDelete = async (video) => {
    const ok = await confirm({
      title: `Remove "${video.title}"?`,
      message: 'The video embed will disappear from the Speaking page.',
      confirmLabel: 'Remove video',
      danger: true,
    })
    if (!ok) return
    await api.del(`/api/videos/${video.id}`)
    load()
  }

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
              <VideoCard
                key={v.id}
                video={v}
                isAdmin={isAdmin}
                onEdit={() => onEdit(v)}
                onDelete={() => onDelete(v)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function VideoCard({ video, isAdmin, onEdit, onDelete }) {
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
      <div className="video-meta">
        {video.description ? (
          <p className="video-desc">{video.description}</p>
        ) : (
          <span />
        )}
        {isAdmin && (
          <div className="video-actions">
            <button
              type="button"
              className="text-btn"
              onClick={onEdit}
              aria-label={`Edit ${video.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-btn danger"
              onClick={onDelete}
              aria-label={`Remove ${video.title}`}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

