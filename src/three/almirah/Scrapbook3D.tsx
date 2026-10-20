import { Html, Sparkles, useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { site } from '../../content/site'
import { getAssets } from '../../lib/assets'
import { sound } from '../../lib/audio'
import { gsap } from '../../lib/gsap'
import { COVER } from '../../lib/textures/cover'
import { useStory } from '../../state/store'
import { pageSize } from '../../ui/scrapbook/size'
import { L } from '../layout'

/**
 * The scrapbook lying on the middle shelf. It glows and sparkles so you know it is the thing to
 * click. On click it lifts off the shelf and flies to the camera, ending exactly where (and as big
 * as) the DOM scrapbook's cover will appear, so the hand-off is invisible.
 */
const BW = 0.3
const BH = BW / (COVER.w / COVER.h)
const BT = 0.035
const REST = new THREE.Vector3(0, L.shelfY + 0.006 + BT / 2, 0.05)
const REST_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.14, 0))

function edgeTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#efe6d2'
  ctx.fillRect(0, 0, 64, 256)
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = `rgba(120,95,60,${0.12 + Math.random() * 0.2})`
    ctx.fillRect(0, y, 64, 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function Scrapbook3D() {
  const a = getAssets()
  const stage = useStory((s) => s.stage)
  const setStage = useStory((s) => s.setStage)
  const bookLanded = useStory((s) => s.bookLanded)
  const setBookLanded = useStory((s) => s.setBookLanded)
  const group = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const flight = useRef({ t: 0 })
  const { camera, size } = useThree()
  const clickable = stage === 'open'
  useCursor(hover && clickable)

  const materials = useMemo(() => {
    const page = new THREE.MeshStandardMaterial({ map: edgeTexture(), roughness: 0.9 })
    const spine = new THREE.MeshStandardMaterial({ color: '#b8343a', roughness: 0.8 })
    const back = new THREE.MeshStandardMaterial({ color: '#9a7149', roughness: 0.85 })
    const cover = new THREE.MeshStandardMaterial({
      map: a.cover,
      emissiveMap: a.cover,
      emissive: new THREE.Color('#ffcf8a'),
      emissiveIntensity: 0,
      roughness: 0.85,
    })
    // BoxGeometry faces: +x, -x (spine), +y (cover), -y, +z, -z
    return { cover, list: [page, spine, cover, back, page, page] }
  }, [a.cover])

  // fly up when the story reaches `book`, fly back when it leaves
  useEffect(() => {
    const f = flight.current
    if (stage === 'book') {
      sound.page()
      const tw = gsap.to(f, { t: 1, duration: f.t > 0.99 ? 0 : 1.35, ease: 'lift', onComplete: () => setBookLanded(true) })
      return () => {
        tw.kill()
      }
    }
    setBookLanded(false)
    const tw = gsap.to(f, { t: 0, duration: 1.1, ease: 'power3.inOut' })
    return () => {
      tw.kill()
    }
  }, [stage, setBookLanded])

  const tmp = useMemo(
    () => ({
      target: new THREE.Vector3(),
      targetQ: new THREE.Quaternion(),
      fwd: new THREE.Vector3(),
      flipX: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      parentInv: new THREE.Matrix4(),
      m: new THREE.Matrix4(),
      s: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = flight.current.t
    const glow = clickable ? 0.25 + 0.2 * Math.sin(clock.elapsedTime * 3) + (hover ? 0.35 : 0) : 0
    materials.cover.emissiveIntensity = glow

    if (t <= 0.0001) {
      g.position.copy(REST)
      g.quaternion.copy(REST_Q)
      g.visible = true
      return
    }
    // where the DOM cover will be: screen centre, at the distance that makes heights match
    const persp = camera as THREE.PerspectiveCamera
    const { h: domH } = pageSize(size.width, size.height)
    const dist = (BH * size.height) / (2 * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2) * domH)
    camera.getWorldDirection(tmp.fwd)
    tmp.target.copy(camera.position).addScaledVector(tmp.fwd, dist)
    tmp.targetQ.copy(camera.quaternion).multiply(tmp.flipX)
    // convert to the almirah's local space
    g.parent!.updateWorldMatrix(true, false)
    tmp.parentInv.copy(g.parent!.matrixWorld).invert()
    tmp.m.compose(tmp.target, tmp.targetQ, new THREE.Vector3(1, 1, 1)).premultiply(tmp.parentInv)
    tmp.m.decompose(tmp.p, tmp.q, tmp.s)
    // an arc: lift up off the shelf first, then travel
    const lift = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.12 * (1 - t)
    g.position.lerpVectors(REST, tmp.p, t)
    g.position.y += lift
    g.quaternion.slerpQuaternions(REST_Q, tmp.q, Math.min(1, t * 1.15))
    g.visible = !bookLanded
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!clickable) return
    e.stopPropagation()
    setStage('book')
  }

  return (
    <group ref={group} position={REST} quaternion={REST_Q}>
      <mesh
        castShadow
        material={materials.list}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[BW, BT, BH]} />
      </mesh>
      {clickable && (
        <>
          <Sparkles count={26} scale={[0.42, 0.16, 0.5]} position={[0, 0.06, 0]} size={2.4} speed={0.35} color="#ffe3a8" opacity={0.9} />
          <Html position={[0.2, 0.06, -0.12]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <div className="hint hint--book" aria-hidden>
              {site.intro.bookHint}
            </div>
          </Html>
        </>
      )}
    </group>
  )
}
