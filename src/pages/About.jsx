import { useSiteContent } from '../lib/useSiteContent.js'
import EditableText from '../components/EditableText.jsx'
import Adjustable from '../components/Adjustable.jsx'
import CustomBlocks from '../components/CustomBlocks.jsx'
import './About.css'

const FALLBACK = {
  about_eyebrow: 'About',
  about_headline: 'About Amber',
  about_p1:
    'Amber Broihier is a speaker and writer focused on the intersection of leadership, communication, and personal story.',
  about_p2:
    'Her work draws from years of experience helping teams and individuals find the words for what they actually mean — on stage, in writing, and in the rooms where decisions get made.',
  about_p3:
    'When she is not speaking or writing, Amber is likely reading, walking somewhere green, or in the middle of a very good conversation.',
}

export default function About() {
  const { content } = useSiteContent(FALLBACK)

  return (
    <div className="container about">
      <div className="prose">
        <Adjustable id="about_eyebrow" content={content}>
        <p className="eyebrow">
          <EditableText field="about_eyebrow" value={content.about_eyebrow} />
        </p>
        </Adjustable>
        <Adjustable id="about_headline" content={content}>
        <h1>
          <EditableText field="about_headline" value={content.about_headline} />
        </h1>
        </Adjustable>
        <Adjustable id="about_p1" content={content}>
        <p>
          <EditableText field="about_p1" value={content.about_p1} multiline />
        </p>
        </Adjustable>
        <Adjustable id="about_p2" content={content}>
        <p>
          <EditableText field="about_p2" value={content.about_p2} multiline />
        </p>
        </Adjustable>
        <Adjustable id="about_p3" content={content}>
        <p>
          <EditableText field="about_p3" value={content.about_p3} multiline />
        </p>
        </Adjustable>
        <CustomBlocks page="about" content={content} />
      </div>
    </div>
  )
}
