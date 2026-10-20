import { Html, RoundedBox, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { site } from '../../content/site'
import { getAssets, GARMENTS } from '../../lib/assets'
import { sound } from '../../lib/audio'
import { gsap } from '../../lib/gsap'
import { drawFabric } from '../../lib/textures/fabrics'
import { STICKERS } from '../../lib/textures/room'
import { canvas, toTexture } from '../../lib/textures/util'
import { live, useStory } from '../../state/store'
import { L } from '../layout'
import { Cloth } from './Cloth'
import { Scrapbook3D } from './Scrapbook3D'

/**
 * The steel almirah every Indian home had: two doors, the right one with the long chrome handle
 * and the lock, an embossed plate, childhood stickers on the front, a suitcase and a carton on top.
 * Inside: a hanging rod with clothes, a shelf with folded stacks, the cookie tin that holds the
 * sewing kit, and in the middle, her scrapbook.
 */
const { w: W, h: H, d: D, plinth: P } = L.almirahSize
const T = 0.014 // sheet thickness
const DOOR_W = W / 2 - 0.004
const DOOR_H = H - P - 0.03

function plateTexture() {
  const { c, ctx } = canvas(256, 128)
  const g = ctx.createLinearGradient(0, 0, 256, 128)
  g.addColorStop(0, '#d8c48c')
  g.addColorStop(0.5, '#f3e6b8')
  g.addColorStop(1, '#a8925a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(128, 64, 124, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#7d6a3c'
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.fillStyle = '#5c4b24'
  ctx.font = '700 54px "Bodoni Moda Variable", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(site.almirahPlate, 128, 68)
  return toTexture(c)
}

function Sticker({ i, position, rotation = 0, size = 0.07 }: { i: number; position: [number, number, number]; rotation?: number; size?: number }) {
  const a = getAssets()
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size)
    const u0 = (i % 4) / 4
    const v0 = 1 - (Math.floor(i / 4) + 1) / 2
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 2)
    return g
  }, [i, size])
  return (
    <mesh geometry={geo} position={position} rotation={[0, 0, rotation]}>
      <meshStandardMaterial map={a.stickers} transparent alphaTest={0.3} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

function Door({ side, children }: { side: 'left' | 'right'; children?: React.ReactNode }) {
  const a = getAssets()
  const s = side === 'left' ? 1 : -1
  return (
    <group>
      {/* the leaf, offset so the group's origin is the hinge */}
      <mesh position={[(s * DOOR_W) / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_W, DOOR_H, 0.018]} />
        <meshStandardMaterial map={a.steel} roughness={0.42} metalness={0.25} />
      </mesh>
      {/* pressed grooves: two outlined panels per door */}
      {[0.27, -0.24].map((y) =>
        [
          [0, DOOR_H * 0.2, DOOR_W - 0.08, 0.005],
          [0, -DOOR_H * 0.2, DOOR_W - 0.08, 0.005],
          [-(DOOR_W - 0.08) / 2, 0, 0.005, DOOR_H * 0.4],
          [(DOOR_W - 0.08) / 2, 0, 0.005, DOOR_H * 0.4],
        ].map(([gx, gy, gw, gh], k) => (
          <mesh key={`${y}-${k}`} position={[(s * DOOR_W) / 2 + gx, y * DOOR_H + gy, 0.0095]}>
            <boxGeometry args={[gw, gh, 0.002]} />
            <meshStandardMaterial color="#6f8a7c" roughness={0.5} metalness={0.2} />
          </mesh>
        )),
      )}
      {/* the inside face is lighter */}
      <mesh position={[(s * DOOR_W) / 2, 0, -0.0095]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[DOOR_W - 0.01, DOOR_H - 0.01]} />
        <meshStandardMaterial map={a.steelInside} roughness={0.5} metalness={0.2} />
      </mesh>
      {children}
    </group>
  )
}

export function Almirah() {
  const a = getAssets()
  const stage = useStory((s) => s.stage)
  const setStage = useStory((s) => s.setStage)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const inner = useRef<THREE.PointLight>(null)
  const handleMat = useRef<THREE.MeshStandardMaterial>(null)
  const [hover, setHover] = useState(false)
  const doors = useRef({ l: 0, r: 0, ajar: 0 })
  const plate = useMemo(plateTexture, [])
  const folded = useMemo(
    () => (['khadi', 'denim', 'bandhani', 'gingham', 'chikan', 'block'] as const).map((k, i) => toTexture(drawFabric(k, 256, 90 + i))),
    [],
  )

  const clickable = stage === 'room'
  useCursor(hover && clickable)

  // open when the story asks, close when you go back
  useEffect(() => {
    const d = doors.current
    if (stage === 'opening') {
      sound.creak()
      const tl = gsap.timeline({ onComplete: () => setStage('open') })
      tl.to(d, { r: 1, duration: 1.5, ease: 'door' }, 0).to(d, { l: 1, duration: 1.6, ease: 'door' }, 0.38)
      return () => {
        tl.kill()
      }
    }
    if (stage === 'room' || stage === 'intro') {
      const tw = gsap.to(d, { l: 0, r: 0, duration: 1.1, ease: 'power2.inOut' })
      return () => {
        tw.kill()
      }
    }
    if (stage === 'open' || stage === 'book') {
      d.l = Math.max(d.l, 1)
      d.r = Math.max(d.r, 1)
    }
  }, [stage, setStage])

  useFrame(({ clock }, dt) => {
    const d = doors.current
    d.ajar += ((hover && clickable ? 1 : 0) - d.ajar) * (1 - Math.exp(-dt * 6))
    const ajar = d.ajar * 0.05
    if (right.current) right.current.rotation.y = d.r * 1.95 + ajar
    if (left.current) left.current.rotation.y = -d.l * 1.9 - ajar * 0.3
    live.doors = (d.l + d.r) / 2
    if (inner.current) inner.current.intensity = 1.8 * live.doors
    if (handleMat.current) {
      // a glint runs along the handle while it waits to be opened
      const glint = clickable ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4) : 0
      handleMat.current.emissiveIntensity = glint * 0.35 + d.ajar * 0.5
    }
  })

  const open = (e: ThreeEvent<MouseEvent>) => {
    if (!clickable) return
    e.stopPropagation()
    setStage('opening')
  }

  const bounds = { minX: -W / 2 + 0.03, maxX: W / 2 - 0.03, minZ: -D / 2 + 0.03, maxZ: D / 2 + 0.02, minY: L.shelfY + 0.05 }
  const showClothes = stage === 'opening' || stage === 'open' || stage === 'book'
  const hooks = useMemo(
    () => GARMENTS.map((_, i) => new THREE.Vector3(-0.33 + i * 0.132, L.rodY - 0.03, -0.02 + (i % 2) * 0.03)),
    [],
  )

  return (
    <group position={L.almirah}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
        onClick={open}
      >
        {/* carcass */}
        <mesh position={[0, P / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W - 0.02, P, D - 0.02]} />
          <meshStandardMaterial color="#3b463f" roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * (W - T)) / 2, P + (H - P) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[T, H - P, D]} />
            <meshStandardMaterial map={a.steel} roughness={0.42} metalness={0.25} />
          </mesh>
        ))}
        <mesh position={[0, H - T / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, T, D]} />
          <meshStandardMaterial map={a.steel} roughness={0.42} metalness={0.25} />
        </mesh>
        <mesh position={[0, H + 0.012, 0.004]} castShadow>
          <boxGeometry args={[W + 0.03, 0.024, D + 0.03]} />
          <meshStandardMaterial map={a.steel} roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, P + T / 2, 0]} receiveShadow>
          <boxGeometry args={[W - 2 * T, T, D]} />
          <meshStandardMaterial map={a.steelInside} roughness={0.5} />
        </mesh>
        <mesh position={[0, P + (H - P) / 2, -D / 2 + T / 2]} receiveShadow>
          <boxGeometry args={[W - 2 * T, H - P, T]} />
          <meshStandardMaterial map={a.steelInside} roughness={0.55} />
        </mesh>

        {/* doors hinge at the outer edges */}
        <group ref={left} position={[-W / 2 + 0.002, P + 0.015 + DOOR_H / 2, D / 2 + 0.01]}>
          <Door side="left">
            <mesh position={[DOOR_W / 2, DOOR_H * 0.43, 0.012]} rotation={[0, 0, 0]}>
              <planeGeometry args={[0.12, 0.06]} />
              <meshStandardMaterial map={plate} transparent alphaTest={0.2} metalness={0.6} roughness={0.35} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
            <Sticker i={STICKERS.indexOf('star')} position={[0.12, -0.12, 0.0125]} rotation={0.2} />
            <Sticker i={STICKERS.indexOf('rainbow')} position={[0.3, -0.02, 0.0125]} rotation={-0.15} size={0.08} />
            <Sticker i={STICKERS.indexOf('butterfly')} position={[0.18, -0.3, 0.0125]} rotation={0.4} />
            <Sticker i={STICKERS.indexOf('heart')} position={[0.32, 0.12, 0.0125]} rotation={-0.3} size={0.05} />
          </Door>
        </group>
        <group ref={right} position={[W / 2 - 0.002, P + 0.015 + DOOR_H / 2, D / 2 + 0.01]}>
          <Door side="right">
            {/* handle on two standoffs, and the lock below it */}
            <group position={[-DOOR_W + 0.05, 0.02, 0.024]}>
              <mesh>
                <boxGeometry args={[0.014, 0.3, 0.012]} />
                <meshStandardMaterial ref={handleMat} color="#d9d9d4" metalness={1} roughness={0.18} emissive="#fff4d6" emissiveIntensity={0} />
              </mesh>
              {[-0.13, 0.13].map((y) => (
                <mesh key={y} position={[0, y, -0.008]}>
                  <boxGeometry args={[0.01, 0.014, 0.012]} />
                  <meshStandardMaterial color="#bdbdb8" metalness={1} roughness={0.25} />
                </mesh>
              ))}
              <mesh position={[0, -0.21, -0.006]}>
                <cylinderGeometry args={[0.016, 0.016, 0.008, 24]} />
                <meshStandardMaterial color="#d4d1c8" metalness={1} roughness={0.22} />
              </mesh>
              <mesh position={[0, -0.21, -0.001]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.003, 0.004, 0.012]} />
                <meshBasicMaterial color="#111" />
              </mesh>
            </group>
            <Sticker i={STICKERS.indexOf('smiley')} position={[-0.3, -0.16, 0.0125]} rotation={-0.25} size={0.075} />
            <Sticker i={STICKERS.indexOf('K')} position={[-0.17, -0.34, 0.0125]} rotation={0.18} size={0.06} />
            <Sticker i={STICKERS.indexOf('kite')} position={[-0.32, 0.05, 0.0125]} rotation={0.6} size={0.06} />
            <Sticker i={STICKERS.indexOf('flower')} position={[-0.12, -0.05, 0.0125]} rotation={-0.4} size={0.055} />
            {/* the mirror on the inside of the door */}
            <mesh position={[-DOOR_W / 2, 0.12, -0.012]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[DOOR_W - 0.1, DOOR_H * 0.5]} />
              <meshStandardMaterial color="#e6eeeb" metalness={0.9} roughness={0.14} />
            </mesh>
          </Door>
        </group>
      </group>

      {/* inside */}
      <mesh position={[0, L.rodY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, W - 2 * T, 12]} />
        <meshStandardMaterial color="#cfcfca" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, L.shelfY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - 2 * T, 0.012, D - 0.02]} />
        <meshStandardMaterial map={a.steelInside} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - 2 * T, 0.012, D - 0.02]} />
        <meshStandardMaterial map={a.steelInside} roughness={0.5} />
      </mesh>
      {/* folded stacks either side of the scrapbook */}
      {[
        [-0.3, L.shelfY, [0, 1, 2]],
        [0.3, L.shelfY, [3, 4]],
        [-0.22, 0.4, [5, 1]],
        [0.12, 0.4, [2, 3, 0]],
      ].map(([x, y, ids]) =>
        (ids as number[]).map((id, k) => (
          <RoundedBox
            key={`${x}-${y}-${k}`}
            args={[0.24, 0.045, 0.3]}
            radius={0.018}
            smoothness={3}
            position={[(x as number) + (k % 2 ? 0.008 : -0.006), (y as number) + 0.03 + k * 0.047, 0.02]}
            rotation={[0, (k - 1) * 0.04, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial map={folded[id]} roughness={0.9} />
          </RoundedBox>
        )),
      )}
      {/* the cookie tin that became the sewing kit */}
      <group position={[0.3, 0.06 + 0.02, 0.04]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.07, 40]} />
          <meshStandardMaterial color="#1f3f8f" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.038, 0]}>
          <cylinderGeometry args={[0.102, 0.102, 0.01, 40]} />
          <meshStandardMaterial color="#c9a64a" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {showClothes &&
        GARMENTS.map((_, i) => (
          <Cloth
            key={i}
            texture={a.garments[i]}
            at={hooks[i]}
            yaw={0.62 + (i % 3) * 0.1}
            height={i === 2 ? 0.62 : i === 3 || i === 4 ? 0.38 : 0.5}
            bounds={bounds}
            active={showClothes}
          />
        ))}

      <Scrapbook3D />

      {/* what lives on top of every almirah: the good suitcase and a carton nobody opens */}
      <group position={[-0.12, H + 0.024, -0.02]} rotation={[0, 0.06, 0]}>
        <RoundedBox args={[0.62, 0.17, 0.42]} radius={0.025} smoothness={3} position={[0, 0.085, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={a.suitcase} roughness={0.55} />
        </RoundedBox>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.11, 0.212]}>
            <boxGeometry args={[0.04, 0.03, 0.01]} />
            <meshStandardMaterial color="#c9b37a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 0.12, 0.218]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.03, 0.007, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#2a1a12" roughness={0.6} />
        </mesh>
      </group>
      <group position={[0.3, H + 0.024, 0.0]} rotation={[0, -0.12, 0]}>
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.22, 0.32]} />
          <meshStandardMaterial color="#b08a5e" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.221, 0]}>
          <boxGeometry args={[0.305, 0.002, 0.04]} />
          <meshStandardMaterial color="#d8c9a3" roughness={0.7} />
        </mesh>
      </group>

      <pointLight ref={inner} position={[0.05, 1.74, 0.5]} color="#ffcf98" intensity={0} distance={2.2} decay={2} />

      {/* "open it": the hint near the handle */}
      {clickable && (
        <Html position={[0.24, 1.2, D / 2 + 0.06]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
          <div className="hint hint--open" aria-hidden>
            {site.intro.openHint}
          </div>
        </Html>
      )}
    </group>
  )
}
