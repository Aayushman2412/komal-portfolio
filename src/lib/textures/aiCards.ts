import { site } from '../../content/site'
import { canvas, rng, roundRect, toTexture, withAlpha } from './util'

/**
 * The "AI feed": an atlas of procedurally drawn fashion renders, each framed as a social post.
 * They are meant to look glossy, plausible and interchangeable, which is the point of the intro.
 */
export const ATLAS = { cols: 6, rows: 4, cellW: 512, cellH: 640 }
export const CELLS = ATLAS.cols * ATLAS.rows

const PALETTES: { bg: [string, string]; cloth: string[]; skin: string }[] = [
  { bg: ['#f3d9e4', '#c9b6e8'], cloth: ['#ff7ac1', '#b18cff', '#7fe0ff', '#fff1a8'], skin: '#d9a98c' },
  { bg: ['#0e1a24', '#2a4c5e'], cloth: ['#d8f3ff', '#7aa6c2', '#2e3f52', '#e9e9ff'], skin: '#8a5a44' },
  { bg: ['#efe5d6', '#cbb79c'], cloth: ['#f7f0e6', '#d9c7aa', '#a68b6d', '#fffaf2'], skin: '#c69072' },
  { bg: ['#d9dde2', '#8e98a3'], cloth: ['#f5f7fa', '#9aa3ad', '#4b525a', '#ffffff'], skin: '#b07c62' },
  { bg: ['#ffb27a', '#e2446c'], cloth: ['#ffe36e', '#ff6a3d', '#c21d5e', '#fff5c9'], skin: '#9c654c' },
  { bg: ['#0b0f3a', '#3d53ff'], cloth: ['#7cf7ff', '#5a6bff', '#d77bff', '#e7fbff'], skin: '#a77457' },
  { bg: ['#d5f5e3', '#8fd6b8'], cloth: ['#e9fff4', '#5fd3a5', '#1d8a6b', '#ffffff'], skin: '#c48f6e' },
  { bg: ['#1a1a1a', '#4a4a4a'], cloth: ['#e7e7e7', '#bdbdbd', '#6e6e6e', '#ffffff'], skin: '#7a4d3a'},
]

type Shape = 'gown' | 'column' | 'coat' | 'mini' | 'suit' | 'cape'
const SHAPES: Shape[] = ['gown', 'column', 'coat', 'mini', 'suit', 'cape']

