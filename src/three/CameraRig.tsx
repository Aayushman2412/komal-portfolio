import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { beats, live, span, useStory } from '../state/store'
import { L, screenWorld } from './layout'

/**
 * One camera, five framings:
 *   K0  pressed against the TV glass so the feed fills the viewport like a website
 *   K1  pulled back: the TV on its table in a dark room
 *   K2  the almirah, full height
 *   KO  close on the open almirah
 * During the intro the framing is a pure function of scroll; after it, the camera eases between
 * framings. Distances adapt to the viewport's aspect so phones see the same subjects.
 */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function CameraRig() {
  const { camera, size } = useThree()
  const stage = useStory((s) => s.stage)
  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      tPos: new THREE.Vector3(),
      tLook: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
      d: new THREE.Vector3(),
      init: false,
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const sc = screenWorld()

    // K0: cover the viewport with the screen
    const d0 = Math.min(L.screen.w / (2 * tanH * aspect), L.screen.h / (2 * tanH)) * 0.97
    const k0p = v.a.copy(sc).add(new THREE.Vector3(0, 0, d0))
    const k0l = sc
    // K1: the set on its table
    const d1 = Math.max(1.85, 1.05 / (2 * tanH * aspect))
    const k1l = sc.clone().add(new THREE.Vector3(0.02, -0.06, 0))
    const k1p = v.b.copy(k1l).add(new THREE.Vector3(0.24, 0.14, 1).normalize().multiplyScalar(d1))
    // K2: the almirah
    const d2 = Math.max(3.7, 1.35 / (2 * tanH * aspect))
    const k2l = L.almirah.clone().add(new THREE.Vector3(0, 1.08, 0))
    const k2p = v.c.copy(k2l).add(new THREE.Vector3(-0.1, 0.05, 1).normalize().multiplyScalar(d2))
    // KO: inside the open almirah
    const dO = Math.max(2.35, 1.0 / (2 * tanH * aspect))
    const kOl = L.almirah.clone().add(new THREE.Vector3(0, 1.12, 0))
    const kOp = v.d.copy(kOl).add(new THREE.Vector3(0, 0.06, 1).normalize().multiplyScalar(dO))

    let lambda = 3
    if (stage === 'intro' || stage === 'loading') {
      const p = live.smooth
      lambda = 14
      const pb = ease(span(p, beats.pullBack[0], beats.pullBack[1]))
      const ta = ease(span(p, beats.toAlmirah[0], beats.toAlmirah[1]))
      if (ta <= 0) {
        v.tPos.lerpVectors(k0p, k1p, pb)
        v.tLook.lerpVectors(k0l, k1l, pb)
        // in the dark the camera drifts in a little, as if leaning towards the sound
        const lean = span(p, beats.powerOff[1], beats.toAlmirah[0])
        v.tPos.lerp(k1l, lean * 0.12)
      } else {
        const k1Lean = v.a.copy(k1p).lerp(k1l, 0.12)
        v.tPos.lerpVectors(k1Lean, k2p, ta)
        v.tLook.lerpVectors(k1l, k2l, ta)
      }
      // camera shake while the feed overloads
      const shake = span(p, 0.3, 0.42) * (1 - pb) * 0.0012 + span(p, 0.47, 0.565) * 0.004 * (1 - span(p, 0.565, 0.6))
      const t = clock.elapsedTime
      v.tPos.x += Math.sin(t * 41) * shake
      v.tPos.y += Math.cos(t * 37) * shake
    } else if (stage === 'room') {
      v.tPos.copy(k2p)
      v.tLook.copy(k2l)
    } else {
      v.tPos.copy(kOp)
      v.tLook.copy(kOl)
      lambda = 2.4
    }

    // gentle parallax once we are in the room
    const par = stage === 'intro' ? span(live.smooth, beats.toAlmirah[0], 1) : 1
    v.tPos.x += live.pointer.x * 0.06 * par
    v.tPos.y += live.pointer.y * 0.035 * par

    if (!v.init) {
      v.pos.copy(v.tPos)
      v.look.copy(v.tLook)
      v.init = true
    }
    const k = 1 - Math.exp(-dt * lambda)
    v.pos.lerp(v.tPos, k)
    v.look.lerp(v.tLook, k)
    cam.position.copy(v.pos)
    cam.lookAt(v.look)
  })

  return null
}
