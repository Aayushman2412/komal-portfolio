import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
  type TouchEvent as RTouchEvent,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * Any picture on the page, large. Every `data-lb` button on the page is one picture, in page order:
 * click or tap one to open it here; arrow keys, the arrows or a swipe step through them; Escape, the
 * cross or a click beside the picture closes it. Click (or tap) the picture to look closer: it grows
 * to twice the size and follows the mouse (or scrolls under a finger); pinch-zoom works too. Her alt
 * text is the caption, in her handwriting font.
 */
type Item = { src: string; alt: string; w: number; h: number }
type Size = { w: number; h: number }
const ZOOM = 2.2
/** Small pieces (a chip, a label) grow to at most this many times their own size. */
const MAX_UP = 3
const finger = () => matchMedia('(pointer: coarse)').matches

function itemsOnPage() {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-lb]')]
  return {
    nodes,
    items: nodes.map((n) => ({ src: n.dataset.src!, alt: n.dataset.alt ?? '', w: Number(n.dataset.w) || 1, h: Number(n.dataset.h) || 1 })),
  }
}

export function Lightbox() {
  const [state, setState] = useState<{ items: Item[]; i: number } | null>(null)
  /** Zoomed in: the point of the picture that was clicked (fraction) and where on screen it was. */
  const [zoom, setZoom] = useState<null | { fx: number; fy: number; px: number; py: number }>(null)
  /** The room the picture has while not zoomed. */
  const [room, setRoom] = useState<Size>({ w: 0, h: 0 })
  const opener = useRef<HTMLElement | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)

  // open from any picture on the page
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>('[data-lb]')
      if (!t || dialog.current?.contains(t)) return
      e.preventDefault()
      const { nodes, items } = itemsOnPage()
      opener.current = t
      setZoom(null)
      setState({ items, i: Math.max(0, nodes.indexOf(t)) })
    }
    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [])

  const open = state !== null
  const item = state?.items[state.i]

  const close = useCallback(() => {
    setState(null)
    setZoom(null)
    opener.current?.focus({ preventScroll: true })
  }, [])

  const step = useCallback((by: number) => {
    setZoom(null)
    setState((s) => (s ? { ...s, i: (s.i + by + s.items.length) % s.items.length } : s))
  }, [])

  // keys, focus and the page underneath while it is open
  useEffect(() => {
    if (!open) return
    closeBtn.current?.focus({ preventScroll: true })
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'Tab') {
        // keep the focus inside the lightbox
        const f = [...(dialog.current?.querySelectorAll<HTMLElement>('button') ?? [])]
        if (!f.length) return
        const at = f.indexOf(document.activeElement as HTMLElement)
        const to = e.shiftKey ? (at <= 0 ? f.length - 1 : at - 1) : at === f.length - 1 ? 0 : at + 1
        e.preventDefault()
        f[to].focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      html.style.overflow = was
    }
  }, [open, close, step])

  // how much room the picture has (it changes with the window and with the caption's length)
  useLayoutEffect(() => {
    const s = stage.current
    if (!open || zoom || !s) return
    const measure = () => {
      const cs = getComputedStyle(s)
      setRoom({
        w: s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        h: s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(s)
    return () => ro.disconnect()
  }, [open, zoom, item])

  // fetch the neighbours so stepping is instant
  useEffect(() => {
    if (!state) return
    for (const by of [1, -1]) {
      const n = state.items[(state.i + by + state.items.length) % state.items.length]
      if (n) new Image().src = n.src
    }
  }, [state])

  const fit: Size = item && room.w > 0 ? scaleTo(item, Math.min(room.w / item.w, room.h / item.h, MAX_UP)) : { w: 0, h: 0 }
  // closer, but a small piece is not blown up past four times the size it was cut at
  const closer = item && fit.w > 0 ? Math.max(1.4, Math.min(ZOOM, (4 * item.w) / fit.w)) : ZOOM
  const shown = zoom ? { w: fit.w * closer, h: fit.h * closer } : fit

  // zoomed: keep the point that was clicked under the pointer
  useLayoutEffect(() => {
    const s = stage.current
    if (!zoom || !s) return
    const r = s.getBoundingClientRect()
    const ox = Math.max(0, (s.clientWidth - shown.w) / 2)
    const oy = Math.max(0, (s.clientHeight - shown.h) / 2)
    s.scrollLeft = ox + zoom.fx * shown.w - (zoom.px - r.left)
    s.scrollTop = oy + zoom.fy * shown.h - (zoom.py - r.top)
  }, [zoom])

  const toggleZoom = (e: RMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (zoom) return setZoom(null)
    const r = e.currentTarget.getBoundingClientRect()
    // a key press has no position: zoom about the middle
    const kb = e.detail === 0
    const px = kb ? r.left + r.width / 2 : e.clientX
    const py = kb ? r.top + r.height / 2 : e.clientY
    setZoom({ fx: (px - r.left) / r.width, fy: (py - r.top) / r.height, px, py })
  }

  // a mouse pans the zoomed picture by moving over it; fingers scroll it natively
  const pan = (e: RPointerEvent<HTMLDivElement>) => {
    const s = stage.current
    if (!zoom || !s || e.pointerType !== 'mouse') return
    const r = s.getBoundingClientRect()
    s.scrollLeft = ((e.clientX - r.left) / r.width) * (s.scrollWidth - s.clientWidth)
    s.scrollTop = ((e.clientY - r.top) / r.height) * (s.scrollHeight - s.clientHeight)
  }

  // swipe between pictures (one finger, not zoomed in any way)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const touchStart = (e: RTouchEvent) => {
    swipe.current = e.touches.length === 1 && !zoom ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
  }
  const touchEnd = (e: RTouchEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || zoom || (window.visualViewport?.scale ?? 1) > 1.01) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1)
  }

  if (!state || !item) return null
  const many = state.items.length > 1
  const tap = finger() ? 'tap' : 'click'

  return createPortal(
    <div
      ref={dialog}
      className={`lb ${zoom ? 'is-zoomed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="The picture, large"
      onClick={close}
      onTouchStart={touchStart}
      onTouchEnd={touchEnd}
    >
      <div ref={stage} className="lb__stage" onPointerMove={pan}>
        <button type="button" className="lb__pic" aria-label={zoom ? 'Step back' : 'Look closer'} onClick={toggleZoom} style={{ width: shown.w, height: shown.h }}>
          <img key={item.src} src={item.src} width={item.w} height={item.h} alt={item.alt} draggable={false} />
        </button>
      </div>
      <p className="lb__caption" onClick={(e) => e.stopPropagation()}>
        {item.alt}
      </p>
      <span className="lb__count" aria-live="polite">
        {state.i + 1} / {state.items.length}
      </span>
      <span className="lb__hint" aria-hidden>
        {zoom ? `${tap} to step back` : `${tap} the picture to look closer`}
      </span>
      {many && (
        <>
          <button
            type="button"
            className="lb__btn lb__btn--prev"
            aria-label="Previous picture"
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
          >
            <ArrowLeft size={22} weight="bold" />
          </button>
          <button
            type="button"
            className="lb__btn lb__btn--next"
            aria-label="Next picture"
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
          >
            <ArrowRight size={22} weight="bold" />
          </button>
        </>
      )}
      <button
        ref={closeBtn}
        type="button"
        className="lb__btn lb__btn--close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation()
          close()
        }}
      >
        <X size={22} weight="bold" />
      </button>
    </div>,
    document.body,
  )
}

const scaleTo = (it: Item, s: number): Size => ({ w: Math.round(it.w * s), h: Math.round(it.h * s) })
