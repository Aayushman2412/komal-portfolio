import { ArrowCounterClockwise, BookOpen, SkipForward, SpeakerSimpleHigh, SpeakerSimpleSlash, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { site } from '../content/site'
import { sound } from '../lib/audio'
import { closeAlmirah, openBookAt, replayIntro, skipIntro, visited } from '../lib/story'
import { useStory } from '../state/store'

/**
 * The few controls that sit outside the story, drawn like the tabs in her feed: sound, skip/replay,
 * close, and a straight path to the index for anyone who has seen the intro before.
 */
export function Controls() {
  const stage = useStory((s) => s.stage)
  const soundOn = useStory((s) => s.sound)
  const setSound = useStory((s) => s.setSound)
  const [returning] = useState(visited.get)

  // Escape steps back out of the almirah
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useStory.getState().stage === 'open') closeAlmirah()
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
      <div className={`controls controls--${stage}`}>
        {inRoom && (
          <p className="namemark">
            {site.name} <span>{site.role}</span>
          </p>
        )}

        <div className="controls__top">
          {stage === 'intro' && (
            <button className={`tab ${returning ? 'tab--dark' : ''}`} onClick={skipIntro}>
              <SkipForward size={15} weight="bold" />
              {returning ? 'skip to the almirah' : 'skip intro'}
            </button>
          )}
          {inRoom && (
            <button className="tab" onClick={replayIntro}>
              <ArrowCounterClockwise size={15} weight="bold" />
              replay intro
            </button>
          )}
          {stage !== 'book' && (
            <button className="tab" onClick={() => openBookAt('index')}>
              <BookOpen size={15} weight="bold" />
              index
            </button>
          )}
        </div>

        {stage === 'open' && (
          <button className="tab tab--close" onClick={closeAlmirah}>
            <X size={15} weight="bold" />
            close the almirah
          </button>
        )}
      </div>
      {/* outside .controls so it stays above the scrapbook too */}
      <button className="tab sound" onClick={toggleSound} aria-pressed={soundOn}>
        {soundOn ? <SpeakerSimpleHigh size={16} weight="bold" /> : <SpeakerSimpleSlash size={16} weight="bold" />}
        <span>sound {soundOn ? 'on' : 'off'}</span>
      </button>
    </>
  )
}
