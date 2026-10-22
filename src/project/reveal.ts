import { useLayoutEffect, type RefObject } from 'react'
import { prefersReducedMotion } from '../lib/gsap'

/**
 * Pages and pieces settle onto the table as they scroll into view: a page lies down flat, a piece
 * is pressed onto its board. Everything marked `data-reveal` under `root` gets `is-in` once it is in
 * view. With reduced motion everything is simply there (and the CSS has no transitions).
 */
export function useReveal(root: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const all = [...el.querySelectorAll<HTMLElement>('[data-reveal]')]
    const html = document.documentElement
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      html.classList.remove('pj-motion')
      all.forEach((n) => n.classList.add('is-in'))
      return
    }
    html.classList.add('pj-motion')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    )
    all.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [root, key])
}
