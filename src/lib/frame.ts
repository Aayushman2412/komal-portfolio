import { gsap } from './gsap'
import { live } from '../state/store'

/**
 * One ticker for every DOM overlay that follows the scroll. Subscribers get the damped intro
 * progress, so the HUD, captions and sound all agree with the 3D scene on where the story is.
 */
type Fn = (p: number, dt: number, time: number) => void
const subs = new Set<Fn>()

export function onFrame(fn: Fn) {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 0.1)
  live.smooth += (live.progress - live.smooth) * (1 - Math.exp(-dt * 10))
  if (Math.abs(live.progress - live.smooth) < 1e-5) live.smooth = live.progress
  subs.forEach((f) => f(live.smooth, dt, time))
})
