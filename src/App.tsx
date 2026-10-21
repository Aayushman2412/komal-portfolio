import { useCallback, useRef, useState } from 'react'
import { Feed } from './scenes/Feed'
import { Inside } from './scenes/Inside'
import { Room } from './scenes/Room'
import { useStory } from './state/store'
import { Controls } from './ui/Controls'
import { Cursor } from './ui/Cursor'
import { Director } from './ui/Director'
import { Preloader } from './ui/Preloader'
import { Scrapbook } from './ui/scrapbook/Scrapbook'

/**
 * Layers, back to front: the room (her frame 3), the feed (frames 1 and 2) over it until the power
 * cut, the inside of the almirah (frame 4), the tall scroll track that drives the intro, controls,
 * the scrapbook (frames 5 and 6 and the project pages), the black first page, and the needle.
 */
export function App() {
  const track = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const stage = useStory((s) => s.stage)
  const onReady = useCallback(() => setReady(true), [])

  return (
    <>
      <a className="sr-only sr-only--focusable skip" href="#index">
        Skip the intro and open the index
      </a>
      <p className="sr-only">
        An interactive story drawn by Komal Singh. A feed of identical AI-made dresses speeds up, glitches and cuts to
        black. A bulb comes on over her nani's carved wooden almirah; inside it, among folded clothes and a tin box, is
        the scrapbook she made as a child, which holds this portfolio.
      </p>
      <Room />
      <Feed />
      <Inside />
      <div ref={track} className="scroll-track" aria-hidden />
      <Director track={track} ready={ready} />
      <Controls />
      {stage === 'book' && <Scrapbook />}
      <Preloader onReady={onReady} />
      <Cursor />
    </>
  )
}
