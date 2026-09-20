// Social links Amber manages in Admin → Socials. Stored in site_content
// under `socials` as JSON: [{ id, platform, url }]. The footer shows one
// icon per entry.

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', home: 'https://instagram.com/' },
  { id: 'facebook', label: 'Facebook', home: 'https://facebook.com/' },
  { id: 'tiktok', label: 'TikTok', home: 'https://tiktok.com/@' },
  { id: 'youtube', label: 'YouTube', home: 'https://youtube.com/@' },
  { id: 'linkedin', label: 'LinkedIn', home: 'https://linkedin.com/in/' },
  { id: 'x', label: 'X (Twitter)', home: 'https://x.com/' },
  { id: 'threads', label: 'Threads', home: 'https://threads.net/@' },
  { id: 'pinterest', label: 'Pinterest', home: 'https://pinterest.com/' },
  { id: 'spotify', label: 'Spotify', home: 'https://open.spotify.com/' },
  { id: 'substack', label: 'Substack', home: 'https://substack.com/@' },
  { id: 'email', label: 'Email', home: 'mailto:' },
  { id: 'website', label: 'Website', home: 'https://' },
]

export const platformById = (id) => PLATFORMS.find((p) => p.id === id)

export function parseSocials(raw) {
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a)
      ? a.filter((s) => s && typeof s === 'object' && s.id && s.platform && typeof s.url === 'string')
      : []
  } catch {
    return []
  }
}

export const genSocialId = () =>
  'so_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)

// Only http(s) and mailto links may be rendered into the footer.
export const isSafeUrl = (url) => /^(https?:\/\/|mailto:)/i.test((url || '').trim())
