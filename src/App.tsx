import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useStory } from './state/store'
import { Controls } from './ui/Controls'
import { Director } from './ui/Director'
import { IntroHud } from './ui/IntroHud'
import { Preloader } from './ui/Preloader'
import { StoryText } from './ui/StoryText'
import { Scrapbook } from './ui/scrapbook/Scrapbook'

const Experience = lazy(() => import('./three/Experience').then((m) => ({ default: m.Experience })))

/**
 * Layers, back to front: the WebGL story (fixed), the tall scroll track that drives it, the AI
 * app's HUD, narration, controls, the scrapbook, and the preloader.
 */
export function App() {
  const track = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [painted, setPainted] = useState(false)
  const stage = useStory((s) => s.stage)
  const onReady = useCallback(() => setReady(true), [])

  // give the scene a few frames to compile shaders before the preloader lifts
  // (with a timeout, because a background tab never gets those frames)
  useEffect(() => {
    if (!ready) return
    let n = 0
    let id = 0
    const done = () => {
      performance.mark('scene:painted')
      setPainted(true)
    }
    const tick = () => {
      if (++n > 8) done()
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    const fallback = window.setTimeout(done, 2500)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(fallback)
    }
  }, [ready])

  return (
    <>
      <a className="sr-only sr-only--focusable skip" href="#index">
        Skip the intro and open the index
      </a>
      <p className="sr-only">
        An interactive story. A feed of AI-generated fashion overloads and an old television switches off. A bulb
        comes on over a steel almirah; inside it, among the clothes, is the scrapbook that holds this portfolio.
      </p>
      {ready && (
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      )}
      <div ref={track} className="scroll-track" aria-hidden />
      <Director track={track} ready={painted} />
      <IntroHud />
      <StoryText />
      <Controls />
      {stage === 'book' && <Scrapbook />}
      <Preloader onReady={onReady} canHide={painted} />
    </>
  )
}
