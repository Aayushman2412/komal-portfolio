import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { live } from '../state/store'

/**
 * Lenis smooths the wheel; one ScrollTrigger maps the tall track to live.progress (0..1).
 * Everything else reads live.progress / live.smooth instead of listening to scroll itself.
 */
let lenis: Lenis | null = null
let trigger: ScrollTrigger | null = null

export function initScroll(track: HTMLElement) {
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, touchMultiplier: 1.2 })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      live.progress = self.progress
    },
  })
  return () => {
    gsap.ticker.remove(tick)
    trigger?.kill()
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToProgress(p: number, immediate = false) {
  if (!trigger || !lenis) return
  const y = trigger.start + (trigger.end - trigger.start) * p
  lenis.scrollTo(y, { immediate, force: true, duration: immediate ? 0 : 2.4 })
  if (immediate) {
    live.progress = p
    live.smooth = p
  }
}

export function lockScroll(locked: boolean) {
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
  document.documentElement.classList.toggle('scroll-locked', locked)
}
