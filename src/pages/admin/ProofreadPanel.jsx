import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSiteContent } from '../../lib/useSiteContent.js'
import { useEdit } from '../../lib/EditContext.jsx'
import {
  scan, runScan, snippet, applyFix, ignoreSignature, readList, remember,
} from '../../lib/proofread.js'
import './ProofreadPanel.css'

const isSpelling = (i) => i.issueType === 'misspelling'
// A word the spell checker doesn't know (as opposed to e.g. a lowercase "i"):
// only these can go in the dictionary.
const isUnknownWord = (i) => i.ruleId.startsWith('MORFOLOGIK')

// Admin → Proofread: scan every page, post and video for possible typos and
// grammar issues. Each one can be fixed from here with a suggestion, opened on
// its page (highlighted) to look at or fix by hand, ignored, or — for a word
// the checker doesn't know, like a name — added to the dictionary.
export default function ProofreadPanel() {
  const { content } = useSiteContent({})
  const { pending, set, refresh } = useEdit()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState('all') // all | spelling | grammar
  // scan lives outside React (it survives page visits); bump to re-render.
  const [, setTick] = useState(0)
  const rerender = () => setTick((n) => n + 1)

  const ignored = readList(content, 'proofread_ignored')
  const dictionary = readList(content, 'proofread_dictionary').map((w) => w.toLowerCase())
  const open = scan.issues.filter(
    (i) =>
      !ignored.includes(ignoreSignature(i)) &&
      !(isUnknownWord(i) && dictionary.includes(i.found.toLowerCase()))
  )
  const shown = open.filter(
    (i) => filter === 'all' || (filter === 'spelling' ? isSpelling(i) : !isSpelling(i))
  )
  const spellingCount = open.filter(isSpelling).length

  const startScan = async () => {
    setBusy(true)
    setError('')
    setNote('')
    try {
      // Check what she sees: saved copy with her unpublished edits on top.
      const { sourceCount, skipped } = await runScan({ ...content, ...pending })
      setNote(
        `Checked ${sourceCount} pieces of text.` +
          (skipped.length ? ` ${skipped.length} very long text(s) were too big to check.` : '')
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      rerender()
    }
  }

  const fix = async (issue, replacement) => {
    setError('')
    try {
      const kind = await applyFix(issue, replacement, { setPending: set })
      setNote(
        kind === 'content'
          ? `Changed “${issue.found}” to “${replacement}”. Press Publish (top of the page) to save it.`
          : `Changed “${issue.found}” to “${replacement}” and saved.`
      )
    } catch (err) {
      setError(
        err.message === 'changed'
          ? 'That text has changed since the scan. Scan again to refresh the list.'
          : `Couldn’t apply that: ${err.message}`
      )
    }
    rerender()
  }

  const keep = async (key, list, entry, message) => {
    setError('')
    try {
      await remember(key, list, entry)
      refresh()
      setNote(message)
    } catch (err) {
      setError(`Couldn’t save that: ${err.message}`)
    }
  }

  const show = (issue) =>
    navigate(scan.sources[issue.id].path, { state: { proofread: issue.key } })

  // Group by page, keeping the order pages were found in.
  const groups = []
  for (const issue of shown) {
    const page = scan.sources[issue.id].page
    let g = groups.find((x) => x.page === page)
    if (!g) groups.push((g = { page, issues: [] }))
    g.issues.push(issue)
  }

  return (
    <div className="proofread">
      <div className="proofread-bar">
        <button type="button" className="btn" onClick={startScan} disabled={busy}>
          {busy ? 'Scanning…' : scan.at ? 'Scan again' : 'Scan site for typos'}
        </button>
        {scan.at && (
          <span className="proofread-summary">
            {open.length === 0
              ? 'No issues found.'
              : `${open.length} possible issue${open.length === 1 ? '' : 's'} · ${spellingCount} spelling · ${open.length - spellingCount} grammar & style`}
          </span>
        )}
        {scan.at && open.length > 0 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-btn">
            <option value="all">Show all</option>
            <option value="spelling">Spelling only</option>
            <option value="grammar">Grammar &amp; style only</option>
          </select>
        )}
      </div>
      {!scan.at && !busy && (
        <p className="proofread-help">
          Checks every page, text block, blog post (drafts too) and video for possible spelling
          and grammar mistakes. Nothing changes until you choose a fix.
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {note && <p className="proofread-note" role="status">{note}</p>}

      {groups.map((g) => (
        <section key={g.page} className="proofread-group">
          <h3>{g.page}</h3>
          <ul>
            {g.issues.map((issue) => {
              const s = snippet(issue)
              const word = issue.found.trim()
              return (
                <li key={issue.key} className="proofread-item">
                  <p className="proofread-where">{scan.sources[issue.id].label}</p>
                  <p className="proofread-context">
                    {s.before}
                    <mark>{s.found.replace(/ /g, ' ') || ' '}</mark>
                    {s.after}
                  </p>
                  <p className="proofread-message">{issue.message}</p>
                  <div className="proofread-actions">
                    {issue.replacements.map((r) => (
                      <button key={r} type="button" className="proofread-fix" onClick={() => fix(issue, r)}
                        title={`Replace “${issue.found}” with “${r}”`}>
                        {r.trim() ? r : r === '' ? 'Remove it' : 'Single space'}
                      </button>
                    ))}
                    <button type="button" className="text-btn" onClick={() => show(issue)}>Show me</button>
                    <button type="button" className="text-btn"
                      onClick={() => keep('proofread_ignored', ignored, ignoreSignature(issue), 'Ignored. It won’t show again.')}>
                      Ignore
                    </button>
                    {isUnknownWord(issue) && /^[\p{L}'’-]+$/u.test(word) && (
                      <button type="button" className="text-btn"
                        onClick={() => keep('proofread_dictionary', readList(content, 'proofread_dictionary'), word, `Added “${word}” to the dictionary.`)}>
                        Add “{word}” to dictionary
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {scan.at && shown.length === 0 && open.length > 0 && (
        <p className="proofread-help">Nothing in this filter.</p>
      )}
    </div>
  )
}
