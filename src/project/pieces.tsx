import type { CSSProperties, ReactNode } from 'react'
import type { Cut, Detail, Piece } from '../content/projects/details'
import { art, publicUrl } from '../lib/art'
import ring from './art/ring.webp'

/**
 * The things stuck onto a project page's boards, in the style of her scrapbook: her teal boards
 * joined by her ring binding, her washi tape and stickers, prints, polaroids, her pink loop border,
 * her yellow labels, Pantone chips and fabric cut with pinking shears. Every piece cut from her pages
 * opens large in the lightbox (see Lightbox.tsx): a `data-lb` button carries what it shows.
 */

/** A small hand-placed tilt, the same every time for the same place. */
export const tilt = (i: number, k = 1) => [-2.6, 1.8, -1.2, 3, -3.4, 1.1, 2.4, -1.8][i % 8] * k

const css = (vars: Record<string, string | number | undefined>) => vars as CSSProperties

/** What the lightbox needs to open a picture: put these on the button that shows it. */
export function lb(src: string, alt: string, w: number, h: number) {
  return { 'data-lb': '', 'data-src': src, 'data-alt': alt, 'data-w': w, 'data-h': h, 'aria-haspopup': 'dialog' as const }
}

/** One picture from her pages, in a button that opens it large. */
export function Pic({ cut, className = 'pc__img', eager = false, children }: { cut: Cut; className?: string; eager?: boolean; children?: ReactNode }) {
  const src = publicUrl(cut.src)
  return (
    <button type="button" className="pc__hit" {...lb(src, cut.alt, cut.w, cut.h)}>
      <img className={className} src={src} width={cut.w} height={cut.h} alt={cut.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
      {children}
    </button>
  )
}

export function Tape({ kind = 1, className = '', style }: { kind?: 1 | 2; className?: string; style?: CSSProperties }) {
  return <img className={`tape ${className}`} src={kind === 1 ? art.book.tape1 : art.book.tape2} alt="" draggable={false} style={style} />
}

export function Sticker({ src, className = '', style }: { src: string; className?: string; style?: CSSProperties }) {
  return <img className={`sticker ${className}`} src={src} alt="" draggable={false} style={style} />
}

/** Her ring binding: the rings that join one board to the board above it, as on her cover pages. */
export function Rings() {
  return (
    <div className="rings" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <img key={i} src={ring} alt="" draggable={false} />
      ))}
    </div>
  )
}

/** One of her teal boards with its pale pink page, lying on the table. */
export function Board({
  id,
  label,
  bound = false,
  i = 0,
  className = '',
  children,
}: {
  id?: string
  label: string
  bound?: boolean
  i?: number
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`board ${bound ? 'board--bound' : ''} ${className}`} aria-label={label} style={css({ '--tilt': `${tilt(i, 0.18)}deg` })} data-reveal>
      {bound && <Rings />}
      {children}
    </section>
  )
}

/** Pink lined paper with her loop border, like her About page. */
export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`note ${className}`}>{children}</div>
}

/** A heading on a strip of white paper in red marker, like her INSPIRATION strips. */
export function Strip({ children, as: Tag = 'h2', className = '' }: { children: ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  return <Tag className={`strip ${className}`}>{children}</Tag>
}

/** Her keywords on yellow labels, the way she labelled her boards. */
export function Words({ words }: { words: string[] }) {
  return (
    <ul className="words" aria-label="Words">
      {words.map((w, i) => (
        <li key={w} className="word" style={css({ '--r': `${tilt(i + 3, 1.3)}deg` })}>
          {w}
        </li>
      ))}
    </ul>
  )
}

/** A sheet of her red paper with her tape, written on in white like "Komal, age 7". */
export function RedPaper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`red-paper ${className}`}>
      <span className="red-paper__text">{children}</span>
      <Tape kind={2} style={css({ left: '-4%', top: '-14%', width: '30%', rotate: '-22deg' })} />
    </div>
  )
}

/** A piece's width in its column (percent), from its width on a wide board: small strips stay narrow. */
export const colWidth = (p: Piece) => Math.min(100, Math.max(p.w < 14 ? 34 : 58, p.w * 3.4))

