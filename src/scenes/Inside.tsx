import { useEffect, useRef } from 'react'
import { art, clipPolygon, FRAME, fitFrame, polyBox, regions } from '../lib/art'
import { onFrame } from '../lib/frame'
import { gsap, prefersReducedMotion } from '../lib/gsap'
import { sound } from '../lib/audio'
import { openBookAt } from '../lib/story'
import { easeInOut, live, smoothstep, span, useStory } from '../state/store'
import { COVER, coverRect, FACE } from '../ui/scrapbook/size'
import { doorwayOnScreen, INSIDE_BACK, INSIDE_VIEW, insideCam } from './cams'

/**
 * Frame 4: inside the almirah. Folded clothes, the floral tin, and the scrapbook she made as a
 * child, with dust turning in the light from the open doors. It takes over from the room in the
 * open doorway (where the room already shows this drawing) and grows to fill the screen. Click the
 * scrapbook and it comes out to you, keeping the shape she drew it in, then the book takes over.
 */

const BOOK = regions.inside.book
const BOOK_BOX = polyBox(BOOK)
const SHELVES = regions.inside.shelves
/** The middle of her drawing, which every placement of it is measured from. */
const ANCHOR: [number, number] = [850, 540]
type Pt = [number, number]
/** Her cover's corners inside the scrapbook cut-out (top left, top right, bottom right, bottom left), in cut-out pixels. */
const COVER_CORNERS = regions.inside.cover.map(([x, y]) => [x - BOOK_BOX[0], y - BOOK_BOX[1]] as Pt)
/** The same corners on the straightened cover the closed book is made of. */
const FLAT_CORNERS: Pt[] = [
  [0, 0],
  [COVER.w, 0],
  [COVER.w, COVER.h],
  [0, COVER.h],
]

type Mote = { x: number; y: number; r: number; vx: number; vy: number; ph: number }

/** Scale and screen position of ANCHOR for the inside drawing right now. */
function place(vw: number, vh: number) {
  const fit = fitFrame(vw, vh, regions.inside.safe)
  // a little over the cover fit, so the pointer's parallax never shows an edge
  const sF = fit.s * (1 + 24 / Math.min(vw, vh))
  const pF: [number, number] = [fit.x + ANCHOR[0] * sF - live.pointer.x * 8, fit.y + ANCHOR[1] * sF + live.pointer.y * 5]
  const k = insideCam.k
  if (k >= 1) return { s: sF, p: pF }
  // in the doorway: the INSIDE_VIEW part of her drawing exactly fills the room's open doors
  const [dx, dy, dw] = doorwayOnScreen(vw, vh, live.pointer)
  const sM = dw / (INSIDE_VIEW[2] - INSIDE_VIEW[0])
  const pM: [number, number] = [dx + (ANCHOR[0] - INSIDE_VIEW[0]) * sM, dy + (ANCHOR[1] - INSIDE_VIEW[1]) * sM]
  const e = easeInOut(k)
  return { s: sM * Math.pow(sF / sM, e), p: [pM[0] + (pF[0] - pM[0]) * e, pM[1] + (pF[1] - pM[1]) * e] as [number, number] }
}

