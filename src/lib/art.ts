import regions from '../content/regions.json'

/**
 * Komal's frames, cut into layers by scripts/slice-art.py. Every frame is 1620x1080 and every
 * place in `regions` is in those pixels, so a layer is positioned by putting the frame on screen
 * (see `fitFrame`) and then using her coordinates directly.
 */
export const FRAME = { w: 1620, h: 1080 }
export { regions }

// absolute URLs, so the site also works from a sub-path (and inside CSS variables, which resolve
// relative URLs against the stylesheet that uses them, not the page)
const a = (p: string) => new URL(`${import.meta.env.BASE_URL}art/${p}`, document.baseURI).href

export const art = {
  feed: {
    cards: Array.from({ length: 10 }, (_, i) => a(`feed/card-${String(i + 1).padStart(2, '0')}.webp`)),
    logo: a('feed/logo.webp'),
    tabs: a('feed/tabs.webp'),
    avatar: a('feed/avatar.webp'),
    bg: a('feed-bg.webp'),
  },
  glitch: { orange: a('glitch/band-orange.webp'), mint: a('glitch/band-mint.webp'), black: a('black.webp') },
  room: a('room.webp'),
  doorL: a('room-door-l.webp'),
  doorR: a('room-door-r.webp'),
  almirah: a('room-almirah.webp'),
  inside: a('inside.webp'),
  insideBook: a('inside-book.webp'),
  table: a('table.webp'),
  book: {
    cover: a('book/cover.webp'),
    back: a('book/back.webp'),
    s1l: a('book/s1-l.webp'),
    s1r: a('book/s1-r.webp'),
    s2l: a('book/s2-l.webp'),
    s2r: a('book/s2-r.webp'),
    blankL: a('book/blank-l.webp'),
    blankR: a('book/blank-r.webp'),
    tape1: a('book/tape-1.webp'),
    tape2: a('book/tape-2.webp'),
    heart: a('book/heart.webp'),
    smiley: a('book/smiley.webp'),
    sparkle: a('book/sparkle.webp'),
  },
}

const cache = new Map<string, Promise<HTMLImageElement>>()

/** Load and decode an image once; later calls share the same promise. */
export function loadImage(src: string) {
  let p = cache.get(src)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img))
      img.onerror = () => reject(new Error(`could not load ${src}`))
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

/** What the feed needs before the black page can lift. */
export const feedAssets = () => [...art.feed.cards, art.feed.logo, art.feed.tabs, art.feed.avatar, art.feed.bg, art.glitch.orange, art.glitch.mint]

/** Everything after the feed, fetched in the background while the visitor scrolls. */
export const laterAssets = () => [
  art.glitch.black,
  art.room,
  art.doorL,
  art.doorR,
  art.almirah,
  art.inside,
  art.insideBook,
  art.table,
  ...Object.values(art.book),
]

export type Fit = { s: number; x: number; y: number }

/**
 * Put a 1620x1080 frame on a viewport: as large as `cover` would make it, but never so large that
 * the `safe` box (the part of her drawing that must stay in view) is cropped. Whatever the frame
 * does not cover is filled by a blurred copy behind it.
 */
export function fitFrame(vw: number, vh: number, safe: number[]): Fit {
  const [x0, y0, x1, y1] = safe
  const cover = Math.max(vw / FRAME.w, vh / FRAME.h)
  const s = Math.min(cover, vw / (x1 - x0), vh / (y1 - y0))
  const place = (view: number, size: number, centre: number) => {
    if (size <= view) return (view - size) / 2
    return Math.min(0, Math.max(view - size, view / 2 - centre * s))
  }
  return { s, x: place(vw, FRAME.w * s, (x0 + x1) / 2), y: place(vh, FRAME.h * s, (y0 + y1) / 2) }
}

/** CSS transform for a frame-sized element placed by a fit, then zoomed by `z` about frame point `p`, which lands on screen point `at`. */
export function frameTransform(f: Fit, z = 1, p?: [number, number], at?: [number, number]) {
  if (!p || !at) return `translate3d(${f.x}px, ${f.y}px, 0) scale(${f.s})`
  const s = f.s * z
  return `translate3d(${at[0] - p[0] * s}px, ${at[1] - p[1] * s}px, 0) scale(${s})`
}

/** Polygon in frame pixels -> CSS clip-path in percent of the frame. */
export function clipPolygon(pts: number[][], box = [0, 0, FRAME.w, FRAME.h]) {
  const [bx, by, bw, bh] = [box[0], box[1], box[2] - box[0], box[3] - box[1]]
  return `polygon(${pts.map(([x, y]) => `${(((x - bx) / bw) * 100).toFixed(3)}% ${(((y - by) / bh) * 100).toFixed(3)}%`).join(',')})`
}

/** Bounding box [x0, y0, x1, y1] of a polygon, padded the way the slicer pads its cut-outs. */
export function polyBox(pts: number[][], pad = 4) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad]
}
