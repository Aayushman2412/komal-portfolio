import { create } from 'zustand'

/**
 * The story is a short state machine:
 *   loading -> intro (scroll-scrubbed: feed, glitch, dark, bulb) -> room (almirah clickable)
 *   -> opening -> open (inside: clothes, tin, scrapbook) -> book (the scrapbook)
 * Scrolling back above the end of the intro returns from `room` to `intro`.
 */
export type Stage = 'loading' | 'intro' | 'room' | 'opening' | 'open' | 'book'

type State = {
  stage: Stage
  sound: boolean
  reducedMotion: boolean
  /** Which face of the scrapbook to open on (set by #book, #index, #p/<slug> links). */
  bookTarget: string | null
  /** The book has flown out of the almirah; the scrapbook may take over. */
  bookLanded: boolean
  setStage: (s: Stage) => void
  setBookLanded: (v: boolean) => void
  setSound: (on: boolean) => void
  setBookTarget: (t: string | null) => void
}

export const useStory = create<State>((set) => ({
  stage: 'loading',
  sound: false,
  reducedMotion: false,
  bookTarget: null,
  bookLanded: false,
  setStage: (stage) => set({ stage }),
  setBookLanded: (bookLanded) => set({ bookLanded }),
  setSound: (sound) => set({ sound }),
  setBookTarget: (bookTarget) => set({ bookTarget }),
}))

/**
 * Values that change every frame live outside React so nothing re-renders on scroll.
 * `progress` is the scrubbed intro position (0..1); `smooth` is the damped copy the layers use.
 */
export const live = {
  progress: 0,
  smooth: 0,
  pointer: { x: 0, y: 0 },
}

/** Intro timeline: where each beat sits on the 0..1 scroll. One place to retime the story. */
export const beats = {
  /** The feed speeds up from here to the glitch. */
  feed: [0, 0.34] as const,
  /** Stutters, bands, SIGNAL LOST. */
  glitch: [0.26, 0.5] as const,
  /** Her jagged black edge sweeps across the screen. */
  tear: [0.42, 0.56] as const,
  /** Power cut: nothing. */
  dark: [0.56, 0.62] as const,
  /** The bulb flickers, close up. */
  bulb: [0.62, 0.72] as const,
  /** It catches; the view pulls back from it into the room. */
  pullBack: [0.7, 0.96] as const,
  roomReady: 0.975,
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** Map v from [a,b] to [0,1], clamped. */
export const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
export const smoothstep = (t: number) => t * t * (3 - 2 * t)
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
