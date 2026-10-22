import { ArrowLeft } from '@phosphor-icons/react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { details, type Cut, type Detail, type Piece, type Section } from '../content/projects/details'
import { art, publicUrl } from '../lib/art'
import { askBook } from '../lib/bookChannel'
import { Board, lb, Line, Note, PieceView, RedPaper, Sticker, Strip, Tape, tilt, Words } from './pieces'
import { useReveal } from './reveal'

/**
 * A project's own page: the scrapbook opened up on her table, page by page. Her cover comes first,
 * big, with the project's name on her index paper; then each of her pages whole, as she drew it, the
 * pieces of it that the boards show in parts small under it ("look closer"), and boards (joined by her
 * ring binding) holding what is on that page: a few lines in her voice and the pieces cut from it,
 * stuck down like things in a scrapbook. The story, the concept note, the spec sheet and the palette
 * sit on their own boards. Her yellow corner flap turns to the next project; the tabs on the right
 * edge (wide screens) jump between her pages.
 */
const num = (n: number) => String(n).padStart(2, '0')
/** The book, open at this project's spread. */
const bookAt = (slug: string) => `./#p/${slug}`
const css = (vars: Record<string, string | number>) => vars as CSSProperties

/** The book opened this page in a new tab (and nothing has been followed here since). */
function openedFromBook() {
  try {
    return history.length === 1 && !!document.referrer && new URL(document.referrer).origin === location.origin
  } catch {
    return false
  }
}

/**
 * Back to the book, at `target` (this project, or 'index'). When the book opened this page in a new
 * tab and is still open behind it, it turns there and this tab closes, rather than load a second copy
 * of the whole story in it. Opened any other way (a shared link, or after turning to another project
 * here), or with the book's tab gone, the link simply goes to the book.
 */
