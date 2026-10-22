/**
 * The scrapbook and a project's own page (which the book opens in a new tab, "click to see more")
 * talk over this channel. The project page asks an open book to turn to a page (its project, or the
 * index), and closes itself once a book has answered, instead of loading a second copy of the whole
 * story; with no book open it simply follows its link.
 */
const NAME = 'komal-scrapbook'

type Msg = { type: 'open'; target: string; id: string } | { type: 'opened'; id: string }

/** In the book: turn to whatever a project page asks for (a project slug, or 'index'). */
export function listenForPages(go: (target: string) => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(NAME)
  ch.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data
    if (m?.type !== 'open' || typeof m.target !== 'string') return
    ch.postMessage({ type: 'opened', id: m.id } satisfies Msg)
    go(m.target)
  }
  return () => ch.close()
}

/** On a project page: ask an open book to turn to `target`. Resolves true once a book has answered. */
export function askBook(target: string, wait = 300): Promise<boolean> {
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const ch = new BroadcastChannel(NAME)
    const id = Math.random().toString(36).slice(2)
    const done = (ok: boolean) => {
      window.clearTimeout(timer)
      ch.close()
      resolve(ok)
    }
    const timer = window.setTimeout(() => done(false), wait)
    ch.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data?.type === 'opened' && e.data.id === id) done(true)
    }
    ch.postMessage({ type: 'open', target, id } satisfies Msg)
  })
}
