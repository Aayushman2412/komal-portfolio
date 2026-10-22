import { publicUrl } from '../lib/art'
import project01Art from './projects/project-01.art.json'
import project02Art from './projects/project-02.art.json'

/**
 * Every word on the site that is not already in Komal's drawings lives here. Components only render it.
 * Anything marked TODO(komal) is a placeholder until she sends her own projects and details.
 */

export type SwatchKind = 'gingham' | 'denim' | 'block' | 'bandhani' | 'ikat' | 'chikan' | 'khadi'

export type Project = {
  slug: string
  title: string
  /** Left out when her pages give no year (nothing is shown in its place). */
  year?: string
  /** One line saying what the project is, for its own page. */
  subtitle?: string
  /** A few sentences in her voice, on the lined note. */
  story: string
  /** Inside the envelope. */
  concept: string
  /** On the spec sheet that slides out from behind the paper tab. */
  specs: [string, string][]
  /** Polaroids; `note` is written on the page underneath each one. Put photos in /public/projects/<slug>/. */
  photos: { src?: string; alt?: string; caption: string; note: string }[]
  /**
   * Click to zoom into the fabric. `src` is a photo of the real fabric (`w`, `h` its size, so the zoom
   * never blows it up past what it holds); without one a drawn swatch of `kind` stands in.
   */
  swatches: { name: string; kind: SwatchKind; src?: string; w?: number; h?: number }[]
  /** Written on her red paper behind the first polaroid (without it, the polaroid's caption is). */
  redNote?: string
  /** Her Pantone chips, as she painted and labelled them; `hex` is sampled from her paint, `src` is the chip cut from her page. */
  palette?: { code: string; hex: string; label: string; src: string }[]
  /** Her project cover, the first of her pages for it. */
  cover?: string
  /** It has its own page (project.html#<slug>), which the spread links to: "click to see more". */
  more?: boolean
}

type Cut = { src: string; w: number; h: number; page: number; box: number[]; alt: string; kind?: string }
type ProjectArt = { pages: { src: string; w: number; h: number }[]; cuts: Record<string, Cut> }

/** Her project pages and the pieces cut from them (scripts/slice-projects.py writes these manifests). */
export const projectArt: Record<string, ProjectArt> = { 'project-01': project01Art, 'project-02': project02Art }

/** One piece cut from her project pages: its URL, size and alt text. */
export function piece(slug: string, name: string) {
  const c = projectArt[slug]?.cuts[name]
  if (!c) throw new Error(`no piece ${name} in ${slug}`)
  return { ...c, url: publicUrl(c.src) }
}

const photo = (slug: string, name: string, caption: string, note: string) => {
  const c = piece(slug, name)
  return { src: c.url, alt: c.alt, caption, note }
}

const fabric = (slug: string, name: string, label: string, kind: SwatchKind) => {
  const c = piece(slug, name)
  return { name: label, kind, src: c.url, w: c.w, h: c.h }
}

const chip = (slug: string, name: string, code: string, hex: string, label: string) => ({ code, hex, label, src: piece(slug, name).url })

/**
 * Project 01, from her pages of 22 Oct (PDF pages 7-10). TODO(komal): every sentence here is ours,
 * written in her voice from what is on her pages, and waits for her OK. "Flytrap" is our name for it;
 * her pages only say PROJECT 01.
 */
const flytrap: Project = {
  slug: 'project-01',
  title: 'Flytrap',
  subtitle: 'A knitwear collection grown from leaves, moss, mushrooms and Venus flytraps.',
  story:
    'It started with a leaf, moss, mushrooms and Venus flytraps: ominous, raw, earthy, a little uncanny. I turned them into rib and waffle knits with rough, ruffled edges. Even the makeup is a flytrap.',
  concept:
    'Nature, but not the pretty kind. I gathered a giant leaf, mushroom gills, moss, Venus flytraps and an uncanny face, and labelled how they felt: ominous, raw, textures, earthy, uncanny. My four colours came from there: a warm yellow, a dark moss green, olive and a soft pink. The silhouettes are bodycon and oversized, layered and flared, with rough edges, patchwork and wavy lines, made up in rib and waffle knits. The photos were taken at night, in tall grass.',
  specs: [
    ['line-up', '11 looks'],
    ['final looks', '2, front & back'],
    ['knits', 'rib & waffle'],
    ['palette', '4 Pantone chips'],
    ['details', 'ruffled edges, flowers'],
    ['shoot', 'at night, in tall grass'],
  ],
  photos: [
    photo('project-01', 'photo-1', 'the striped dress', 'Rib-knit stripes, raw ruffled seams and little flowers.'),
    photo('project-01', 'photo-4', 'the cropped turtleneck', 'Waffle knit, a ribbed collar, and sleeves that ruffle at the edges.'),
  ],
  swatches: [
    fabric('project-01', 'fabric-waffle', 'waffle knit', 'khadi'),
    fabric('project-01', 'fabric-rib', 'rib knit', 'khadi'),
    fabric('project-01', 'fabric-stripes', 'striped rib', 'khadi'),
  ],
  redNote: 'ominous, raw, earthy, uncanny',
  // TODO(komal): 16-0299 is hard to read on her chip, and 19-0220 looks lighter than Pantone's 19- range
  palette: [
    chip('project-01', 'chip-yellow', '13-0544 TCX', '#dfcb58', 'warm yellow'),
    chip('project-01', 'chip-green', '16-0299 TCX', '#3d4933', 'dark moss green'),
    chip('project-01', 'chip-olive', '19-0220 TCX', '#b79f3b', 'olive yellow'),
    chip('project-01', 'chip-pink', '13-2120 TCX', '#e3a7c0', 'soft pink'),
  ],
  cover: piece('project-01', 'cover').url,
  more: true,
}

