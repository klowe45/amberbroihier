import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Blog.css'

export default function Blog() {
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
        <p className="eyebrow">Writing</p>
        <h1>Essays, notes, and thinking-out-loud</h1>
      </div>

      {loading ? (
        <p className="blog-empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="blog-empty">No posts yet — check back soon.</p>
      ) : (
        <ul className="post-list">
          {posts.map((p) => (
            <li key={p.id} className="post-list-item">
              <Link to={`/blog/${p.slug}`} className="post-list-title">
                {p.title}
              </Link>
              {p.published_at && (
                <time className="post-list-date">
                  {new Date(p.published_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}
              {p.excerpt && <p className="post-list-excerpt">{p.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
