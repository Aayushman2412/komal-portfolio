import { canvas, grain, mottle, rng, toTexture, withAlpha } from './util'

/** A 90s Indian room, drawn: distemper walls with an oil-paint dado, a red-oxide floor, old steel. */

export function wallTexture() {
  const W = 1024
  const H = 1024
  const { c, ctx } = canvas(W, H)
  const r = rng(11)
  const dado = H * 0.7
  ctx.fillStyle = '#a7c4bb' // faded distemper mint
  ctx.fillRect(0, 0, W, dado)
  mottle(ctx, W, dado, r, 140, '#c9ddd5', [0.08, 0.2], [30, 160])
  mottle(ctx, W, dado, r, 90, '#7e9e95', [0.05, 0.14], [30, 140])
  // damp patches creeping down from the ceiling
  mottle(ctx, W, 160, r, 20, '#8a7f5c', [0.08, 0.18], [40, 120])
  // oil-paint dado, glossier and darker
  ctx.fillStyle = '#4f7268'
  ctx.fillRect(0, dado, W, H - dado)
  mottle(ctx, W, H, r, 60, '#3a564e', [0.1, 0.2], [20, 90])
  ctx.fillStyle = '#2f453f'
  ctx.fillRect(0, dado - 6, W, 8)
  // hairline cracks
  ctx.strokeStyle = 'rgba(40,50,45,0.35)'
  ctx.lineWidth = 1
  for (let k = 0; k < 7; k++) {
    let x = r() * W
    let y = r() * dado
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < 12; s++) {
      x += (r() - 0.5) * 30
      y += r() * 18
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  grain(ctx, W, H, 18, r)
  return toTexture(c)
}

export function floorTexture() {
  const S = 1024
  const { c, ctx } = canvas(S, S)
  const r = rng(23)
  ctx.fillStyle = '#7a2c22'
  ctx.fillRect(0, 0, S, S)
  mottle(ctx, S, S, r, 160, '#9b3a2b', [0.1, 0.25], [20, 120])
  mottle(ctx, S, S, r, 120, '#4e1a14', [0.08, 0.2], [20, 100])
  // polish wear: lighter swirls where people walked
  mottle(ctx, S, S, r, 30, '#c46a52', [0.05, 0.1], [80, 220])
  // tile joints every quarter
  ctx.strokeStyle = 'rgba(30,8,5,0.5)'
  ctx.lineWidth = 2
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo((i * S) / 4, 0)
    ctx.lineTo((i * S) / 4, S)
    ctx.moveTo(0, (i * S) / 4)
    ctx.lineTo(S, (i * S) / 4)
    ctx.stroke()
  }
  grain(ctx, S, S, 16, r)
  return toTexture(c, { repeat: 3 })
}

export function woodTexture() {
  const W = 512
  const H = 512
  const { c, ctx } = canvas(W, H)
  const r = rng(5)
  ctx.fillStyle = '#5b3a24'
  ctx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) {
    ctx.strokeStyle = withAlpha(r() > 0.5 ? '#3d2716' : '#7a5236', 0.25 + r() * 0.25)
    ctx.lineWidth = 1 + r() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + y * 0.05) * 3)
    ctx.stroke()
  }
  grain(ctx, W, H, 12, r)
  return toTexture(c)
}

/** Old enamelled steel: a soft sheen, faint wipe marks, hairline scratches, a little rust at the foot. */
export function steelTexture(base: string, seed = 3) {
  const S = 1024
  const { c, ctx } = canvas(S, S)
  const r = rng(seed)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, S, S)
  mottle(ctx, S, S, r, 80, '#ffffff', [0.03, 0.06], [60, 220])
  mottle(ctx, S, S, r, 50, '#2d3a33', [0.015, 0.035], [60, 200])
  // wipe marks: long soft streaks where a cloth went over it for years
  ctx.save()
  ctx.filter = 'blur(10px)'
  for (let k = 0; k < 10; k++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 30 + r() * 40
    ctx.beginPath()
    const y = r() * S
    ctx.moveTo(-20, y)
    ctx.quadraticCurveTo(S / 2, y + (r() - 0.5) * 200, S + 20, y + (r() - 0.5) * 120)
    ctx.stroke()
  }
  ctx.restore()
  ctx.filter = 'none'
  // a little rust low down, where the floor gets mopped
  for (let k = 0; k < 5; k++) {
    const x = r() * S
    const y = S * (0.9 + r() * 0.1)
    const g = ctx.createRadialGradient(x, y, 0, x, y, 6 + r() * 12)
    g.addColorStop(0, 'rgba(138,82,40,0.45)')
    g.addColorStop(1, 'rgba(138,82,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 20, y - 20, 40, 40)
  }
  // hairline scratches
  ctx.strokeStyle = 'rgba(240,245,240,0.16)'
  for (let k = 0; k < 40; k++) {
    const x = r() * S
    const y = r() * S
    const a = (r() - 0.5) * 0.8
    const l = 8 + r() * 40
    ctx.lineWidth = 0.6 + r() * 0.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    ctx.stroke()
  }
  grain(ctx, S, S, 6, r)
  return toTexture(c)
}