/** Solve A x = b (small and dense) by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c]
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]
    }
  }
  const x: number[] = Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let v = M[r][n]
    for (let j = r + 1; j < n; j++) v -= M[r][j] * x[j]
    x[r] = v / M[r][r]
  }
  return x
}

/** The CSS transform that puts four points of an element (in its own pixels) on four points of the screen. */
function quadMatrix(from: Pt[], to: Pt[]) {
  const A: number[][] = []
  const b: number[] = []
  from.forEach(([x, y], i) => {
    const [u, v] = to[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  })
  const [a, c, tx, d, e, ty, g, h] = solve(A, b)
  return `matrix3d(${a},${d},0,${g},${c},${e},0,${h},0,0,1,0,${tx},${ty},0,1)`
}

export function Inside() {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dust = useRef<HTMLCanvasElement>(null)
  const book = useRef<HTMLImageElement>(null)
  const flyer = useRef<HTMLImageElement>(null)
  const flat = useRef<HTMLDivElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const stage = useStory((s) => s.stage)
  const shown = useStory((s) => s.bookShown)
  /** Going back out through the doorway as the almirah closes. */
  const leaving = useRef(false)

  // take over in the doorway as the room's zoom ends, then grow to the whole screen; on the way
  // out, shrink back into the doorway before the doors close
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (stage === 'opening') {
      insideCam.k = 0
      const tl = gsap.timeline({ onComplete: () => useStory.getState().setStage('open') })
      tl.set(el, { autoAlpha: 0 })
      tl.to(el, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 1.2)
      tl.to(insideCam, { k: 1, duration: 1.05, ease: 'none' }, 1.45)
      return () => {
        tl.kill()
      }
    }
    if (stage === 'open' || stage === 'book') {
      insideCam.k = 1
      gsap.set(el, { autoAlpha: 1 })
      if (stage === 'open' && dim.current) gsap.to(dim.current, { opacity: 0, duration: 0.4 })
      return
    }
    if (stage === 'room' && insideCam.k > 0 && Number(gsap.getProperty(el, 'opacity')) > 0) {
      leaving.current = true
      const tl = gsap.timeline({ onComplete: () => void (leaving.current = false) })
      tl.to(insideCam, { k: 0, duration: INSIDE_BACK, ease: 'none' })
      // back in the doorway it matches the room's own copy of the drawing, so it can go
      tl.to(el, { autoAlpha: 0, duration: 0.15 })
      return () => {
        tl.kill()
        leaving.current = false
      }
    }
    const tw = gsap.to(el, { autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
    return () => {
      tw.kill()
    }
  }, [stage])

  // the book in your hands has taken over the screen: the one in flight can go
  useEffect(() => {
    if (shown) gsap.set([flyer.current, flat.current], { display: 'none' })
  }, [shown])

  useEffect(() => {
    const canvas = dust.current!
    const ctx = canvas.getContext('2d')!
    const motes: Mote[] = Array.from({ length: 70 }, () => ({
      x: SHELVES[0] + Math.random() * (SHELVES[2] - SHELVES[0]),
      y: SHELVES[1] + Math.random() * (SHELVES[3] - SHELVES[1]),
      r: 0.8 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * 5,
      ph: Math.random() * Math.PI * 2,
    }))
    const still = prefersReducedMotion()

    return onFrame((_p, dt, time) => {
      const { stage: st, bookShown } = useStory.getState()
      if (!(st === 'opening' || st === 'open' || st === 'book' || leaving.current) || (st === 'book' && bookShown)) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { s, p } = place(vw, vh)
      if (frame.current) frame.current.style.transform = `translate3d(${p[0] - ANCHOR[0] * s}px, ${p[1] - ANCHOR[1] * s}px, 0) scale(${s})`
      // seen only through the doorway at first; the opening widens to the whole screen as we go in,
      // its edge softening as it goes, so the room fades out around it instead of being wiped away
      if (root.current) {
        const k = insideCam.k
        const css = root.current.style
        if (k >= 1) {
          css.removeProperty('mask-image')
          css.removeProperty('-webkit-mask-image')
        } else {
          const [dx, dy, dw, dh] = doorwayOnScreen(vw, vh, live.pointer)
          const e = easeInOut(k)
          const f = e * Math.max(vw, vh) * 0.22
          const l = dx * (1 - e)
          const t = dy * (1 - e)
          const r = vw - (vw - dx - dw) * (1 - e)
          const b = vh - (vh - dy - dh) * (1 - e)
          const px = (v: number) => `${v.toFixed(1)}px`
          const m = `linear-gradient(to right, transparent ${px(l - f)}, #000 ${px(l)}, #000 ${px(r)}, transparent ${px(r + f)}), linear-gradient(to bottom, transparent ${px(t - f)}, #000 ${px(t)}, #000 ${px(b)}, transparent ${px(b + f)})`
          css.setProperty('mask-image', m)
          css.setProperty('-webkit-mask-image', m)
          css.setProperty('mask-composite', 'intersect')
          css.setProperty('-webkit-mask-composite', 'source-in')
        }
      }

      if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) {
        canvas.width = Math.round(vw * dpr)
        canvas.height = Math.round(vh * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, vw, vh)
      const [x0, y0, x1, y1] = SHELVES
      for (const m of motes) {
        if (!still) {
          m.x += (m.vx + Math.sin(time * 0.6 + m.ph) * 4) * dt
          m.y += m.vy * dt
          if (m.y < y0) m.y = y1
          if (m.x < x0) m.x = x1
          if (m.x > x1) m.x = x0
        }
        const sx = p[0] + (m.x - ANCHOR[0]) * s
        const sy = p[1] + (m.y - ANCHOR[1]) * s
        // brighter towards the open doors on the left, twinkling as they turn
        const a = (0.18 + 0.32 * (0.5 + 0.5 * Math.sin(time * 1.7 + m.ph * 3))) * (1 - (m.x - x0) / (x1 - x0)) + 0.05
        ctx.fillStyle = `rgba(255, 228, 188, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(sx, sy, m.r * s * 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [])

  /**
   * The scrapbook leaves the shelf and comes to you as she drew it, tilting as it lifts off and
   * straightening out of her perspective on the way, and its cover lands corner for corner on the
   * closed book's cover (same proportions, so it keeps its shape). Her cut-out turns into the
   * straightened cover on the way in (the two ride the same corners), so it lands as exactly the
   * book that then takes over on top.
   */
  const take = () => {
    const el = book.current
    const fly = flyer.current
    const straight = flat.current
    if (!el || !fly || !straight) return openBookAt('cover')
    const from = el.getBoundingClientRect()
    sound.click()
    const to = coverRect()
    const W = BOOK_BOX[2] - BOOK_BOX[0]
    const H = BOOK_BOX[3] - BOOK_BOX[1]
    const start = COVER_CORNERS.map(([x, y]) => [from.left + (x * from.width) / W, from.top + (y * from.height) / H] as Pt)
    const end: Pt[] = [
      [to.x, to.y],
      [to.x + to.w, to.y],
      [to.x + to.w, to.y + to.h],
      [to.x, to.y + to.h],
    ]
    const o = { t: 0 }
    const draw = () => {
      const q = start.map(([x, y], i) => [x + (end[i][0] - x) * o.t, y + (end[i][1] - y) * o.t] as Pt)
      const cx = q.reduce((v, p) => v + p[0], 0) / 4
      const cy = q.reduce((v, p) => v + p[1], 0) / 4
      const a = -0.12 * Math.sin(Math.PI * o.t)
      const [c, s] = [Math.cos(a), Math.sin(a)]
      const turned = q.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c] as Pt)
      fly.style.transform = quadMatrix(COVER_CORNERS, turned)
      straight.style.transform = quadMatrix(FLAT_CORNERS, turned)
      const morph = smoothstep(span(o.t, 0.45, 0.85))
      straight.style.opacity = String(morph)
      fly.style.opacity = String(1 - smoothstep(span(o.t, 0.55, 0.95)))
    }
    gsap.set(fly, { display: 'block', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0' })
    gsap.set(straight, { display: 'block', left: 0, top: 0, transformOrigin: '0 0' })
    draw()
    openBookAt('cover', { fly: true })
    const tl = gsap.timeline()
    tl.to(o, { t: 1, duration: 0.9, ease: 'power3.inOut', onUpdate: draw }, 0)
    if (dim.current) tl.to(dim.current, { opacity: 1, duration: 0.75, ease: 'power1.in' }, 0)
    tl.call(() => useStory.getState().setBookLanded(true), [], 0.8)
  }

  const clickable = stage === 'open'

  return (
    <div
      ref={root}
      className={`inside ${clickable ? 'is-ready' : ''} ${stage === 'book' && shown ? 'is-covered' : ''}`}
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      <div ref={frame} className="art-frame" style={{ width: FRAME.w, height: FRAME.h }}>
        <img className="art-frame__img" src={art.inside} alt="" draggable={false} />
        <button
          className="inside__hit"
          aria-label="Take out the scrapbook"
          tabIndex={clickable ? 0 : -1}
          disabled={!clickable}
          onClick={take}
          style={{
            left: BOOK_BOX[0],
            top: BOOK_BOX[1],
            width: BOOK_BOX[2] - BOOK_BOX[0],
            height: BOOK_BOX[3] - BOOK_BOX[1],
            clipPath: clipPolygon(BOOK, BOOK_BOX),
          }}
        />
        <img
          ref={book}
          className="inside__book"
          src={art.insideBook}
          alt=""
          draggable={false}
          style={{ left: BOOK_BOX[0], top: BOOK_BOX[1], width: BOOK_BOX[2] - BOOK_BOX[0] }}
        />
      </div>
      <div className="inside__shaft" />
      <canvas ref={dust} className="inside__dust" />
      <div ref={dim} className="inside__dim" />
      <img ref={flyer} className="inside__flyer" src={art.insideBook} alt="" draggable={false} />
      <div ref={flat} className="inside__flyer" style={{ width: COVER.w + COVER.edgesW, height: COVER.h }}>
        <img className="inside__flat" src={art.book.cover} alt="" draggable={false} style={{ left: -COVER.x, top: -COVER.y, width: FACE.w, height: FACE.h }} />
        <img className="inside__flat" src={art.book.coverEdges} alt="" draggable={false} style={{ left: COVER.w, top: 0, width: COVER.edgesW, height: COVER.h }} />
      </div>
    </div>
  )
}