function drawFigure(ctx: CanvasRenderingContext2D, cx: number, r: () => number, shape: Shape, pal: (typeof PALETTES)[number]) {
  const top = 74
  const sh = 124 // shoulder line
  const waist = 236
  const feet = 492
  const shoulderW = 92 + r() * 22
  const waistW = 46 + r() * 14

  // Floor shadow
  const sg = ctx.createRadialGradient(cx, feet + 8, 4, cx, feet + 8, 120)
  sg.addColorStop(0, 'rgba(0,0,0,0.28)')
  sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg
  ctx.fillRect(cx - 140, feet - 30, 280, 70)

  // Skin: neck, arms, legs (garment covers what it covers)
  ctx.fillStyle = pal.skin
  ctx.beginPath()
  ctx.roundRect?.(cx - 9, top + 44, 18, 40, 8)
  ctx.fill()
  ctx.lineCap = 'round'
  ctx.strokeStyle = pal.skin
  ctx.lineWidth = 15
  ctx.beginPath()
  ctx.moveTo(cx - 16, 300)
  ctx.lineTo(cx - 20, feet - 6)
  ctx.moveTo(cx + 16, 300)
  ctx.lineTo(cx + 22, feet - 10)
  ctx.stroke()
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(cx - shoulderW / 2 + 6, sh + 6)
  ctx.quadraticCurveTo(cx - shoulderW / 2 - 14, 210, cx - shoulderW / 2 - 4, 290)
  ctx.moveTo(cx + shoulderW / 2 - 6, sh + 6)
  ctx.quadraticCurveTo(cx + shoulderW / 2 + 16, 205, cx + shoulderW / 2 + 10, 286)
  ctx.stroke()

  // Head: glossy, faceless (the model "smoothed it out")
  const hg = ctx.createRadialGradient(cx - 6, top + 12, 2, cx, top + 22, 34)
  hg.addColorStop(0, withAlpha('#ffffff', 0.55))
  hg.addColorStop(0.35, pal.skin)
  hg.addColorStop(1, withAlpha('#000000', 0.35))
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.ellipse(cx, top + 22, 21, 27, 0, 0, Math.PI * 2)
  ctx.fill()
  // slick hair cap
  ctx.fillStyle = withAlpha('#120d0b', 0.92)
  ctx.beginPath()
  ctx.ellipse(cx, top + 10, 23, 19, 0, Math.PI, Math.PI * 2)
  ctx.fill()

  // Garment silhouette
  const hemY = shape === 'mini' ? 330 : shape === 'coat' ? 380 : feet + 4
  const hemW = shape === 'gown' ? 250 + r() * 60 : shape === 'column' ? 92 : shape === 'cape' ? 240 : shape === 'mini' ? 132 : 150
  ctx.beginPath()
  if (shape === 'cape') {
    ctx.moveTo(cx - 20, sh - 6)
    ctx.quadraticCurveTo(cx - shoulderW, sh + 30, cx - hemW / 2, hemY)
    ctx.lineTo(cx + hemW / 2, hemY)
    ctx.quadraticCurveTo(cx + shoulderW, sh + 30, cx + 20, sh - 6)
  } else if (shape === 'suit') {
    ctx.moveTo(cx - shoulderW / 2, sh)
    ctx.lineTo(cx - waistW / 2 - 8, 300)
    ctx.lineTo(cx - 34, feet)
    ctx.lineTo(cx - 6, feet)
    ctx.lineTo(cx, 320)
    ctx.lineTo(cx + 6, feet)
    ctx.lineTo(cx + 36, feet)
    ctx.lineTo(cx + waistW / 2 + 8, 300)
    ctx.lineTo(cx + shoulderW / 2, sh)
  } else {
    ctx.moveTo(cx - shoulderW / 2, sh)
    ctx.bezierCurveTo(cx - shoulderW / 2, sh + 40, cx - waistW / 2, waist - 30, cx - waistW / 2, waist)
    ctx.bezierCurveTo(cx - waistW / 2 - 10, waist + 60, cx - hemW / 2, hemY - 90, cx - hemW / 2, hemY)
    const scallops = shape === 'gown' ? 7 : 3
    for (let i = 1; i <= scallops; i++) {
      const x = cx - hemW / 2 + (hemW * i) / scallops
      ctx.quadraticCurveTo(x - hemW / scallops / 2, hemY + 12 * r(), x, hemY + (i % 2 ? -4 : 3))
    }
    ctx.bezierCurveTo(cx + hemW / 2, hemY - 90, cx + waistW / 2 + 10, waist + 60, cx + waistW / 2, waist)
    ctx.bezierCurveTo(cx + waistW / 2, waist - 30, cx + shoulderW / 2, sh + 40, cx + shoulderW / 2, sh)
  }
  ctx.quadraticCurveTo(cx, sh + (shape === 'cape' ? -8 : 34), cx - (shape === 'cape' ? 20 : shoulderW / 2), shape === 'cape' ? sh - 6 : sh)
  ctx.closePath()

  // Iridescent fill
  const lg = ctx.createLinearGradient(cx - hemW / 2, sh, cx + hemW / 2, hemY)
  const c = pal.cloth
  lg.addColorStop(0, c[0])
  lg.addColorStop(0.35 + r() * 0.1, c[1])
  lg.addColorStop(0.7, c[2])
  lg.addColorStop(1, c[3])
  ctx.save()
  ctx.shadowColor = withAlpha(c[1], 0.55)
  ctx.shadowBlur = 40
  ctx.fillStyle = lg
  ctx.fill()
  ctx.restore()

  // Folds and specular streaks, clipped to the garment
  ctx.save()
  ctx.clip()
  ctx.filter = 'blur(5px)'
  for (let i = 0; i < 9; i++) {
    const x0 = cx + (r() - 0.5) * waistW
    const x1 = cx + (r() - 0.5) * hemW
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.22)'
    ctx.lineWidth = 6 + r() * 16
    ctx.beginPath()
    ctx.moveTo(x0, waist - 40)
    ctx.bezierCurveTo(x0 + (r() - 0.5) * 60, waist + 80, x1 + (r() - 0.5) * 40, hemY - 80, x1, hemY + 10)
    ctx.stroke()
  }
  const sheen = ctx.createLinearGradient(cx - hemW, sh, cx + hemW, hemY)
  sheen.addColorStop(0.42, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.45)')
  sheen.addColorStop(0.58, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, 512, 640)
  ctx.restore()
  ctx.filter = 'none'
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.3)
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3)
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s)
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3)
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3)
  ctx.fill()
}

