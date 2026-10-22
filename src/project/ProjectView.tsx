import { ArrowLeft } from '@phosphor-icons/react'
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { details, type Detail, type Section } from '../content/projects/details'
import { art, publicUrl } from '../lib/art'
import { Board, lb, Line, Note, PieceView, RedPaper, Sticker, Strip, Tape, tilt, Words } from './pieces'
import { useReveal } from './reveal'

/**
 * A project's own page: the scrapbook opened up on her table, page by page. Her cover comes first,
 * big, with the project's name on her index paper; then each of her pages whole, as she drew it, and
 * under it boards (joined by her ring binding) holding what is on that page: a few lines in her voice
 * and every piece cut from it, stuck down like things in a scrapbook. The story, the concept note,
 * the spec sheet and the palette sit on their own boards. Her yellow corner flap turns to the next
 * project; the tabs on the right edge (wide screens) jump between her pages.
 */
const num = (n: number) => String(n).padStart(2, '0')
/** The book, open at this project's spread. */
const bookAt = (slug: string) => `./#p/${slug}`
const css = (vars: Record<string, string | number>) => vars as CSSProperties

/**
 * Each of her pages with its sections. A piece in the manifest that no section names is added to the
 * last section of its page, so nothing she cut is ever left off.
 */
function arrange(d: Detail) {
  const named = new Set<string>()
  for (const s of d.sections) {
    s.pieces.forEach((p) => named.add(p.cut))
    for (const c of [s.lettering, s.tab, s.flap]) if (c) named.add(c)
  }
  const pages: Section[][] = d.art.pages.map((_, i) => d.sections.filter((s) => s.page === i + 1))
  for (const [name, cut] of Object.entries(d.art.cuts)) {
    if (named.has(name) || !pages[cut.page - 1]) continue
    const on = pages[cut.page - 1]
    if (!on.length) on.push({ id: `page-${cut.page}-more`, heading: `Page ${cut.page}`, page: cut.page, text: '', pieces: [] })
    const last = on[on.length - 1]
    on[on.length - 1] = { ...last, pieces: [...last.pieces, { cut: name, look: 'print', w: 22 }] }
  }
  return pages
}

/** Two of her stickers on a board's corners, a different pair on each board. */
function Stickers({ i }: { i: number }) {
  const set = [art.book.heart, art.book.sparkle, art.book.smiley]
  return (
    <>
      <Sticker src={set[i % 3]} className="sticker--a" style={css({ '--r': `${tilt(i, 4)}deg` })} />
      <Sticker src={set[(i + 1) % 3]} className="sticker--b" style={css({ '--r': `${tilt(i + 3, 4)}deg` })} />
    </>
  )
}

