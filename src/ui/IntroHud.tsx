import { Sparkle } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { site } from '../content/site'
import { onFrame } from '../lib/frame'
import { gsap } from '../lib/gsap'
import { span, useStory } from '../state/store'

/**
 * The chrome of a fictional AI design app laid over the feed: it is what the visitor thinks the
 * website is for the first few seconds. As you scroll it gets louder (counter, toasts, a prompt
 * that degrades to "more"), starts to glitch, and falls away when the camera pulls back to reveal
 * it was all on an old TV.
 */
const PROMPTS = [site.intro.prompt, 'the same dress, but trending', 'more', 'more more more more']
const PROMPT_AT = [0, 0.12, 0.22, 0.3]
const CAPTION_AT: [number, number][] = [
  [0.05, 0.14],
  [0.15, 0.24],
  [0.26, 0.37],
]

/** 0 outside [a,b], fades in and out over the first and last 20% of the window. */
function windowed(p: number, a: number, b: number) {
  const r = (b - a) * 0.2
  return Math.min(span(p, a, a + r), 1 - span(p, b - r, b))
}

export function IntroHud() {
  const stage = useStory((s) => s.stage)
  const root = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const prompt = useRef<HTMLSpanElement>(null)
  const captions = useRef<(HTMLParagraphElement | null)[]>([])
  const toasts = useRef<(HTMLDivElement | null)[]>([])
  const promptIdx = useRef(-1)
  const typed = useRef(false)

  // type the first prompt once the feed is up
  useEffect(() => {
    if (stage !== 'intro' || typed.current || !prompt.current) return
    typed.current = true
    promptIdx.current = 0
    const el = prompt.current
    const text = PROMPTS[0]
    const o = { n: 0 }
    gsap.to(o, {
      n: text.length,
      duration: 1.6,
      delay: 0.6,
      ease: 'none',
      onUpdate: () => {
        if (promptIdx.current === 0) el.textContent = text.slice(0, Math.round(o.n))
      },
    })
  }, [stage])

  useEffect(
    () =>
      onFrame((p) => {
        const el = root.current
        if (!el) return
        const st = useStory.getState().stage
        const fade = st === 'intro' ? 1 - span(p, 0.37, 0.43) : 0
        el.style.opacity = String(fade)
        el.style.visibility = fade <= 0.001 ? 'hidden' : 'visible'
        if (fade <= 0.001) return
        const g = span(p, 0.28, 0.42)
        el.style.setProperty('--g', g.toFixed(3))
        el.classList.toggle('hud--glitch', g > 0.02)

        if (counter.current) {
          const t = span(p, 0, 0.42)
          const n = Math.round(1240 * Math.pow(10, 5.2 * t * t) + p * 37)
          counter.current.textContent = n.toLocaleString('en-IN')
        }

        let idx = 0
        PROMPT_AT.forEach((a, i) => {
          if (p >= a) idx = i
        })
        if (typed.current && idx !== promptIdx.current && prompt.current) {
          promptIdx.current = idx
          gsap.to(prompt.current, { duration: 0.5, scrambleText: { text: PROMPTS[idx], chars: 'lowerCase', speed: 0.6 } })
        }

        CAPTION_AT.forEach(([a, b], i) => {
          const c = captions.current[i]
          if (!c) return
          const w = windowed(p, a, b)
          c.style.opacity = String(w)
          c.style.transform = `translate3d(0, ${(1 - w) * 18}px, 0)`
        })

        const n = site.intro.toasts.length
        toasts.current.forEach((t, i) => {
          if (!t) return
          const at = 0.04 + (i / n) * 0.32
          const on = span(p, at, at + 0.012)
          // only the newest few stay; older ones are pushed off the top
          const newer = site.intro.toasts.filter((_, k) => k > i && p >= 0.04 + (k / n) * 0.32).length
          const vis = on * (newer < 4 ? 1 : 0)
          t.style.opacity = String(vis)
          t.style.transform = `translate3d(${(1 - on) * 40}px, ${newer * 112}%, 0)`
        })
      }),
    [],
  )

  return (
    <div ref={root} className="hud" aria-hidden>
      <header className="hud__bar">
        <div className="hud__brand">
          <Sparkle weight="fill" size={18} />
          {site.intro.app}
        </div>
        <nav className="hud__tabs">
          <span className="is-on">For you</span>
          <span>Trending</span>
          <span>Collections</span>
        </nav>
        <div className="hud__count">
          <span ref={counter}>1,240</span>
          <small>designs generated today</small>
        </div>
      </header>

      <div className="hud__captions">
        {site.intro.captions.map((c, i) => (
          <p key={c} ref={(el) => void (captions.current[i] = el)}>
            {c}
          </p>
        ))}
      </div>

      <div className="hud__toasts">
        {site.intro.toasts.map((t, i) => (
          <div key={t} className="toast" ref={(el) => void (toasts.current[i] = el)}>
            <Sparkle weight="fill" size={14} />
            {t}
          </div>
        ))}
      </div>

      <div className="hud__promptwrap">
        <div className="hud__prompt">
          <span className="hud__slash">/imagine</span>
          <span ref={prompt} className="hud__text" />
          <span className="hud__caret" />
          <span className="hud__gen">
            <Sparkle weight="fill" size={15} />
            Generate
          </span>
        </div>
        <p className="hud__hint">scroll to generate</p>
      </div>
    </div>
  )
}
