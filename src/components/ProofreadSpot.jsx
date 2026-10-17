import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEdit } from '../lib/EditContext.jsx'
import { scan, locate, applyFix } from '../lib/proofread.js'
import './ProofreadSpot.css'

const HIGHLIGHT = 'proofread'
const clearHighlight = () => { if ('highlights' in CSS) CSS.highlights.delete(HIGHLIGHT) }

// Admin → Proofread → "Show me" lands here (Layout renders this for admins):
// the flagged words are highlighted on the page and a small box offers the
// suggestion, editing it by hand, or going back to the list.
export default function ProofreadSpot() {
  const location = useLocation()
  const navigate = useNavigate()
  const { set } = useEdit()
  const key = location.state?.proofread
  const issue = key ? scan.issues.find((i) => i.key === key) : null
  // { top, left } in page coordinates once found; { missing } if not.
  const [spot, setSpot] = useState(null)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSpot(null)
    setDone('')
    setError('')
    if (!issue) return undefined
    const source = scan.sources[issue.id]
    let frame
    let tries = 0
    let observer
    let settle
    const show = (found, scroll) => {
      if ('highlights' in CSS) CSS.highlights.set(HIGHLIGHT, new Highlight(found.range))
      const r = found.range.getBoundingClientRect()
      if (scroll) window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.35, behavior: 'smooth' })
      setSpot({
        top: window.scrollY + r.bottom + 10,
        left: Math.max(16, Math.min(window.scrollX + r.left, window.innerWidth - 376)),
        el: found.el,
      })
    }
    // The page's text arrives from the API after the route renders, so keep
    // looking for a few seconds.
    const find = () => {
      const found = locate(source.anchor, issue)
      if (!found?.range) {
        if (tries++ < 240) { frame = requestAnimationFrame(find); return }
        if (found?.el) found.el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setSpot({ missing: true })
        return
      }
      show(found, true)
      // Pages often re-render their text once more right after loading
      // (fresh content, formatting), which detaches the highlight from the
      // replaced text. Re-attach it on changes for the next few seconds.
      observer = new MutationObserver(() => {
        const again = locate(source.anchor, issue)
        if (again?.range) show(again, false)
      })
      observer.observe(found.el, { childList: true, subtree: true, characterData: true })
      settle = setTimeout(() => observer.disconnect(), 4000)
    }
    frame = requestAnimationFrame(find)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      clearTimeout(settle)
      clearHighlight()
    }
    // issue is looked up from key; re-run only when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!issue && !done) return null

  const source = issue && scan.sources[issue.id]
  const backToList = () => { clearHighlight(); navigate('/admin', { state: { tab: 'proofread' } }) }
  const close = () => { clearHighlight(); navigate(location.pathname, { replace: true, state: null }) }

  const fix = async (replacement) => {
    setError('')
    try {
      const kind = await applyFix(issue, replacement, { setPending: set })
      clearHighlight()
      setDone(kind === 'content'
        ? `Changed to “${replacement}”. Press Publish to save it.`
        : `Changed to “${replacement}” and saved. Reload the page to see it.`)
    } catch (err) {
      setError(err.message === 'changed'
        ? 'This text has changed since the scan. Go back to the list and scan again.'
        : `Couldn’t apply that: ${err.message}`)
    }
  }

  // Site copy: open the inline editor on that text. Posts and videos are
  // edited in Admin, so go there.
  const editMyself = () => {
    clearHighlight()
    const { ref } = source
    if (ref.type === 'post') navigate('/admin', { state: { tab: 'blog' } })
    else if (ref.type === 'video') navigate('/admin', { state: { editVideoId: ref.id } })
    else { spot?.el?.click(); navigate(location.pathname, { replace: true, state: null }) }
  }

  const style = spot && !spot.missing
    ? { position: 'absolute', top: spot.top, left: spot.left }
    : { position: 'fixed', bottom: 24, right: 24 }

  // Portalled to <body> so its page coordinates aren't offset by a
  // positioned ancestor.
  return createPortal(
    <div className="proofread-spot" style={style} role="dialog" aria-label="Possible typo">
      <button type="button" className="proofread-spot-x" onClick={close} aria-label="Close">×</button>
      {done ? (
        <p className="proofread-spot-msg">{done}</p>
      ) : (
        <>
          <p className="proofread-spot-msg">
            {spot?.missing
              ? `Couldn’t find “${issue.found}” on this page — it may be hidden or already changed.`
              : issue.message}
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="proofread-spot-actions">
            {!spot?.missing && issue.replacements.slice(0, 3).map((r) => (
              <button key={r} type="button" className="proofread-fix" onClick={() => fix(r)}>
                {r.trim() ? r : r === '' ? 'Remove it' : 'Single space'}
              </button>
            ))}
            <button type="button" className="text-btn" onClick={editMyself}>Edit it myself</button>
          </div>
        </>
      )}
      <button type="button" className="proofread-spot-back" onClick={backToList}>← Back to the list</button>
    </div>,
    document.body
  )
}
