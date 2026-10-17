// How a free-positioned image shows on phones — shared by ImageLayer (which
// decides what goes in the flow) and PhoneImages (which places it there).

export const PHONE_MODES = [
  ['auto', 'Automatic'],
  ['wrap', 'Wrap text'],
  ['full', 'Full width'],
  ['hide', 'Hide'],
]

// A photo (JPEG) vs a decoration — Amber's flowers are transparent PNG/WebP
// cut-outs. Only decorations are shown small.
const isPhoto = (img) => /\.jpe?g($|\?)|^data:image\/jpe?g/i.test(img.src ?? '')

// { mode: 'wrap' | 'full' | 'hide', side, width (% of the column) }.
// Automatic: anything that took up half the column or more on desktop (a
// feature photo) and videos go full width; anything narrower sat beside the
// copy, so it wraps on the same side, small for decorations.
export function phoneLayout(img, colMax) {
  const fw = img.rel?.fw ?? (img.w ?? 320) / colMax
  const fx = img.rel?.fx ?? (img.anchor === 'column' ? (img.x ?? 0) / colMax : 0.5)
  const chosen = img.phone && img.phone !== 'auto' ? img.phone : null
  if (chosen === 'hide') return { mode: 'hide' }
  if (img.type === 'video' || chosen === 'full' || (!chosen && fw >= 0.5)) return { mode: 'full' }
  const small = fw < 0.25 && !isPhoto(img)
  return { mode: 'wrap', side: fx + fw / 2 < 0.5 ? 'left' : 'right', width: small ? 28 : 44 }
}

export const hasPhoneSpot = (img) => img.mrel != null || img.mx != null
