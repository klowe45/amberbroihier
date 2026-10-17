import { stripHtml } from '../lib/richTextView.js'
import './UnderConstruction.css'

// What visitors see in place of the site's pages while Amber has
// Admin → "Under construction" switched on. Layout keeps the footer under
// it, so socials and Sign in (her way back in to turn it off) still work.
// She (any admin) still sees the real site.
export default function UnderConstruction({ brand }) {
  return (
    <div className="construction">
      <p className="construction-brand">{stripHtml(brand)}</p>
      <p className="eyebrow">Under construction</p>
      <h1>Something new is on the way.</h1>
      <p className="construction-lede">
        The site is being built right now. Please check back soon.
      </p>
    </div>
  )
}
