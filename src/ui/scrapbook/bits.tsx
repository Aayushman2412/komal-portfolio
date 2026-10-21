import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../../content/site'
import { art, regions } from '../../lib/art'
import { sound } from '../../lib/audio'
import { fabricUrl } from '../../lib/textures/fabrics'
import { FACE } from './size'

/**
 * The things stuck into the project pages, in the style of her drawn pages: her own washi tape and
 * stickers, a pink lined note with a loop border, polaroids, an envelope, a paper tab and swatches.
 * Positions are in page percent, so everything scales with the book.
 */

type Pos = { x: number; y: number; r?: number; w?: number; h?: number }
export const place = ({ x, y, r = 0, w, h }: Pos): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: w ? `${w}%` : undefined,
  height: h ? `${h}%` : undefined,
  transform: r ? `rotate(${r}deg)` : undefined,
})

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

/** A polaroid. Lift it to read what is written underneath (her notes: "polaroid → handwritten note underneath"). */
export function Polaroid({ photo, tape, lift = 'left', ...pos }: Pos & { photo: Project['photos'][number]; tape?: 1 | 2; lift?: 'left' | 'right' }) {
  const [lifted, setLifted] = useState(false)
  const toward = { '--lift-r': lift === 'left' ? '-4deg' : '4deg' }
  return (
    <div className="polaroid" style={{ ...place(pos), ...(toward as CSSProperties) }}>
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
        <span className="polaroid__photo">{photo.src ? <img src={photo.src} alt="" loading="lazy" /> : <span className="polaroid__empty">photo to come</span>}</span>
        <span className="polaroid__caption">{photo.caption}</span>
        {tape && <img className="polaroid__tape" src={tape === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} />}
      </button>
    </div>
  )
}

/** An envelope with the concept note inside (her notes: "envelope → concept note"). */
export function Envelope({ text, ...pos }: Pos & { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      className={`envelope ${open ? 'is-open' : ''}`}
      style={place(pos)}
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

/** A paper tab poking out of a pocket; pull it and the spec sheet slides out (her notes: "paper tab → specs sheet hidden"). */
export function SpecTab({ specs, ...pos }: Pos & { specs: Project['specs'] }) {
  const [out, setOut] = useState(false)
  return (
    <div className={`spec ${out ? 'is-out' : ''}`} style={place(pos)}>
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
  }, [zoom])
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
      {zoom &&
        createPortal(
          <div className="zoom" role="dialog" aria-label={swatch.name} onClick={() => setZoom(false)}>
            <span className="zoom__cloth" style={{ backgroundImage: `url(${swatch.src ?? fabricUrl(swatch.kind, 768)})` }} />
            <span className="zoom__tag">{swatch.name}</span>
            <span className="zoom__hint">click anywhere to put it back</span>
          </div>,
          document.body,
        )}
    </>
  )
}
