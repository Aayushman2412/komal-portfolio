import { ArrowCounterClockwise, BookOpen, SkipForward, SpeakerSimpleHigh, SpeakerSimpleSlash, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { sound } from '../lib/audio'
import { onFrame } from '../lib/frame'
import { closeAlmirah, openAlmirah, openBookAt, replayIntro, skipIntro, visited } from '../lib/story'
import { span, useStory } from '../state/store'

/**
 * The few controls that sit outside the story: sound, skip/replay, close, and a straight path to
 * the index for anyone who has seen the intro before (recruiters revisit; see BRIEF.md).
 * Hidden-but-focusable buttons mirror the 3D clicks for keyboard and screen-reader users.
 */
export function Controls() {
  const stage = useStory((s) => s.stage)
  const soundOn = useStory((s) => s.sound)
  const setSound = useStory((s) => s.setSound)
  const [returning] = useState(visited.get)
  const name = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      onFrame((p) => {
        if (!name.current) return
        const st = useStory.getState().stage
        const show = st === 'intro' ? span(p, 0.44, 0.5) : st === 'loading' ? 0 : 1
        name.current.style.opacity = String(show)
      }),
    [],
  )

  // Escape steps back out of the story
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const s = useStory.getState().stage
      if (s === 'open') closeAlmirah()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSound(next)
    sound.enable(next)
  }

  if (stage === 'loading') return null
  const inRoom = stage === 'room' || stage === 'opening' || stage === 'open'

  return (
    <>
      <div className="controls">
        <div ref={name} className="namemark">
          <strong>{site.name}</strong>
          <span>{site.role}</span>
        </div>

        <div className="controls__top">
          {stage === 'intro' && (
            <button className={`chip ${returning ? 'chip--loud' : ''}`} onClick={skipIntro}>
              <SkipForward size={16} weight="bold" />
              {returning ? 'Skip to the almirah' : 'Skip intro'}
            </button>
          )}
          {inRoom && (
            <button className="chip" onClick={replayIntro}>
              <ArrowCounterClockwise size={16} weight="bold" />
              Replay intro
            </button>
          )}
          {stage !== 'book' && (
            <button className="chip" onClick={() => openBookAt('index')}>
              <BookOpen size={16} weight="bold" />
              Index
            </button>
          )}
        </div>

        {stage === 'open' && (
          <button className="chip chip--close" onClick={closeAlmirah}>
            <X size={16} weight="bold" />
            Close the almirah
          </button>
        )}

        {/* keyboard / screen-reader equivalents of the 3D clicks */}
        {stage === 'room' && (
          <button className="sr-only sr-only--focusable" onClick={openAlmirah}>
            Open the almirah
          </button>
        )}
        {stage === 'open' && (
          <button className="sr-only sr-only--focusable" onClick={() => openBookAt('cover')}>
            Open the scrapbook
          </button>
        )}
      </div>
      {/* outside .controls so it stays above the scrapbook too */}
      <button className="sound" onClick={toggleSound} aria-pressed={soundOn}>
        {soundOn ? <SpeakerSimpleHigh size={18} weight="bold" /> : <SpeakerSimpleSlash size={18} weight="bold" />}
        <span>Sound {soundOn ? 'on' : 'off'}</span>
      </button>
    </>
  )
}
