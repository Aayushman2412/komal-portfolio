import { useEffect, useRef } from 'react'
import { site } from '../content/site'
import { onFrame } from '../lib/frame'
import { beats, span, useStory } from '../state/store'

/** The two lines of narration after the app falls away: one at the switch-off, one in the room. */
function windowed(p: number, a: number, b: number, edge = 0.25) {
  const r = (b - a) * edge
  return Math.min(span(p, a, a + r), 1 - span(p, b - r, b))
}

export function StoryText() {
  const off = useRef<HTMLParagraphElement>(null)
  const room = useRef<HTMLParagraphElement>(null)

  useEffect(
    () =>
      onFrame((p) => {
        const intro = useStory.getState().stage === 'intro'
        const a = intro ? windowed(p, beats.powerOff[0] - 0.03, beats.dark[1]) : 0
        const b = intro ? windowed(p, beats.bulb[1] - 0.01, beats.roomReady + 0.02, 0.18) : 0
        if (off.current) {
          off.current.style.opacity = String(a)
          off.current.style.letterSpacing = `${(1 - a) * 0.3}em`
        }
        if (room.current) {
          room.current.style.opacity = String(b)
          room.current.style.transform = `translate3d(0, ${(1 - b) * 14}px, 0)`
        }
      }),
    [],
  )

  return (
    <div className="story" aria-hidden>
      <p ref={off} className="story__off">
        {site.intro.afterOff}
      </p>
      <p ref={room} className="story__room">
        {site.intro.roomLine}
      </p>
    </div>
  )
}
