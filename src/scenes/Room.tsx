import { useEffect, useRef } from 'react'
import { art, clipPolygon, FRAME, fitFrame, frameTransform, polyBox, regions } from '../lib/art'
import { onFrame } from '../lib/frame'
import { gsap } from '../lib/gsap'
import { sound } from '../lib/audio'
import { openAlmirah } from '../lib/story'
import { beats, easeInOut, live, span, useStory } from '../state/store'

/**
 * Frame 3: nani's almirah. After the power cut the screen is black; the bulb in the corner of her
 * drawing flickers, catches, and the view pulls back from it until the whole room is lit. Then the
 * almirah can be opened: its two upper doors (cut from her drawing) swing out and the view goes in.
 */

/** Where, through the bulb beat, the filament stops flickering and stays lit. */
export const BULB_CATCH = 0.52

/** 0..1 bulb brightness for a scroll position: a few false starts, then steady. */
export function bulbLevel(p: number) {
  const f = span(p, beats.bulb[0], beats.bulb[1])
  if (f <= 0) return 0
  if (f >= 0.62) return 1
  const blips: [number, number, number][] = [
    [0.08, 0.13, 0.7],
    [0.2, 0.23, 0.35],
    [0.31, 0.4, 0.9],
    [0.46, 0.49, 0.5],
  ]
  for (const [a, b, v] of blips) if (f >= a && f <= b) return v
  return f > BULB_CATCH ? 0.85 + 0.15 * span(f, BULB_CATCH, 0.62) : 0
}

/** The camera after the intro: `z` zooms toward the doors, `k` brings them to the middle, `door` opens them. */
export const roomCam = { z: 1, k: 0, door: 0 }

const BULB = regions.room.bulb as [number, number]
const [DL, DR] = [regions.room.doors.left, regions.room.doors.right]
const DOORS_CENTRE: [number, number] = [(DL[0] + DR[2]) / 2, (DL[1] + DL[3]) / 2]
const ALMIRAH = regions.room.almirah
const ALMIRAH_BOX = polyBox(ALMIRAH)
const ZOOM_FROM = 3.4

