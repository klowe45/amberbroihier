import { useSiteContent } from '../lib/useSiteContent.js'
import './About.css'

const FALLBACK = {
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
        <p className="eyebrow">About</p>
        <h1>{content.about_headline}</h1>
        <p>{content.about_p1}</p>
        <p>{content.about_p2}</p>
        <p>{content.about_p3}</p>
      </div>
    </div>
  )
}
