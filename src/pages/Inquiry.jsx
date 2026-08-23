import { useSiteContent } from '../lib/useSiteContent.js'
import InquiryForm from '../components/InquiryForm.jsx'
import EditableText from '../components/EditableText.jsx'
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
        <p className="eyebrow">
          <EditableText field="inquiry_eyebrow" value={content.inquiry_eyebrow} />
        </p>
        <h1>
          <EditableText field="inquiry_headline" value={content.inquiry_headline} />
        </h1>
        <p className="book-lede">
          <EditableText
            field="inquiry_lede"
            value={content.inquiry_lede}
            multiline
          />
        </p>
      </div>
      <InquiryForm />
      <CustomBlocks page="inquiry" content={content} />
    </div>
  )
}
