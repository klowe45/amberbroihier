import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { api } from '../lib/api.js'
import { quillFormats } from '../lib/quill.js'
import './Blog.css'

// Whitelist matches the formats the editor emits (plus their raw tag
// equivalents). Anything else — <script>, <iframe>, event handlers,
// javascript: URLs — is stripped by DOMPurify. Only Amber can currently
// author posts, but the sanitiser is defense-in-depth for the day
// there's a second admin.
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'a',
  'ol',
  'ul',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'span',
]
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

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

  // Sanitize once per body change. Also handle a fallback for posts
  // written before the rich editor existed — those don't contain any
  // HTML tags, so we wrap them in <p> to keep spacing consistent.
  const sanitizedBody = useMemo(() => {
    if (!post?.body) return ''
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(post.body)
    const html = looksLikeHtml
      ? post.body
      : `<p>${post.body.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    })
  }, [post?.body])

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
      <div
        className="post-body"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
      <Link to="/blog" className="post-back">← Back to writing</Link>
    </article>
  )
}
