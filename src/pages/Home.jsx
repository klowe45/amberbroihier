import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useEdit } from '../lib/EditContext.jsx'
import { useSiteContent } from '../lib/useSiteContent.js'
import { toEmbedUrl } from '../lib/embedUrl.js'
import EditableText from '../components/EditableText.jsx'
import EditModeToggle from '../components/EditModeToggle.jsx'
import './Home.css'

const FALLBACK = {
  home_eyebrow: 'Speaker · Writer · Communicator',
  home_headline: 'Ideas worth speaking about.',
  home_lede:
    'Amber Broihier helps audiences connect the dots between story, strategy, and human experience. Book her for your next keynote, panel, or workshop.',
  home_cta_primary: 'Book Amber',
  home_cta_secondary: 'Read the writing',
  // Featured video shown under the CTAs. Stored as a video UUID
  // (matches videos.id). Empty string = no featured video / hidden.
  home_featured_video_id: '',
}

export default function Home() {
  const { isAdmin } = useAuth()
  const { content } = useSiteContent(FALLBACK)
  const { pending, set } = useEdit()
  const [buttonsEditMode, setButtonsEditMode] = useState(false)
  const [videos, setVideos] = useState([])

  // We fetch the whole video list so the picker has options and we
  // can resolve the featured id → its embed URL. Small payload for a
  // personal-brand site, no need to add a dedicated /featured route.
  useEffect(() => {
    api
      .get('/api/videos')
      .then((data) => setVideos(data ?? []))
      .catch(() => setVideos([]))
  }, [])

  // Pending edit overlays the saved value so Amber can preview her
  // pick before hitting Publish.
  const featuredId =
    pending.home_featured_video_id ?? content.home_featured_video_id ?? ''
  const featured = videos.find((v) => v.id === featuredId)
  const embedUrl = featured ? toEmbedUrl(featured.embed_url) : null

  return (
    <div className="container home">
      <p className="eyebrow">
        <EditableText field="home_eyebrow" value={content.home_eyebrow} />
      </p>
      <h1 className="home-headline">
        <EditableText field="home_headline" value={content.home_headline} />
      </h1>
      <p className="home-lede">
        <EditableText
          field="home_lede"
          value={content.home_lede}
          multiline
        />
      </p>
      <div className="home-actions">
        <Link to="/book" className="btn">
          <EditableText
            field="home_cta_primary"
            value={content.home_cta_primary}
            enabled={buttonsEditMode}
            pencil={false}
          />
        </Link>
        <Link to="/blog" className="btn btn-ghost">
          <EditableText
            field="home_cta_secondary"
            value={content.home_cta_secondary}
            enabled={buttonsEditMode}
            pencil={false}
          />
        </Link>
        {isAdmin && (
          <EditModeToggle
            active={buttonsEditMode}
            onClick={() => setButtonsEditMode((v) => !v)}
            label="Edit button labels"
          />
        )}
      </div>

      {featured && embedUrl && (
        <div className="home-video">
          <div className="home-video-frame">
            <iframe
              src={embedUrl}
              title={featured.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {featured.title && (
            <p className="home-video-caption">{featured.title}</p>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="home-video-picker">
          <label>
            <span className="home-video-picker-label">Featured video</span>
            <div className="home-video-picker-row">
              <select
                value={featuredId}
                onChange={(e) =>
                  set('home_featured_video_id', e.target.value)
                }
              >
                <option value="">— None —</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
              {/* Explicit Remove — clearer than hunting for "None"
                  in the dropdown. Only shows when there's actually
                  something to remove (saved or pending). */}
              {featuredId && (
                <button
                  type="button"
                  className="text-btn danger"
                  onClick={() => set('home_featured_video_id', '')}
                >
                  Remove
                </button>
              )}
            </div>
          </label>
          <p className="home-video-picker-help">
            {videos.length === 0
              ? 'Add a video in Admin → Videos, then pick it here.'
              : 'Pick which video plays on the home page. Publish to save.'}
          </p>
        </div>
      )}
    </div>
  )
}
