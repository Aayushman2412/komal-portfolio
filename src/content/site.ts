/**
 * Every word and fact on the site lives here. Components only render it.
 * Anything marked TODO(komal) is a placeholder until Komal sends her own copy, photos and projects.
 */

export type Swatch = { name: string; kind: 'gingham' | 'denim' | 'block' | 'bandhani' | 'ikat' | 'chikan' | 'khadi' }

export type Project = {
  slug: string
  title: string
  year: string
  /** One or two sentences, in her voice. */
  story: string
  /** Short handwritten notes scattered on the spread. */
  notes: string[]
  swatches: Swatch[]
  /** Image paths under /public. Empty slots render as labelled empty polaroids. */
  images: { src?: string; caption: string; back?: string }[]
  tint: string
}

export const site = {
  name: 'Komal Singh',
  firstName: 'Komal',
  role: 'Fashion design student',
  /** Small embossed plate on the almirah door. */
  almirahPlate: 'K.S.',

  intro: {
    app: 'promptwear',
    prompt: 'a dress nobody has ever made before',
    feedHandles: ['@ai.atelier', '@gen.couture', '@trendbot', '@runway.ai', '@prompt.daily', '@style.diffusion'],
    feedPrompts: [
      'haute couture gown, liquid chrome, editorial, 8k',
      'quiet luxury coat, studio light, trending',
      'iridescent bias-cut dress, ultra detailed',
      'oversized blazer, hyperreal, award winning',
      'organza cape, octane render, masterpiece',
      'sculptural corset, glossy, viral aesthetic',
    ],
    toasts: [
      'Your design is trending',
      '412 new looks generated',
      'New trend detected: quiet luxury v12',
      'Regenerating 9 variations',
      'Collection complete in 0.8s',
      'Your style has been copied 2,301 times',
      'Upscaling, please wait',
      'Everything sold out. Generate more?',
    ],
    /** Captions that appear over the feed as you scroll. TODO(komal): rewrite in your voice. */
    captions: ['Everyone is designing now.', 'Nobody is touching fabric.', 'More. Faster. The same.'],
    /** In the dark, right after the TV switches off. */
    afterOff: 'Switch it off.',
    /** When the bulb comes on and the almirah appears. */
    roomLine: 'Before all of this, there was the almirah at home.',
    openHint: 'open it',
    bookHint: 'this one',
  },

  /** The handmade cover of the scrapbook. TODO(komal): photograph the real one if it still exists. */
  cover: {
    title: 'my scrap book',
    owner: 'Komal',
    tagline: 'do not open without asking',
    age: 'class 4 B',
  },

  about: {
    /** TODO(komal): a real childhood photo at /public/photos/komal-small.jpg */
    photo: undefined as string | undefined,
    photoCaption: 'me, before I could sew',
    lines: [
      'I am Komal.',
      'I study fashion design.',
      'I keep scraps. Buttons, tags, offcuts, ticket stubs.',
      'Most of my ideas start in an old almirah, not on a screen.',
    ],
    likes: ['hand stitching', 'my nani\'s sarees', 'thrift markets', 'drawing on brown paper'],
    label: 'things about me',
  },

  /** TODO(komal): replace with real projects. Slots render as an empty template until filled. */
  projects: [
    {
      slug: 'project-one',
      title: 'Project one',
      year: '2026',
      story: 'Your first project goes here: what started it, what you made, what you learnt.',
      notes: ['first sketch', 'fabric tests', 'final look'],
      swatches: [
        { name: 'cotton gingham', kind: 'gingham' },
        { name: 'indigo denim', kind: 'denim' },
      ],
      images: [
        { caption: 'moodboard', back: 'where the idea came from' },
        { caption: 'sketch', back: 'drawn on brown paper' },
        { caption: 'the look', back: 'shot at home' },
      ],
      tint: '#d9644a',
    },
    {
      slug: 'project-two',
      title: 'Project two',
      year: '2026',
      story: 'A second project. Keep it short; the photos do the talking.',
      notes: ['research', 'draping'],
      swatches: [
        { name: 'block print', kind: 'block' },
        { name: 'bandhani', kind: 'bandhani' },
      ],
      images: [
        { caption: 'research', back: 'notes from the market' },
        { caption: 'draping', back: 'on the dress form' },
        { caption: 'detail', back: 'hand finished' },
      ],
      tint: '#3f6db3',
    },
    {
      slug: 'project-three',
      title: 'Project three',
      year: '2025',
      story: 'A third project. A college assignment, a competition, or something you made for yourself.',
      notes: ['swatches', 'toile'],
      swatches: [
        { name: 'ikat', kind: 'ikat' },
        { name: 'khadi', kind: 'khadi' },
      ],
      images: [
        { caption: 'swatches', back: 'what worked' },
        { caption: 'toile', back: 'version two' },
        { caption: 'final', back: 'the one I kept' },
      ],
      tint: '#c99a2e',
    },
    {
      slug: 'project-four',
      title: 'Project four',
      year: '2025',
      story: 'A fourth project. Add as many as you like; the index grows with this list.',
      notes: ['illustration', 'colour story'],
      swatches: [
        { name: 'chikankari', kind: 'chikan' },
        { name: 'cotton gingham', kind: 'gingham' },
      ],
      images: [
        { caption: 'illustration', back: 'gouache' },
        { caption: 'colour story', back: 'from a sunset' },
        { caption: 'garment', back: 'stitched by hand' },
      ],
      tint: '#5f8a5a',
    },
  ] satisfies Project[],

  plan: {
    caption: 'how this website was planned, on a call, 15.10.2026',
  },

  /** TODO(komal): real contact details. */
  contact: {
    heading: 'write to me',
    email: 'hello@example.com',
    instagram: '@komal',
    note: 'for internships, collaborations, or to swap scraps',
  },
}

export type Site = typeof site
