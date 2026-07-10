import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '5rem 1.5rem', maxWidth: 640 }}>
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>That page doesn’t exist (or moved).</p>
      <Link to="/" className="btn">Back home</Link>
    </div>
  )
}