function drawCard(ctx: CanvasRenderingContext2D, i: number) {
  const r = rng(1000 + i * 97)
  const { cellW: w, cellH: h } = ATLAS
  const imgH = 520
  const pal = PALETTES[i % PALETTES.length]
  const shape = SHAPES[(i * 5 + Math.floor(r() * 3)) % SHAPES.length]

  // Studio backdrop
  const bg = ctx.createRadialGradient(w * 0.5, imgH * 0.38, 20, w * 0.5, imgH * 0.5, w * 0.85)
  bg.addColorStop(0, pal.bg[0])
  bg.addColorStop(1, pal.bg[1])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, imgH)
  // a soft "light ring" every AI render seems to have
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.filter = 'blur(2px)'
  ctx.beginPath()
  ctx.ellipse(w / 2, imgH * 0.36, 150 + r() * 40, 150 + r() * 40, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  ctx.filter = 'none'

  drawFigure(ctx, w / 2 + (r() - 0.5) * 30, r, shape, pal)

  // Sparkle glints
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (let k = 0; k < 6; k++) {
    const x = r() * w
    const y = r() * imgH
    const s = 2 + r() * 6
    ctx.beginPath()
    ctx.moveTo(x, y - s * 2)
    ctx.lineTo(x + s * 0.4, y)
    ctx.lineTo(x, y + s * 2)
    ctx.lineTo(x - s * 0.4, y)
    ctx.closePath()
    ctx.fill()
  }

  // "AI" badge
  ctx.fillStyle = 'rgba(15,15,20,0.55)'
  roundRect(ctx, 18, 18, 64, 30, 15)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '600 16px "Instrument Sans Variable", system-ui, sans-serif'
  ctx.fillText('AI  ✦', 30, 39)

  // Caption strip
  ctx.fillStyle = '#fbfbfc'
  ctx.fillRect(0, imgH, w, h - imgH)
  const handle = site.intro.feedHandles[i % site.intro.feedHandles.length]
  const prompt = site.intro.feedPrompts[(i * 7) % site.intro.feedPrompts.length]
  ctx.fillStyle = '#16161a'
  ctx.font = '600 22px "Instrument Sans Variable", system-ui, sans-serif'
  ctx.fillText(handle, 22, imgH + 40)
  ctx.fillStyle = '#e8336d'
  heart(ctx, w - 118, imgH + 22, 22)
  ctx.fillStyle = '#16161a'
  ctx.font = '500 20px "Instrument Sans Variable", system-ui, sans-serif'
  ctx.fillText(`${(r() * 90 + 4).toFixed(1)}k`, w - 98, imgH + 41)
  ctx.fillStyle = '#6b6b75'
  ctx.font = '400 16px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(`/imagine ${prompt}`.slice(0, 44), 22, imgH + 76)
  ctx.fillText(`seed ${Math.floor(r() * 1e9)}  v${1 + Math.floor(r() * 9)}`, 22, imgH + 102)
}

export function buildFeedAtlas() {
  const { cols, rows, cellW, cellH } = ATLAS
  const { c, ctx } = canvas(cols * cellW, rows * cellH)
  for (let i = 0; i < CELLS; i++) {
    ctx.save()
    ctx.translate((i % cols) * cellW, Math.floor(i / cols) * cellH)
    ctx.beginPath()
    ctx.rect(0, 0, cellW, cellH)
    ctx.clip()
    drawCard(ctx, i)
    ctx.restore()
  }
  const tex = toTexture(c, { aniso: 8 })
  tex.generateMipmaps = true
  return tex
}
