import { site } from '../site'
import project01Art from './project-01.art.json'
import project02Art from './project-02.art.json'

/**
 * Each project's own page (project.html#<slug>): her four pages in her order, and after each page
 * the pieces cut from it, stuck onto boards like things in a scrapbook. The title, story, concept,
 * spec sheet, palette, polaroid notes and swatch names come from `site.ts`, so the book and this
 * page always say the same thing; what is only on this page (the section texts, and how each piece
 * is stuck down) lives here.
 *
 * TODO(komal): every sentence here is ours, written in her voice from what is on her pages, and waits
 * for her OK. Her keywords are her own words, spelled as she meant them.
 */

export type Cut = { src: string; w: number; h: number; page: number; box: number[]; alt: string; kind?: string }
export type ProjectArt = { pages: { src: string; w: number; h: number }[]; cuts: Record<string, Cut> }

/**
 * How a piece is stuck onto the board.
 * print: a photo print, taped at the top. polaroid: white frame with a caption, the note written
 * beside it. cutout: cut along its edge and glued flat. card: an illustration card with her pink loop
 * border. chip: a Pantone chip with the colour's name written under it. fabric: a swatch cut with pinking
 * shears. hang: pegged on a thread (the line-up). lettering: her own lettering, stuck on like a label.
 */
export type Look = 'print' | 'polaroid' | 'cutout' | 'card' | 'chip' | 'fabric' | 'hang' | 'lettering'

export type Piece = {
  cut: string
  look: Look
  /** Width on a wide board, in percent of the board. */
  w: number
  /** Width on a phone, in percent (default: from `w`). */
  wm?: number
  /** Tilt in degrees (default: a small hand-placed tilt). */
  r?: number
  /** Written on a polaroid, or on a fabric's tag. */
  caption?: string
  /** Written on the board beside a polaroid. */
  note?: string
}

export type Section = {
  id: string
  /** Live heading; with `lettering` it only names the section for screen readers and the side tabs. */
  heading: string
  /** Her own lettering of the heading, cut from her page, shown instead of the live heading. */
  lettering?: string
  page: number
  text: string
  /** Her keywords, as her yellow labels. */
  words?: string[]
  pieces: Piece[]
  /** Her PROJECTS tab, stuck out of this board's right edge as on her page. */
  tab?: string
  /** Her PROJECT 0N corner flap, in this board's lower right corner as on her page. */
  flap?: string
}

export type Detail = {
  slug: string
  n: number
  title: string
  subtitle?: string
  story: string
  concept: string
  specs: [string, string][]
  redNote?: string
  palette: { code: string; hex: string; label: string; cut: string }[]
  art: ProjectArt
  /** What is on each of her four pages, for anyone who cannot see them (and the lightbox caption). */
  pageAlts: string[]
  sections: Section[]
  /**
   * By page: her pieces that the boards show in parts (her whole moodboard, her line-up panel, a whole
   * shoot), or that only repeat her page (the blown-up prints behind her photos). They sit small under
   * her page, to open large, so nothing is shown twice at full size. Her cover (the cut named `cover`)
   * is what her cover page opens.
   */
  closer: Record<number, string[]>
}

const P = (cut: string, look: Look, w: number, extra: Omit<Piece, 'cut' | 'look' | 'w'> = {}): Piece => ({ cut, look, w, ...extra })

