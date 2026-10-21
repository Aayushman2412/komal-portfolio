/**
 * Every word on the site that is not already in Komal's drawings lives here. Components only render it.
 * Anything marked TODO(komal) is a placeholder until she sends her own projects and details.
 */

export type SwatchKind = 'gingham' | 'denim' | 'block' | 'bandhani' | 'ikat' | 'chikan' | 'khadi'

export type Project = {
  slug: string
  title: string
  year: string
  /** A few sentences in her voice, on the lined note. */
  story: string
  /** Inside the envelope. */
  concept: string
  /** On the spec sheet that slides out from behind the paper tab. */
  specs: [string, string][]
  /** Polaroids; `note` is written on the page underneath each one. Put photos in /public/projects/<slug>/. */
  photos: { src?: string; caption: string; note: string }[]
  /** Click to zoom into the fabric. `src` is a photo of the real fabric; without one a drawn swatch stands in. */
  swatches: { name: string; kind: SwatchKind; src?: string }[]
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

  /** TODO(komal): replace with real projects. Her index (frame 6) lists five. */
  projects: [
    placeholder(1, [
      { name: 'cotton gingham', kind: 'gingham' },
      { name: 'indigo denim', kind: 'denim' },
    ]),
    placeholder(2, [
      { name: 'block print', kind: 'block' },
      { name: 'bandhani', kind: 'bandhani' },
    ]),
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
