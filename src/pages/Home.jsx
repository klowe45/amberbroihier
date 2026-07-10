import { Link } from 'react-router-dom'
import { useSiteContent } from '../lib/useSiteContent.js'
import './Home.css'

const FALLBACK = {
  home_eyebrow: 'Speaker · Writer · Communicator',
  home_headline: 'Ideas worth speaking about.',
  home_lede:
    'Amber Broihier helps audiences connect the dots between story, strategy, and human experience. Book her for your next keynote, panel, or workshop.',
  home_cta_primary: 'Book Amber',
  home_cta_secondary: 'Read the writing',
}

export default function Home() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container home">
      <p className="eyebrow">{content.home_eyebrow}</p>
      <h1 className="home-headline">{content.home_headline}</h1>
      <p className="home-lede">{content.home_lede}</p>
      <div className="home-actions">
        <Link to="/speaking" className="btn">
          {content.home_cta_primary}
        </Link>
        <Link to="/blog" className="btn btn-ghost">
          {content.home_cta_secondary}
        </Link>
      </div>
    </div>
  )
}