const flytrap: Omit<Detail, keyof SiteText | 'art' | 'palette'> = {
  slug: 'project-01',
  n: 1,
  pageAlts: [
    'Her cover for project 01: a glitched close-up of pink and dark green leaf veins on a teal board, its ring binding along the bottom.',
    'Her spread for project 01. Left: her INSPIRATION and SILHOUTTE board, a collage of a giant leaf, mushrooms, Venus flytraps, moss and an uncanny face, labelled in yellow, with four Pantone chips and pink gowns and an oversized turtleneck. Right: her line-up of eleven illustrated looks in pink and lime, her PROJECTS tab and her PROJECT 01 corner flap.',
    'Her page of final looks: two illustration cards, front and back, with pink loop borders, beside the Venus flytrap makeup: red-rimmed eyes, lime brows, glossy lips and flytraps in the hair.',
    'Her night shoot: the knits photographed at night in tall grass, six photos laid over two blown-up prints.',
  ],
  closer: {
    2: ['moodboard', 'leaf', 'mushrooms', 'face', 'embellishment', 'lineup'],
    3: ['look-1-front', 'look-1-back', 'look-2-front', 'look-2-back'],
    4: ['backdrop-left', 'backdrop-right'],
  },
  sections: [
    {
      id: 'inspiration',
      heading: 'Inspiration',
      lettering: 'heading-inspiration',
      page: 2,
      text: 'A giant leaf, mushroom gills, moss, Venus flytraps and an uncanny face. My words for them: ominous, raw, textures, earthy, uncanny. The four chips are my palette.',
      words: ['ominous', 'raw', 'textures', 'earthy', 'uncanny'],
      pieces: [
        P('inspiration', 'cutout', 62, { r: -1 }),
        P('chip-yellow', 'chip', 13),
        P('chip-green', 'chip', 12),
        P('chip-olive', 'chip', 12),
        P('chip-pink', 'chip', 17),
      ],
    },
    {
      id: 'silhouette',
      heading: 'Silhouette',
      lettering: 'heading-silhouette',
      page: 2,
      text: 'Bodycon, an oversized turtleneck, layers and flare. Rough edges, patchwork, wavy lines, and flytraps as embellishment.',
      words: ['BODYCON', 'TURTLENECK', 'LAYERS', 'OVER-SIZED', 'FLARE', 'ROUGH EDGES', 'PATCHWORK', 'EMBELLISHMENT', 'WAVY'],
      pieces: [P('silhouette', 'cutout', 60, { r: 1 })],
    },
    {
      id: 'lineup',
      heading: 'The line-up',
      page: 2,
      text: 'Eleven looks in pink and lime: ruffled seams and stripes, cropped turtlenecks, wide trousers, wrap skirts and column dresses.',
      pieces: Array.from({ length: 11 }, (_, i) => P(`lineup-${i + 1}`, 'hang', 0)),
      tab: 'tab-projects',
      flap: 'flap-project-01',
    },
    {
      id: 'final-looks',
      heading: 'Two final looks',
      page: 3,
      text: 'A cropped turtleneck over a long striped skirt, and a strapless striped column dress, front and back. Olive, moss, mustard and pink, with little flowers along the stripes.',
      pieces: [
        P('look-1', 'card', 31, { r: -2, wm: 80 }),
        P('look-2', 'card', 29, { r: 2.5, wm: 80 }),
      ],
    },
    {
      id: 'makeup',
      heading: 'Makeup',
      page: 3,
      text: 'The flytrap on the face: red-rimmed eyes, lime brows, glossy red lips, and flytraps tucked into the hair.',
      pieces: [P('makeup-face', 'cutout', 30, { r: -1.5, wm: 86 }), P('makeup-eyes', 'print', 30, { r: 3, wm: 80 }), P('makeup-hair', 'cutout', 36, { r: -2, wm: 92 })],
    },
    {
      id: 'night-shoot',
      heading: 'The night shoot',
      page: 4,
      text: 'Shot at night, in tall grass, so the knits glow out of the dark.',
      pieces: [
        P('photo-1', 'polaroid', 24, { r: -4, wm: 72 }),
        P('photo-2', 'print', 25, { r: 3, wm: 70 }),
        P('photo-3', 'print', 19, { r: -2, wm: 56 }),
        P('photo-4', 'polaroid', 24, { r: 4, wm: 72 }),
        P('photo-5', 'print', 19, { r: -3, wm: 56 }),
        P('photo-6', 'print', 29, { r: 2, wm: 80 }),
      ],
    },
    {
      id: 'up-close',
      heading: 'Up close',
      page: 4,
      text: 'Waffle knit, rib knit, and stripes joined with raw, ruffled seams.',
      pieces: [P('fabric-waffle', 'fabric', 17, { r: -5 }), P('fabric-rib', 'fabric', 15, { r: 4 }), P('fabric-stripes', 'fabric', 16, { r: -3 })],
    },
  ],
}

