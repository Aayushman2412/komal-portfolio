import type { SwatchKind } from '../../content/site'
import { canvas, grain, mottle, rng, withAlpha } from './util'

/**
 * Hand-drawn-looking Indian textiles for the fabric swatches on the project pages, standing in
 * until Komal photographs the real fabrics (a swatch's `src` replaces its drawing).
 */
type Kind = SwatchKind

function gingham(ctx: CanvasRenderingContext2D, s: number, a: string, b: string) {
  ctx.fillStyle = b
  ctx.fillRect(0, 0, s, s)
  const n = 8
  const step = s / n
  ctx.fillStyle = withAlpha(a, 0.5)
  for (let i = 0; i < n; i += 2) {
    ctx.fillRect(i * step, 0, step, s)
    ctx.fillRect(0, i * step, s, step)
  }
  ctx.fillStyle = withAlpha(a, 0.45)
  for (let i = 0; i < n; i += 2) for (let j = 0; j < n; j += 2) ctx.fillRect(i * step, j * step, step, step)
}

function weave(ctx: CanvasRenderingContext2D, s: number, r: () => number, dark: string, light: string, diag: boolean) {
  ctx.lineWidth = 1.2
  for (let i = -s; i < s * 2; i += 3) {
    ctx.strokeStyle = r() > 0.5 ? withAlpha(dark, 0.35) : withAlpha(light, 0.25)
    ctx.beginPath()
    if (diag) {
      ctx.moveTo(i, 0)
      ctx.lineTo(i + s, s)
    } else {
      ctx.moveTo(i, 0)
      ctx.lineTo(i, s)
    }
    ctx.stroke()
  }
}

function blockPrint(ctx: CanvasRenderingContext2D, s: number, r: () => number) {
  ctx.fillStyle = '#efe3cc'
  ctx.fillRect(0, 0, s, s)
  const step = s / 4
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const cx = x * step + (y % 2 ? step / 2 : 0)
      const cy = y * step
      // a stamped buti: petals around a dot, slightly misregistered like a real hand block
      const off = (r() - 0.5) * 3
      ctx.fillStyle = withAlpha('#b2402c', 0.85)
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.ellipse(cx + Math.cos(ang) * 11, cy + Math.sin(ang) * 11, 8, 4.5, ang, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = withAlpha('#1f3b2f', 0.9)
      ctx.beginPath()
      ctx.arc(cx + off, cy + off, 5, 0, Math.PI * 2)
      ctx.fill()
    }
}

function bandhani(ctx: CanvasRenderingContext2D, s: number, r: () => number) {
  ctx.fillStyle = '#b5223b'
  ctx.fillRect(0, 0, s, s)
  mottle(ctx, s, s, r, 30, '#6d0f22', [0.15, 0.3], [20, 60])
  const step = s / 10
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 11; x++) {
      const px = x * step + (y % 2 ? step / 2 : 0) + (r() - 0.5) * 2
      const py = y * step + (r() - 0.5) * 2
      ctx.fillStyle = withAlpha('#fff3d6', 0.9)
      ctx.beginPath()
      ctx.arc(px, py, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = withAlpha('#f2b134', 0.9)
      ctx.beginPath()
      ctx.arc(px, py, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
}

function ikat(ctx: CanvasRenderingContext2D, s: number, r: () => number) {
  ctx.fillStyle = '#1d2a4a'
  ctx.fillRect(0, 0, s, s)
  const bands = 4
  for (let b = 0; b < bands; b++) {
    const y0 = (b / bands) * s
    for (let x = 0; x < s; x += 2) {
      const tri = Math.abs(((x / s) * 4) % 2 - 1)
      const hgt = (s / bands) * 0.45 * tri
      const jitter = (r() - 0.5) * 6
      ctx.fillStyle = b % 2 ? withAlpha('#e4c27a', 0.85) : withAlpha('#d05a3c', 0.85)
      ctx.fillRect(x, y0 + s / bands / 2 - hgt / 2 + jitter, 2, hgt)
    }
  }
}

function chikan(ctx: CanvasRenderingContext2D, s: number, r: () => number) {
  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = withAlpha('#d9d2c3', 1)
  ctx.lineWidth = 1.6
  for (let k = 0; k < 9; k++) {
    const x = r() * s
    const y = r() * s
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 3, a, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(x, y + 12)
    ctx.bezierCurveTo(x + 10, y + 30, x - 10, y + 40, x + 6, y + 60)
    ctx.stroke()
  }
}

export function drawFabric(kind: Kind, size = 256, seed = 7): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size)
  const r = rng(seed + kind.length * 31)
  switch (kind) {
    case 'gingham':
      gingham(ctx, size, '#c8343a', '#f6efe4')
      weave(ctx, size, r, '#000', '#fff', false)
      break
    case 'denim':
      ctx.fillStyle = '#2f4a74'
      ctx.fillRect(0, 0, size, size)
      weave(ctx, size, r, '#16243d', '#9fb3d4', true)
      mottle(ctx, size, size, r, 18, '#c9d6ea', [0.05, 0.12], [20, 70])
      break
    case 'block':
      blockPrint(ctx, size, r)
      break
    case 'bandhani':
      bandhani(ctx, size, r)
      break
    case 'ikat':
      ikat(ctx, size, r)
      break
    case 'chikan':
      chikan(ctx, size, r)
      break
    case 'khadi':
      ctx.fillStyle = '#e2d6bd'
      ctx.fillRect(0, 0, size, size)
      weave(ctx, size, r, '#8a7a5c', '#fffaf0', false)
      ctx.save()
      ctx.translate(size, 0)
      ctx.rotate(Math.PI / 2)
      weave(ctx, size, r, '#8a7a5c', '#fffaf0', false)
      ctx.restore()
      break
  }
  grain(ctx, size, size, 14, r)
  return c
}

const urlCache = new Map<string, string>()
/** Data URL for CSS backgrounds (scrapbook swatches). */
export function fabricUrl(kind: Kind, size = 256) {
  const key = `${kind}:${size}`
  if (!urlCache.has(key)) urlCache.set(key, drawFabric(kind, size).toDataURL('image/jpeg', 0.86))
  return urlCache.get(key)!
}
