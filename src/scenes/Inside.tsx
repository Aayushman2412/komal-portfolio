import { useEffect, useRef } from 'react'
import { art, clipPolygon, FRAME, fitFrame, polyBox, regions } from '../lib/art'
import { onFrame } from '../lib/frame'
import { gsap, prefersReducedMotion } from '../lib/gsap'
import { sound } from '../lib/audio'
import { openBookAt } from '../lib/story'
import { easeInOut, live, useStory } from '../state/store'
import { coverRect } from '../ui/scrapbook/size'
import { doorwayOnScreen, INSIDE_VIEW, insideCam } from './cams'

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
/** Her cover inside the scrapbook cut-out: its centre, and its height (the mean of its two sides), in cut-out pixels. */
const CUTOUT_COVER = { cx: 146, cy: 208, h: 360 }

type Mote = { x: number; y: number; r: number; vx: number; vy: number; ph: number }

/** Scale and screen position of ANCHOR for the inside drawing right now. */
function place(vw: number, vh: number) {
  const fit = fitFrame(vw, vh, regions.inside.safe)
  const sF = fit.s
  const pF: [number, number] = [fit.x + ANCHOR[0] * sF - live.pointer.x * 8, fit.y + ANCHOR[1] * sF + live.pointer.y * 5]
  const k = insideCam.k
  if (k >= 1) return { s: sF, p: pF }
  // in the doorway: the INSIDE_VIEW part of her drawing exactly fills the room's open doors
  const [dx, dy, dw] = doorwayOnScreen(vw, vh, live.pointer)
  const sM = dw / (INSIDE_VIEW[2] - INSIDE_VIEW[0])
  const pM: [number, number] = [dx + (ANCHOR[0] - INSIDE_VIEW[0]) * sM, dy + (ANCHOR[1] - INSIDE_VIEW[1]) * sM]
  const e = easeInOut(k)
  return { s: sM * Math.pow(sF / sM, k), p: [pM[0] + (pF[0] - pM[0]) * e, pM[1] + (pF[1] - pM[1]) * e] as [number, number] }
}

export function Inside() {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dust = useRef<HTMLCanvasElement>(null)
  const book = useRef<HTMLImageElement>(null)
  const flyer = useRef<HTMLImageElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const stage = useStory((s) => s.stage)
  const landed = useStory((s) => s.bookLanded)

  // take over in the doorway as the room's zoom ends, then grow to the whole screen; fade out when
  // the doors close again
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
    const tw = gsap.to(el, { autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
    return () => {
      tw.kill()
    }
  }, [stage])

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
      const st = useStory.getState().stage
      const covered = st === 'book' && useStory.getState().bookLanded
      if (!(st === 'opening' || st === 'open' || st === 'book') || covered) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { s, p } = place(vw, vh)
      if (frame.current) frame.current.style.transform = `translate3d(${p[0] - ANCHOR[0] * s}px, ${p[1] - ANCHOR[1] * s}px, 0) scale(${s})`
      // seen only through the doorway at first; the opening widens to the whole screen as we go in
      if (root.current) {
        const k = insideCam.k
        if (k >= 1) root.current.style.clipPath = ''
        else {
          const [dx, dy, dw, dh] = doorwayOnScreen(vw, vh, live.pointer)
          const e = easeInOut(k)
          const t = dy * (1 - e)
          const l = dx * (1 - e)
          const r = (vw - dx - dw) * (1 - e)
          const b = (vh - dy - dh) * (1 - e)
          root.current.style.clipPath = `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px)`
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
   * The scrapbook leaves the shelf and comes to you as she drew it, straightening a little on the
   * way, and lands exactly where the closed book appears (same proportions, so it keeps its shape).
   */
  const take = () => {
    const el = book.current
    const fly = flyer.current
    if (!el || !fly) return openBookAt('cover')
    const from = el.getBoundingClientRect()
    sound.click()
    const to = coverRect()
    const W = BOOK_BOX[2] - BOOK_BOX[0]
    const H = BOOK_BOX[3] - BOOK_BOX[1]
    const k = to.h / CUTOUT_COVER.h
    gsap.set(fly, {
      display: 'block',
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      rotation: 0,
      opacity: 1,
      transformOrigin: `${(CUTOUT_COVER.cx / W) * 100}% ${(CUTOUT_COVER.cy / H) * 100}%`,
    })
    openBookAt('cover', { fly: true })
    const tl = gsap.timeline()
    tl.to(fly, { left: to.x + to.w / 2 - CUTOUT_COVER.cx * k, top: to.y + to.h / 2 - CUTOUT_COVER.cy * k, width: W * k, height: H * k, rotation: 9, duration: 0.9, ease: 'power3.inOut' }, 0)
    if (dim.current) tl.to(dim.current, { opacity: 1, duration: 0.75, ease: 'power1.in' }, 0)
    tl.call(() => useStory.getState().setBookLanded(true), [], 0.8)
    tl.to(fly, { opacity: 0, duration: 0.32 }, 0.86)
    tl.set(fly, { display: 'none' })
  }

  const clickable = stage === 'open'

  return (
    <div
      ref={root}
      className={`inside ${clickable ? 'is-ready' : ''} ${stage === 'book' && landed ? 'is-covered' : ''}`}
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
    </div>
  )
}