export function Room() {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dark = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const doorL = useRef<HTMLImageElement>(null)
  const doorR = useRef<HTMLImageElement>(null)
  const stage = useStory((s) => s.stage)

  // open the doors and go in; close them on the way back out
  useEffect(() => {
    if (stage === 'opening') {
      sound.creak(1.2)
      const tl = gsap.timeline({ onComplete: () => useStory.getState().setStage('open') })
      tl.to(roomCam, { door: 1, duration: 1.2, ease: 'door' }, 0.12)
      tl.to(roomCam, { z: 2.9, k: 1, duration: 1.45, ease: 'power2.inOut' }, 0.3)
      return () => {
        tl.kill()
      }
    }
    if (stage === 'room' && (roomCam.z !== 1 || roomCam.door !== 0)) {
      const tl = gsap.timeline()
      tl.to(roomCam, { z: 1, k: 0, duration: 1.1, ease: 'power2.inOut' }, 0)
      tl.to(roomCam, { door: 0, duration: 0.9, ease: 'power2.inOut', onComplete: () => sound.click() }, 0.35)
      return () => {
        tl.kill()
      }
    }
    if (stage === 'open' || stage === 'book') Object.assign(roomCam, { z: 2.9, k: 1, door: 1 })
  }, [stage])

  useEffect(
    () =>
      onFrame((p) => {
        const el = root.current
        if (!el || !frame.current) return
        const st = useStory.getState().stage
        const intro = st === 'intro' || st === 'loading'
        const visible = intro ? p >= beats.tear[0] : st === 'room' || st === 'opening' || (st === 'open' && roomCam.z < 2.89)
        el.style.visibility = visible ? 'visible' : 'hidden'
        if (!visible) return

        const vw = window.innerWidth
        const vh = window.innerHeight
        const fit = fitFrame(vw, vh, regions.room.safe)
        const bulbAt: [number, number] = [fit.x + BULB[0] * fit.s, fit.y + BULB[1] * fit.s]
        const diag = Math.hypot(vw, vh)

        let transform: string
        let light = 1
        let reveal = 1
        let at = bulbAt
        if (intro) {
          // close on the bulb in the dark, then pull back to her full frame
          const u = easeInOut(span(p, beats.pullBack[0], beats.pullBack[1]))
          const z = Math.pow(ZOOM_FROM, 1 - u)
          at = [vw / 2 + (bulbAt[0] - vw / 2) * u, vh * 0.45 + (bulbAt[1] - vh * 0.45) * u]
          transform = frameTransform(fit, z, BULB, at)
          light = bulbLevel(p)
          reveal = u
        } else {
          const doorsAt: [number, number] = [fit.x + DOORS_CENTRE[0] * fit.s, fit.y + DOORS_CENTRE[1] * fit.s]
          const target: [number, number] = [doorsAt[0] + (vw / 2 - doorsAt[0]) * roomCam.k, doorsAt[1] + (vh / 2 - doorsAt[1]) * roomCam.k]
          // a breath of parallax while you look at it
          target[0] -= live.pointer.x * 6
          target[1] += live.pointer.y * 4
          transform = frameTransform(fit, roomCam.z, DOORS_CENTRE, target)
        }
        frame.current.style.transform = transform

        // the dark: a mask that opens around the bulb as it lights the room
        if (dark.current) {
          const r = light * diag * (0.13 + 1.5 * Math.pow(reveal, 1.3))
          const a = 1 - span(reveal, 0.2, 0.95)
          dark.current.style.opacity = a <= 0.001 ? '0' : '1'
          const m = `radial-gradient(circle at ${at[0].toFixed(1)}px ${at[1].toFixed(1)}px, rgba(0,0,0,0) ${(r * 0.28).toFixed(1)}px, rgba(0,0,0,${a.toFixed(3)}) ${Math.max(1, r).toFixed(1)}px)`
          dark.current.style.maskImage = m
          dark.current.style.webkitMaskImage = m
        }
        if (glow.current) {
          const z = intro ? Math.pow(ZOOM_FROM, 1 - easeInOut(span(p, beats.pullBack[0], beats.pullBack[1]))) : 1
          const size = Math.min(vw, vh) * 0.42 * Math.sqrt(z)
          glow.current.style.opacity = String(light * (intro ? 1 - 0.55 * reveal : 0.45))
          glow.current.style.transform = `translate3d(${at[0] - size / 2}px, ${at[1] - size / 2}px, 0)`
          glow.current.style.width = glow.current.style.height = `${size}px`
        }

        const d = roomCam.door
        if (doorL.current) doorL.current.style.transform = `rotateY(${-104 * d}deg)`
        if (doorR.current) doorR.current.style.transform = `rotateY(${104 * d}deg)`
      }),
    [],
  )

  const clickable = stage === 'room'

  return (
    <div ref={root} className={`room ${clickable ? 'is-ready' : ''}`}>
      <div className="room__backdrop" style={{ backgroundImage: `url(${art.room})` }} />
      <div ref={frame} className="art-frame" style={{ width: FRAME.w, height: FRAME.h }}>
        <img className="art-frame__img" src={art.room} alt="" draggable={false} />
        {regions.room.stars.map(([x, y], i) => (
          <span key={i} className="room__star" style={{ left: x, top: y, animationDelay: `${(i * 0.77) % 3}s` }} />
        ))}
        <div className="room__doors" style={{ left: DL[0], top: DL[1], width: DR[2] - DL[0], height: DL[3] - DL[1] }}>
          <span className="room__inside" />
          <img ref={doorL} className="room__door room__door--l" src={art.doorL} alt="" draggable={false} style={{ width: DL[2] - DL[0] }} />
          <img ref={doorR} className="room__door room__door--r" src={art.doorR} alt="" draggable={false} style={{ width: DR[2] - DR[0] }} />
        </div>
        <button
          className="room__hit"
          aria-label="Open the almirah"
          tabIndex={clickable ? 0 : -1}
          disabled={!clickable}
          onClick={openAlmirah}
          style={{
            left: ALMIRAH_BOX[0],
            top: ALMIRAH_BOX[1],
            width: ALMIRAH_BOX[2] - ALMIRAH_BOX[0],
            height: ALMIRAH_BOX[3] - ALMIRAH_BOX[1],
            clipPath: clipPolygon(ALMIRAH, ALMIRAH_BOX),
          }}
        />
        <img
          className="room__almirah"
          src={art.almirah}
          alt=""
          draggable={false}
          style={{ left: ALMIRAH_BOX[0], top: ALMIRAH_BOX[1], width: ALMIRAH_BOX[2] - ALMIRAH_BOX[0] }}
        />
      </div>
      <div ref={dark} className="room__dark" />
      <div ref={glow} className="room__glow" />
    </div>
  )
}
