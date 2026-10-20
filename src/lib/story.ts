import { useStory } from '../state/store'
import { lockScroll, scrollToProgress } from './scroll'

/** Navigation verbs shared by buttons, keyboard and deep links. */

export function skipIntro() {
  scrollToProgress(1, true)
  useStory.getState().setStage('room')
}

export function replayIntro() {
  const s = useStory.getState()
  s.setBookLanded(false)
  s.setStage('intro')
  lockScroll(false)
  scrollToProgress(0, true)
  history.replaceState(null, '', location.pathname + location.search)
}

/** Open the scrapbook, from anywhere. `target` is 'cover' | 'index' | a project slug. */
export function openBookAt(target: string) {
  const s = useStory.getState()
  s.setBookTarget(target)
  if (s.stage === 'intro' || s.stage === 'loading') scrollToProgress(1, true)
  s.setStage('book')
}

export function closeBook() {
  useStory.getState().setStage('open')
  history.replaceState(null, '', location.pathname + location.search)
}

export function closeAlmirah() {
  useStory.getState().setStage('room')
}

export function openAlmirah() {
  if (useStory.getState().stage === 'room') useStory.getState().setStage('opening')
}

export const visited = {
  get: () => {
    try {
      return localStorage.getItem('ks-visited') === '1'
    } catch {
      return false
    }
  },
  set: () => {
    try {
      localStorage.setItem('ks-visited', '1')
    } catch {
      /* private mode: nothing to remember */
    }
  },
}
