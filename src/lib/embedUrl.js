// Turn whatever YouTube / Vimeo URL Amber has in hand into a URL that will
// actually render inside an <iframe> on the site.
//
// This matters more than it looks: YouTube serves `x-frame-options:
// SAMEORIGIN` on every page EXCEPT /embed/, so a watch link, a Shorts link
// or a live link dropped straight into an iframe src paints a black box and
// nothing else. Only the /embed/ form plays. Same idea on Vimeo — the public
// page won't frame, player.vimeo.com will.
//
// Returns null when the link is from a host we recognise but we can't find a
// video id in it, so the caller can say so instead of placing a dead frame.

// YouTube ids have been 11 URL-safe characters for the life of the platform.
const YT_ID = /^[A-Za-z0-9_-]{11}$/

const YT_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]

// "90", "1m30s", "1h2m3s" → seconds. YouTube accepts both shapes on `t`.
function toSeconds(raw) {
  if (!raw) return 0
  if (/^\d+$/.test(raw)) return Number(raw)
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)
  if (!m) return 0
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
}

function youTubeEmbed(u) {
  const segs = u.pathname.split('/').filter(Boolean)
  let id = null

  if (u.hostname.endsWith('youtu.be')) {
    // https://youtu.be/ID?t=30
    id = segs[0]
  } else if (segs[0] === 'watch') {
    // https://www.youtube.com/watch?v=ID   (also /watch/ID on some shares)
    id = u.searchParams.get('v') || segs[1]
  } else if (['embed', 'shorts', 'live', 'v', 'e'].includes(segs[0])) {
    // /embed/ID (already right), /shorts/ID, /live/ID, /v/ID
    id = segs[1]
  }

  const list = u.searchParams.get('list')

  if (!id || !YT_ID.test(id)) {
    // A playlist link with no single video still embeds fine.
    if (list) return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`
    return null
  }

  // youtube-nocookie is the privacy-preserving player. Honour it if that's
  // what she pasted; otherwise use the normal host.
  const host = u.hostname.includes('nocookie')
    ? 'https://www.youtube-nocookie.com'
    : 'https://www.youtube.com'

  const params = new URLSearchParams()
  const start = toSeconds(u.searchParams.get('t') || u.searchParams.get('start') || u.hash.replace(/^#t=/, ''))
  if (start > 0) params.set('start', String(start))
  if (list) params.set('list', list)

  const qs = params.toString()
  return `${host}/embed/${id}${qs ? `?${qs}` : ''}`
}

function vimeoEmbed(u) {
  const segs = u.pathname.split('/').filter(Boolean)
  // Works for every shape Vimeo hands out: /ID, /ID/HASH (unlisted),
  // /channels/name/ID, /groups/name/videos/ID, /showcase/N/video/ID,
  // and player.vimeo.com/video/ID.
  const idIndex = segs.map((s) => /^\d+$/.test(s)).lastIndexOf(true)
  if (idIndex === -1) return null
  const id = segs[idIndex]

  // An unlisted video carries a privacy hash — either as the segment right
  // after the id, or as ?h= on the player URL. Without it the embed 404s.
  const next = segs[idIndex + 1]
  const hash = u.searchParams.get('h') || (next && /^[A-Za-z0-9]+$/.test(next) && !/^\d+$/.test(next) ? next : null)

  return `https://player.vimeo.com/video/${id}${hash ? `?h=${encodeURIComponent(hash)}` : ''}`
}

export function toEmbedUrl(url) {
  if (!url) return null
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol)) return null

  const host = u.hostname.toLowerCase()

  if (YT_HOSTS.includes(host) || host.endsWith('.youtube.com')) return youTubeEmbed(u)
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return vimeoEmbed(u)

  // Some other host — she may already have an embed URL from elsewhere.
  // Pass it through and let the caller decide whether to trust it.
  return url
}

// True when `url` is a host we know how to turn into a player.
export const isKnownVideoHost = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return (
      YT_HOSTS.includes(host) ||
      host.endsWith('.youtube.com') ||
      host === 'vimeo.com' ||
      host.endsWith('.vimeo.com')
    )
  } catch {
    return false
  }
}

// A direct link to a video file — played with <video> rather than an
// embedded third-party player. Query string and #fragment are ignored so a
// signed/expiring URL still matches.
export const isVideoFileUrl = (u) => /\.(mp4|webm|mov|m4v|ogv|ogg)(?:[?#].*)?$/i.test(u || '')
