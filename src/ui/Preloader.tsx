import { useEffect, useRef, useState } from 'react'
import { feedAssets, laterAssets, loadImage } from '../lib/art'
import { gsap } from '../lib/gsap'
import { fontsReady } from '../lib/textures/util'

/**
 * Her first beat: the site opens on a black page. Behind it the fonts and the feed's pieces load;
 * then the black lifts and the feed starts generating. The rest of her frames load in the
 * background while the visitor scrolls.
 */
export function Preloader({ onReady }: { onReady: () => void }) {
  const [gone, setGone] = useState(false)
  const [slow, setSlow] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    const slowId = window.setTimeout(() => setSlow(true), 1600)
    const t0 = performance.now()
    Promise.all([
      fontsReady(['400 24px "Gochi Hand"', '400 24px "Caveat Variable"', '400 24px "Special Elite"']),
      ...feedAssets().map((src) => loadImage(src).catch(() => undefined)),
    ]).then(async () => {
      // hold the black for a moment even on a fast connection: it is a beat, not a spinner
      const wait = Math.max(0, 900 - (performance.now() - t0))
      await new Promise((r) => setTimeout(r, wait))
      if (!alive) return
      window.clearTimeout(slowId)
      onReady()
      laterAssets().forEach((src) => loadImage(src).catch(() => undefined))
      if (root.current) gsap.to(root.current, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut', onComplete: () => setGone(true) })
      else setGone(true)
    })
    return () => {
      alive = false
      window.clearTimeout(slowId)
    }
  }, [onReady])

  if (gone) return null
  return (
    <div ref={root} className="preloader" role="status" aria-live="polite">
      <span className={`preloader__label ${slow ? 'is-on' : ''}`}>loading</span>
    </div>
  )
}