/** Childhood stickers, die-cut with a white border. 4x2 atlas. */
export const STICKERS = ['star', 'heart', 'smiley', 'flower', 'rainbow', 'K', 'butterfly', 'kite'] as const
export function stickerAtlas() {
  const cell = 256
  const { c, ctx } = canvas(cell * 4, cell * 2)
  const r = rng(77)
  STICKERS.forEach((kind, i) => {
    ctx.save()
    ctx.translate((i % 4) * cell + cell / 2, Math.floor(i / 4) * cell + cell / 2)
    ctx.rotate((r() - 0.5) * 0.4)
    const path = new Path2D()
    switch (kind) {
      case 'star':
        for (let p = 0; p < 10; p++) {
          const rad = p % 2 ? 40 : 92
          const a = (p / 10) * Math.PI * 2 - Math.PI / 2
          if (p === 0) path.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
          else path.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
        }
        path.closePath()
        break
      case 'heart':
        path.moveTo(0, 70)
        path.bezierCurveTo(-120, -10, -50, -95, 0, -40)
        path.bezierCurveTo(50, -95, 120, -10, 0, 70)
        break
      case 'smiley':
      case 'flower':
        path.arc(0, 0, kind === 'flower' ? 46 : 88, 0, Math.PI * 2)
        if (kind === 'flower')
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * Math.PI * 2
            path.moveTo(Math.cos(a) * 62 + 40, Math.sin(a) * 62)
            path.arc(Math.cos(a) * 62, Math.sin(a) * 62, 40, 0, Math.PI * 2)
          }
        break
      case 'rainbow':
        path.arc(0, 40, 96, Math.PI, 0)
        path.lineTo(46, 40)
        path.arc(0, 40, 46, 0, Math.PI, true)
        path.closePath()
        break
      case 'K':
        path.rect(-70, -90, 140, 180)
        break
      case 'butterfly':
        path.ellipse(-46, -24, 50, 40, -0.4, 0, Math.PI * 2)
        path.moveTo(96, -24)
        path.ellipse(46, -24, 50, 40, 0.4, 0, Math.PI * 2)
        path.moveTo(-6, 40)
        path.ellipse(-34, 40, 34, 28, 0.3, 0, Math.PI * 2)
        path.moveTo(68, 40)
        path.ellipse(34, 40, 34, 28, -0.3, 0, Math.PI * 2)
        break
      case 'kite':
        path.moveTo(0, -100)
        path.lineTo(76, 0)
        path.lineTo(0, 100)
        path.lineTo(-76, 0)
        path.closePath()
        break
    }
    // white die-cut border
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#fbf7ee'
    ctx.lineWidth = 22
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6
    ctx.stroke(path)
    ctx.shadowBlur = 0
    const fills: Record<string, string> = {
      star: '#f4c430', heart: '#e2405f', smiley: '#ffd23a', flower: '#f08bb4',
      rainbow: '#58a6e6', K: '#3b5bdb', butterfly: '#8f5bd6', kite: '#ff7a2f',
    }
    ctx.fillStyle = fills[kind]
    ctx.fill(path, 'nonzero')
    ctx.fillStyle = '#1b1b1b'
    if (kind === 'smiley') {
      ctx.beginPath()
      ctx.arc(-30, -20, 10, 0, Math.PI * 2)
      ctx.arc(30, -20, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 9
      ctx.strokeStyle = '#1b1b1b'
      ctx.beginPath()
      ctx.arc(0, 8, 46, 0.2, Math.PI - 0.2)
      ctx.stroke()
    }
    if (kind === 'rainbow') {
      ;['#e2405f', '#f4c430', '#4caf50'].forEach((col, k) => {
        ctx.strokeStyle = col
        ctx.lineWidth = 12
        ctx.beginPath()
        ctx.arc(0, 40, 86 - k * 14, Math.PI, 0)
        ctx.stroke()
      })
    }
    if (kind === 'K') {
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 150px "Gochi Hand", cursive'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('K', 0, 8)
    }
    if (kind === 'kite') {
      ctx.strokeStyle = '#fff3'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, -100)
      ctx.lineTo(0, 100)
      ctx.moveTo(-76, 0)
      ctx.lineTo(76, 0)
      ctx.stroke()
    }
    // sun-faded gloss
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = 'rgba(255,248,230,0.18)'
    ctx.fillRect(-128, -128, 256, 256)
    ctx.restore()
  })
  const t = toTexture(c)
  return t
}

/** Crochet doily for the top of the TV (alpha mask). */
export function doilyTexture() {
  const S = 512
  const { c, ctx } = canvas(S, S)
  ctx.translate(S / 2, S / 2)
  ctx.strokeStyle = '#f3efe4'
  ctx.lineCap = 'round'
  for (let ring = 1; ring <= 7; ring++) {
    const rad = ring * 33
    const loops = ring * 8
    ctx.lineWidth = ring === 7 ? 7 : 5
    for (let i = 0; i < loops; i++) {
      const a = (i / loops) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, 9 + (ring % 2) * 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, rad - 12, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30)
    ctx.lineTo(Math.cos(a) * 220, Math.sin(a) * 220)
    ctx.stroke()
  }
  return toTexture(c)
}

export function suitcaseTexture() {
  const W = 512
  const H = 256
  const { c, ctx } = canvas(W, H)
  const r = rng(91)
  ctx.fillStyle = '#6a3b2a'
  ctx.fillRect(0, 0, W, H)
  mottle(ctx, W, H, r, 60, '#2c160e', [0.1, 0.25], [20, 80])
  ctx.fillStyle = '#c9a15a'
  ctx.fillRect(0, H * 0.48, W, 10)
  grain(ctx, W, H, 14, r)
  return toTexture(c)
}
