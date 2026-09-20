import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import Adjustable from '../components/Adjustable.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import './Blog.css'

const FALLBACK = {
  blog_eyebrow: 'Writing',
  blog_headline: 'Essays, notes, and thinking-out-loud',
}

export default function Blog() {
  const { content } = useSiteContent(FALLBACK)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/posts')
      .then((data) => setPosts(data ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container blog">
      <div className="blog-header">
        <Adjustable id="blog_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="blog_eyebrow" value={content.blog_eyebrow} />
        </p>
        </Adjustable>
        <Adjustable id="blog_headline" content={content}>
        <h1>
          <EditableText field="blog_headline" value={content.blog_headline} />
        </h1>
        </Adjustable>
      </div>

      <Adjustable id="blog_posts" content={content}>
      {loading ? (
        <p className="blog-empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="blog-empty">No posts yet — check back soon.</p>
      ) : (
        <ul className="post-list">
          {posts.map((p) => (
            <li key={p.id} className="post-list-item">
              <Link to={`/blog/${p.slug}`} className="post-list-link">
                <h2 className="post-list-title">{p.title}</h2>
                {p.published_at && (
                  <time className="post-list-date">
                    {new Date(p.published_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {p.excerpt && (
                  <p className="post-list-excerpt">{p.excerpt}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      </Adjustable>
      <CustomBlocks page="blog" content={content} />
    </div>
  )
}
