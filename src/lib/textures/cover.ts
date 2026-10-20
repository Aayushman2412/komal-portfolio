import { site } from '../../content/site'
import { drawFabric } from './fabrics'
import { canvas, grain, mottle, rng, withAlpha } from './util'

/**
 * The scrapbook cover, drawn once. The 3D book in the almirah and the DOM book that takes over
 * use this same image, so the hand-off between them is seamless.
 */
export const COVER = { w: 1100, h: 1500 }

const SCRAP_COLORS = ['#f6f1e7', '#111111', '#e9d24a', '#d9534f', '#f1c4d6', '#9ec5e8', '#fdfdfd', '#2f2f2f']
const SCRAP_FONTS = [
  '900 150px "Bodoni Moda Variable", serif',
  'italic 700 140px "Bodoni Moda Variable", serif',
  '800 130px "Instrument Sans Variable", sans-serif',
  '400 140px "Special Elite", monospace',
  '400 130px "Permanent Marker", cursive',
  '400 150px "Gochi Hand", cursive',
]

function cutoutWord(ctx: CanvasRenderingContext2D, word: string, x: number, y: number, r: () => number, scale = 1) {
  let cx = x
  for (const ch of word) {
    if (ch === ' ') {
      cx += 50 * scale
      continue
    }
    const font = SCRAP_FONTS[Math.floor(r() * SCRAP_FONTS.length)]
    ctx.save()
    ctx.font = font.replace(/(\d+)px/, (_m, n) => `${Math.round(Number(n) * scale * (0.85 + r() * 0.3))}px`)
    const m = ctx.measureText(ch)
    const w = m.width + 26 * scale
    const h = 150 * scale
    ctx.translate(cx + w / 2, y + (r() - 0.5) * 22 * scale)
    ctx.rotate((r() - 0.5) * 0.22)
    const paper = SCRAP_COLORS[Math.floor(r() * SCRAP_COLORS.length)]
    ctx.shadowColor = 'rgba(40,25,10,0.35)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    ctx.fillStyle = paper
    // torn-ish scrap: a jittered quad
    ctx.beginPath()
    ctx.moveTo(-w / 2 + r() * 6, -h / 2 + r() * 6)
    ctx.lineTo(w / 2 - r() * 6, -h / 2 + r() * 8)
    ctx.lineTo(w / 2 - r() * 4, h / 2 - r() * 6)
    ctx.lineTo(-w / 2 + r() * 8, h / 2 - r() * 4)
    ctx.closePath()
    ctx.fill()
    ctx.shadowColor = 'transparent'
    const dark = paper === '#111111' || paper === '#2f2f2f'
    ctx.fillStyle = dark ? '#f6f1e7' : r() > 0.7 ? '#c0392b' : '#151515'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ch, 0, 6 * scale)
    ctx.restore()
    cx += w - 4 * scale
  }
  return cx
}

