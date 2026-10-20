import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase)
CustomEase.create('door', 'M0,0 C0.3,0 0.12,1.08 0.56,1.04 0.76,1.02 0.82,1 1,1')
CustomEase.create('lift', 'M0,0 C0.5,0 0.2,1 1,1')

export { gsap, ScrollTrigger }

/** Reduced motion, with a `?motion=force|off` override for testing. */
export function prefersReducedMotion() {
  const q = new URLSearchParams(location.search).get('motion')
  if (q === 'force') return false
  if (q === 'off') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
