import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { BlendFunction, ToneMappingMode, type ChromaticAberrationEffect, type NoiseEffect, type VignetteEffect } from 'postprocessing'
import { useRef } from 'react'
import * as THREE from 'three'
import { beats, live, span, useStory } from '../state/store'

/**
 * Post: bloom makes the power-off line and the bulb burn; grain, vignette and a touch of chromatic
 * aberration arrive only as the clean AI app degrades, so the first screen stays crisp.
 */
export function Effects({ mobile }: { mobile: boolean }) {
  const stage = useStory((s) => s.stage)
  const ca = useRef<ChromaticAberrationEffect>(null)
  const noise = useRef<NoiseEffect>(null)
  const vig = useRef<VignetteEffect>(null)
  const offset = useRef(new THREE.Vector2())

  useFrame(() => {
    const p = stage === 'intro' || stage === 'loading' ? live.smooth : 1
    const degrade = span(p, 0.3, 0.5)
    const glitch = span(p, 0.47, 0.57) * (1 - span(p, beats.powerOff[0], beats.powerOff[1]))
    if (vig.current) vig.current.darkness = 0.1 + 0.6 * degrade
    if (noise.current) noise.current.blendMode.opacity.value = 0.02 + 0.13 * degrade
    if (ca.current) {
      const o = 0.0002 + 0.0007 * degrade + 0.004 * glitch
      offset.current.set(o, o * 0.6)
      ca.current.offset = offset.current
    }
  })

  return (
    <EffectComposer multisampling={mobile ? 0 : 4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={1.1} radius={0.72} />
      <ChromaticAberration ref={ca} offset={offset.current} radialModulation modulationOffset={0.25} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Noise ref={noise} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.02} />
      <Vignette ref={vig} offset={0.28} darkness={0.1} />
    </EffectComposer>
  )
}
