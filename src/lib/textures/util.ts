/** Small seeded PRNG so every visit draws the same textures. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: false })!
  return { c, ctx }
}

/** Soft mottling: many faint blotches. Cheap stand-in for value noise on a 2D canvas. */
export function mottle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: () => number,
  count: number,
  color: string,
  alpha: [number, number],
  size: [number, number],
) {
  ctx.save()
  for (let i = 0; i < count; i++) {
    const x = r() * w
    const y = r() * h
    const s = size[0] + r() * (size[1] - size[0])
    const g = ctx.createRadialGradient(x, y, 0, x, y, s)
    const a = alpha[0] + r() * (alpha[1] - alpha[0])
    g.addColorStop(0, withAlpha(color, a))
    g.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - s, y - s, s * 2, s * 2)
  }
  ctx.restore()
}

let noiseTile: HTMLCanvasElement | null = null
/** One 256px tile of grey noise, drawn once and reused as a pattern by every texture. */
function getNoiseTile() {
  if (noiseTile) return noiseTile
  const { c, ctx } = canvas(256, 256)
  const img = ctx.createImageData(256, 256)
  const r = rng(99)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  noiseTile = c
  return c
}

/** Grain over whatever is drawn: the shared noise tile, overlaid. `amount` is roughly 0..30. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, _r?: () => number) {
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = Math.min(1, amount / 90)
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat')!
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

export function withAlpha(hex: string, a: number) {
  if (hex.startsWith('rgb')) return hex.replace(/rgba?\(([^)]+)\)/, (_m, inner) => {
    const [r, g, b] = inner.split(',').map((s: string) => s.trim())
    return `rgba(${r},${g},${b},${a})`
  })
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Wait for the fonts the canvases draw with, so text never renders in a fallback face. */
export async function fontsReady(families: string[]) {
  if (!('fonts' in document)) return
  await Promise.all(families.map((f) => document.fonts.load(f).catch(() => undefined)))
}
