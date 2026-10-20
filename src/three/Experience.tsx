import { Environment, Lightformer, useFBO } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { live, useStory } from '../state/store'
import { Almirah } from './almirah/Almirah'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Feed } from './feed/Feed'
import { bulbLevel, Room } from './room/Room'
import { CrtTv } from './tv/CrtTv'

/** Keeps metal reflections dark until the bulb is on, so the blackout is truly black. */
function EnvLevel() {
  const scene = useThree((s) => s.scene)
  const stage = useStory((s) => s.stage)
  useFrame(() => {
    const p = stage === 'intro' || stage === 'loading' ? live.smooth : 1
    scene.environmentIntensity = 0.55 * bulbLevel(p)
  })
  if (import.meta.env.DEV) (window as unknown as { __scene: THREE.Scene }).__scene = scene
  return null
}

function Scene({ mobile }: { mobile: boolean }) {
  const [fw, fh] = mobile ? [1280, 960] : [2048, 1536]
  const target = useFBO(fw, fh, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    samples: 0,
  })
  return (
    <>
      <color attach="background" args={['#050404']} />
      <Feed target={target} />
      <Room />
      <CrtTv feed={target.texture} />
      <Almirah />
      <CameraRig />
      <EnvLevel />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} color="#ffd2a1" position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#b8c8ff" position={[0, 1, 4]} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[-3, 1.5, 1]} rotation-y={Math.PI / 2} scale={1.2} />
      </Environment>
      <Effects mobile={mobile} />
    </>
  )
}

export function Experience() {
  const mobile = useMemo(() => window.innerWidth < 768 || matchMedia('(pointer: coarse)').matches, [])
  return (
    <div className="stage-canvas">
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 1.75]}
        shadows="percentage"
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 35, near: 0.01, far: 30, position: [0, 1, 3] }}
        style={{ touchAction: 'pan-y' }}
      >
        <Scene mobile={mobile} />
      </Canvas>
    </div>
  )
}
