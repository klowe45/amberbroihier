import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import Adjustable from '../components/Adjustable.jsx'
import './Home.css'

const FALLBACK = {
  // Header brand. The hero eyebrow started out sharing this field; it now
  // has its own (`home_eyebrow`) and only falls back to the brand until
  // Amber gives it its own text.
  brand: 'Amber Broihier',
  home_headline: 'Ideas worth speaking about.',
  home_lede:
    'Amber Broihier helps audiences connect the dots between story, strategy, and human experience. Book her for your next keynote, panel, or workshop.',
}

export default function Home() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container home">
      <Adjustable id="home_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="home_eyebrow" value={content.home_eyebrow ?? content.brand} />
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

      <CustomBlocks page="home" content={content} />
    </div>
  )
}
