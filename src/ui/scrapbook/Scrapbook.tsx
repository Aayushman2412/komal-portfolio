import { ArrowLeft, ArrowRight, BookOpen, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { site } from '../../content/site'
import { art } from '../../lib/art'
import { sound } from '../../lib/audio'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { closeBook } from '../../lib/story'
import { useStory } from '../../state/store'
import { Spot } from './bits'
import { buildFaces, type Face, type Go } from './pages'
import { CLOSED_SHIFT, COVER, END_SHIFT, FACE, pageSize, SINGLE_BACK_SHIFT, SINGLE_COVER_SHIFT } from './size'

/**
 * The scrapbook. Desktop: a two-page spread with real 3D page turns (click a page, drag its edge,
 * use the arrow keys, or click her tabs and index rows; jumping riffles through the pages in
 * between). Phones: one page at a time, swipe or tap the arrows.
 * It appears where the book from the almirah landed, closed (her cover at the proportions she drew
 * it, with its page edges and tabs), and opens itself on "who is she?". The pages already turned
 * and still to turn show as a stack of board edges under each side, so it reads as a real book.
 */
function faceToSpread(f: number) {
  return f % 2 ? (f + 1) / 2 : f / 2
}

function hashFor(face: Face | undefined) {
  if (!face) return '#book'
  if (face.id === 'index') return '#index'
  const slug = face.id.replace(/:r$/, '')
  if (site.projects.some((p) => p.slug === slug)) return `#p/${slug}`
  return '#book'
}

function FaceView({ face, go }: { face: Face; go: Go }) {
  return (
    <>
      <img className="page__art" src={face.src} alt="" draggable={false} />
      {face.render && <div className="page__content">{face.render(go)}</div>}
      {face.spots?.map((s, i) => <Spot key={i} box={s.box} label={s.label} onGo={() => go(s.to)} />)}
    </>
  )
}

export function Scrapbook() {
  const bookLanded = useStory((s) => s.bookLanded)
  const bookTarget = useStory((s) => s.bookTarget)
  const bookNav = useStory((s) => s.bookNav)
  const faces = useMemo(buildFaces, [])
  const N = faces.length / 2
  const [size, setSize] = useState(pageSize)
  const [spread, setSpread] = useState(0)
  const [face, setFace] = useState(0)
  /**
   * The leaves that may show while pages move: the ones turning and the ones they uncover. At rest
   * only the two open pages show, so nothing stuck out of a page further in (her ABOUT ME star)
   * peeks past the edges.
   */
  const [turn, setTurn] = useState<[number, number] | null>(null)
  const turning = turn !== null
  const single = size.mobile
  /** Fully closed: only the cover and its page edges show. Over as soon as the cover starts to lift. */
  const closed = single ? face === 0 : spread === 0 && !turning
  const reduced = useMemo(prefersReducedMotion, [])
  const layer = useRef<HTMLDivElement>(null)
  const stageEl = useRef<HTMLDivElement>(null)
  const leaves = useRef<(HTMLDivElement | null)[]>([])
  const angles = useRef<number[]>(Array(N).fill(0))
  /** A turn (or a drag) owns the leaves; nothing else may start one. */
  const busy = useRef(false)
  const closeBtn = useRef<HTMLButtonElement>(null)
  /** The book opens itself a moment after it lands, unless the visitor gets there first. */
  const autoOpen = useRef(0)
  const cancelAuto = useCallback(() => window.clearTimeout(autoOpen.current), [])

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
      // the boards already turned show under the left page only once the cover is over on that side
      if (i === 0 && stageEl.current) stageEl.current.dataset.cover = a > 90 ? 'over' : 'shut'
    },
    [N],
  )

  // turning a phone or resizing a window can switch between spreads and single pages: stay on the same page
  const wasSingle = useRef(single)
  useLayoutEffect(() => {
    if (wasSingle.current === single) return
    wasSingle.current = single
    busy.current = false
    setTurn(null)
    if (single) setFace(Math.max(0, spread * 2 - 1))
    else {
      const s = faceToSpread(face)
      angles.current = angles.current.map((_, i) => (i < s ? 180 : 0))
      setSpread(s)
    }
  }, [single]) // eslint-disable-line react-hooks/exhaustive-deps

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
      setTurn([Math.min(spread, target) - 1, Math.max(spread, target)])
      ids.forEach((i, k) => {
        const o = { a: angles.current[i] }
        // the cover swings slower and heavier than a page
        const cover = i === 0
        tl.to(
          o,
          {
            a: forward ? 180 : 0,
            duration: reduced ? 0.01 : cover ? 1.15 : fast || ids.length > 1 ? 0.55 : 0.9,
            ease: cover ? 'power3.inOut' : 'power2.inOut',
            onStart: () => (!cover ? sound.page(ids.length > 1) : forward ? sound.bookOpen() : sound.bookClose()),
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
        setTurn(null)
      })
    },
    [N, spread, paintLeaf, reduced],
  )

  const goFace = useCallback(
    (f: number) => {
      f = Math.max(0, Math.min(faces.length - 1, f))
      if (single) {
        if (f === face) return Promise.resolve()
        if (face === 0) sound.bookOpen()
        else if (f === 0) sound.bookClose()
        else sound.page()
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

  // appear where the book landed, closed, then open on wherever the visit asked for
  useEffect(() => {
    if (!bookLanded || !layer.current) return
    // once it covers the screen, the almirah under it can stop drawing
    gsap.fromTo(layer.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.01 : 0.35, ease: 'power1.out', onComplete: () => useStory.getState().setBookShown(true) })
    closeBtn.current?.focus({ preventScroll: true })
    const t = !bookTarget || bookTarget === 'cover' ? 'who' : bookTarget
    autoOpen.current = window.setTimeout(() => goTarget(t), reduced ? 0 : bookTarget === 'cover' ? 750 : 420)
    return cancelAuto
  }, [bookLanded]) // eslint-disable-line react-hooks/exhaustive-deps

  // the page that names where you are: the right-hand page of a spread, or the single page
  const current = single ? faces[face] : (faces[Math.min(faces.length - 1, spread * 2)] ?? faces[spread * 2 - 1])
  const currentRef = useRef(current)
  currentRef.current = current
  useEffect(() => {
    if (!bookLanded) return
    history.replaceState(null, '', location.pathname + location.search + hashFor(current))
  }, [current, bookLanded])

  // a link followed while the book is already open (#index, #p/<slug>) turns to it, even the same link twice
  const lastNav = useRef(bookNav)
  useEffect(() => {
    if (bookNav === lastNav.current) return
    lastNav.current = bookNav
    if (!bookLanded || !bookTarget) return
    cancelAuto()
    // the browser has just put the link in the address bar: name the page actually showing until the turn lands
    history.replaceState(null, '', location.pathname + location.search + hashFor(currentRef.current))
    goTarget(bookTarget === 'cover' ? 'who' : bookTarget)
  }, [bookNav]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(async () => {
    if (busy.current) return
    cancelAuto()
    if (!single && spread > 0) await goSpread(0, true)
    if (single) setFace(0)
    // the almirah shows again under the book as it fades
    useStory.getState().setBookShown(false)
    if (layer.current) await gsap.to(layer.current, { autoAlpha: 0, duration: reduced ? 0.01 : 0.3 })
    closeBook()
  }, [single, spread, goSpread, reduced, cancelAuto])

  const next = useCallback(() => (single ? goFace(face + 1) : goSpread(spread + 1)), [single, face, spread, goFace, goSpread])
  const prev = useCallback(() => (single ? goFace(face - 1) : goSpread(spread - 1)), [single, face, spread, goFace, goSpread])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!bookLanded || document.querySelector('.zoom')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Escape') cancelAuto()
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [bookLanded, next, prev, close, cancelAuto])

  // it is a dialog: Tab goes round the book's controls (and the sound switch over it), not the page behind
  useEffect(() => {
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const all = [...document.querySelectorAll<HTMLElement>('.sound, .book-layer a[href], .book-layer button')].filter(
        (el) => !el.closest('[inert]') && !(el as HTMLButtonElement).disabled && getComputedStyle(el).visibility !== 'hidden',
      )
      if (!all.length) return
      const i = all.indexOf(document.activeElement as HTMLElement)
      const to = e.shiftKey ? (i <= 0 ? all[all.length - 1] : null) : i < 0 || i === all.length - 1 ? all[0] : null
      if (to) {
        e.preventDefault()
        to.focus()
      }
    }
    window.addEventListener('keydown', trap)
    return () => window.removeEventListener('keydown', trap)
  }, [])

  // drag a page by its edge (desktop) or swipe (phone)
  const drag = useRef<{ x: number; leaf: number; dir: 1 | -1; moved: boolean } | null>(null)
  const onDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-interactive]') || busy.current || drag.current) return
    const rect = stageEl.current!.getBoundingClientRect()
    if (single) {
      drag.current = { x: e.clientX, leaf: -1, dir: 1, moved: false }
      return
    }
    const spine = rect.left + rect.width / 2
    const right = e.clientX > spine
    if (right && spread < N) drag.current = { x: e.clientX, leaf: spread, dir: 1, moved: false }
    else if (!right && spread > 0) drag.current = { x: e.clientX, leaf: spread - 1, dir: -1, moved: false }
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
    if (!d.moved) {
      // a turn started by something else (a key, the page opening itself) keeps the leaves
      if (Math.abs(dx) <= 6 || busy.current) return
      d.moved = true
      busy.current = true
      setTurn([spread - 2, spread + 1])
    }
    const frac = Math.min(1, Math.max(0, (-dx / size.w) * 0.6))
    angles.current[d.leaf] = d.dir === 1 ? frac * 180 : 180 - frac * 180
    paintLeaf(d.leaf)
  }
  const onUp = (e: RPointerEvent | null) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (single) {
      if (!e) return
      const dx = e.clientX - d.x
      if (d.moved && Math.abs(dx) > 40) (dx < 0 ? next : prev)()
      else if (!d.moved) (e.clientX > window.innerWidth / 2 ? next : prev)()
      return
    }
    if (!d.moved) {
      if (e) (d.dir === 1 ? next : prev)()
      return
    }
    // let go: the page finishes its turn if it is past a third of the way, else falls back (a cancelled drag always falls back)
    const a = angles.current[d.leaf]
    const complete = !!e && (d.dir === 1 ? a > 60 : a < 120)
    const o = { a }
    if (complete) {
      if (d.leaf !== 0) sound.page()
      else if (d.dir === 1) sound.bookOpen()
      else sound.bookClose()
    }
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
        setTurn(null)
        if (complete) setSpread((s) => s + d.dir)
      },
    })
  }

  // closed, the cover sits centred; at the end, the back cover does (it is as narrow as the cover)
  const last = faces.length - 1
  const atEnd = single ? face === last : spread === N
  const shift = single ? (face === 0 ? SINGLE_COVER_SHIFT : face === last ? SINGLE_BACK_SHIFT : 0) : spread === 0 ? CLOSED_SHIFT : atEnd ? END_SHIFT : 0
  const edgesBox = {
    left: `${((COVER.x + COVER.w) / FACE.w) * 100}%`,
    top: `${(COVER.y / FACE.h) * 100}%`,
    width: `${(COVER.edgesW / FACE.w) * 100}%`,
    height: `${(COVER.h / FACE.h) * 100}%`,
  }
  const visibleFace = (f: number) => (single ? f === face : f === spread * 2 || f === spread * 2 - 1)
  const faceStyle = (f: Face) => ({ ['--face' as string]: `url(${f.src})` }) as CSSProperties

  return (
    <div
      ref={layer}
      className="book-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`${site.name}'s scrapbook`}
      style={{ visibility: 'hidden', opacity: 0, backgroundImage: `url(${art.table})` }}
      onPointerDownCapture={cancelAuto}
    >
      <div
        className={`book ${single ? 'book--single' : 'book--spread'} ${closed ? 'is-closed' : ''} ${atEnd ? 'is-end' : ''} ${turning ? 'is-turning' : ''}`}
        style={{
          top: size.top,
          ['--pw' as string]: `${size.w}px`,
          ['--ph' as string]: `${size.h}px`,
          // how thick the stack of pages is on each side
          ['--stack-l' as string]: String(single ? 0 : spread / N),
          ['--stack-r' as string]: String(single ? (last - face) / last : (N - spread) / N),
          // one page at a time: left-hand and right-hand pages have their boards in slightly different places
          ['--stack-x' as string]: String(single && face % 2 ? 25 : 5),
          ['--stack-w' as string]: String(single && face % 2 ? 775 : 780),
        }}
      >
        <div
          ref={stageEl}
          className="book__stage"
          style={{ transform: `translateX(${shift * size.w}px)` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => onUp(null)}
        >
          <span className="book__stack book__stack--l" />
          <span className="book__stack book__stack--r" />
          {/* the closed book's page edges and tabs: they stay put while the cover swings open */}
          <div className="book__edges" style={single ? edgesBox : { ...edgesBox, left: `calc(50% + ${edgesBox.left} / 2)`, width: `calc(${edgesBox.width} / 2)` }}>
            <img src={art.book.coverEdges} alt="" draggable={false} />
          </div>
          {single ? (
            <div className="single">
              {faces.map((f, i) =>
                Math.abs(i - face) <= 1 ? (
                  <div
                    key={f.id}
                    className={`page single__page ${i === 0 ? 'single__page--cover' : ''} ${i === face ? 'is-current' : i < face ? 'is-before' : 'is-after'}`}
                    inert={i !== face}
                    style={faceStyle(f)}
                  >
                    <FaceView face={f} go={goTarget} />
                    {/* the inside of the card cover, seen as it swings over */}
                    {i === 0 && <span className="single__cover-back" style={{ backgroundImage: `url(${art.book.back})` }} />}
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            Array.from({ length: N }, (_, i) => (
              <div key={i} ref={(el) => void (leaves.current[i] = el)} className={`leaf ${i === 0 ? 'leaf--cover' : ''} ${i >= (turn ? turn[0] : spread - 1) && i <= (turn ? turn[1] : spread) ? 'is-near' : ''}`}>
                <div className="page leaf__front" inert={!visibleFace(i * 2)} style={faceStyle(faces[i * 2])}>
                  <FaceView face={faces[i * 2]} go={goTarget} />
                  <span className="leaf__shade" />
                </div>
                <div className="page leaf__back" inert={!visibleFace(i * 2 + 1)} style={faceStyle(faces[i * 2 + 1])}>
                  <FaceView face={faces[i * 2 + 1]} go={goTarget} />
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
          index
        </button>
        <button ref={closeBtn} onClick={close} aria-label="Close the scrapbook">
          <X size={18} weight="bold" />
        </button>
      </nav>
    </div>
  )
}