const muse: Omit<Detail, keyof SiteText | 'art' | 'palette'> = {
  slug: 'project-02',
  n: 2,
  pageAlts: [
    'Her cover for project 02: a collage of red lips with gold teeth, denim and a girl in a red cap, with I AM MY OWN MUSE lettered in red inside a screaming mouth, its ring binding along the bottom.',
    'Her INSPIRATION board: a white racing helmet, WARREN ST and ONE WAY signs, bikes at night, fire, a crowd in smoke, a zebra crossing, a zip, a safety pin, a red gem, two crumpled Pantone chips, and the words RACING, EDGY, RAW and URBAN on red tags.',
    'Her page THE COLLECTION: three illustrated looks in red leather-look and dark denim, beside red lips with gold teeth, denim and a back pocket with red stars.',
    'Her E-COMMERCE SHOOT, LOOK 3 drawn and as four 3D renders from every side, and her AI SHOOT, six night photos of LOOK 3 with red motorbikes.',
  ],
  closer: {
    2: ['moodboard'],
    3: ['collection'],
    4: ['ecommerce', 'ai-shoot'],
  },
  sections: [
    {
      id: 'muse',
      heading: 'I am my own muse',
      page: 1,
      text: 'My cover is a collage: red lips with gold teeth, layers of denim, a girl in a red cap. The mouth in the middle screams it for me: I am my own muse.',
      pieces: [P('muse', 'cutout', 24, { r: 6, wm: 60 }), P('cover-girl', 'print', 20, { r: -4, wm: 52 }), P('fabric-indigo-denim', 'fabric', 17, { r: 3 })],
    },
    {
      id: 'inspiration',
      heading: 'Inspiration',
      lettering: 'heading-inspiration',
      page: 2,
      text: 'A racing helmet, street signs, bikes at night, fire, a crowd in smoke, a safety pin and a zip. Four words on red tags: racing, edgy, raw, urban.',
      pieces: [
        P('label-racing', 'lettering', 9, { r: -8 }),
        P('label-edgy', 'lettering', 9, { r: 5 }),
        P('label-raw', 'lettering', 9, { r: -4 }),
        P('label-urban', 'lettering', 10, { r: 6 }),
        P('helmet', 'cutout', 26, { r: -3, wm: 70 }),
        P('signs', 'cutout', 25, { r: 2, wm: 70 }),
        P('bikes', 'cutout', 18, { r: -2, wm: 50 }),
        P('fire', 'cutout', 20, { r: 4, wm: 56 }),
        P('crowd', 'print', 13, { r: -3, wm: 40 }),
        P('crossing', 'print', 15, { r: 3, wm: 44 }),
        P('tower', 'cutout', 10, { r: -2, wm: 30 }),
        P('zip', 'cutout', 7, { r: 8, wm: 22 }),
        P('safety-pin', 'cutout', 18, { r: -10, wm: 54 }),
        P('gem', 'cutout', 11, { r: 6, wm: 34 }),
      ],
    },
    {
      id: 'colours',
      heading: 'Colours',
      page: 2,
      text: 'Two crumpled Pantone chips: a deep red, PANTONE 199, and Faded Denim.',
      pieces: [P('chip-red', 'chip', 12, { r: -4, wm: 34 }), P('chip-denim', 'chip', 16, { r: 3, wm: 44 })],
    },
    {
      id: 'collection',
      heading: 'The collection',
      lettering: 'heading-collection',
      page: 3,
      text: 'Three looks in red leather-look and dark denim: a cut-out crop top tied with bows over culottes, a glossy jacket with studded thigh-high boots, and a bustier with a red sash and wide trousers panelled in red.',
      pieces: [
        P('collection-left', 'cutout', 15, { r: -2, wm: 30 }),
        P('collection-middle', 'cutout', 11, { r: 1, wm: 22 }),
        P('collection-right', 'cutout', 15, { r: 2, wm: 30 }),
        P('lips-1', 'cutout', 14, { r: -6, wm: 40 }),
        P('lips-2', 'cutout', 13, { r: 4, wm: 38 }),
        P('lips-3', 'cutout', 13, { r: -3, wm: 38 }),
        P('pocket', 'cutout', 16, { r: 5, wm: 46 }),
        P('fabric-leather', 'fabric', 14, { r: -4 }),
        P('fabric-panel', 'fabric', 13, { r: 3 }),
        P('fabric-denim', 'fabric', 13, { r: 5, caption: 'denim' }),
      ],
    },
    {
      id: 'e-commerce',
      heading: 'E-commerce shoot',
      lettering: 'heading-ecommerce',
      page: 4,
      text: 'LOOK 3 as a 3D render, turned to show the front, side and back.',
      pieces: [
        P('look-3', 'cutout', 15, { r: -2, wm: 42 }),
        P('label-look-3', 'lettering', 9, { r: -5, wm: 26 }),
        P('render-1', 'print', 14, { r: -3, wm: 42 }),
        P('render-2', 'polaroid', 20, { r: 2, wm: 56 }),
        P('render-3', 'print', 17, { r: -2, wm: 46 }),
        P('render-4', 'print', 14, { r: 3, wm: 42 }),
      ],
    },
    {
      id: 'ai-shoot',
      heading: 'AI shoot',
      lettering: 'heading-ai-shoot',
      page: 4,
      text: 'LOOK 3 at night with AI: wet streets, red neon, red motorbikes, smoke and a tunnel.',
      pieces: [
        P('ai-2', 'polaroid', 22, { r: 3, wm: 70, caption: 'look 3, after dark', note: 'Red neon, a wet street, and LOOK 3.' }),
        P('ai-1', 'print', 17, { r: -3, wm: 48 }),
        P('ai-3', 'print', 16, { r: 2, wm: 46 }),
        P('ai-4', 'print', 13, { r: -4, wm: 38 }),
        P('ai-5', 'polaroid', 27, { r: -3, wm: 80 }),
        P('ai-6', 'print', 26, { r: 2, wm: 76 }),
      ],
    },
  ],
}

