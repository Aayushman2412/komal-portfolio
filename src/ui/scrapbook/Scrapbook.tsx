import { ArrowLeft, ArrowRight, BookOpen, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { site } from '../../content/site'
import { getAssets } from '../../lib/assets'
import { sound } from '../../lib/audio'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { closeBook } from '../../lib/story'
import { useStory } from '../../state/store'
import { buildFaces, type Face } from './pages'
import { pageSize } from './size'

/**
 * The scrapbook, in the DOM so it is crisp, selectable and accessible.
 * Desktop: a two-page spread with real 3D page turns (click a page, drag its edge, or use the
 * arrow keys; jumping from the index riffles through the pages in between).
 * Phones: one page at a time, swipe or tap the arrows.
 * It appears exactly over the 3D book that flew out of the almirah, closed, then opens.
 */
function faceToSpread(f: number) {
  return f % 2 ? (f + 1) / 2 : f / 2
}

function hashFor(face: Face | undefined) {
  if (!face || face.id === 'cover' || face.id === 'about' || face.id === 'back' || face.id === 'blank') return '#book'
  if (face.id === 'index') return '#index'
  const slug = face.id.replace(/:r$/, '')
  if (site.projects.some((p) => p.slug === slug)) return `#p/${slug}`
  return '#book'
}

export function Scrapbook() {
  const bookLanded = useStory((s) => s.bookLanded)
  const bookTarget = useStory((s) => s.bookTarget)
  const faces = useMemo(() => buildFaces(getAssets().coverCanvas), [])
  const N = faces.length / 2
  const [size, setSize] = useState(pageSize)
  const [spread, setSpread] = useState(0)
  const [face, setFace] = useState(0)
  const reduced = useMemo(prefersReducedMotion, [])
  const layer = useRef<HTMLDivElement>(null)
  const stageEl = useRef<HTMLDivElement>(null)
  const leaves = useRef<(HTMLDivElement | null)[]>([])
  const angles = useRef<number[]>(Array(N).fill(0))
  const busy = useRef(false)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const single = size.mobile

  useEffect(() => {
    const r = () => setSize(pageSize())
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  const paintLeaf = useCallback(
    (i: number) => {
      const el = leaves.current[i]
      if (!el) return
      const a = angles.current[i]
      el.style.transform = `rotateY(${-a}deg)`
      el.style.zIndex = String(a > 90 ? i + 1 : N - i + (a > 0.5 ? N : 0))
      el.style.setProperty('--shade', String(Math.sin((a * Math.PI) / 180)))
    },
    [N],
  )

  useLayoutEffect(() => {
    for (let i = 0; i < N; i++) paintLeaf(i)
  }, [N, paintLeaf, single])

  /** Turn to a spread, riffling through any leaves in between. */
  const goSpread = useCallback(
    (target: number, fast = false) => {
      target = Math.max(0, Math.min(N, target))
      if (target === spread || busy.current) return Promise.resolve()
      busy.current = true
      const forward = target > spread
      const ids = forward ? Array.from({ length: target - spread }, (_, k) => spread + k) : Array.from({ length: spread - target }, (_, k) => spread - 1 - k)
      const tl = gsap.timeline()
      ids.forEach((i, k) => {
        const o = { a: angles.current[i] }
        tl.to(
          o,
          {
            a: forward ? 180 : 0,
            duration: reduced ? 0.01 : fast || ids.length > 1 ? 0.55 : 0.85,
            ease: 'power2.inOut',
            onStart: () => sound.page(),
            onUpdate: () => {
              angles.current[i] = o.a
              paintLeaf(i)
            },
          },
          k * (ids.length > 1 ? 0.09 : 0),
        )
      })
      setSpread(target)
      return tl.then(() => {
        busy.current = false
      })
    },
    [N, spread, paintLeaf, reduced],
  )

  const goFace = useCallback(
    (f: number) => {
      f = Math.max(0, Math.min(faces.length - 1, f))
      if (single) {
        if (f === face) return Promise.resolve()
        sound.page()
        setFace(f)
        return Promise.resolve()
      }
      return goSpread(faceToSpread(f))
    },
    [faces.length, single, face, goSpread],
  )

  const goTarget = useCallback(
    (target: string) => {
      const f = faces.findIndex((x) => x.id === target)
      if (f >= 0) goFace(f)
    },
    [faces, goFace],
  )

  // appear over the 3D book, then open to wherever the visit asked for
  useEffect(() => {
    if (!bookLanded || !layer.current) return
    gsap.fromTo(layer.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.01 : 0.35, ease: 'power1.out' })
    closeBtn.current?.focus({ preventScroll: true })
    const t = bookTarget && bookTarget !== 'cover' ? bookTarget : null
    if (t) {
      const id = window.setTimeout(() => goTarget(t), 450)
      return () => window.clearTimeout(id)
    }
  }, [bookLanded]) // eslint-disable-line react-hooks/exhaustive-deps

  // the page that names where you are: the right-hand page of a spread, or the single page
  const current = single ? faces[face] : faces[Math.min(faces.length - 1, spread * 2)] ?? faces[spread * 2 - 1]
  useEffect(() => {
    if (!bookLanded) return
    history.replaceState(null, '', location.pathname + location.search + hashFor(current))
  }, [current, bookLanded])

  const close = useCallback(async () => {
    if (busy.current) return
    if (!single && spread > 0) await goSpread(0, true)
    if (single) setFace(0)
    if (layer.current) await gsap.to(layer.current, { autoAlpha: 0, duration: reduced ? 0.01 : 0.25 })
    closeBook()
  }, [single, spread, goSpread, reduced])

  const next = useCallback(() => (single ? goFace(face + 1) : goSpread(spread + 1)), [single, face, spread, goFace, goSpread])
  const prev = useCallback(() => (single ? goFace(face - 1) : goSpread(spread - 1)), [single, face, spread, goFace, goSpread])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!bookLanded) return
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [bookLanded, next, prev, close])

  // drag a page by its edge (desktop) or swipe (phone)
  const drag = useRef<{ x: number; leaf: number; dir: 1 | -1; moved: boolean; id: number } | null>(null)
  const onDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-interactive]') || busy.current) return
    const rect = stageEl.current!.getBoundingClientRect()
    if (single) {
      drag.current = { x: e.clientX, leaf: -1, dir: 1, moved: false, id: e.pointerId }
      return
    }
    const spine = rect.left + rect.width / 2
    const right = e.clientX > spine
    if (right && spread < N) drag.current = { x: e.clientX, leaf: spread, dir: 1, moved: false, id: e.pointerId }
    else if (!right && spread > 0) drag.current = { x: e.clientX, leaf: spread - 1, dir: -1, moved: false, id: e.pointerId }
    else return
    stageEl.current!.setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPointerEvent) => {
    const d = drag.current
    if (!d || single) {
      if (d && Math.abs(e.clientX - d.x) > 8) d.moved = true
      return
    }
    const dx = (e.clientX - d.x) * d.dir
    if (Math.abs(dx) > 6) d.moved = true
    if (!d.moved) return
    const frac = Math.min(1, Math.max(0, (-dx / size.w) * 0.6))
    angles.current[d.leaf] = d.dir === 1 ? frac * 180 : 180 - frac * 180
    paintLeaf(d.leaf)
  }
  const onUp = (e: RPointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (single) {
      const dx = e.clientX - d.x
      if (d.moved && Math.abs(dx) > 40) (dx < 0 ? next : prev)()
      else if (!d.moved) (e.clientX > window.innerWidth / 2 ? next : prev)()
      return
    }
    if (!d.moved) {
      ;(d.dir === 1 ? next : prev)()
      return
    }
    const a = angles.current[d.leaf]
    const complete = d.dir === 1 ? a > 60 : a < 120
    const o = { a }
    busy.current = true
    gsap.to(o, {
      a: complete === (d.dir === 1) ? 180 : 0,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        angles.current[d.leaf] = o.a
        paintLeaf(d.leaf)
      },
      onComplete: () => {
        busy.current = false
        if (complete) {
          sound.page()
          setSpread((s) => s + d.dir)
        }
      },
    })
  }

  const shift = single ? 0 : spread === 0 ? -0.5 : spread === N ? 0.5 : 0
  const visibleFace = (f: number) => (single ? f === face : f === spread * 2 || f === spread * 2 - 1)

  return (
    <div
      ref={layer}
      className="book-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`${site.name}'s scrapbook`}
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      <div
        className={`book ${single ? 'book--single' : 'book--spread'}`}
        style={{ ['--pw' as string]: `${size.w}px`, ['--ph' as string]: `${size.h}px` }}
      >
        <div
          ref={stageEl}
          className="book__stage"
          style={{ transform: `translateX(${shift * size.w}px)` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (drag.current = null)}
        >
          {single ? (
            <div className="single">
              {faces.map((f, i) =>
                Math.abs(i - face) <= 1 ? (
                  <div key={f.id} className={`page paper-${f.paper} single__page ${i === face ? 'is-current' : i < face ? 'is-before' : 'is-after'}`} inert={i !== face}>
                    {f.render(goTarget)}
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            Array.from({ length: N }, (_, i) => (
              <div key={i} ref={(el) => void (leaves.current[i] = el)} className="leaf">
                <div className={`page leaf__front paper-${faces[i * 2].paper}`} inert={!visibleFace(i * 2)}>
                  {faces[i * 2].render(goTarget)}
                  <span className="leaf__shade" />
                </div>
                <div className={`page leaf__back paper-${faces[i * 2 + 1].paper}`} inert={!visibleFace(i * 2 + 1)}>
                  {faces[i * 2 + 1].render(goTarget)}
                  <span className="leaf__shade" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <nav className="book-nav" aria-label="Scrapbook pages">
        <button onClick={prev} disabled={single ? face === 0 : spread === 0} aria-label="Previous page">
          <ArrowLeft size={18} weight="bold" />
        </button>
        <span className="book-nav__label">{current?.label}</span>
        <button onClick={next} disabled={single ? face === faces.length - 1 : spread === N} aria-label="Next page">
          <ArrowRight size={18} weight="bold" />
        </button>
        <button onClick={() => goTarget('index')} className="book-nav__index">
          <BookOpen size={18} weight="bold" />
          Index
        </button>
        <button ref={closeBtn} onClick={close} aria-label="Close the scrapbook">
          <X size={18} weight="bold" />
        </button>
      </nav>
    </div>
  )
}