function tape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, a: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.fillStyle = withAlpha(color, 0.78)
  ctx.beginPath()
  ctx.moveTo(-w / 2, -26)
  for (let i = 0; i <= 8; i++) ctx.lineTo(-w / 2 + (i % 2) * 5, -26 + (52 * i) / 8)
  ctx.lineTo(w / 2, 26)
  for (let i = 8; i >= 0; i--) ctx.lineTo(w / 2 - (i % 2) * 5, -26 + (52 * i) / 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  for (let i = -w / 2; i < w / 2; i += 22) ctx.fillRect(i, -26, 8, 52)
  ctx.restore()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let p = 0; p < 10; p++) {
    const rad = p % 2 ? s * 0.42 : s
    const a = (p / 10) * Math.PI * 2 - Math.PI / 2
    if (p === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

export function drawCover(): HTMLCanvasElement {
  const { w: W, h: H } = COVER
  const { c, ctx } = canvas(W, H)
  const r = rng(2412)

  // kraft board
  ctx.fillStyle = '#b98d5f'
  ctx.fillRect(0, 0, W, H)
  mottle(ctx, W, H, r, 220, '#d4a877', [0.08, 0.2], [20, 140])
  mottle(ctx, W, H, r, 160, '#7d5634', [0.05, 0.14], [20, 120])
  // fibres
  ctx.strokeStyle = 'rgba(90,60,30,0.18)'
  for (let i = 0; i < 900; i++) {
    const x = r() * W
    const y = r() * H
    ctx.lineWidth = 0.6 + r()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18)
    ctx.stroke()
  }

  // fabric-bound spine
  const spine = drawFabric('gingham', 256, 4)
  for (let y = 0; y < H; y += 256) ctx.drawImage(spine, 0, y, 130, 256)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(126, 0, 6, H)
  // running stitch along the spine
  ctx.strokeStyle = '#f3ead6'
  ctx.lineWidth = 5
  ctx.setLineDash([22, 16])
  ctx.beginPath()
  ctx.moveTo(150, 30)
  ctx.lineTo(150, H - 30)
  ctx.stroke()
  ctx.setLineDash([])

  // title in cut-out magazine letters
  cutoutWord(ctx, 'my', 230, 230, r, 1)
  cutoutWord(ctx, 'scrap', 230, 420, r, 1.05)
  cutoutWord(ctx, 'book', 360, 600, r, 1.05)

  // the school-notebook name slip
  ctx.save()
  ctx.translate(615, 1020)
  ctx.rotate(-0.045)
  ctx.shadowColor = 'rgba(40,25,10,0.35)'
  ctx.shadowBlur = 12
  ctx.fillStyle = '#fbf8f0'
  ctx.beginPath()
  ctx.roundRect?.(-330, -170, 660, 340, 40)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = '#2c5aa0'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.roundRect?.(-312, -152, 624, 304, 30)
  ctx.stroke()
  ctx.fillStyle = '#2c5aa0'
  ctx.font = '400 40px "Special Elite", monospace'
  const rows = ['Name', 'Class', 'Subject']
  rows.forEach((label, i) => {
    const y = -78 + i * 92
    ctx.fillText(label, -270, y + 12)
    ctx.fillRect(-120, y + 22, 380, 3)
  })
  ctx.fillStyle = '#1d1b4b'
  ctx.font = '400 78px "Gochi Hand", cursive'
  ctx.fillText(site.cover.owner, -100, -70)
  ctx.font = '400 60px "Gochi Hand", cursive'
  ctx.fillText(site.cover.age, -100, 18)
  ctx.fillText('scrap book', -100, 110)
  ctx.restore()

  // stickers and doodles
  star(ctx, 920, 250, 54, '#f4c430')
  star(ctx, 990, 380, 30, '#e2405f')
  star(ctx, 260, 1330, 40, '#2c5aa0')
  ctx.fillStyle = '#ffd23a'
  ctx.beginPath()
  ctx.arc(905, 1360, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 12
  ctx.strokeStyle = '#fbf7ee'
  ctx.stroke()
  ctx.fillStyle = '#1b1b1b'
  ctx.beginPath()
  ctx.arc(880, 1340, 8, 0, Math.PI * 2)
  ctx.arc(930, 1340, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = '#1b1b1b'
  ctx.beginPath()
  ctx.arc(905, 1362, 34, 0.25, Math.PI - 0.25)
  ctx.stroke()

  tape(ctx, 860, 140, 220, 0.5, '#f29cb7')
  tape(ctx, 300, 1450, 260, -0.12, '#9ad0c2')

  // kid handwriting
  ctx.save()
  ctx.translate(250, 1250)
  ctx.rotate(-0.06)
  ctx.fillStyle = '#7a1f1f'
  ctx.font = '400 50px "Gochi Hand", cursive'
  ctx.fillText(site.cover.tagline, 0, 0)
  ctx.strokeStyle = '#7a1f1f'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(0, 14)
  ctx.quadraticCurveTo(300, 26, 640, 10)
  ctx.stroke()
  ctx.restore()

  // worn corners and edge darkening
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(40,20,5,0.45)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
  grain(ctx, W, H, 16, r)
  return c
}
