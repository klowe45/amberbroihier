import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './Blog.css'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
      .then(({ data }) => {
        setPost(data)
        setStatus(data ? 'ok' : 'not-found')
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
