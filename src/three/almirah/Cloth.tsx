import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sound } from '../../lib/audio'
import { live } from '../../state/store'

/**
 * A garment on a wire hanger, simulated as a small verlet cloth (structural + shear springs).
 * The top row is pinned along the hanger's shoulders; the rest falls, sways when the doors swing
 * open, and parts when the pointer brushes through it. Simulated in the almirah's local space so
 * it can collide with the almirah's walls and shelf with simple clamps.
 */
const NX = 9
const NY = 13

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number; minY: number }

export type ClothProps = {
  texture: THREE.Texture
  /** hook position on the rod, almirah-local */
  at: THREE.Vector3
  /** rotation of the hanger around the rod's vertical axis */
  yaw: number
  width?: number
  height?: number
  bounds: Bounds
  active: boolean
}

function hangerCurve() {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.15 + (i / 10) * Math.PI * 1.25
    pts.push(new THREE.Vector3(Math.cos(a) * 0.018 - 0.002, 0.03 + Math.sin(a) * 0.018, 0))
  }
  pts.push(new THREE.Vector3(0, 0.0, 0), new THREE.Vector3(0, -0.025, 0))
  pts.push(new THREE.Vector3(-0.08, -0.06, 0), new THREE.Vector3(-0.165, -0.098, 0), new THREE.Vector3(-0.16, -0.108, 0))
  pts.push(new THREE.Vector3(0, -0.108, 0), new THREE.Vector3(0.16, -0.108, 0), new THREE.Vector3(0.165, -0.098, 0))
  pts.push(new THREE.Vector3(0.08, -0.06, 0), new THREE.Vector3(0.004, -0.026, 0))
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2)
}

