import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Swatch as SwatchT } from '../../content/site'
import { fabricUrl } from '../../lib/textures/fabrics'
import { rng } from '../../lib/textures/util'
import { sound } from '../../lib/audio'

/** Small physical things that get stuck into a scrapbook. Positions are in page-relative units. */

type Pos = { x: number; y: number; r?: number; w?: number }
const place = ({ x, y, r = 0, w }: Pos): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: w ? `${w}%` : undefined,
  transform: `rotate(${r}deg)`,
})

export function Tape({ color = '#f2a7bf', ...pos }: Pos & { color?: string }) {
  return <span className="tape" style={{ ...place(pos), ['--tape' as string]: color }} />
}

const LETTER_FONTS = ['f-bodoni', 'f-bodoni-i', 'f-sans', 'f-type', 'f-marker', 'f-kid']
const LETTER_PAPERS = ['#f6f1e7', '#151515', '#e9d24a', '#d9534f', '#f1c4d6', '#9ec5e8', '#ffffff']

/** Ransom-note letters cut out of magazines. */
export function Cutout({ text, seed = 1, className = '' }: { text: string; seed?: number; className?: string }) {
  const r = rng(seed)
  return (
    <span className={`cutout ${className}`} aria-label={text} role="img">
      {[...text].map((ch, i) => {
        if (ch === ' ') return <span key={i} className="cutout__gap" />
        const paper = LETTER_PAPERS[Math.floor(r() * LETTER_PAPERS.length)]
        const dark = paper === '#151515'
        return (
          <span
            key={i}
            aria-hidden
            className={`cutout__l ${LETTER_FONTS[Math.floor(r() * LETTER_FONTS.length)]}`}
            style={{
              background: paper,
              color: dark ? '#f6f1e7' : r() > 0.75 ? '#b3261e' : '#151515',
              transform: `rotate(${(r() - 0.5) * 14}deg) translateY(${(r() - 0.5) * 8}%)`,
              fontSize: `${0.85 + r() * 0.35}em`,
            }}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}

/** A Dymo label-maker strip. */
export function Dymo({ children, color = '#151515', ...pos }: Pos & { children: ReactNode; color?: string }) {
  return (
    <span className="dymo" style={{ ...place(pos), background: color }}>
      {children}
    </span>
  )
}

/** The zig-zag edge pinking shears leave, as a clip-path. */
const PINKED = (() => {
  const teeth = 14
  const d = 2.6
  const pts: string[] = []
  for (let i = 0; i <= teeth; i++) pts.push(`${(i / teeth) * 100}% ${i % 2 ? d : 0}%`)
  for (let i = 0; i <= teeth; i++) pts.push(`${i % 2 ? 100 - d : 100}% ${(i / teeth) * 100}%`)
  for (let i = teeth; i >= 0; i--) pts.push(`${(i / teeth) * 100}% ${i % 2 ? 100 - d : 100}%`)
  for (let i = teeth; i >= 0; i--) pts.push(`${i % 2 ? d : 0}% ${(i / teeth) * 100}%`)
  return `polygon(${pts.join(',')})`
})()

/** Fabric cut with pinking shears, with a little paper tag. */
export function Swatch({ swatch, ...pos }: Pos & { swatch: SwatchT }) {
  return (
    <figure className="swatch" style={place(pos)}>
      <span className="swatch__cloth" style={{ backgroundImage: `url(${fabricUrl(swatch.kind)})`, clipPath: PINKED }} />
      <span className="swatch__pin" />
      <figcaption className="swatch__tag">{swatch.name}</figcaption>
    </figure>
  )
}

/**
 * A polaroid. Click it to turn it over and read what is written on the back (her idea from the
 * call: "a Polaroid, and something on the other side"). Empty slots show where a photo goes.
 */
export function Polaroid({ src, caption, back, tape, ...pos }: Pos & { src?: string; caption: string; back?: string; tape?: string }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="polaroid" style={place(pos)} data-interactive>
      <button
        className={`polaroid__card ${flipped ? 'is-flipped' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          sound.click()
          setFlipped((f) => !f)
        }}
        aria-label={`${caption}${back ? `. Turn over to read: ${back}` : ''}`}
        aria-pressed={flipped}
      >
        <span className="polaroid__front">
          <span className="polaroid__photo">
            {src ? <img src={src} alt="" loading="lazy" /> : <span className="polaroid__empty">photo to come</span>}
            <span className="corner corner--tl" />
            <span className="corner corner--br" />
          </span>
          <span className="polaroid__caption">{caption}</span>
        </span>
        <span className="polaroid__back">
          <span>{back ?? caption}</span>
        </span>
      </button>
      {tape && <span className="tape tape--top" style={{ ['--tape' as string]: tape }} />}
    </div>
  )
}

/** A sewing button, used as the bullet for index entries. */
export function SewButton({ color }: { color: string }) {
  return (
    <span className="sewbtn" style={{ background: color }} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export function Sticky({ children, color = '#fff27a', ...pos }: Pos & { children: ReactNode; color?: string }) {
  return (
    <p className="sticky" style={{ ...place(pos), background: color }}>
      {children}
    </p>
  )
}
