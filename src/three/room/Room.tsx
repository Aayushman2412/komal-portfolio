import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getAssets } from '../../lib/assets'
import { canvas, rng, toTexture } from '../../lib/textures/util'
import { beats, live, span, useStory } from '../../state/store'
import { L } from '../layout'

/**
 * The room the TV was in: red-oxide floor, distemper walls, a low wooden table, a wall calendar,
 * a switchboard, and one bare bulb. The bulb is the only real light once the TV is off; it flickers
 * on as you scroll (deterministic, so scrolling back plays it in reverse).
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

function calendarTexture() {
  const { c, ctx } = canvas(512, 720)
  const r = rng(2012)
  ctx.fillStyle = '#f4efe2'
  ctx.fillRect(0, 0, 512, 720)
  // the picture: hills and a river, the kind every calendar had
  const sky = ctx.createLinearGradient(0, 0, 0, 340)
  sky.addColorStop(0, '#f2a65a')
  sky.addColorStop(1, '#f7d9a0')
  ctx.fillStyle = sky
  ctx.fillRect(24, 24, 464, 320)
  ctx.fillStyle = '#5c7a4a'
  ctx.beginPath()
  ctx.moveTo(24, 260)
  for (let x = 24; x <= 488; x += 20) ctx.lineTo(x, 220 + Math.sin(x * 0.02) * 30 + r() * 10)
  ctx.lineTo(488, 344)
  ctx.lineTo(24, 344)
  ctx.fill()
  ctx.fillStyle = '#7fb3c9'
  ctx.beginPath()
  ctx.moveTo(220, 344)
  ctx.quadraticCurveTo(260, 290, 250, 250)
  ctx.lineTo(262, 250)
  ctx.quadraticCurveTo(300, 300, 330, 344)
  ctx.fill()
  ctx.fillStyle = '#a5281e'
  ctx.font = '700 64px "Instrument Sans Variable", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('2012', 256, 420)
  ctx.fillStyle = '#2b2b2b'
  ctx.font = '500 26px "Instrument Sans Variable", sans-serif'
  ctx.fillText('JUNE', 256, 460)
  ctx.font = '400 20px "IBM Plex Mono", monospace'
  for (let d = 0; d < 30; d++) {
    const col = (d + 5) % 7
    const row = Math.floor((d + 5) / 7)
    ctx.fillStyle = col === 0 ? '#a5281e' : '#2b2b2b'
    ctx.fillText(String(d + 1), 70 + col * 62, 500 + row * 42)
  }
  // a date circled in pen
  ctx.strokeStyle = '#1d3c9a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(70 + 3 * 62, 500 + 2 * 42 - 7, 22, 18, 0.2, 0, Math.PI * 2)
  ctx.stroke()
  return toTexture(c)
}

export function Room() {
  const a = getAssets()
  const stage = useStory((s) => s.stage)
  const wall = useMemo(() => {
    const t = a.wall.clone()
    t.wrapS = THREE.RepeatWrapping
    t.repeat.set(2.2, 1)
    t.needsUpdate = true
    return t
  }, [a.wall])
  const side = useMemo(() => {
    const t = a.wall.clone()
    t.wrapS = THREE.RepeatWrapping
    t.repeat.set(1.6, 1)
    t.needsUpdate = true
    return t
  }, [a.wall])
  const calendar = useMemo(calendarTexture, [])

  const bulbLight = useRef<THREE.PointLight>(null)
  const bulbGlass = useRef<THREE.MeshStandardMaterial>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const dust = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const p = stage === 'intro' || stage === 'loading' ? live.smooth : 1
    const t = clock.elapsedTime
    const b = bulbLevel(p) * (0.97 + 0.03 * Math.sin(t * 60.0) * Math.sin(t * 7.3))
    if (bulbLight.current) bulbLight.current.intensity = 7.5 * b
    if (bulbGlass.current) bulbGlass.current.emissiveIntensity = 0.2 + 9 * b
    if (hemi.current) hemi.current.intensity = 0.16 * b
    if (dust.current) dust.current.visible = b > 0.5
  })

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.6]} receiveShadow>
        <planeGeometry args={[7, 5.6]} />
        <meshStandardMaterial map={a.floor} roughness={0.32} metalness={0.05} />
      </mesh>
      {/* back and left walls */}
      <mesh position={[0, 1.6, L.wallZ]} receiveShadow>
        <planeGeometry args={[7, 3.2]} />
        <meshStandardMaterial map={wall} roughness={0.92} />
      </mesh>
      <mesh position={[-2.6, 1.6, 0.6]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[5.6, 3.2]} />
        <meshStandardMaterial map={side} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.04, L.wallZ + 0.01]}>
        <boxGeometry args={[7, 0.08, 0.02]} />
        <meshStandardMaterial color="#2f453f" roughness={0.5} />
      </mesh>

      {/* low wooden table under the TV */}
      <group position={L.table}>
        <mesh position={[0, L.tableTop - 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.04, 0.56]} />
          <meshStandardMaterial map={a.wood} roughness={0.55} />
        </mesh>
        {[[-0.46, -0.24], [0.46, -0.24], [-0.46, 0.24], [0.46, 0.24]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, (L.tableTop - 0.04) / 2, z]} castShadow>
            <boxGeometry args={[0.04, L.tableTop - 0.04, 0.04]} />
            <meshStandardMaterial map={a.wood} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.94, 0.025, 0.5]} />
          <meshStandardMaterial map={a.wood} roughness={0.6} />
        </mesh>
      </group>

      {/* wall calendar and switchboard */}
      <mesh position={[-0.85, 1.72, L.wallZ + 0.006]} rotation={[0, 0, 0.02]}>
        <planeGeometry args={[0.3, 0.42]} />
        <meshStandardMaterial map={calendar} roughness={0.85} />
      </mesh>
      <group position={[0.05, 1.32, L.wallZ + 0.01]}>
        <mesh>
          <boxGeometry args={[0.2, 0.12, 0.012]} />
          <meshStandardMaterial color="#efece2" roughness={0.6} />
        </mesh>
        {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
          <mesh key={x} position={[x, 0.01, 0.009]} rotation={[i === 1 ? 0.25 : -0.25, 0, 0]}>
            <boxGeometry args={[0.018, 0.034, 0.008]} />
            <meshStandardMaterial color="#f7f5ee" roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0.08, -0.04, 0.008]}>
          <sphereGeometry args={[0.004, 8, 6]} />
          <meshBasicMaterial color="#ff3b2f" toneMapped={false} />
        </mesh>
      </group>

      {/* the bulb */}
      <group position={L.bulb}>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.78, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.016, 0.019, 0.05, 16]} />
          <meshStandardMaterial color="#1b1a19" roughness={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.035, 24, 16]} />
          <meshStandardMaterial ref={bulbGlass} color="#fff3dd" emissive="#ffb35c" emissiveIntensity={0.2} roughness={0.2} toneMapped={false} />
        </mesh>
        <pointLight
          ref={bulbLight}
          color="#ffb46b"
          intensity={0}
          distance={9}
          decay={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={6}
        />
      </group>
      <hemisphereLight ref={hemi} args={['#ffd6a8', '#3a1a10', 0]} />

      <group ref={dust} visible={false}>
        <Sparkles count={45} scale={[2.4, 1.6, 1.4]} position={[0.2, 1.6, -0.2]} size={0.9} speed={0.12} opacity={0.3} color="#ffd9a8" noise={0.6} />
      </group>
    </group>
  )
}
