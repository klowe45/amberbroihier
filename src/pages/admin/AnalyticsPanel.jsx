import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { useConfirm } from '../../lib/ConfirmContext.jsx'
import './AnalyticsPanel.css'

// Admin → Analytics. What visitors do on the site: how many, what they
// look at, what they click, how long they stay, how far they read.
// Everything comes from GET /api/analytics/summary for a chosen window.

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

const fmtTime = (ms) => {
  const s = Math.round((ms || 0) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}
const fmtDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const fmtWhen = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const pageName = (path, title) => {
  if (path === '/') return 'Home'
  if (title) return title.replace(/\s*[|·—-]\s*Amber Broihier.*$/i, '').trim() || path
  return path
}

export default function AnalyticsPanel() {
  const confirm = useConfirm()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = (d) =>
    api
      .get(`/api/analytics/summary?days=${d}`)
      .then((res) => { setData(res); setError('') })
      .catch((err) => setError(err.message))

  useEffect(() => { load(days) }, [days])

  const reset = async () => {
    const ok = await confirm({
      title: 'Clear all analytics?',
      message: 'Every recorded visit, click and read is deleted. This cannot be undone.',
      confirmLabel: 'Clear analytics',
      danger: true,
    })
    if (!ok) return
    await api.del('/api/analytics')
    load(days)
  }

  if (error) return <p className="an-empty">Couldn’t load analytics: {error}</p>
  if (!data) return <p className="an-empty">Loading…</p>

  const t = data.totals
  const empty = !t.pageviews

  return (
    <div className="an">
      <div className="an-toolbar">
        <div className="an-ranges" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              role="tab"
              aria-selected={days === r.days}
              className={`an-range${days === r.days ? ' is-active' : ''}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="text-btn danger" onClick={reset}>Clear data</button>
      </div>

      <div className="an-tiles">
        <Tile label="Visitors" value={t.visitors} hint="different people" />
        <Tile label="Visits" value={t.sessions} hint="sessions" />
        <Tile label="Page views" value={t.pageviews} />
        <Tile label="Avg. time on page" value={fmtTime(t.avg_time_ms)} />
        <Tile label="Avg. read depth" value={`${t.avg_depth || 0}%`} hint="of the page scrolled" />
        <Tile label="Clicks" value={t.clicks} />
      </div>

      {empty ? (
        <p className="an-empty">
          Nothing recorded in the last {days} days yet. Visits from the public site
          show up here within a few seconds — your own signed-in visits are not counted.
        </p>
      ) : (
        <>
          <Section title="Views per day">
            <DailyChart rows={data.daily} />
          </Section>

          <div className="an-grid">
            <Section title="Most viewed pages">
              <Table
                cols={['Page', 'Views', 'People', 'Avg. time', 'Read']}
                rows={data.pages.map((p) => [
                  <PathCell key="p" path={p.path} title={p.title} />,
                  p.views, p.visitors, fmtTime(p.avg_time_ms), `${p.avg_depth}%`,
                ])}
              />
            </Section>

            <Section title="What they click">
              <Table
                cols={['Clicked', 'On page', 'Times']}
                rows={data.clicks.map((c) => [
                  <span key="t" className="an-click">
                    {c.target}
                    {c.href && <span className="an-muted"> → {c.href}</span>}
                  </span>,
                  pageName(c.path),
                  c.clicks,
                ])}
                emptyText="No clicks recorded yet."
              />
            </Section>

            <Section title="What they read (writing)">
              <Table
                cols={['Post', 'Views', 'Readers', 'Avg. time', 'Read', 'Finished']}
                rows={data.reads.map((r) => [
                  <PathCell key="p" path={r.path} title={r.title} />,
                  r.views, r.readers, fmtTime(r.avg_time_ms), `${r.avg_depth}%`, r.finished,
                ])}
                emptyText="No posts read yet."
              />
            </Section>

            <Section title="Where they came from">
              <Table
                cols={['Source', 'Visits']}
                rows={data.referrers.map((r) => [r.source, r.sessions])}
              />
              <div className="an-inline-stats">
                {data.devices.map((d) => (
                  <span key={d.device}><strong>{d.sessions}</strong> {d.device.toLowerCase()}</span>
                ))}
                {data.submits.map((s) => (
                  <span key={s.target}><strong>{s.count}</strong> {s.target} form{s.count === 1 ? '' : 's'} sent</span>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Recent activity">
            <ActivityFeed events={data.recent} />
          </Section>
        </>
      )}
    </div>
  )
}

// The activity log with filters: what kind of event, which page, and a
// search box (matches page, clicked text, link, or a visitor id — click a
// visitor id in the list to follow just that person).
const EVENT_KINDS = [
  { id: 'all', label: 'Everything' },
  { id: 'pageview', label: 'Views' },
  { id: 'click', label: 'Clicks' },
  { id: 'leave', label: 'Time on page' },
  { id: 'submit', label: 'Forms' },
]
const verb = (t) => (t === 'leave' ? 'left' : t === 'pageview' ? 'viewed' : t === 'submit' ? 'sent' : 'clicked')

function ActivityFeed({ events }) {
  const [kind, setKind] = useState('all')
  const [page, setPage] = useState('all')
  const [q, setQ] = useState('')

  const pages = useMemo(() => {
    const seen = new Map()
    for (const e of events) if (!seen.has(e.path)) seen.set(e.path, pageName(e.path, e.title))
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [events])

  const needle = q.trim().toLowerCase()
  const rows = events.filter((e) => {
    if (kind !== 'all' && e.type !== kind) return false
    if (page !== 'all' && e.path !== page) return false
    if (!needle) return true
    const hay = [pageName(e.path, e.title), e.path, e.target, e.href, `#${e.visitor}`, e.visitor, verb(e.type)]
      .filter(Boolean).join(' ').toLowerCase()
    return hay.includes(needle)
  })

  const filtered = kind !== 'all' || page !== 'all' || !!needle

  return (
    <div>
      <div className="an-filters">
        <div className="an-ranges" role="tablist" aria-label="Activity type">
          {EVENT_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={kind === k.id}
              className={`an-range${kind === k.id ? ' is-active' : ''}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <select className="an-select" value={page} onChange={(e) => setPage(e.target.value)} aria-label="Page">
          <option value="all">All pages</option>
          {pages.map(([path, name]) => (
            <option key={path} value={path}>{name}</option>
          ))}
        </select>
        <input
          type="search"
          className="an-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search page, link, or visitor #…"
          aria-label="Search activity"
        />
        {filtered && (
          <button type="button" className="text-btn" onClick={() => { setKind('all'); setPage('all'); setQ('') }}>
            Clear
          </button>
        )}
        <span className="an-filters-count">
          {rows.length} of {events.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="an-empty">Nothing matches those filters.</p>
      ) : (
        <ul className="an-feed">
          {rows.map((e) => (
            <li key={e.id}>
              <span className="an-feed-when">{fmtWhen(e.created_at)}</span>
              <span className={`an-feed-type an-feed-${e.type}`}>{verb(e.type)}</span>
              <span className="an-feed-what">
                {e.type === 'click' && <>“{e.target}”{e.href && <span className="an-muted"> → {e.href}</span>} on {pageName(e.path, e.title)}</>}
                {e.type === 'pageview' && pageName(e.path, e.title)}
                {e.type === 'submit' && <>the {e.target} form</>}
                {e.type === 'leave' && <>{pageName(e.path, e.title)} after {fmtTime(e.duration_ms)}{e.depth != null && <span className="an-muted"> · read {e.depth}%</span>}</>}
              </span>
              <button
                type="button"
                className="an-feed-who"
                title="Show only this visitor"
                onClick={() => setQ(`#${e.visitor}`)}
              >
                #{e.visitor}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Tile({ label, value, hint }) {
  return (
    <div className="an-tile">
      <span className="an-tile-value">{value ?? 0}</span>
      <span className="an-tile-label">{label}</span>
      {hint && <span className="an-tile-hint">{hint}</span>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="an-section">
      <h3 className="an-section-title">{title}</h3>
      {children}
    </section>
  )
}

function PathCell({ path, title }) {
  return (
    <span className="an-path">
      {pageName(path, title)}
      <span className="an-muted"> {path}</span>
    </span>
  )
}

function Table({ cols, rows, emptyText = 'Nothing yet.' }) {
  if (!rows.length) return <p className="an-empty">{emptyText}</p>
  return (
    <table className="an-table">
      <thead>
        <tr>{cols.map((c, i) => <th key={c} className={i ? 'num' : ''}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((cell, j) => <td key={j} className={j ? 'num' : ''}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

// Single-series bar chart of page views per day. One hue (the site
// accent), thin rounded bars with a small gap, recessive gridlines, and a
// hover tooltip per bar; the numbers are also in the table below it.
function DailyChart({ rows }) {
  const [hover, setHover] = useState(null)
  const W = 720, H = 180, PAD = { l: 34, r: 8, t: 12, b: 26 }
  const max = Math.max(1, ...rows.map((r) => r.views))
  const ticks = useMemo(() => {
    const step = max <= 5 ? 1 : Math.ceil(max / 4)
    const out = []
    for (let v = 0; v <= max; v += step) out.push(v)
    if (out[out.length - 1] < max) out.push(max)
    return out
  }, [max])
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const slot = innerW / rows.length
  const barW = Math.max(2, Math.min(28, slot - 2))
  const y = (v) => PAD.t + innerH - (v / max) * innerH
  const labelEvery = rows.length > 45 ? 15 : rows.length > 14 ? 7 : 1

  return (
    <div className="an-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="an-chart" role="img" aria-label="Page views per day">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="an-gridline" />
            <text x={PAD.l - 6} y={y(v) + 3} className="an-tick" textAnchor="end">{v}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = PAD.l + i * slot + (slot - barW) / 2
          const h = r.views ? Math.max(2, (r.views / max) * innerH) : 0
          return (
            <g key={r.day}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* hit target wider than the bar */}
              <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <rect x={x} y={y(r.views)} width={barW} height={h} rx={Math.min(4, barW / 2)}
                  className={`an-bar${hover === i ? ' is-hover' : ''}`} />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 8} className="an-tick" textAnchor="middle">{fmtDay(r.day)}</text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && rows[hover] && (
        <div className="an-tooltip" style={{ left: `${((PAD.l + hover * slot + slot / 2) / W) * 100}%` }}>
          <strong>{fmtDay(rows[hover].day)}</strong>
          <span>{rows[hover].views} view{rows[hover].views === 1 ? '' : 's'}</span>
          <span>{rows[hover].visitors} visitor{rows[hover].visitors === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  )
}
