import { create } from 'zustand'

/**
 * The story is a short state machine:
 *   loading -> intro (scroll-scrubbed feed, TV, room) -> room (almirah clickable)
 *   -> opening -> open (clothes + scrapbook) -> book (DOM scrapbook)
 * Scrolling back above the end of the intro returns from `room` to `intro`.
 */
export type Stage = 'loading' | 'intro' | 'room' | 'opening' | 'open' | 'book'

type State = {
  stage: Stage
  sound: boolean
  reducedMotion: boolean
  /** Which face of the scrapbook to open on (set by #index / #p/<slug> links). */
  bookTarget: string | null
  /** The 3D book has reached the camera; the DOM scrapbook may take over. */
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
 * `progress` is the scrubbed intro position (0..1); `smooth` is the damped copy the 3D scene uses.
 */
export const live = {
  progress: 0,
  smooth: 0,
  pointer: { x: 0, y: 0 },
  /** 0..1 how open the almirah doors are, written by the almirah, read by lights and cloth. */
  doors: 0,
  /** Set while the 3D book flies to the camera, so the DOM cover can take over at the same spot. */
  bookFlight: 0,
}

/** Intro timeline: where each beat sits on the 0..1 scroll. One place to retime the story. */
export const beats = {
  feedStart: 0.0,
  feedDense: 0.3,
  glitchStart: 0.3,
  hudGone: 0.42,
  pullBack: [0.4, 0.56] as const,
  powerOff: [0.57, 0.66] as const,
  dark: [0.66, 0.74] as const,
  bulb: [0.74, 0.8] as const,
  toAlmirah: [0.8, 0.97] as const,
  roomReady: 0.975,
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** Map v from [a,b] to [0,1], clamped. */
export const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