const toBook = (target: string) => (e: MouseEvent<HTMLAnchorElement>) => {
  if (!openedFromBook() || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  const href = e.currentTarget.href
  e.preventDefault()
  askBook(target).then((answered) => {
    if (!answered) return location.assign(href)
    window.close()
    // still here (the browser kept the tab open): go there after all
    setTimeout(() => location.assign(href), 150)
  })
}

/**
 * Each of her pages with its sections. A piece in the manifest that no section (and no "look closer"
 * strip) names is added to the last section of its page, so nothing she cut is ever left off.
 */
function arrange(d: Detail) {
  const named = new Set<string>(['cover', ...Object.values(d.closer).flat()])
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
      <a className="ytab ytab--back" href={d ? bookAt(d.slug) : './#index'} onClick={toBook(d ? d.slug : 'index')}>
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

/** One of her pages, whole, lying on the table; it opens large (or opens `opens`, her cover cut from it). */
function PagePic({ d, n, eager = false, opens }: { d: Detail; n: number; eager?: boolean; opens?: Cut }) {
  const page = d.art.pages[n - 1]
  const src = publicUrl(page.src)
  const alt = d.pageAlts[n - 1] ?? `Her page ${n}`
  const big = opens ? lb(publicUrl(opens.src), opens.alt, opens.w, opens.h) : lb(src, alt, page.w, page.h)
  return (
    <figure className={`spread__page ${n === 1 ? 'spread__page--cover' : ''}`} data-reveal>
      <button type="button" className="pc__hit" {...big}>
        <img
          src={src}
          // a phone shows her page about 390 px wide: the 810 px copy is sharp enough there
          srcSet={page.small ? `${publicUrl(page.small)} 810w, ${src} ${page.w}w` : undefined}
          sizes={page.small ? '(max-width: 760px) 100vw, 90vw' : undefined}
          width={page.w}
          height={page.h}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          draggable={false}
        />
      </button>
    </figure>
  )
}

/**
 * Small, under her page: the pieces of it that the boards show in parts, or that repeat her page. Each
 * opens large, so every piece she cut is there to look at, but nothing fills the page twice.
 */
function Closer({ d, n }: { d: Detail; n: number }) {
  const cuts = (d.closer[n] ?? []).flatMap((name) => (d.art.cuts[name] ? [d.art.cuts[name]] : []))
  if (!cuts.length) return null
  return (
    <div className="closer" data-reveal>
      <p className="closer__label" aria-hidden>
        look closer
      </p>
      <ul className="closer__list" aria-label={`Parts of page ${n}, to look at large`}>
        {cuts.map((c, k) => (
          <li key={c.src} style={css({ '--ar': (c.w / c.h).toFixed(3), '--nw': c.w, '--r': `${tilt(k + n, 0.8)}deg` })}>
            <button type="button" className="pc__hit" {...lb(publicUrl(c.src), c.alt, c.w, c.h)}>
              {/* a small copy here; the button opens the piece itself */}
              <img src={publicUrl(c.thumb ?? c.src)} width={c.w} height={c.h} alt={c.alt} loading="lazy" decoding="async" draggable={false} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Her cover, big, with the name of the project on her index paper. */
function Hero({ d }: { d: Detail }) {
  return (
    <header className="hero" id="cover">
      <PagePic d={d} n={1} eager opens={d.art.cuts.cover} />
      <div className="hero__below">
        <div className="hero__card" data-reveal>
          <img className="hero__lettering" src={art.projectTitles[d.n - 1]} alt={`Project ${num(d.n)}`} draggable={false} />
          <h1 className="hero__title">{d.title}</h1>
          {d.subtitle && <p className="hero__sub">{d.subtitle}</p>}
          {/* on the corner away from her cover, so it only ever sits on the card and the table */}
          <Tape kind={1} style={css({ left: 'auto', right: '-3%', top: '-8%', width: 'min(30%, 112px)', translate: 'none', rotate: '24deg' })} />
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

/**
 * Where a section's pieces go on its board, so it fills like a page of her scrapbook and not a grid
 * with holes: a big piece (a look, a face) sits beside the note, with up to two more under the note;
 * her tags line up under the note; the rest are stuck down in columns; chips and fabrics in a row at
 * the end. With no big piece, a few small pieces (or only chips and fabrics) stand in a row beside the
 * note, and more than that start the columns with the note.
 */
function layout(s: Section) {
  const pieces = s.pieces.filter((p) => p.look !== 'hang')
  const feature = pieces.find((p) => p.w >= 40)
  const group = (look: Piece['look']) => {
    const g = pieces.filter((p) => p.look === look)
    return g.length > 1 ? g : []
  }
  const tags = group('lettering')
  const chips = [...group('chip'), ...group('fabric')]
  const rest = pieces.filter((p) => p !== feature && !tags.includes(p) && !chips.includes(p))
  // two or fewer small pieces go under the note, beside the big one
  const aside = feature && rest.length <= 2 ? rest : []
  const beside = feature ? [] : !chips.length && rest.length <= 3 ? rest : !rest.length ? chips : []
  const flow = aside.length || beside === rest ? [] : rest
  return { feature, tags, row: beside === chips ? [] : chips, aside, flow, beside }
}

/** How many columns a board's pieces stand in: three on a wide screen, two on a tablet, one on a phone. */
const colQueries = ['(max-width: 760px)', '(max-width: 1099px)']
const colsNow = () => (matchMedia(colQueries[0]).matches ? 1 : matchMedia(colQueries[1]).matches ? 2 : 3)

function useColumns() {
  const [n, setN] = useState(colsNow)
  useEffect(() => {
    const mqs = colQueries.map((q) => matchMedia(q))
    const on = () => setN(colsNow())
    mqs.forEach((m) => m.addEventListener('change', on))
    return () => mqs.forEach((m) => m.removeEventListener('change', on))
  }, [])
  return n
}

/** The rows the columns are measured in (px), and how many of them columns 2 and 3 start lower. */
const ROW = 4
const STAGGER = [0, 7, 3]

/**
 * Pieces stuck down in columns that end level: the note first, then the tallest piece into whichever
 * column is shortest so far, and so on down; in each column they keep her order. The heights are the
 * pieces' real ones, measured as laid out (their images carry their sizes, so this is right before
 * any has loaded) and again whenever one changes size (a font arriving, a narrower window). They stay
 * where they are in the page; only their place in the grid changes.
 */
function Columns({ cells, n }: { cells: { key: string; el: ReactNode }[]; n: number }) {
  const root = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<Record<string, string>>({})
  const keys = cells.map((c) => c.key).join(' ')
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const names = keys.split(' ')
    const lay = () => {
      const span = [...el.children].map((c) => Math.max(1, Math.ceil((c as HTMLElement).offsetHeight / ROW)))
      const order = names.map((_, k) => k).sort((x, y) => (names[x] === 'intro' ? -1 : names[y] === 'intro' ? 1 : span[y] - span[x]))
      const h = STAGGER.slice(0, n)
      const col = names.map(() => 0)
      for (const k of order) {
        col[k] = h.indexOf(Math.min(...h))
        h[col[k]] += span[k]
      }
      const top = STAGGER.slice(0, n)
      const next: Record<string, string> = {}
      names.forEach((name, k) => {
        next[name] = `${top[col[k]] + 1} / ${col[k] + 1} / span ${span[k]}`
        top[col[k]] += span[k]
      })
      setAt((was) => (JSON.stringify(was) === JSON.stringify(next) ? was : next))
    }
    lay()
    const ro = new ResizeObserver(lay)
    for (const c of el.children) ro.observe(c)
    return () => ro.disconnect()
  }, [keys, n])
  return (
    <div ref={root} className="sheet__flow" style={css({ '--cols': n })}>
      {cells.map((c) => (
        <div key={c.key} className="sheet__cell" style={at[c.key] ? { gridArea: at[c.key] } : undefined}>
          {c.el}
        </div>
      ))}
    </div>
  )
}

function SectionBoard({ d, s, i, bound, cols }: { d: Detail; s: Section; i: number; bound: boolean; cols: number }) {
  const lettering = s.lettering ? d.art.cuts[s.lettering] : undefined
  const tab = s.tab ? d.art.cuts[s.tab] : undefined
  const flap = s.flap ? d.art.cuts[s.flap] : undefined
  const hangs = s.pieces.filter((p) => p.look === 'hang')
  const { feature, tags, row, aside, flow, beside } = layout(s)
  let k = i
  const view = (p: Piece) => <PieceView key={p.cut} d={d} p={p} i={k++} />
  const intro = (
    <div className="sheet__intro">
      {s.text && (
        <Note>
          <p>{s.text}</p>
        </Note>
      )}
      {s.words && <Words words={s.words} />}
      {tags.length > 0 && <div className="sheet__tags">{tags.map(view)}</div>}
      {aside.length > 0 && <div className="sheet__aside">{aside.map(view)}</div>}
    </div>
  )
  const rowEl = row.length > 0 && <div className="sheet__row">{row.map(view)}</div>
  const besideEl = beside.length > 0 && <div className="sheet__row">{beside.map(view)}</div>
  const lead = feature || besideEl
  const cells = [...(lead ? [] : [{ key: 'intro', el: intro }]), ...flow.map((p) => ({ key: p.cut, el: view(p) }))]
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
        <span className="sheet__page">from my page {s.page}</span>
      </header>
      {lead && (
        <div className="sheet__lead">
          {intro}
          {feature ? <div className="sheet__feature">{view(feature)}</div> : besideEl}
        </div>
      )}
      {cells.length > 0 && <Columns cells={cells} n={Math.min(cols, cells.length)} />}
      {rowEl}
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
                  {/* her code typed, our name for the colour written after it by hand */}
                  <span className="paint__code">{c.code}</span> <span className="paint__name">– {c.label}</span>
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
      <a className="ytab endnav__book" href={bookAt(d.slug)} onClick={toBook(d.slug)}>
        <ArrowLeft size={16} weight="bold" aria-hidden />
        back to the scrapbook
      </a>
      <a
        className={`endflap endflap--next ${next ? '' : 'endflap--index'}`}
        href={next ? `#${next.slug}` : './#index'}
        aria-label={next ? `Turn to project ${num(next.n)}: ${next.title}` : 'Turn to the index of the scrapbook'}
        onClick={next ? undefined : toBook('index')}
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
    <nav className="sidetabs" aria-label="The pages">
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
  const cols = useColumns()
  const pages = arrange(d)
  let b = 0
  return (
    <main className="pj-main" ref={root}>
      <TopBar d={d} />
      <Hero d={d} />
      <div className="boards">
        <StoryBoard d={d} i={b++} />
        {pages[0].map((s) => (
          <SectionBoard key={s.id} d={d} s={s} i={b++} bound cols={cols} />
        ))}
      </div>
      {pages.slice(1).map((sections, k) => {
        const n = k + 2
        const last = n === pages.length
        return (
          <Fragment key={n}>
            <section className="spread" id={`page-${n}`} aria-label={`Page ${n} of ${pages.length}`}>
              <p className="spread__tag" aria-hidden>
                page {n}
              </p>
              <PagePic d={d} n={n} />
              <Closer d={d} n={n} />
            </section>
            <div className="boards">
              {sections.map((s, j) => (
                <SectionBoard key={s.id} d={d} s={s} i={b++} bound={j > 0} cols={cols} />
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