type SiteText = Pick<Detail, 'title' | 'subtitle' | 'story' | 'concept' | 'specs' | 'redNote'>

const arts: Record<string, ProjectArt> = { 'project-01': project01Art, 'project-02': project02Art }

/**
 * The words the book already has for a project (`site.ts`), and the pieces they name: a polaroid's
 * caption and note, a swatch's name and a chip's code are matched to the cut by its file.
 */
function withSite(d: typeof flytrap): Detail {
  const p = site.projects.find((q) => q.slug === d.slug)!
  const art = arts[d.slug]
  const file = (src?: string) => src?.split('/').slice(-2).join('/')
  const cutOf = (src?: string) => Object.keys(art.cuts).find((k) => file(art.cuts[k].src) === file(src))
  const photo = (cut: string) => p.photos.find((ph) => cutOf(ph.src) === cut)
  const swatch = (cut: string) => p.swatches.find((s) => cutOf(s.src) === cut)
  return {
    ...d,
    title: p.title,
    subtitle: p.subtitle,
    story: p.story,
    concept: p.concept,
    specs: p.specs,
    redNote: p.redNote,
    palette: (p.palette ?? []).flatMap((c) => {
      const cut = cutOf(c.src)
      return cut ? [{ code: c.code, hex: c.hex, label: c.label, cut }] : []
    }),
    art,
    sections: d.sections.map((s) => ({
      ...s,
      pieces: s.pieces.map((pc) => {
        const ph = pc.look === 'polaroid' ? photo(pc.cut) : undefined
        const sw = pc.look === 'fabric' ? swatch(pc.cut) : undefined
        return { ...pc, caption: pc.caption ?? ph?.caption ?? sw?.name, note: pc.note ?? ph?.note }
      }),
    })),
  }
}

/** The projects that have their own page, in her order. */
export const details: Detail[] = [withSite(flytrap), withSite(muse)]

export const detailFor = (slug: string) => details.find((d) => d.slug === slug)
