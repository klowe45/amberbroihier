import { Link } from 'react-router-dom'
import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
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
        <Link to="/speaking" className="btn">
          <EditableText
            field="home_cta_primary"
            value={content.home_cta_primary}
          />
        </Link>
        <Link to="/blog" className="btn btn-ghost">
          <EditableText
            field="home_cta_secondary"
            value={content.home_cta_secondary}
          />
        </Link>
      </div>
    </div>
  )
}
