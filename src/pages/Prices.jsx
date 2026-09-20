import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import './Prices.css'

// Amber's products / services with pricing. The whole thing is one big
// free-form text area (`prices_body` in site_content) that she edits in
// place and Publishes like any other copy — she lays it out however she
// likes, line breaks included.

const FALLBACK = {
  prices_eyebrow: 'Prices',
  prices_headline: 'Products & services',
  prices_lede: 'What I offer, and what it costs.',
  prices_body: '',
}

export default function Prices() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container prices">
      <div className="prices-intro">
        <p className="eyebrow">
          <EditableText field="prices_eyebrow" value={content.prices_eyebrow} />
        </p>
        <h1>
          <EditableText field="prices_headline" value={content.prices_headline} />
        </h1>
        <p className="prices-lede">
          <EditableText field="prices_lede" value={content.prices_lede} multiline />
        </p>
      </div>

      <section className="prices-body">
        <EditableText
          as="div"
          field="prices_body"
          value={content.prices_body}
          multiline
          placeholder="Click to type out your products, prices, and descriptions…"
          className="prices-text"
        />
      </section>
    </div>
  )
}