/**
 * Project 02, from her pages of 22 Oct (PDF pages 11-14). The title is hers, lettered in the mouth on
 * her cover. TODO(komal): the rest of the words are ours, in her voice, and wait for her OK.
 */
const muse: Project = {
  slug: 'project-02',
  title: 'I Am My Own Muse',
  subtitle: 'A racing-inspired collection in denim and red leather-look, with an e-commerce shoot and an AI shoot.',
  story:
    'I am my own muse. It started with a racing helmet, street signs, bikes at night and fire. Edgy, raw and urban, in deep red and faded denim. Then I took LOOK 3 further: into 3D, and out into the night.',
  concept:
    'The idea is in the mouth on my cover: I am my own muse. The mood comes from racing and the street: a white racing helmet, street signs, a wheelie at night, fire, a giant safety pin and a zip. Four words on red tags hold it together: racing, edgy, raw, urban. The colours are two crumpled Pantone chips, a deep red and Faded Denim, so the looks live in red leather-look and dark denim, with red lips, gold teeth and stars for attitude.',
  specs: [
    ['mood', 'racing, edgy, raw, urban'],
    ['colours', 'deep red, faded denim'],
    ['materials', 'denim, red leather-look'],
    ['looks', '3'],
    ['details', 'bows, laces, studs, a red sash'],
    ['shoots', '3D e-commerce, AI'],
  ],
  photos: [
    photo('project-02', 'ai-2', 'look 3, after dark', 'From my AI shoot: red neon, a wet street, and LOOK 3.'),
    photo('project-02', 'ai-5', 'full speed', 'The tunnel shot: the racing feeling I wanted for the whole collection.'),
  ],
  swatches: [
    fabric('project-02', 'fabric-indigo-denim', 'indigo denim', 'denim'),
    fabric('project-02', 'fabric-red-denim', 'wine-tinted denim', 'denim'),
    fabric('project-02', 'fabric-leather', 'red leather-look', 'block'),
  ],
  redNote: 'racing, edgy, raw, urban',
  // TODO(komal): the full codes; only "199" and "…-4021 Faded Denim" show past the crumples
  palette: [chip('project-02', 'chip-red', 'PANTONE 199', '#9e3336', 'deep red'), chip('project-02', 'chip-denim', 'PANTONE …-4021', '#3d5770', 'Faded Denim')],
  cover: piece('project-02', 'cover').url,
  more: true,
}

const placeholder = (n: number, swatches: Project['swatches']): Project => ({
  slug: `project-${String(n).padStart(2, '0')}`,
  title: `Project ${String(n).padStart(2, '0')}`,
  year: '2026',
  story: 'What started it, what I made, and what I learnt. A few lines, the way I would tell it.',
  concept: 'The concept note: the story behind the collection, the mood, the references.',
  specs: [
    ['fabric', 'to come'],
    ['colours', 'to come'],
    ['technique', 'to come'],
    ['silhouette', 'to come'],
  ],
  photos: [
    { caption: 'moodboard', note: 'where the idea came from' },
    { caption: 'the look', note: 'what I would change next time' },
  ],
  swatches,
})

export const site = {
  name: 'Komal Singh',
  firstName: 'Komal',
  role: 'fashion design',

  intro: {
    /** Under the feed's counter and its two other indicators (her frame 1 and her notes). */
    style: 'style: trending',
    signal: 'SIGNAL LOST',
  },

  /** Her index (frame 6) lists five. TODO(komal): projects 03-05 are placeholders until she sends them. */
  projects: [
    flytrap,
    muse,
    placeholder(3, [
      { name: 'ikat', kind: 'ikat' },
      { name: 'khadi', kind: 'khadi' },
    ]),
    placeholder(4, [
      { name: 'chikankari', kind: 'chikan' },
      { name: 'cotton gingham', kind: 'gingham' },
    ]),
    placeholder(5, [
      { name: 'bandhani', kind: 'bandhani' },
      { name: 'block print', kind: 'block' },
    ]),
  ] satisfies Project[],

  /** TODO(komal): real contact details. */
  contact: {
    heading: 'write to me',
    email: 'hello@example.com',
    instagram: '@komal',
    note: 'for internships, collaborations, or just to talk about clothes',
  },
}

export type Site = typeof site
