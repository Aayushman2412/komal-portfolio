import * as THREE from 'three'
import { buildFeedAtlas } from './textures/aiCards'
import { drawCover } from './textures/cover'
import { drawGarment, type GarmentCut } from './textures/fabrics'
import { doilyTexture, floorTexture, steelTexture, stickerAtlas, suitcaseTexture, wallTexture, woodTexture } from './textures/room'
import { fontsReady, toTexture } from './textures/util'
import type { Swatch } from '../content/site'

/** Everything procedural is drawn once, up front, while the preloader is showing. */
export type Assets = ReturnType<typeof draw>

export const GARMENTS: { cut: GarmentCut; kind: Swatch['kind'] }[] = [
  { cut: 'kurta', kind: 'block' },
  { cut: 'dress', kind: 'bandhani' },
  { cut: 'dupatta', kind: 'ikat' },
  { cut: 'shirt', kind: 'gingham' },
  { cut: 'jacket', kind: 'denim' },
  { cut: 'dress', kind: 'chikan' },
]

/** Times each texture into the performance timeline (visible in DevTools > Performance). */
function timed<T>(name: string, fn: () => T): T {
  const t0 = performance.now()
  const v = fn()
  performance.measure(`tex:${name}`, { start: t0, end: performance.now() })
  return v
}

function draw() {
  const coverCanvas = timed('cover', drawCover)
  const cover = toTexture(coverCanvas)
  return {
    feed: timed('feed', buildFeedAtlas),
    wall: timed('wall', wallTexture),
    floor: timed('floor', floorTexture),
    wood: timed('wood', woodTexture),
    steel: timed('steel', () => steelTexture('#93bfa6')),
    steelInside: timed('steelInside', () => steelTexture('#c9d6cc', 9)),
    stickers: timed('stickers', stickerAtlas),
    doily: timed('doily', doilyTexture),
    suitcase: timed('suitcase', suitcaseTexture),
    cover,
    coverCanvas,
    garments: timed('garments', () =>
      GARMENTS.map((g, i) => {
        const t = toTexture(drawGarment(g.cut, g.kind, 40 + i))
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
        return t
      }),
    ),
  }
}

// Textures are drawn once per page load; editing any texture code reloads the page in dev
// rather than leaving a live scene pointing at a wiped cache.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())

let cache: Assets | null = null
let pending: Promise<Assets> | null = null

export function getAssets() {
  if (!cache) throw new Error('assets not loaded yet')
  return cache
}

export function loadAssets(onStep?: (label: string, done: number, total: number) => void) {
  if (pending) return pending
  pending = (async () => {
    onStep?.('loading type', 0, 3)
    performance.mark('assets:start')
    await fontsReady([
      '600 22px "Instrument Sans Variable"',
      '400 16px "IBM Plex Mono"',
      '900 150px "Bodoni Moda Variable"',
      'italic 700 140px "Bodoni Moda Variable"',
      '400 40px "Special Elite"',
      '400 60px "Gochi Hand"',
      '400 60px "Permanent Marker"',
      '400 40px "Caveat Variable"',
      '400 40px "VT323"',
    ])
    performance.mark('assets:fonts')
    onStep?.('generating designs', 1, 3)
    // let the preloader paint before the heavy synchronous canvas work (a timer, not rAF:
    // rAF is paused in background tabs and would stall the load until the tab is shown)
    await new Promise((r) => setTimeout(r, 30))
    cache = draw()
    performance.mark('assets:drawn')
    onStep?.('ready', 3, 3)
    return cache
  })()
  return pending
}