export function Cloth({ texture, at, yaw, width = 0.32, height = 0.48, bounds, active }: ClothProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const lastRustle = useRef(0)

  const sim = useMemo(() => {
    const n = NX * NY
    const pos = new Float32Array(n * 3)
    const prev = new Float32Array(n * 3)
    const pinned = new Uint8Array(n)
    const pinAt = new Float32Array(n * 3)
    const rot = new THREE.Matrix4().makeRotationY(yaw)
    const v = new THREE.Vector3()
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i
        const u = i / (NX - 1) - 0.5
        // top row follows the hanger's shoulder slope; neck highest
        const top = -0.03 - Math.abs(u) * 0.15
        v.set(u * width * 0.95, top - (j / (NY - 1)) * height, 0).applyMatrix4(rot).add(at)
        pos.set([v.x, v.y, v.z], k * 3)
        prev.set([v.x, v.y, v.z], k * 3)
        if (j === 0) {
          pinned[k] = 1
          pinAt.set([v.x, v.y, v.z], k * 3)
        }
      }
    const cons: number[] = []
    const add = (a: number, b: number) => {
      const dx = pos[a * 3] - pos[b * 3]
      const dy = pos[a * 3 + 1] - pos[b * 3 + 1]
      const dz = pos[a * 3 + 2] - pos[b * 3 + 2]
      cons.push(a, b, Math.hypot(dx, dy, dz))
    }
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i
        if (i < NX - 1) add(k, k + 1)
        if (j < NY - 1) add(k, k + NX)
        if (i < NX - 1 && j < NY - 1) {
          add(k, k + NX + 1)
          add(k + 1, k + NX)
        }
        if (i < NX - 2) add(k, k + 2) // bending, keeps it from crumpling like tissue
      }
    const geo = new THREE.PlaneGeometry(1, 1, NX - 1, NY - 1)
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3))
    return { pos, prev, pinned, pinAt, cons: new Float32Array(cons), geo, gust: 0, push: null as null | { p: THREE.Vector3; t: number } }
  }, [at, yaw, width, height])

  const hanger = useMemo(() => {
    const g = new THREE.TubeGeometry(hangerCurve(), 64, 0.0022, 6, false)
    return g
  }, [])

  const doorsPrev = useRef(0)

  useFrame((_, dtRaw) => {
    if (!active) return
    const dt = Math.min(dtRaw, 1 / 30)
    const { pos, prev, pinned, pinAt, cons } = sim
    // doors swinging open push air into the almirah: a gust towards the back, then settling
    const dDoor = live.doors - doorsPrev.current
    doorsPrev.current = live.doors
    sim.gust = sim.gust * Math.exp(-dt * 2.2) + Math.max(0, dDoor) * 7
    const t = performance.now() / 1000
    const breeze = 0.012 * Math.sin(t * 0.9 + yaw * 3)
    const g = -9.8 * dt * dt
    const damp = 0.985
    for (let k = 0; k < pos.length / 3; k++) {
      const x = k * 3
      if (pinned[k]) continue
      const vx = (pos[x] - prev[x]) * damp
      const vy = (pos[x + 1] - prev[x + 1]) * damp
      const vz = (pos[x + 2] - prev[x + 2]) * damp
      prev[x] = pos[x]
      prev[x + 1] = pos[x + 1]
      prev[x + 2] = pos[x + 2]
      const row = Math.floor(k / NX) / (NY - 1)
      pos[x] += vx + Math.sin(t * 2.1 + k) * sim.gust * 0.00015 * row
      pos[x + 1] += vy + g
      pos[x + 2] += vz - sim.gust * 0.0006 * row + breeze * dt * row
    }
    // pointer brushing through
    if (sim.push && t - sim.push.t < 0.12) {
      const pp = sim.push.p
      for (let k = 0; k < pos.length / 3; k++) {
        if (pinned[k]) continue
        const x = k * 3
        const dx = pos[x] - pp.x
        const dy = pos[x + 1] - pp.y
        const dz = pos[x + 2] - pp.z
        const d = Math.hypot(dx, dy, dz)
        if (d < 0.1) {
          const f = (1 - d / 0.1) * 0.012
          pos[x] += (dx / (d + 1e-4)) * f
          pos[x + 2] -= f * 1.4
        }
      }
    }
    for (let it = 0; it < 5; it++) {
      for (let c = 0; c < cons.length; c += 3) {
        const a = cons[c] * 3
        const b = cons[c + 1] * 3
        const rest = cons[c + 2]
        const dx = pos[b] - pos[a]
        const dy = pos[b + 1] - pos[a + 1]
        const dz = pos[b + 2] - pos[a + 2]
        const d = Math.hypot(dx, dy, dz) || 1e-6
        const diff = (d - rest) / d
        const pa = pinned[cons[c]] ? 0 : pinned[cons[c + 1]] ? 1 : 0.5
        const pb = pinned[cons[c + 1]] ? 0 : pinned[cons[c]] ? 1 : 0.5
        pos[a] += dx * diff * pa
        pos[a + 1] += dy * diff * pa
        pos[a + 2] += dz * diff * pa
        pos[b] -= dx * diff * pb
        pos[b + 1] -= dy * diff * pb
        pos[b + 2] -= dz * diff * pb
      }
      for (let k = 0; k < pos.length / 3; k++) {
        const x = k * 3
        if (pinned[k]) {
          pos[x] = pinAt[x]
          pos[x + 1] = pinAt[x + 1]
          pos[x + 2] = pinAt[x + 2]
          continue
        }
        pos[x] = Math.min(bounds.maxX, Math.max(bounds.minX, pos[x]))
        pos[x + 2] = Math.min(bounds.maxZ, Math.max(bounds.minZ, pos[x + 2]))
        pos[x + 1] = Math.max(bounds.minY, pos[x + 1])
      }
    }
    const attr = sim.geo.getAttribute('position') as THREE.BufferAttribute
    ;(attr.array as Float32Array).set(pos)
    attr.needsUpdate = true
    sim.geo.computeVertexNormals()
    sim.geo.computeBoundingSphere()
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const parent = mesh.current?.parent
    if (!parent) return
    const p = parent.worldToLocal(e.point.clone())
    const now = performance.now() / 1000
    sim.push = { p, t: now }
    if (now - lastRustle.current > 0.35) {
      lastRustle.current = now
      sound.rustle()
    }
  }

  return (
    <group>
      <mesh ref={mesh} geometry={sim.geo} onPointerMove={onMove} castShadow>
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} alphaTest={0.5} roughness={0.85} />
      </mesh>
      <mesh geometry={hanger} position={at} rotation={[0, yaw, 0]}>
        <meshStandardMaterial color="#c8c8c4" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}
