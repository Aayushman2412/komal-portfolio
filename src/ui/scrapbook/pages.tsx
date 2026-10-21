import type { ReactNode } from 'react'
import { site, type Project } from '../../content/site'
import { art, regions } from '../../lib/art'
import { Envelope, Flap, IndexCard, Note, Polaroid, RedPaper, SpecTab, Sticker, Swatch, Tape } from './bits'

/**
 * The faces of the scrapbook, in reading order. A face is one side of one leaf; on desktop two
 * faces show as a spread. The first ones are her drawn pages exactly as she drew them, with
 * clickable spots over her tabs, her "turn" flap and her index rows. Project pages are built from
 * her own pieces (a blank page cut from her spread, her index paper and lettering, her red paper,
 * tape, stickers, corner flap and "turn") until she draws or sends them.
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
      <IndexCard x={10} y={13} w={50} h={13.5} r={-2} className="proj__card">
        <img className="proj__lettering" src={art.projectTitles[n] ?? art.projectTitles[0]} alt={`Project ${num(n)}`} draggable={false} />
      </IndexCard>
      <Sticker src={art.book.smiley} x={66} y={14} w={9} r={10} />
      <Sticker src={art.book.sparkle} x={80} y={20} w={6} r={-6} />
      <p className="proj__title">
        {p.title} <span>{p.year}</span>
      </p>
      <Tape kind={2} x={3} y={32.5} r={-8} w={18} />
      <Note x={9} y={34} w={82} h={29} r={-1.2}>
        <p>{p.story}</p>
      </Note>
      <Envelope x={9} y={67.5} w={40} h={19} r={-4} text={p.concept} />
      <SpecTab x={57} y={66} w={34} h={23} r={3} specs={p.specs} />
    </>
  )
}

function ProjectRight({ p, next, go }: { p: Project; next: { to: string; label: string }; go: Go }) {
  return (
    <>
      <RedPaper x={7} y={13} w={56} h={50} r={-3}>
        <span className="red-paper__note">{p.photos[0].caption}</span>
      </RedPaper>
      <Polaroid x={12} y={17} w={44} r={-5} photo={p.photos[0]} tape={1} />
      <Polaroid x={55} y={33} w={37} r={6} photo={p.photos[1]} tape={1} lift="right" />
      <Sticker src={art.book.sparkle} x={78} y={15} w={8} r={-8} />
      <Sticker src={art.book.heart} x={46} y={64} w={8} r={-14} />
      {p.swatches.map((s, i) => (
        <Swatch key={s.name + i} x={10 + i * 25} y={68 + (i % 2) * 3} w={19} r={i % 2 ? 6 : -7} swatch={s} />
      ))}
      <Flap label={next.label} onGo={() => go(next.to)} />
    </>
  )
}

function Contact() {
  const c = site.contact
  return (
    <>
      <IndexCard x={9} y={15} w={82} h={52} r={-1} className="contact">
        <h2>WRITE TO ME</h2>
        <p className="contact__note">{c.note}</p>
        <span className="contact__table">
          <span>EMAIL</span>
          <a href={`mailto:${c.email}`} data-interactive>
            {c.email}
          </a>
          <span>INSTAGRAM</span>
          <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" data-interactive>
            {c.instagram}
          </a>
        </span>
      </IndexCard>
      <Tape kind={1} x={58} y={11} r={10} w={22} />
      <Sticker src={art.book.heart} x={72} y={64} w={12} r={-12} />
      <Sticker src={art.book.smiley} x={14} y={70} w={11} r={8} />
    </>
  )
}

function End({ go }: { go: Go }) {
  return (
    <>
      <RedPaper x={11} y={16} w={74} h={50} r={2} tape={2}>
        <span className="the-end">
          the end,
          <br />
          for now.
        </span>
      </RedPaper>
      <Sticker src={art.book.sparkle} x={14} y={66} w={9} r={-10} />
      <Sticker src={art.book.sparkle} x={78} y={12} w={7} r={14} />
      <Sticker src={art.book.smiley} x={70} y={60} w={11} r={-6} />
      <Flap label="INDEX" color="green" onGo={() => go('index')} />
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
    const next = site.projects[i + 1] ? { to: site.projects[i + 1].slug, label: `PROJECT ${num(i + 1)}` } : { to: 'contact', label: 'WRITE TO ME' }
    faces.push({ id: p.slug, label: `project ${num(i)}`, src: art.book.blankL, render: () => <ProjectLeft p={p} n={i} /> })
    faces.push({ id: `${p.slug}:r`, label: `project ${num(i)}`, src: art.book.blankR, spots: tabs(), render: (go) => <ProjectRight p={p} next={next} go={go} /> })
  })
  faces.push({ id: 'contact', label: site.contact.heading, src: art.book.blankL, render: () => <Contact /> })
  faces.push({ id: 'end', label: 'the end', src: art.book.blankR, spots: tabs(), render: (go) => <End go={go} /> })
  if (faces.length % 2 === 0) faces.push({ id: 'blank', label: '', src: art.book.blankL })
  faces.push({ id: 'back', label: 'back cover', src: art.book.back })
  return faces
}
