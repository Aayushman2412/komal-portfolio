import { useEffect, useRef } from 'react'
import { art, loadImage } from '../lib/art'
import { onFrame } from '../lib/frame'
import { beats, easeInOut, span, useStory } from '../state/store'

/**
 * Frames 1 and 2: the feed.ai app and its glitch, drawn on one canvas from her own pieces (the
 * cards, the header and the band textures are cut from her frames). The grid scrolls upward on its
 * own like an endless feed and goes faster as you scroll; then it stutters, her colour bands and
 * black bars flash in, SIGNAL LOST comes up, and her jagged black edge eats the screen.
 */

// her frame 1, in its own pixels
const COL_X = [31, 294, 550, 816, 1067, 1318]
const COL_TOP = [173, 171, 190, 176, 181, 169]
const PITCH = 257
const CARD_W = 252
const GAP = 12
const HEADER_H = 140
// the cut-outs carry 4px of padding on every side
const PAD = 4

// her frame 2: the glitch bands, in frame pixels (y), and her black edge
const BANDS: { y0: number; y1: number; kind: 'orange' | 'mint' | 'black'; dome?: string }[] = [
  { y0: 100, y1: 188, kind: 'orange', dome: '#3cb7c4' },
  { y0: 318, y1: 382, kind: 'black' },
  { y0: 455, y1: 488, kind: 'black' },
  { y0: 556, y1: 638, kind: 'mint', dome: '#ef3f7a' },
  { y0: 760, y1: 798, kind: 'black' },
]
const TEAR = [
  [1000, 0],
  [920, 315],
  [995, 495],
  [905, 690],
  [965, 880],
  [865, 1080],
]