/** The default width on a phone for a piece that is `w` percent of a wide board. */
const phoneWidth = (w: number) => (w >= 40 ? 100 : w >= 24 ? 74 : w >= 15 ? 48 : 36)

/** A piece cut from her page, stuck down the way its `look` says. */
export function PieceView({ d, p, i }: { d: Detail; p: Piece; i: number }) {
  const cut = d.art.cuts[p.cut]
  if (!cut) return null
  const style = css({
    '--w': `${p.w}%`,
    '--wm': `${p.wm ?? phoneWidth(p.w)}%`,
    // in the columns: its width in a column, and never blown up much past the size it was cut at
    '--cw': `${colWidth(p)}%`,
    '--nw': cut.w,
    '--ar': (cut.w / cut.h).toFixed(3),
    '--r': `${p.r ?? tilt(i)}deg`,
    '--d': `${(i % 4) * 70}ms`,
  })
  // one thin strip of tape at the top, only just over the picture's edge; a print wider than it is
  // tall is taped at its two top corners instead, so the tape stays off her lettering and off faces
  const tape = <Tape kind={1} className="tape--top" style={css({ rotate: `${tilt(i + 5, 1.6)}deg` })} />
  const corners = (
    <>
      <Tape kind={1} className="tape--corner tape--l" style={css({ rotate: `${-38 + tilt(i, 1.5)}deg` })} />
      <Tape kind={1} className="tape--corner tape--r" style={css({ rotate: `${38 + tilt(i + 3, 1.5)}deg` })} />
    </>
  )

  switch (p.look) {
    case 'print':
      return (
        <figure className="pc pc--print" style={style} data-reveal>
          <Pic cut={cut} />
          {cut.w > cut.h * 1.1 ? corners : tape}
        </figure>
      )
    case 'polaroid':
      return (
        <figure className="pc pc--polaroid" style={style} data-reveal>
          <Pic cut={cut}>{p.caption && <span className="pc__cap">{p.caption}</span>}</Pic>
          {tape}
          {p.note && <figcaption className="pc__note">{p.note}</figcaption>}
        </figure>
      )
    case 'card':
      return (
        <figure className="pc pc--card" style={style} data-reveal>
          <Pic cut={cut} />
        </figure>
      )
    case 'chip': {
      // her chip already carries its code: only the colour's name, written by hand, goes under it
      const c = d.palette.find((x) => x.cut === p.cut)
      return (
        <figure className="pc pc--chip" style={style} data-reveal>
          <Pic cut={cut} />
          {c && <figcaption className="tag">{c.label}</figcaption>}
        </figure>
      )
    }
    case 'fabric':
      return (
        <figure className="pc pc--fabric" style={style} data-reveal>
          <button type="button" className="pc__hit" {...lb(publicUrl(cut.src), cut.alt, cut.w, cut.h)} aria-label={`${p.caption ?? 'fabric'}: ${cut.alt}`}>
            {/* drawn once the swatch is in view (a background image does not wait like a lazy image) */}
            <span className="pc__cloth" style={css({ '--cloth': `url(${publicUrl(cut.src)})` })} />
          </button>
          {p.caption && <figcaption className="tag tag--fabric">{p.caption}</figcaption>}
        </figure>
      )
    case 'lettering':
      return (
        <figure className="pc pc--lettering" style={style} data-reveal>
          <Pic cut={cut} />
        </figure>
      )
    case 'hang':
      return null
    default:
      return (
        <figure className="pc pc--cutout" style={style} data-reveal>
          <Pic cut={cut} />
        </figure>
      )
  }
}

/** The line-up, pegged on a red thread like washing on a line. */
export function Line({ d, pieces }: { d: Detail; pieces: Piece[] }) {
  return (
    <ul className="line" aria-label="The line-up, look by look">
      {pieces.map((p, i) => {
        const cut = d.art.cuts[p.cut]
        if (!cut) return null
        return (
          <li key={p.cut} className="line__look" style={css({ '--r': `${tilt(i, 0.9)}deg`, '--d': `${(i % 6) * 60}ms`, '--ar': `${cut.w / cut.h}` })} data-reveal>
            <span className="line__peg" aria-hidden />
            <Pic cut={cut} />
          </li>
        )
      })}
    </ul>
  )
}
