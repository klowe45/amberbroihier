import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import Adjustable from '../components/Adjustable.jsx'
import WaiverForm from '../components/WaiverForm.jsx'
import { stripHtml } from '../lib/richTextView.js'
import './Waivers.css'

// Waivers. Same shape as Prices / Retreats: intro copy plus one big
// free-form text area (`waivers_body` in site_content) Amber edits in
// place — the waiver wording itself — then the usual custom blocks.

// Sample wording so the page isn't empty — Amber replaces it with her own.
const SAMPLE_WAIVER = [
  '<h3>Participation Waiver &amp; Release</h3>',
  '<p>By taking part in any session, workshop, or retreat offered by Amber Broihier ("the Facilitator"), I acknowledge and agree to the following:</p>',
  '<p><strong>1. Voluntary participation.</strong> I am choosing to participate of my own free will. I understand that activities may include movement, breathwork, reflective exercises, and group discussion, and that I may pause or opt out of any activity at any time.</p>',
  '<p><strong>2. Not medical or mental-health treatment.</strong> The Facilitator is not a licensed physician, therapist, or counsellor. Nothing offered is a substitute for professional medical or psychological care. I will consult a qualified professional for any health concern.</p>',
  '<p><strong>3. Assumption of risk.</strong> I understand that physical and emotional activities carry some risk. I confirm I am in adequate health to participate and will inform the Facilitator of any condition that may affect my participation.</p>',
  '<p><strong>4. Release of liability.</strong> To the fullest extent permitted by law, I release the Facilitator from any claim arising from my participation, except where caused by gross negligence or wilful misconduct.</p>',
  '<p><strong>5. Confidentiality &amp; conduct.</strong> I will treat what other participants share as confidential and will conduct myself respectfully toward everyone in the space.</p>',
  '<p><strong>6. Photos &amp; recordings.</strong> Occasionally sessions are photographed or recorded. My choice below tells the Facilitator whether I am comfortable being included.</p>',
  '<p>By signing below I confirm that I have read this waiver, understand it, and agree to its terms.</p>',
].join('')

const FALLBACK = {
  waivers_eyebrow: 'Waivers',
  waivers_headline: 'Participation waiver',
  waivers_lede: 'Please read and sign before joining a session, workshop, or retreat.',
  waivers_body: SAMPLE_WAIVER,
}

export default function Waivers() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container waivers">
      <div className="waivers-intro">
        <Adjustable id="waivers_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="waivers_eyebrow" value={content.waivers_eyebrow} />
        </p>
        </Adjustable>
        <Adjustable id="waivers_headline" content={content}>
        <h1>
          <EditableText field="waivers_headline" value={content.waivers_headline} />
        </h1>
        </Adjustable>
        <Adjustable id="waivers_lede" content={content}>
        <p className="waivers-lede">
          <EditableText field="waivers_lede" value={content.waivers_lede} multiline />
        </p>
        </Adjustable>
      </div>

      <Adjustable id="waivers_body" content={content}>
      <section className="waivers-body">
        <EditableText
          as="div"
          field="waivers_body"
          value={content.waivers_body}
          multiline
          placeholder="Click to type out your waiver — what participants are agreeing to, how to sign, and who to contact with questions…"
          className="waivers-text"
        />
      </section>
      </Adjustable>

      <Adjustable id="waivers_form" content={content}>
      <WaiverForm waiverText={stripHtml(content.waivers_body)} />
      </Adjustable>
    </div>
  )
}
