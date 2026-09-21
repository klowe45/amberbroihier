import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import Adjustable from '../components/Adjustable.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import './Retreats.css'

// Retreats. Same shape as Prices: intro copy plus one big free-form text
// area (`retreats_body` in site_content) Amber edits in place, then the
// usual custom blocks.

const FALLBACK = {
  retreats_eyebrow: 'Retreats',
  retreats_headline: 'Retreats',
  retreats_lede: 'Time away to reconnect with yourself.',
  retreats_body: '',
}

export default function Retreats() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container retreats">
      <div className="retreats-intro">
        <Adjustable id="retreats_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="retreats_eyebrow" value={content.retreats_eyebrow} />
        </p>
        </Adjustable>
        <Adjustable id="retreats_headline" content={content}>
        <h1>
          <EditableText field="retreats_headline" value={content.retreats_headline} />
        </h1>
        </Adjustable>
        <Adjustable id="retreats_lede" content={content}>
        <p className="retreats-lede">
          <EditableText field="retreats_lede" value={content.retreats_lede} multiline />
        </p>
        </Adjustable>
      </div>

      <Adjustable id="retreats_body" content={content}>
      <section className="retreats-body">
        <EditableText
          as="div"
          field="retreats_body"
          value={content.retreats_body}
          multiline
          placeholder="Click to describe your retreats — dates, locations, what’s included…"
          className="retreats-text"
        />
      </section>
      </Adjustable>
      <CustomBlocks page="retreats" content={content} />
    </div>
  )
}
