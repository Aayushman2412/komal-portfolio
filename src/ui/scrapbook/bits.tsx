import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../../content/site'
import { art, regions } from '../../lib/art'
import { sound } from '../../lib/audio'
import { fabricUrl } from '../../lib/textures/fabrics'
import { FACE } from './size'

/**
 * The things stuck into the project pages, in the style of her drawn pages: her own washi tape and
 * stickers, a pink lined note with a loop border, polaroids, an envelope, a paper tab, swatches, prints
 * of her own pieces and the "click to see more" scrap. Positions are in page percent, so everything
 * scales with the book.
 */

type Pos = { x: number; y: number; r?: number; w?: number; h?: number }
export const place = ({ x, y, r = 0, w, h }: Pos): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: w ? `${w}%` : undefined,
  height: h ? `${h}%` : undefined,
  transform: r ? `rotate(${r}deg)` : undefined,
})

/** Escape puts back whatever is zoomed in, before the book hears it (Escape there closes the book). */
function useEscape(zoom: boolean, setZoom: (zoom: boolean) => void) {
  useEffect(() => {
    if (!zoom) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setZoom(false)
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [zoom, setZoom])
}

/** A clickable area over her drawn pages (her tabs, her "turn" flap, her index rows). Box in page pixels. */
export function Spot({ box, label, onGo }: { box: number[]; label: string; onGo: () => void }) {
  const [x0, y0, x1, y1] = box
  return (
    <button
      className="spot"
      data-interactive
      aria-label={label}
      title={label}
      style={{ left: `${(x0 / FACE.w) * 100}%`, top: `${(y0 / FACE.h) * 100}%`, width: `${((x1 - x0) / FACE.w) * 100}%`, height: `${((y1 - y0) / FACE.h) * 100}%` }}
      onClick={(e) => {
        e.stopPropagation()
        onGo()
      }}
    />
  )
}

/** Her corner flap with her "turn" beside it: the way her own pages say "next". Box in page pixels. */
export function Flap({ label, color = 'yellow', onGo }: { label: string; color?: 'yellow' | 'green'; onGo: () => void }) {
  const [x0, y0, x1, y1] = regions.book.turnFlap
  return (
    <>
      <img className="turn-note" src={art.book.turn} alt="" draggable={false} style={{ left: `${(535 / FACE.w) * 100}%`, top: `${(858 / FACE.h) * 100}%`, width: `${(142 / FACE.w) * 100}%` }} />
      <button
        className={`flap flap--${color}`}
        data-interactive
        aria-label={label}
        style={{ left: `${(x0 / FACE.w) * 100}%`, top: `${(y0 / FACE.h) * 100}%`, width: `${((x1 - x0) / FACE.w) * 100}%`, height: `${((y1 - y0) / FACE.h) * 100}%` }}
        onClick={(e) => {
          e.stopPropagation()
          onGo()
        }}
      >
        <img src={color === 'yellow' ? art.book.flapYellow : art.book.flapGreen} alt="" draggable={false} />
        <span>{label}</span>
      </button>
    </>
  )
}

/** A sheet of her red paper, pinned with her tape, like the ones on her first spread. */
export function RedPaper({ children, tape = 1, ...pos }: Pos & { children?: ReactNode; tape?: 1 | 2 }) {
  return (
    <div className="red-paper" style={place(pos)}>
      {children}
      <img className="red-paper__tape" src={tape === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} />
    </div>
  )
}

/** Speckled grey paper with a pink loop border, like her index. */
export function IndexCard({ children, className = '', ...pos }: Pos & { children: ReactNode; className?: string }) {
  return (
    <div className={`index-card ${className}`} style={place(pos)}>
      {children}
    </div>
  )
}

export function Tape({ kind = 1, ...pos }: Pos & { kind?: 1 | 2 }) {
  return <img className="tape" src={kind === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} style={place(pos)} />
}

export function Sticker({ src, ...pos }: Pos & { src: string }) {
  return <img className="sticker" src={src} alt="" draggable={false} style={place(pos)} />
}

/** Pink lined paper with a loop border, like her About page. */
export function Note({ children, className = '', ...pos }: Pos & { children: ReactNode; className?: string }) {
  return (
    <div className={`note ${className}`} style={place(pos)}>
      {children}
    </div>
  )
}

/**
 * A polaroid. Lift it to read what is written underneath (her notes: "polaroid → handwritten note
 * underneath"); `onRed` when it is stuck on her red paper, so the note is written in white.
 */
export function Polaroid({ photo, tape, lift = 'left', onRed, ...pos }: Pos & { photo: Project['photos'][number]; tape?: 1 | 2; lift?: 'left' | 'right'; onRed?: boolean }) {
  const [lifted, setLifted] = useState(false)
  const toward = { '--lift-r': lift === 'left' ? '-4deg' : '4deg' }
  return (
    <div className={`polaroid ${onRed ? 'polaroid--on-red' : ''}`} style={{ ...place(pos), ...(toward as CSSProperties) }}>
      <p className="polaroid__under">{photo.note}</p>
      <button
        className={`polaroid__card ${lifted ? 'is-lifted' : ''}`}
        data-interactive
        aria-pressed={lifted}
        aria-label={`${photo.caption}. ${lifted ? 'Put it back' : 'Lift it to read the note underneath'}`}
        onClick={(e) => {
          e.stopPropagation()
          sound.click()
          setLifted((v) => !v)
        }}
      >
        <span className="polaroid__photo">{photo.src ? <img src={photo.src} alt={photo.alt ?? ''} loading="lazy" style={photo.focus ? { objectPosition: photo.focus } : undefined} /> : <span className="polaroid__empty">photo to come</span>}</span>
        <span className="polaroid__caption">{photo.caption}</span>
        {tape && <img className="polaroid__tape" src={tape === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} />}
      </button>
    </div>
  )
}

/**
 * An envelope with the concept note inside (her notes: "envelope → concept note"). A long note gives
 * `out`, where the letter lies once it is pulled out (page percent, like the envelope): it comes up
 * out of the envelope and unfolds there, still tucked in at the bottom.
 */
export function Envelope({ text, out, ...pos }: Pos & { text: string; out?: { x: number; y: number; w: number; h: number } }) {
  const [open, setOpen] = useState(false)
  const { x, y, w = 1, h = 1, r = 0 } = pos
  // the unfolded letter, in the envelope's own percent
  const sheet = out && {
    '--out-l': `${((out.x - x) / w) * 100}%`,
    '--out-t': `${((out.y - y) / h) * 100}%`,
    '--out-w': `${(out.w / w) * 100}%`,
    '--out-h': `${(out.h / h) * 100}%`,
    '--out-r': `${-r * 0.8}deg`,
  }
  return (
    <button
      className={`envelope ${out ? 'envelope--long' : ''} ${open ? 'is-open' : ''}`}
      style={{ ...place(pos), ...(sheet as CSSProperties) }}
      data-interactive
      aria-expanded={open}
      aria-label={open ? 'Close the envelope' : 'Open the envelope: the concept note'}
      onClick={(e) => {
        e.stopPropagation()
        sound.page()
        setOpen((v) => !v)
      }}
    >
      <span className="envelope__back" />
      <span className="envelope__letter">
        <b>concept</b>
        {text}
      </span>
      <span className="envelope__front">
        <span className="envelope__label">concept note</span>
      </span>
      <span className="envelope__flap" />
      <img className="envelope__seal" src={art.book.heart} alt="" draggable={false} />
    </button>
  )
}

/**
 * A paper tab poking out of a pocket; pull it and the spec sheet slides out (her notes: "paper tab →
 * specs sheet hidden"). A longer sheet gives `sheet`, how many pockets tall it is: pulled out, it
 * also opens out to the left, wide enough for whole lines.
 */
export function SpecTab({ specs, sheet, ...pos }: Pos & { specs: Project['specs']; sheet?: number }) {
  const [out, setOut] = useState(false)
  return (
    <div className={`spec ${sheet ? 'spec--long' : ''} ${out ? 'is-out' : ''}`} style={{ ...place(pos), ...(sheet ? ({ '--sheet': sheet } as CSSProperties) : {}) }}>
      <button
        className="spec__sheet"
        data-interactive
        aria-expanded={out}
        aria-label={out ? 'Put the spec sheet back' : 'Pull out the spec sheet'}
        onClick={(e) => {
          e.stopPropagation()
          sound.page()
          setOut((v) => !v)
        }}
      >
        <span className="spec__tab">specs</span>
        <span className="spec__table">
          <b>spec sheet</b>
          {specs.map(([k, v]) => (
            <span key={k} className="spec__row">
              <span>{k}</span>
              <span>{v}</span>
            </span>
          ))}
        </span>
      </button>
      <span className="spec__pocket" />
    </div>
  )
}

/** A swatch cut with pinking shears; click it to look closely at the fabric (her notes: "click the swatch → zooms fabric texture"). */
export function Swatch({ swatch, ...pos }: Pos & { swatch: Project['swatches'][number] }) {
  const [zoom, setZoom] = useState(false)
  const small = swatch.src ?? fabricUrl(swatch.kind)
  useEscape(zoom, setZoom)
  // a photo of the real fabric is shown at most about three times its own size, so it stays fabric, not blur
  const most = swatch.src && swatch.w && swatch.h ? Math.round(Math.min(swatch.w, swatch.h) * 3.2) : 0
  return (
    <>
      <button
        className="swatch"
        style={place(pos)}
        data-interactive
        aria-label={`${swatch.name}: look closer`}
        onClick={(e) => {
          e.stopPropagation()
          sound.click()
          setZoom(true)
        }}
      >
        <span className="swatch__cloth" style={{ backgroundImage: `url(${small})` }} />
        <span className="swatch__tag">{swatch.name}</span>
      </button>
      {/* data-interactive: it is portaled out of the book, but React still bubbles its pointer events up to the page, which would turn */}
      {zoom &&
        createPortal(
          <div className="zoom" role="dialog" aria-label={swatch.name} data-interactive onClick={() => setZoom(false)}>
            <span
              className={`zoom__cloth ${most ? 'zoom__cloth--photo' : ''}`}
              style={{ backgroundImage: `url(${swatch.src ?? fabricUrl(swatch.kind, 768)})`, ...(most ? { width: `min(68vmin, 620px, ${most}px)` } : {}) }}
            />
            <span className="zoom__tag">{swatch.name}</span>
            <span className="zoom__hint">click anywhere to put it back</span>
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * One of her own pieces stuck in like a print, taped down, or `bare` when she cut it out; click it to
 * look closer (her line-up, her collection). `size` is the piece's own size in pixels, so the closer
 * look shows it as large as it holds (about twice), never more.
 */
export function Print({ src, alt, size, tape, bare, ...pos }: Pos & { src: string; alt: string; size: [number, number]; tape?: 1 | 2; bare?: boolean }) {
  const [zoom, setZoom] = useState(false)
  useEscape(zoom, setZoom)
  const [iw, ih] = size
  return (
    <>
      <button
        className={`print ${bare ? 'print--bare' : ''}`}
        style={place(pos)}
        data-interactive
        aria-label={`${alt} Look closer`}
        onClick={(e) => {
          e.stopPropagation()
          sound.click()
          setZoom(true)
        }}
      >
        <img src={src} alt="" draggable={false} loading="lazy" />
        {tape && <img className="print__tape" src={tape === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} />}
      </button>
      {zoom &&
        createPortal(
          <div className="zoom" role="dialog" aria-label={alt} data-interactive onClick={() => setZoom(false)}>
            <img className="zoom__print" src={src} alt={alt} style={{ width: `min(92vw, ${iw * 2}px, calc(80vh * ${(iw / ih).toFixed(4)}))` }} />
            <span className="zoom__hint">click anywhere to put it back</span>
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * "click to see more": her hand on a torn scrap of white paper, like her INSPIRATION strip. It is a
 * real link, so it opens the project's own page in a new tab (and middle-click, copy link, keyboard
 * all work); it never turns the page. Without a position it sits in line, after the project's name.
 */
export function More({ href, title, className = '', ...pos }: Partial<Pos> & { href: string; title: string; className?: string }) {
  return (
    <a
      className={`more ${pos.x === undefined ? 'more--inline' : ''} ${className}`}
      style={pos.x === undefined ? undefined : place(pos as Pos)}
      href={href}
      target="_blank"
      rel="noopener"
      draggable={false}
      data-interactive
      aria-label={`click to see more: ${title}, the whole project (opens in a new tab)`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        sound.click()
      }}
    >
      <span className="more__text">click to see more</span>
      <svg className="more__arrow" viewBox="0 0 40 22" aria-hidden="true">
        <path d="M2 14c7-6 17-8 30-5" />
        <path d="M26 3.5l7 5.6-7.6 4.4" />
      </svg>
    </a>
  )
}
