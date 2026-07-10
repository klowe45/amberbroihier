import { useSiteContent } from '../lib/useSiteContent.js'
import BookingForm from '../components/BookingForm.jsx'
import EditableText from '../components/EditableText.jsx'
import './Book.css'

const FALLBACK = {
  book_eyebrow: 'Book Amber',
  book_headline: 'Let’s talk about your event.',
  book_lede:
    'Tell Amber a bit about what you’re planning. She’ll reply within a few business days.',
  book_email_line: 'Prefer email? Write to',
  book_email: 'hello@amberbroihier.com',
}

export default function Book() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container book">
      <div className="book-intro">
        <p className="eyebrow">
          <EditableText field="book_eyebrow" value={content.book_eyebrow} />
        </p>
        <h1>
          <EditableText field="book_headline" value={content.book_headline} />
        </h1>
        <p className="book-lede">
          <EditableText
            field="book_lede"
            value={content.book_lede}
            multiline
          />
        </p>
        <p className="book-email-line">
          <EditableText
            field="book_email_line"
            value={content.book_email_line}
          />{' '}
          <a href={`mailto:${content.book_email}`}>
            <EditableText field="book_email" value={content.book_email} />
          </a>
        </p>
      </div>
      <BookingForm />
    </div>
  )
}
