import { useSiteContent } from '../lib/useSiteContent.js'
import InquiryForm from '../components/InquiryForm.jsx'
import EditableText from '../components/EditableText.jsx'
import Adjustable from '../components/Adjustable.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import './Book.css'

const FALLBACK = {
  inquiry_eyebrow: 'Inquiry',
  inquiry_headline: 'Tell us about your organization.',
  inquiry_lede:
    'Share a few details and Amber will follow up about how she can help. She’ll reply within a few business days.',
}

export default function Inquiry() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container book">
      <div className="book-intro">
        <Adjustable id="inquiry_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="inquiry_eyebrow" value={content.inquiry_eyebrow} />
        </p>
        </Adjustable>
        <Adjustable id="inquiry_headline" content={content}>
        <h1>
          <EditableText field="inquiry_headline" value={content.inquiry_headline} />
        </h1>
        </Adjustable>
        <Adjustable id="inquiry_lede" content={content}>
        <p className="book-lede">
          <EditableText
            field="inquiry_lede"
            value={content.inquiry_lede}
            multiline
          />
        </p>
        </Adjustable>
      </div>
      <Adjustable id="inquiry_form" content={content}>
      <InquiryForm />
      </Adjustable>
      <CustomBlocks page="inquiry" content={content} />
    </div>
  )
}