type Card = { img: number; y: number; h: number; regen: number }

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function noiseCanvas() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(128, 128)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 120
    img.data[i] = v - 10 + Math.random() * 30
    img.data[i + 1] = v - 4
    img.data[i + 2] = v + 8
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export function Feed() {
  const root = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const gen = useRef<HTMLElement>(null)
  const orig = useRef<HTMLElement>(null)
  const pills = useRef<HTMLDivElement>(null)
  const signal = useRef<HTMLDivElement>(null)
  const tear = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const stage = useStory((s) => s.stage)
  const booted = stage !== 'loading'

  useEffect(() => {
    if (!booted) return
    const canvas = cv.current!
    const ctx = canvas.getContext('2d')!
    let imgs: HTMLImageElement[] = []
    let chrome: { logo: HTMLImageElement; tabs: HTMLImageElement; avatar: HTMLImageElement } | null = null
    let bgPat: CanvasPattern | null = null
    let noisePat: CanvasPattern | null = null
    const bandPat: Partial<Record<'orange' | 'mint', CanvasPattern>> = {}
    let cols: Card[][] = []
    let offset = 0
    let shown = 0
    let regenDebt = 0
    let lastText = 0
    let bootAt = -1
    const byHeight = new Map<number, number[]>()
    let L = { vw: 0, vh: 0, dpr: 1, n: 6, s: 1, cs: 1, ox: 0, yShift: 0 }

    // re-rolls swap a card for one of the same height (to within a few px) so the column never jumps
    const bucket = (h: number) => Math.round(h / 30)

    function layout() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const n = vw >= 1000 ? 6 : vw >= 700 ? 4 : 3
      const W = 2 * COL_X[0] + (n - 1) * PITCH + CARD_W + 14
      const s = vw / W
      // the app chrome stays readable on phones, where the grid itself gets small
      const cs = Math.min(1.3, Math.max(s, Math.min(0.62, (vw - 24) / 660)))
      L = { vw, vh, dpr, n, s, cs, ox: (vw - W * s) / 2, yShift: HEADER_H * (cs - s) }
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(vh * dpr)
      root.current?.style.setProperty('--cs', String(cs))
      if (imgs.length) seed()
    }

    function pick(prev: number) {
      let k = Math.floor(Math.random() * imgs.length)
      if (k === prev) k = (k + 1) % imgs.length
      return k
    }

    function seed() {
      cols = Array.from({ length: L.n }, (_, c) => {
        const list: Card[] = []
        let y = COL_TOP[c % COL_TOP.length] - PAD + offset
        let prev = -1
        // her own first two rows, in order, then the endless rest
        while ((y - offset) * L.s < L.vh + 400) {
          const k = pick(prev)
          const h = imgs[k].naturalHeight
          list.push({ img: k, y, h, regen: -1 })
          y += h - 2 * PAD + GAP
          prev = k
        }
        return list
      })
    }

    function extend(col: Card[]) {
      while (col.length > 1 && col[0].y + col[0].h < Math.min(offset, shown) - 100) col.shift()
      let last = col[col.length - 1]
      while ((last.y - offset) * L.s < L.vh + 400) {
        const k = pick(last.img)
        const card = { img: k, y: last.y + last.h - 2 * PAD + GAP, h: imgs[k].naturalHeight, regen: -1 }
        col.push(card)
        last = card
      }
    }

    Promise.all([...art.feed.cards.map(loadImage), loadImage(art.feed.logo), loadImage(art.feed.tabs), loadImage(art.feed.avatar), loadImage(art.feed.bg), loadImage(art.glitch.orange), loadImage(art.glitch.mint)]).then(
      (all) => {
        imgs = all.slice(0, art.feed.cards.length)
        imgs.forEach((im, i) => {
          const b = bucket(im.naturalHeight)
          byHeight.set(b, [...(byHeight.get(b) ?? []), i])
        })
        const [logo, tabs, avatar, bg, orange, mint] = all.slice(art.feed.cards.length)
        chrome = { logo, tabs, avatar }
        bgPat = ctx.createPattern(bg, 'repeat')
        noisePat = ctx.createPattern(noiseCanvas(), 'repeat')
        bandPat.orange = ctx.createPattern(orange, 'repeat') ?? undefined
        bandPat.mint = ctx.createPattern(mint, 'repeat') ?? undefined
        layout()
      },
    )

    window.addEventListener('resize', layout)
    layout()

    const off = onFrame((p, dt, time) => {
      const st = useStory.getState().stage
      const intro = st === 'intro' || st === 'loading'
      const q = intro ? p : 1
      const visible = q < beats.dark[1]
      // display, not visibility: her black edge sets its own visibility and would outlive the feed
      if (root.current) root.current.style.display = visible ? '' : 'none'
      if (!visible || !imgs.length || !chrome || !bgPat) return
      if (bootAt < 0) bootAt = time

      const f = span(q, beats.feed[0], beats.feed[1])
      const g = span(q, beats.glitch[0], beats.glitch[1])
      const t = span(q, beats.tear[0], beats.tear[1])
      const { vw, vh, dpr, s, cs, ox, yShift } = L

      // the feed runs on its own and runs faster the further you scroll
      const speed = 34 * (1 + 16 * f * f)
      offset += speed * dt
      // stutter: as the glitch builds, the picture only updates in jerks
      if (g < 0.15 || Math.random() > g * 0.35) shown = offset - (g > 0.15 ? hash(Math.floor(time * 9)) * 60 * g : 0)
      cols.forEach(extend)

      // re-rolling: visible cards dissolve back to noise and come back the same
      regenDebt += dt * (0.8 + 26 * f * f) * (1 - g)
      while (regenDebt >= 1) {
        regenDebt -= 1
        const col = cols[Math.floor(Math.random() * cols.length)]
        const onScreen = col.filter((c) => (c.y - shown) * s + yShift > 0 && (c.y - shown) * s < vh)
        const c = onScreen[Math.floor(Math.random() * onScreen.length)]
        if (c) {
          const same = byHeight.get(bucket(c.h)) ?? [c.img]
          c.img = same[Math.floor(Math.random() * same.length)]
          c.regen = time
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = bgPat
      ctx.fillRect(0, 0, vw, vh)

      const ghost = g * 0.5
      cols.forEach((col, ci) => {
        const x0 = ox + (COL_X[0] + ci * PITCH) * s
        col.forEach((c, ri) => {
          const y = (c.y - shown) * s + yShift
          const im = imgs[c.img]
          const w = im.naturalWidth * s
          const h = c.h * s
          if (y > vh || y + h < 0) return
          const x = x0 + ((CARD_W + 2 * PAD - im.naturalWidth) / 2) * s
          ctx.drawImage(im, x, y, w, h)
          if (ghost > 0.02) {
            // her glitched figures: a pink-and-cyan double
            ctx.globalAlpha = ghost * 0.55
            ctx.globalCompositeOperation = 'multiply'
            ctx.drawImage(im, x + 7 * s, y, w, h)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1
          }
          // the boot cascade, then the re-rolls: noise that resolves into the picture
          const born = bootAt + 0.15 + ci * 0.07 + ri * 0.12
          const since = c.regen > 0 ? time - c.regen : time - born
          const n = since < 0 ? 1 : 1 - since / 0.6
          if (n > 0 && noisePat) {
            ctx.save()
            roundRect(ctx, x + PAD * s, y + PAD * s, w - 2 * PAD * s, h - 2 * PAD * s, 24 * s)
            ctx.clip()
            ctx.translate(Math.random() * 128, Math.random() * 128)
            ctx.globalAlpha = Math.min(1, n * 1.15)
            ctx.fillStyle = noisePat
            ctx.fillRect(-128, -128, vw + 256, vh + 256)
            ctx.restore()
          }
        })
      })

      // the app bar, drawn over the cards so they scroll under it
      const hh = HEADER_H * cs
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(vw, 0)
      for (let x = vw; x >= 0; x -= 12) ctx.lineTo(x, hh - 6 * cs + Math.sin(x * 0.011) * 3 * cs + Math.sin(x * 0.037 + 1) * 1.5 * cs)
      ctx.closePath()
      ctx.fillStyle = bgPat
      ctx.fill()
      const grad = ctx.createLinearGradient(0, 0, 0, hh)
      grad.addColorStop(0, 'rgba(255,255,255,0.62)')
      grad.addColorStop(1, 'rgba(255,255,255,0.32)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
      const cy = 110 * cs
      const { logo, tabs, avatar } = chrome
      const pad = Math.max(14, 38 * s)
      ctx.drawImage(logo, pad, cy - (logo.naturalHeight * cs) / 2, logo.naturalWidth * cs, logo.naturalHeight * cs)
      ctx.drawImage(tabs, (vw - tabs.naturalWidth * cs) / 2, cy - (tabs.naturalHeight * cs) / 2, tabs.naturalWidth * cs, tabs.naturalHeight * cs)
      ctx.drawImage(avatar, vw - pad - avatar.naturalWidth * cs, cy - (avatar.naturalHeight * cs) / 2, avatar.naturalWidth * cs, avatar.naturalHeight * cs)

      if (g > 0) drawGlitch(g, time)

      // the indicators: the counter climbs with the feed; originality falls to nothing
      if (time - lastText > 0.07) {
        lastText = time
        if (gen.current) {
          const n = 4010 * Math.pow(10, 2.3 * f * f) * (1 + 0.03 * Math.sin(time * 9) + 0.02 * Math.random())
          gen.current.textContent = Math.round(Math.max(4010, n)).toLocaleString('en-US')
        }
        if (orig.current) orig.current.textContent = (0.02 * (1 - span(f, 0.45, 1))).toFixed(2)
      }
      pills.current?.style.setProperty('--g', g.toFixed(3))
      if (signal.current) {
        const on = g > 0.5 && (g > 0.85 || hash(Math.floor(time * 7)) > 0.35)
        signal.current.style.opacity = on ? '1' : '0'
      }
      if (hint.current) hint.current.style.opacity = String(Math.max(0, Math.min(1, (time - bootAt - 2.6) * 2)) * (1 - span(q, 0.005, 0.03)))

      // her black edge, swept from the right until it covers everything
      if (tear.current) {
        const dx = 800 - easeInOut(t) * 1860
        const pts = TEAR.map(([x, y]) => `${(((x + dx) / 1620) * 100).toFixed(2)}% ${((y / 1080) * 100).toFixed(2)}%`)
        tear.current.style.clipPath = `polygon(${pts.join(',')}, 400% 100%, 400% 0%)`
        tear.current.style.visibility = t > 0 ? 'visible' : 'hidden'
      }
    })

    function drawGlitch(g: number, time: number) {
      const { vw, vh, s, ox } = L
      const fy = vh / 1080
      // washed out, like her frame 2
      ctx.fillStyle = `rgba(236,239,243,${0.28 * g})`
      ctx.fillRect(0, 0, vw, vh)
      // bands flash in and out, then hold
      const tick = Math.floor(time * 11)
      BANDS.forEach((b, i) => {
        const on = g > 0.82 || hash(tick * 7 + i * 13) < g * 0.9 - 0.12
        if (!on) return
        const jitter = g > 0.82 ? 0 : (hash(tick + i) - 0.5) * 60 * fy
        const y0 = b.y0 * fy + jitter
        const h = (b.y1 - b.y0) * fy
        if (b.kind === 'black') {
          ctx.fillStyle = 'rgba(20,32,39,0.94)'
          ctx.fillRect(0, y0, vw, h)
        } else {
          const pat = bandPat[b.kind]
          if (pat) {
            ctx.save()
            ctx.translate(0, y0)
            ctx.scale(1, h / 46)
            ctx.fillStyle = pat
            ctx.fillRect(0, 0, vw, 46)
            ctx.restore()
          }
          // the heads that slipped: half-domes sitting on the band, one per column
          if (b.dome) {
            ctx.fillStyle = b.dome
            const r = 30 * s
            for (let c = 0; c < L.n; c++) {
              const cx = ox + (COL_X[0] + c * PITCH + CARD_W / 2 - 20) * s
              ctx.beginPath()
              ctx.arc(cx, y0 + h, r, Math.PI, 0)
              ctx.fill()
            }
          }
        }
      })
      // torn scanlines: strips of the picture slide sideways
      const strips = Math.floor(2 + g * 7)
      for (let k = 0; k < strips; k++) {
        if (hash(tick * 3 + k) > g) continue
        const y = hash(tick + k * 31) * vh
        const h = (6 + hash(k + tick * 5) * 40) * fy
        const dx = (hash(k * 17 + tick) - 0.5) * 120 * g
        ctx.drawImage(cv.current!, 0, y * L.dpr, vw * L.dpr, h * L.dpr, dx, y, vw, h)
      }
      // scanlines
      ctx.fillStyle = `rgba(40,52,60,${0.16 * g})`
      for (let y = 0; y < vh; y += 4) ctx.fillRect(0, y, vw, 1.2)
    }

    return () => {
      off()
      window.removeEventListener('resize', layout)
    }
  }, [booted])

  return (
    <div ref={root} className="feed" aria-hidden>
      <canvas ref={cv} className="feed__canvas" />
      <div ref={pills} className={`feed__pills ${booted ? 'is-on' : ''}`}>
        <p className="pill pill--gen">
          <i className="pill__dot" />
          generating <b ref={gen}>4,010</b> looks/sec
        </p>
        <p className="pill pill--style">style: trending</p>
        <p className="pill pill--orig">
          originality score: <b ref={orig}>0.02</b>
        </p>
      </div>
      <div ref={signal} className="feed__signal">
        SIGNAL LOST<span>_</span>
      </div>
      <div ref={hint} className="feed__hint">
        scroll
        <svg viewBox="0 0 20 28" aria-hidden>
          <path d="M10 2 C 9 10, 11 16, 10 24 M4 18 L10 25 L16 18" />
        </svg>
      </div>
      <div ref={tear} className="feed__tear" />
    </div>
  )
}
