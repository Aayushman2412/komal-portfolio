import { useEffect, useRef } from 'react'
import { sound } from '../lib/audio'
import { listenForPages } from '../lib/bookChannel'
import { onFrame } from '../lib/frame'
import { prefersReducedMotion } from '../lib/gsap'
import { initScroll, lockScroll } from '../lib/scroll'
import { openBookAt, skipIntro, visited } from '../lib/story'
import { BULB_CATCH, bulbLevel } from '../scenes/Room'
import { beats, live, span, useStory } from '../state/store'

/** Opens whatever the URL hash points at. Returns false when there is nothing to follow. */
function followHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''))
  if (hash === 'book') openBookAt('cover')
  else if (hash === 'index') openBookAt('index')
  else if (hash.startsWith('p/')) openBookAt(hash.slice(2))
  else if (hash === 'almirah') skipIntro()
  else return false
  return true
}

/**
 * Runs the story: owns the scroll engine, moves between stages as the scroll crosses the end of
 * the intro, honours deep links (#almirah, #book, #index, #p/<slug>) and reduced motion, locks
 * scrolling once the almirah is open, and feeds the sound engine.
 */
export function Director({ track, ready }: { track: React.RefObject<HTMLDivElement | null>; ready: boolean }) {
  const stage = useStory((s) => s.stage)
  const prev = useRef(0)

  useEffect(() => {
    if (!track.current) return
    return initScroll(track.current)
  }, [track])

  // start, or jump straight in for deep links / reduced motion
  useEffect(() => {
    if (!ready) return
    useStory.getState().setStage('intro')
    if (!followHash() && prefersReducedMotion()) skipIntro()
    // in-page links such as the skip link change the hash without reloading
    const onHash = () => followHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [ready])

  // a project's own page, opened from the book in another tab, sends the book to its project or the index
  useEffect(() => listenForPages((target) => openBookAt(target)), [])

  useEffect(() => {
    lockScroll(stage === 'opening' || stage === 'open' || stage === 'book')
    if (stage === 'room') visited.set()
  }, [stage])

  useEffect(
    () =>
      onFrame((p) => {
        const st = useStory.getState()
        if (st.stage === 'intro' && live.progress >= beats.roomReady) st.setStage('room')
        else if (st.stage === 'room' && live.progress < beats.roomReady - 0.015) st.setStage('intro')

        const inIntro = st.stage === 'intro' || st.stage === 'loading'
        const q = inIntro ? p : 1
        const cut = span(q, beats.tear[1] - 0.02, beats.tear[1])
        sound.setLevels({
          feed: inIntro ? (1 - span(q, beats.glitch[0], beats.glitch[1])) * (1 - cut) : 0,
          climb: span(q, beats.feed[0], beats.feed[1]),
          glitch: span(q, beats.glitch[0], beats.glitch[1]) * (1 - cut),
          room: span(q, beats.bulb[1], beats.pullBack[1]),
          bulb: bulbLevel(q),
        })
        const trip = beats.tear[1] - 0.01
        if (inIntro && prev.current < trip && q >= trip) sound.powerOff()

        // the bulb: the switch as you cross into the flicker, an arc each time it lights, a tick
        // each time it cuts out, a low thunk and warm-up ticks when it catches. Sub-sampled between
        // frames so a fast scroll still plays every flicker it passes; scrolling back plays them in reverse.
        const from = prev.current
        const flipped = from < beats.bulb[0] !== q < beats.bulb[0]
        let n = 0
        // switching on: the click comes first; switching off (scrolling back): it comes last
        if (flipped && q > from) sound.switchClick()
        if (from !== q && Math.max(from, q) >= beats.bulb[0] && Math.min(from, q) <= beats.bulb[1]) {
          let last = bulbLevel(from)
          for (let k = 1; k <= 24; k++) {
            const v = bulbLevel(from + ((q - from) * k) / 24)
            if (last === 0 && v > 0) sound.bulbSpark(Math.min(1, v), 0.06 * n++)
            else if (last > 0 && v === 0) sound.bulbDrop(0.06 * n)
            last = v
          }
          const caught = beats.bulb[0] + (beats.bulb[1] - beats.bulb[0]) * BULB_CATCH
          if (from < caught && q >= caught) {
            sound.bulbThunk(0.06 * n)
            sound.bulbTicks(0.06 * n + 0.28)
          }
        }
        if (flipped && q < from) sound.switchClick(0.06 * n)
        prev.current = q
      }),
    [],
  )

  // pointer, for parallax and the needle
  useEffect(() => {
    const move = (e: PointerEvent) => {
      live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      live.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return null
}