function TopBar({ d }: { d?: Detail }) {
  return (
    <nav className="topbar" aria-label="Komal's projects">
      <a className="ytab ytab--back" href={d ? bookAt(d.slug) : './#index'}>
        <ArrowLeft size={16} weight="bold" aria-hidden />
        back to the scrapbook
      </a>
      <ul className="topbar__projects">
        {details.map((x) => (
          <li key={x.slug}>
            <a className="ytab" href={`#${x.slug}`} aria-current={x === d ? 'page' : undefined}>
              PROJECT {num(x.n)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** One of her pages, whole, lying on the table. */
function PagePic({ d, n, eager = false }: { d: Detail; n: number; eager?: boolean }) {
  const page = d.art.pages[n - 1]
  const src = publicUrl(page.src)
  const alt = d.pageAlts[n - 1] ?? `Her page ${n}`
  return (
    <figure className={`spread__page ${n === 1 ? 'spread__page--cover' : ''}`} data-reveal>
      <button type="button" className="pc__hit" {...lb(src, alt, page.w, page.h)}>
        <img src={src} width={page.w} height={page.h} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" draggable={false} />
      </button>
    </figure>
  )
}

/** Her cover, big, with the name of the project on her index paper. */
function Hero({ d }: { d: Detail }) {
  return (
    <header className="hero" id="cover">
      <PagePic d={d} n={1} eager />
      <div className="hero__below">
        <div className="hero__card" data-reveal>
          <img className="hero__lettering" src={art.projectTitles[d.n - 1]} alt={`Project ${num(d.n)}`} draggable={false} />
          <h1 className="hero__title">{d.title}</h1>
          {d.subtitle && <p className="hero__sub">{d.subtitle}</p>}
          <Tape kind={1} style={css({ left: '-6%', top: '-9%', width: '30%', rotate: '-26deg' })} />
          <Sticker src={art.book.sparkle} className="hero__sparkle" />
          <Sticker src={art.book.heart} className="hero__heart" />
        </div>
        <p className="hero__hint" aria-hidden>
          scroll down to turn the pages
        </p>
      </div>
    </header>
  )
}

/** Her story on the lined note, the concept note pulled out of its envelope, her words on red paper. */
function StoryBoard({ d, i }: { d: Detail; i: number }) {
  return (
    <Board id="story" label="The story" i={i} className="board--story">
      <header className="sheet__head">
        <Strip>the story</Strip>
      </header>
      <div className="story">
        <Note className="story__note">
          <p>{d.story}</p>
        </Note>
        <div className="letter" data-reveal>
          <div className="letter__paper">
            <b>concept</b>
            <p>{d.concept}</p>
          </div>
          <span className="letter__flap" aria-hidden />
          <span className="letter__envelope" aria-hidden>
            <img className="letter__seal" src={art.book.heart} alt="" draggable={false} />
          </span>
        </div>
        {d.redNote && <RedPaper className="story__red">{d.redNote}</RedPaper>}
      </div>
      <Stickers i={i} />
    </Board>
  )
}

function SectionBoard({ d, s, i, bound }: { d: Detail; s: Section; i: number; bound: boolean }) {
  const lettering = s.lettering ? d.art.cuts[s.lettering] : undefined
  const tab = s.tab ? d.art.cuts[s.tab] : undefined
  const flap = s.flap ? d.art.cuts[s.flap] : undefined
  const hangs = s.pieces.filter((p) => p.look === 'hang')
  return (
    <Board id={`s-${s.id}`} label={s.heading} bound={bound} i={i} className={`board--section ${flap ? 'has-flap' : ''}`}>
      <header className="sheet__head">
        {lettering ? (
          <h2 className="sheet__lettering">
            <img src={publicUrl(lettering.src)} width={lettering.w} height={lettering.h} alt={s.heading} loading="lazy" draggable={false} />
          </h2>
        ) : (
          <Strip>{s.heading}</Strip>
        )}
        <span className="sheet__page">from her page {s.page}</span>
      </header>
      <div className="sheet__body">
        {(s.text || s.words) && (
          <div className="sheet__intro">
            {s.text && (
              <Note>
                <p>{s.text}</p>
              </Note>
            )}
            {s.words && <Words words={s.words} />}
          </div>
        )}
        {s.pieces.map((p, k) => (
          <PieceView key={p.cut} d={d} p={p} i={k + i} />
        ))}
      </div>
      {hangs.length > 0 && <Line d={d} pieces={hangs} />}
      {tab && <img className="board__tab" src={publicUrl(tab.src)} width={tab.w} height={tab.h} alt={tab.alt} loading="lazy" draggable={false} />}
      {flap && <img className="board__flap" src={publicUrl(flap.src)} width={flap.w} height={flap.h} alt={flap.alt} loading="lazy" draggable={false} />}
      <Stickers i={i} />
    </Board>
  )
}

/** The spec sheet, ruled like her index, and her palette painted out. */
function SpecBoard({ d, i, bound }: { d: Detail; i: number; bound: boolean }) {
  return (
    <Board id="specs" label="Spec sheet and palette" bound={bound} i={i} className="board--specs">
      <header className="sheet__head">
        <Strip>the details</Strip>
      </header>
      <div className="specs">
        <div className="spec-card" data-reveal>
          <span className="spec-card__tab" aria-hidden>
            specs
          </span>
          <h3>spec sheet</h3>
          <table className="spec-table">
            <tbody>
              {d.specs.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.palette.length > 0 && (
          <div className="palette" data-reveal>
            <h3>my palette</h3>
            <ul>
              {d.palette.map((c, k) => (
                <li key={c.cut} className="paint" style={css({ '--hex': c.hex, '--r': `${tilt(k + 2, 1.2)}deg` })}>
                  <span className="paint__chip" aria-hidden />
                  <span className="paint__code">{c.code}</span>
                  <span className="paint__name">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Stickers i={i} />
    </Board>
  )
}

/** Her yellow corner flap and her "turn" to the next project; the green one back to the previous. */
function EndNav({ d }: { d: Detail }) {
  const at = details.indexOf(d)
  const prev = details[at - 1]
  const next = details[at + 1]
  return (
    <nav className="endnav" aria-label="Where next">
      {prev ? (
        <a className="endflap endflap--prev" href={`#${prev.slug}`} aria-label={`Back to project ${num(prev.n)}: ${prev.title}`}>
          <img className="endflap__img" src={art.book.flapGreen} alt="" draggable={false} />
          <span>PROJECT {num(prev.n)}</span>
        </a>
      ) : (
        <span className="endflap endflap--none" />
      )}
      <a className="ytab endnav__book" href={bookAt(d.slug)}>
        <ArrowLeft size={16} weight="bold" aria-hidden />
        back to the scrapbook
      </a>
      <a
        className={`endflap endflap--next ${next ? '' : 'endflap--index'}`}
        href={next ? `#${next.slug}` : './#index'}
        aria-label={next ? `Turn to project ${num(next.n)}: ${next.title}` : 'Turn to the index of the scrapbook'}
      >
        <img className="endflap__turn" src={art.book.turn} alt="" draggable={false} />
        <img className="endflap__img" src={next ? art.book.flapYellow : art.book.flapGreen} alt="" draggable={false} />
        <span>{next ? `PROJECT ${num(next.n)}` : 'INDEX'}</span>
      </a>
    </nav>
  )
}

/** Tabs on the right edge, like the ones on her pages: jump to her cover, a page, or the spec sheet. */
const tabsFor = (d: Detail) => [
  { id: 'cover', label: 'COVER' },
  ...d.art.pages.slice(1).map((_, k) => ({ id: `page-${k + 2}`, label: `PAGE ${k + 2}` })),
  { id: 'specs', label: 'SPECS' },
]

function SideTabs({ d }: { d: Detail }) {
  const tabs = tabsFor(d)
  const [on, setOn] = useState('cover')
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setOn(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    tabsFor(d).forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [d])
  return (
    <nav className="sidetabs" aria-label="Her pages">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`sidetab ${on === t.id ? 'is-on' : ''}`}
          aria-current={on === t.id ? 'true' : undefined}
          onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export function ProjectView({ d }: { d: Detail }) {
  const root = useRef<HTMLElement>(null)
  useReveal(root, d.slug)
  const pages = arrange(d)
  let b = 0
  return (
    <main className="pj-main" ref={root}>
      <TopBar d={d} />
      <Hero d={d} />
      <div className="boards">
        <StoryBoard d={d} i={b++} />
        {pages[0].map((s) => (
          <SectionBoard key={s.id} d={d} s={s} i={b++} bound />
        ))}
      </div>
      {pages.slice(1).map((sections, k) => {
        const n = k + 2
        const last = n === pages.length
        return (
          <Fragment key={n}>
            <section className="spread" id={`page-${n}`} aria-label={`Her page ${n} of ${pages.length}`}>
              <p className="spread__tag" aria-hidden>
                page {n}
              </p>
              <PagePic d={d} n={n} />
            </section>
            <div className="boards">
              {sections.map((s, j) => (
                <SectionBoard key={s.id} d={d} s={s} i={b++} bound={j > 0} />
              ))}
              {last && <SpecBoard d={d} i={b++} bound={sections.length > 0} />}
            </div>
          </Fragment>
        )
      })}
      <EndNav d={d} />
      <footer className="pj-foot">Komal Singh · fashion design</footer>
      <SideTabs d={d} />
    </main>
  )
}

/** No project in the link (or one without its own page yet): the projects that have one. */
export function ProjectIndex() {
  const root = useRef<HTMLElement>(null)
  useReveal(root, 'index')
  return (
    <main className="pj-main pj-main--index" ref={root}>
      <TopBar />
      <Board label="Projects" className="board--index">
        <header className="sheet__head">
          <Strip as="h1">my projects</Strip>
        </header>
        <ul className="pindex">
          {details.map((d, k) => (
            <li key={d.slug} style={css({ '--r': `${tilt(k, 0.8)}deg` })}>
              <a className="pindex__card" href={`#${d.slug}`}>
                <img className="pindex__cover" src={publicUrl(d.art.pages[0].src)} alt="" loading="lazy" draggable={false} />
                <img className="pindex__lettering" src={art.projectTitles[d.n - 1]} alt={`Project ${num(d.n)}`} draggable={false} />
                <span className="pindex__title">{d.title}</span>
              </a>
            </li>
          ))}
        </ul>
        <Stickers i={1} />
      </Board>
    </main>
  )
}
