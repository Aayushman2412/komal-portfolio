import { EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { site, type Project } from '../../content/site'
import { Cutout, Dymo, Polaroid, SewButton, Sticky, Swatch, Tape } from './bits'

/**
 * The faces of the scrapbook, in reading order. A face is one side of one leaf; on desktop two
 * faces show as a spread. Everything inside uses page-relative units so it scales with the book.
 */
export type Go = (target: string) => void
export type Face = { id: string; label: string; paper: 'cover' | 'ruled' | 'plain' | 'kraft' | 'black' | 'back'; render: (go: Go) => ReactNode }

const BUTTON_COLORS = ['#c0392b', '#2c5aa0', '#e0a526', '#3f7d4e', '#7d3c98', '#d35400']

/** Blits the same canvas the 3D book wears, so the two covers are pixel-identical. */
function Cover({ source }: { source: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = source.width
    c.height = source.height
    c.getContext('2d')?.drawImage(source, 0, 0)
  }, [source])
  return (
    <div className="face-cover">
      <canvas ref={ref} className="face-cover__art" aria-label={`${site.cover.title}, ${site.cover.owner}`} role="img" />
      <span className="face-cover__hint">open</span>
    </div>
  )
}

function About() {
  const a = site.about
  return (
    <>
      <p className="belongs">this book belongs to</p>
      <h2 className="kidname">{site.firstName}</h2>
      <Dymo x={11} y={28} r={-2}>
        {site.role.toUpperCase()}
      </Dymo>
      <Polaroid x={60} y={5} r={4} w={33} src={a.photo} caption={a.photoCaption} back="this is the only photo where I am not holding scissors" tape="#9ad0c2" />
      <div className="ruled-text" style={{ top: '38.6%' }}>
        {a.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <Sticky x={9} y={75} r={-3} w={46} color="#ffe98a">
        <span className="likes__title">{a.label}</span>
        {a.likes.map((l) => (
          <span key={l} className="likes__item">
            {l}
          </span>
        ))}
      </Sticky>
      <Swatch x={68} y={74} r={-8} w={19} swatch={{ name: 'my first offcut', kind: 'bandhani' }} />
    </>
  )
}

function Index({ go }: { go: Go }) {
  const entries = [
    ...site.projects.map((p, i) => ({ id: p.slug, title: p.title, page: 3 + i * 2, color: BUTTON_COLORS[i % BUTTON_COLORS.length] })),
    { id: 'plan', title: 'the plan', page: 3 + site.projects.length * 2, color: '#7f8c8d' },
    { id: 'contact', title: site.contact.heading, page: 4 + site.projects.length * 2, color: '#16a085' },
  ]
  return (
    <>
      <h2 className="index-title">
        <Cutout text="index" seed={7} />
      </h2>
      <ol className="index-list">
        {entries.map((e, i) => (
          <li key={e.id}>
            <button
              data-interactive
              onClick={(ev) => {
                ev.stopPropagation()
                go(e.id)
              }}
            >
              <SewButton color={e.color} />
              <span className="index-list__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="index-list__t">{e.title}</span>
              <span className="index-list__dots" />
              <span className="index-list__p">p. {e.page}</span>
            </button>
          </li>
        ))}
      </ol>
      <Tape x={70} y={-2} r={8} color="#f6d36b" />
      <Sticky x={60} y={80} r={-4} w={32}>
        press a button to go to a page
      </Sticky>
    </>
  )
}

function ProjectLeft({ p, n }: { p: Project; n: number }) {
  return (
    <>
      <div className="proj-num">
        <Cutout text={String(n).padStart(2, '0')} seed={n * 13} />
      </div>
      <h2 className="proj-title">{p.title}</h2>
      <Dymo x={62} y={12} r={3} color={p.tint}>
        {p.year}
      </Dymo>
      <div className="ruled-text ruled-text--light" style={{ top: '34%' }}>
        <p>{p.story}</p>
      </div>
      {p.notes.map((note, i) => (
        <Sticky key={note} x={8 + i * 30} y={58 + (i % 2) * 5} r={(i % 2 ? 4 : -5) + i} w={26} color={i % 2 ? '#bfe3ff' : '#fff27a'}>
          {note}
        </Sticky>
      ))}
      {p.swatches.map((s, i) => (
        <Swatch key={s.name} x={10 + i * 40} y={74} r={i % 2 ? 6 : -7} w={24} swatch={s} />
      ))}
      <Tape x={-4} y={4} r={-35} color={p.tint} />
    </>
  )
}

function ProjectRight({ p }: { p: Project }) {
  const spots = [
    { x: 8, y: 6, r: -5, w: 50 },
    { x: 50, y: 30, r: 6, w: 44 },
    { x: 12, y: 56, r: 3, w: 46 },
  ]
  return (
    <>
      {p.images.slice(0, 3).map((img, i) => (
        <Polaroid key={i} {...spots[i]} src={img.src} caption={img.caption} back={img.back} tape={i === 1 ? p.tint : undefined} />
      ))}
      <p className="margin-note" style={{ left: '60%', top: '82%' }}>
        turn them over
      </p>
    </>
  )
}

function Plan() {
  return (
    <>
      <h2 className="plan-title">the plan</h2>
      <figure className="plan-img" style={{ left: '6%', top: '14%', width: '86%', transform: 'rotate(-2deg)' }}>
        <img src="/plan/storyboard.jpg" alt="Komal's storyboard: a feed of AI designs, the TV switching off, the almirah, the almirah open with clothes and the scrapbook" />
      </figure>
      <figure className="plan-img" style={{ left: '20%', top: '58%', width: '62%', transform: 'rotate(3deg)' }}>
        <img src="/plan/book-plan.jpg" alt="Komal's plan for the scrapbook: cover, about me, index" />
      </figure>
      <Tape x={40} y={11} r={-4} color="#9ad0c2" />
      <Tape x={44} y={56} r={6} color="#f29cb7" />
      <p className="margin-note" style={{ left: '8%', top: '92%' }}>
        {site.plan.caption}
      </p>
    </>
  )
}

function Contact() {
  const c = site.contact
  return (
    <div className="inland">
      <div className="inland__head">
        <span>INLAND LETTER CARD</span>
        <span className="inland__stamp">
          <span>{site.firstName.toUpperCase()}</span>
        </span>
      </div>
      <h2 className="inland__to">{c.heading}</h2>
      <p className="inland__note">{c.note}</p>
      <ul className="inland__lines">
        <li>
          <a href={`mailto:${c.email}`} data-interactive>
            <EnvelopeSimple size={18} weight="bold" />
            {c.email}
          </a>
        </li>
        <li>
          <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" data-interactive>
            <InstagramLogo size={18} weight="bold" />
            {c.instagram}
          </a>
        </li>
      </ul>
      <p className="inland__fold">fold here</p>
    </div>
  )
}

function BackCover() {
  return (
    <div className="face-back">
      <span className="price">Rs. 25/-</span>
      <p className="the-end">the end (for now)</p>
    </div>
  )
}

export function buildFaces(coverCanvas: HTMLCanvasElement): Face[] {
  const faces: Face[] = [
    { id: 'cover', label: 'cover', paper: 'cover', render: () => <Cover source={coverCanvas} /> },
    { id: 'about', label: 'about', paper: 'ruled', render: () => <About /> },
    { id: 'index', label: 'index', paper: 'plain', render: (go) => <Index go={go} /> },
  ]
  site.projects.forEach((p, i) => {
    faces.push({ id: p.slug, label: p.title, paper: 'kraft', render: () => <ProjectLeft p={p} n={i + 1} /> })
    faces.push({ id: `${p.slug}:r`, label: p.title, paper: 'plain', render: () => <ProjectRight p={p} /> })
  })
  faces.push({ id: 'plan', label: 'the plan', paper: 'black', render: () => <Plan /> })
  faces.push({ id: 'contact', label: site.contact.heading, paper: 'plain', render: () => <Contact /> })
  faces.push({ id: 'back', label: 'back cover', paper: 'back', render: () => <BackCover /> })
  if (faces.length % 2) faces.splice(faces.length - 1, 0, { id: 'blank', label: '', paper: 'plain', render: () => null })
  return faces
}
