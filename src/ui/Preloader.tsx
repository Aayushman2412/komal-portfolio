import { Sparkle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { loadAssets } from '../lib/assets'
import { gsap } from '../lib/gsap'

/**
 * Boots like the AI app it is pretending to be. Real work happens behind it: fonts load and every
 * procedural texture is drawn. It hands over to the feed on the same off-white, so the cut is clean.
 */
export function Preloader({ onReady, canHide }: { onReady: () => void; canHide: boolean }) {
  const [label, setLabel] = useState('warming up')
  const [gone, setGone] = useState(false)
  const pct = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef({ v: 0 })
  const loaded = useRef(false)

  useEffect(() => {
    const tw = gsap.to(shown.current, {
      v: 82,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => paint(),
    })
    loadAssets((l) => setLabel(l)).then(() => {
      loaded.current = true
      onReady()
    })
    return () => {
      tw.kill()
    }
  }, [onReady])

  // hide once the scene has rendered its first frames
  useEffect(() => {
    if (!canHide || !root.current) return
    const tl = gsap.timeline({ onComplete: () => setGone(true) })
    tl.to(shown.current, { v: 100, duration: 0.5, ease: 'power1.inOut', onUpdate: () => paint() })
    tl.to(root.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, '+=0.15')
    return () => {
      tl.kill()
    }
  }, [canHide])

  function paint() {
    const v = Math.round(shown.current.v)
    if (pct.current) pct.current.textContent = `${v}%`
    if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`
  }

  if (gone) return null
  return (
    <div ref={root} className="preloader" role="status" aria-live="polite">
      <div className="preloader__brand">
        <Sparkle weight="fill" size={22} />
        {site.intro.app}
      </div>
      <div className="preloader__row">
        <span className="preloader__label">{label}</span>
        <span ref={pct} className="preloader__pct">
          0%
        </span>
      </div>
      <div className="preloader__track">
        <div ref={bar} className="preloader__bar" />
      </div>
    </div>
  )
}
