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

  // Sanitize once per body change. Two fallbacks:
  //   1. Pre-Quill posts stored plain text — wrap paragraphs in <p>
  //      so spacing survives.
  //   2. Short-form posts where the writer used only the Summary
  //      field (or Quill emitted its empty '<p></p>' shell) —
  //      render the excerpt so the detail page isn't blank.
  const sanitizedBody = useMemo(() => {
    if (!post) return ''
    // Strip tags + whitespace to detect an effectively-empty body.
    const stripped = (post.body || '').replace(/<[^>]*>/g, '').trim()
    const rawSource = stripped ? post.body : post.excerpt || ''
    if (!rawSource) return ''
    // Normalize non-breaking spaces (both the HTML entity and the
    // literal 0xA0 char) to regular spaces. Quill often emits &nbsp;
    // when pasting from Word / Google Docs; browsers won't wrap lines
    // at those, so paragraphs overflow the container. Replacing with
    // real spaces restores natural word-wrap.
    const source = rawSource.replace(/&nbsp;/g, ' ').replace(/ /g, ' ')
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(source)
    const html = looksLikeHtml
      ? source
      : `<p>${source.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    })
  }, [post])

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
