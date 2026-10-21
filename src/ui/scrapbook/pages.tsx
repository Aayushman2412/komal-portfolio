import { EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { site, type Project } from '../../content/site'
import { art, regions } from '../../lib/art'
import { Envelope, Note, Polaroid, SpecTab, Sticker, Swatch, Tape } from './bits'

/**
 * The faces of the scrapbook, in reading order. A face is one side of one leaf; on desktop two
 * faces show as a spread. The first ones are her drawn pages exactly as she drew them, with
 * clickable spots over her tabs, her "turn" flap and her index rows. Project pages are built on a
 * blank page cut from her drawing until she draws or sends them.
 */
export type Go = (target: string) => void
export type Spot = { box: number[]; to: string; label: string }
export type Face = { id: string; label: string; src: string; spots?: Spot[]; render?: (go: Go) => ReactNode }

const R = regions.book
const first = site.projects[0].slug
const num = (i: number) => String(i + 1).padStart(2, '0')

const tabs = (): Spot[] => [
  { box: R.tabs.about, to: 'about', label: 'About me' },
  { box: R.tabs.index, to: 'index', label: 'Index' },
  { box: R.tabs.project, to: first, label: 'Projects' },
]

function ProjectLeft({ p, n }: { p: Project; n: number }) {
  return (
    <>
      <h2 className="proj__num">PROJECT {num(n)}</h2>
      <p className="proj__title">
        {p.title} <span>{p.year}</span>
      </p>
      <Tape kind={2} x={4} y={24} r={-8} w={20} />
      <Note x={9} y={29} w={82} h={33} r={-1.2}>
        <p>{p.story}</p>
      </Note>
      <Envelope x={10} y={67} w={40} h={20} r={-4} text={p.concept} />
      <SpecTab x={58} y={66} w={32} h={24} r={3} specs={p.specs} />
      <Sticker src={art.book.smiley} x={82} y={14} w={9} r={10} />
    </>
  )
}

function ProjectRight({ p }: { p: Project }) {
  return (
    <>
      <Polaroid x={8} y={12} w={44} r={-5} photo={p.photos[0]} tape={1} />
      <Polaroid x={47} y={30} w={40} r={5} photo={p.photos[1]} tape={2} lift="right" />
      <Sticker src={art.book.sparkle} x={78} y={14} w={8} r={-8} />
      <Sticker src={art.book.sparkle} x={8} y={60} w={6} r={12} />
      {p.swatches.map((s, i) => (
        <Swatch key={s.name + i} x={12 + i * 32} y={72 - i * 3} w={22} r={i % 2 ? 6 : -7} swatch={s} />
      ))}
    </>
  )
}

function Contact() {
  const c = site.contact
  return (
    <>
      <h2 className="proj__num">{c.heading}</h2>
      <Tape kind={1} x={60} y={21} r={10} w={22} />
      <Note x={10} y={26} w={80} h={40} r={1}>
        <p>{c.note}</p>
        <p>
          <a href={`mailto:${c.email}`} data-interactive>
            <EnvelopeSimple size="1em" weight="bold" /> {c.email}
          </a>
        </p>
        <p>
          <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" data-interactive>
            <InstagramLogo size="1em" weight="bold" /> {c.instagram}
          </a>
        </p>
      </Note>
      <Sticker src={art.book.heart} x={76} y={68} w={12} r={-12} />
    </>
  )
}

function End({ go }: { go: Go }) {
  return (
    <>
      <p className="the-end">the end (for now)</p>
      <button
        className="back-to-index"
        data-interactive
        onClick={(e) => {
          e.stopPropagation()
          go('index')
        }}
      >
        back to the index
      </button>
      <Sticker src={art.book.sparkle} x={22} y={30} w={9} r={-10} />
      <Sticker src={art.book.sparkle} x={70} y={58} w={7} r={14} />
      <Sticker src={art.book.smiley} x={44} y={62} w={11} r={-6} />
    </>
  )
}

export function buildFaces(): Face[] {
  const faces: Face[] = [
    { id: 'cover', label: "Komal's fashion world", src: art.book.cover },
    { id: 'who', label: 'who is she?', src: art.book.s1l },
    { id: 'who:r', label: 'who is she?', src: art.book.s1r, spots: [{ box: R.turnFlap, to: 'about', label: 'Turn the page' }, ...tabs()] },
    { id: 'about', label: 'about me', src: art.book.s2l },
    {
      id: 'index',
      label: 'index',
      src: art.book.s2r,
      spots: [
        ...R.indexRows.slice(0, site.projects.length).map((box, i) => ({ box, to: site.projects[i].slug, label: `Project ${num(i)}` })),
        { box: R.turnFlap, to: first, label: `Project ${num(0)}` },
        { box: R.tabs.project, to: first, label: 'Projects' },
      ],
    },
  ]
  site.projects.forEach((p, i) => {
    faces.push({ id: p.slug, label: `project ${num(i)}`, src: art.book.blankL, render: () => <ProjectLeft p={p} n={i} /> })
    faces.push({ id: `${p.slug}:r`, label: `project ${num(i)}`, src: art.book.blankR, spots: tabs(), render: () => <ProjectRight p={p} /> })
  })
  faces.push({ id: 'contact', label: site.contact.heading, src: art.book.blankL, render: () => <Contact /> })
  faces.push({ id: 'end', label: 'the end', src: art.book.blankR, spots: tabs(), render: (go) => <End go={go} /> })
  if (faces.length % 2 === 0) faces.push({ id: 'blank', label: '', src: art.book.blankL })
  faces.push({ id: 'back', label: 'back cover', src: art.book.back })
  return faces
}
