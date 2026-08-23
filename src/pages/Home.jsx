import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import Adjustable from '../components/Adjustable.jsx'
import EditModeToggle from '../components/EditModeToggle.jsx'
import './Home.css'

const FALLBACK = {
  // The hero eyebrow is the site name — it shares the `brand` field with the
  // header, so editing it here live-updates the header (and vice-versa).
  brand: 'Amber Broihier',
  home_headline: 'Ideas worth speaking about.',
  home_lede:
    'Amber Broihier helps audiences connect the dots between story, strategy, and human experience. Book her for your next keynote, panel, or workshop.',
  home_cta_secondary: 'Read the writing',
}

export default function Home() {
  const { isAdmin } = useAuth()
  const { content } = useSiteContent(FALLBACK)
  const [buttonsEditMode, setButtonsEditMode] = useState(false)

  return (
    <div className="container home">
      <Adjustable id="home_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="brand" value={content.brand} />
        </p>
      </Adjustable>
      <Adjustable id="home_headline" content={content}>
        <h1 className="home-headline">
          <EditableText field="home_headline" value={content.home_headline} />
        </h1>
      </Adjustable>
      <Adjustable id="home_lede" content={content}>
        <p className="home-lede">
          <EditableText field="home_lede" value={content.home_lede} multiline />
        </p>
      </Adjustable>
      <Adjustable id="home_actions" content={content}>
      <div className="home-actions">
        <Link to="/blog" className="btn">
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
            label="Edit button label"
          />
        )}
      </div>
      </Adjustable>

      <CustomBlocks page="home" content={content} />
    </div>
  )
}
