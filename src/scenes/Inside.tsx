import { useEffect, useRef } from 'react'
import { art, clipPolygon, FRAME, fitFrame, frameTransform, polyBox, regions } from '../lib/art'
import { onFrame } from '../lib/frame'
import { gsap, prefersReducedMotion } from '../lib/gsap'
import { sound } from '../lib/audio'
import { openBookAt } from '../lib/story'
import { live, useStory } from '../state/store'
import { coverRect } from '../ui/scrapbook/size'

/**
 * Frame 4: inside the almirah. Folded clothes, the floral tin, and the scrapbook she made as a
 * child, with dust turning in the light from the open doors. Click the scrapbook and it comes out
 * to you, then the book takes over.
 */

const BOOK = regions.inside.book
const BOOK_BOX = polyBox(BOOK)
const SHELVES = regions.inside.shelves

type Mote = { x: number; y: number; r: number; vx: number; vy: number; ph: number }

export function Inside() {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dust = useRef<HTMLCanvasElement>(null)
  const book = useRef<HTMLImageElement>(null)
  const flyer = useRef<HTMLImageElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const stage = useStory((s) => s.stage)
  const landed = useStory((s) => s.bookLanded)

  // fade in through the open doors; fade out when they close
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (stage === 'opening') {
      const tw = gsap.fromTo(el, { autoAlpha: 0, scale: 1.14 }, { autoAlpha: 1, scale: 1, duration: 0.8, delay: 0.95, ease: 'power2.out' })
      return () => {
        tw.kill()
      }
    }
    if (stage === 'open' || stage === 'book') {
      gsap.set(el, { autoAlpha: 1, scale: 1 })
      if (stage === 'open' && dim.current) gsap.to(dim.current, { opacity: 0, duration: 0.4 })
      return
    }
    const tw = gsap.to(el, { autoAlpha: 0, scale: 1.08, duration: 0.5, ease: 'power2.in' })
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
      const fit = fitFrame(vw, vh, regions.inside.safe)
      const at: [number, number] = [fit.x + 850 * fit.s - live.pointer.x * 8, fit.y + 540 * fit.s + live.pointer.y * 5]
      if (frame.current) frame.current.style.transform = frameTransform(fit, 1, [850, 540], at)

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
        const sx = at[0] + (m.x - 850) * fit.s
        const sy = at[1] + (m.y - 540) * fit.s
        // brighter towards the open doors on the left, twinkling as they turn
        const a = (0.18 + 0.32 * (0.5 + 0.5 * Math.sin(time * 1.7 + m.ph * 3))) * (1 - (m.x - x0) / (x1 - x0)) + 0.05
        ctx.fillStyle = `rgba(255, 228, 188, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(sx, sy, m.r * fit.s * 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [])

  /** The scrapbook leaves the shelf and comes to you, landing where the book will open. */
  const take = () => {
    const from = book.current?.getBoundingClientRect()
    const fly = flyer.current
    if (!from || !fly) return openBookAt('cover')
    sound.click()
    const to = coverRect()
    // the cut-out is the cover plus its page edges; size it so the cover part lands on the board
    const k = (to.h / from.height) * 1.04
    const w = from.width * k
    const h = from.height * k
    gsap.set(fly, { display: 'block', left: from.left, top: from.top, width: from.width, height: from.height, rotation: 0, opacity: 1 })
    openBookAt('cover', { fly: true })
    const tl = gsap.timeline()
    tl.to(fly, { left: to.x + to.w / 2 - w * 0.43, top: to.y + to.h / 2 - h / 2, width: w, height: h, rotation: 4, duration: 0.85, ease: 'power3.inOut' }, 0)
    if (dim.current) tl.to(dim.current, { opacity: 1, duration: 0.7, ease: 'power1.in' }, 0)
    tl.call(() => useStory.getState().setBookLanded(true), [], 0.72)
    tl.to(fly, { opacity: 0, duration: 0.3 }, 0.82)
    tl.set(fly, { display: 'none' })
  }

  const clickable = stage === 'open'

  return (
    <div
      ref={root}
      className={`inside ${clickable ? 'is-ready' : ''} ${stage === 'book' && landed ? 'is-covered' : ''}`}
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      <div className="inside__backdrop" style={{ backgroundImage: `url(${art.inside})` }} />
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
