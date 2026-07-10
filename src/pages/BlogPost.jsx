import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Blog.css'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api
      .get(`/api/posts/${encodeURIComponent(slug)}`)
      .then((data) => {
        setPost(data)
        setStatus('ok')
      })
      .catch((err) => {
        setStatus(err.status === 404 ? 'not-found' : 'error')
      })
  }, [slug])

  if (status === 'loading') {
    return <div className="container post">Loading…</div>
  }
  if (status === 'not-found') {
    return (
      <div className="container post">
        <p>Post not found.</p>
        <Link to="/blog" className="post-back">← Back to writing</Link>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="container post">
        <p>Something went wrong loading this post.</p>
        <Link to="/blog" className="post-back">← Back to writing</Link>
      </div>
    )
  }

  return (
    <article className="container post prose">
      <p className="eyebrow">Writing</p>
      <h1>{post.title}</h1>
      {post.published_at && (
        <time className="post-date">
          {new Date(post.published_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      )}
      <div className="post-body">{post.body}</div>
      <Link to="/blog" className="post-back">← Back to writing</Link>
    </article>
  )
}
