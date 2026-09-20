// Turn a raw YouTube / Vimeo URL into the corresponding embed URL.
// Falls back to the input if the shape doesn't match a known host —
// lets Amber paste an iframe src directly if she already has one.
export function toEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return `https://player.vimeo.com/video/${id}`
    }
    return url
  } catch {
    return null
  }
}

// A direct link to a video file — played with <video> rather than an
// embedded third-party player.
export const isVideoFileUrl = (u) => /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(u || '')
