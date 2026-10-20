import { createPortal, useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { ATLAS, CELLS } from '../../lib/textures/aiCards'
import { getAssets } from '../../lib/assets'
import { beats, live, span } from '../../state/store'
import { FEED_ASPECT } from '../layout'

/**
 * The AI feed: an endless wall of generated "posts", one instanced draw call. Every card's position,
 * regeneration cycle and diffusion-style denoise is computed on the GPU from a handful of uniforms
 * that follow the scroll. Rendered into a render target that becomes the CRT's picture.
 */
const COLS = 44
const ROWS = 26
const BG = new THREE.Color('#efeeea')

const vert = /* glsl */ `
  attribute vec2 aGrid;
  attribute float aSeed;
  uniform float uZoom, uScroll, uTime, uChaos, uCols;
  varying vec2 vUv;
  varying float vSeed;
  varying vec2 vGrid;
  varying vec2 vSize;
  float hash(float n){ return fract(sin(n) * 43758.5453123); }
  void main() {
    float pitchY = 2.0 / uZoom;
    float cardH = pitchY * 0.88;
    float cardW = cardH * 0.8;
    float pitchX = cardW + pitchY * 0.12;
    float row = aGrid.y;
    float speed = 1.0 + uChaos * hash(row * 7.13) * 2.6;
    float jump = uChaos * uChaos * (hash(row + floor(uTime * 16.0)) - 0.5) * 3.0;
    float total = uCols * pitchX;
    float x = (aGrid.x + 0.5 - uCols * 0.5) * pitchX - (uScroll * speed + jump) * pitchX;
    x = mod(x + total * 0.5, total) - total * 0.5;
    float y = row * pitchY;
    vec3 pos = vec3(position.x * cardW + x, position.y * cardH + y, 0.0);
    vUv = uv;
    vSeed = aSeed;
    vGrid = aGrid;
    vSize = vec2(cardW, cardH);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const frag = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uTime, uGen, uChaos, uSame, uRegen;
  uniform vec3 uBg;
  varying vec2 vUv;
  varying float vSeed;
  varying vec2 vGrid;
  varying vec2 vSize;
  float hash(float n){ return fract(sin(n) * 43758.5453123); }
  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    // regeneration: each card periodically dissolves to noise and denoises into a new design
    float period = mix(10.0, 1.2, uRegen) * (0.6 + hash(vSeed * 3.1) * 0.8);
    float cyc = uTime / period + vSeed * 7.0;
    float k = floor(cyc) * step(0.001, uRegen);
    float ph = fract(cyc);
    float cycleReveal = mix(1.0, smoothstep(0.0, 0.25, ph), step(0.001, uRegen));
    float genReveal = clamp((uGen - vSeed * 1.4 - abs(vGrid.y) * 0.35) / 1.1, 0.0, 1.0);
    float reveal = min(genReveal, cycleReveal);

    float idx = floor(hash(vSeed * 13.7 + k * 1.618) * ${CELLS}.0);
    if (hash(vSeed * 5.3 + k * 0.7) < uSame) idx = floor(hash(k * 0.37 + vSeed * 0.01) * 3.0);
    vec2 cell = vec2(mod(idx, ${ATLAS.cols}.0), floor(idx / ${ATLAS.cols}.0));

    // diffusion look: coarse blocks of noise that refine into the image
    vec2 res = mix(vec2(5.0, 6.0), vec2(150.0, 190.0), reveal * reveal);
    vec2 quv = reveal > 0.97 ? vUv : (floor(vUv * res) + 0.5) / res;
    vec2 auv = vec2((cell.x + quv.x) / ${ATLAS.cols}.0, 1.0 - (cell.y + 1.0 - quv.y) / ${ATLAS.rows}.0);
    vec3 img = texture2D(uAtlas, auv).rgb;
    float n = hash21(floor(quv * res) + floor(uTime * 14.0) + vSeed);
    vec3 nz = mix(vec3(0.52, 0.55, 0.68), vec3(1.0, 0.94, 0.98), n) * (0.75 + 0.25 * n);
    vec3 col = mix(nz, img, smoothstep(0.2, 0.9, reveal));

    // a light sweep while a card is still generating
    float sweep = smoothstep(0.08, 0.0, abs(fract(vUv.x + vUv.y * 0.6 - uTime * 0.9) - 0.5)) * (1.0 - reveal);
    col += sweep * 0.35;

    // the overload: channel swaps and over-saturation
    float swap = step(0.82, hash(vSeed * 2.0 + floor(uTime * 7.0))) * uChaos;
    col = mix(col, col.brg, swap * 0.8);
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, 1.0 + uChaos * 0.9);

    vec2 p = (vUv - 0.5) * vSize;
    float d = rbox(p, vSize * 0.5, vSize.x * 0.05);
    float aa = fwidth(d) * 1.2;
    col = mix(uBg, col, 1.0 - smoothstep(-aa, aa, d));
    gl_FragColor = vec4(col, 1.0);
  }
`

function makeGeometry() {
  const base = new THREE.PlaneGeometry(1, 1)
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = base.index
  geo.setAttribute('position', base.getAttribute('position'))
  geo.setAttribute('uv', base.getAttribute('uv'))
  const grid = new Float32Array(COLS * ROWS * 2)
  const seed = new Float32Array(COLS * ROWS)
  let i = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      grid[i * 2] = c
      grid[i * 2 + 1] = r - Math.floor(ROWS / 2)
      seed[i] = Math.random()
      i++
    }
  geo.setAttribute('aGrid', new THREE.InstancedBufferAttribute(grid, 2))
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  geo.instanceCount = COLS * ROWS
  return geo
}

/** Visible rows as the story scrolls: a few big posts at first, then far too many. */
function zoomAt(p: number) {
  const t = span(p, 0.03, 0.36)
  const e = t * t * (3 - 2 * t)
  return 1.75 * Math.pow(22 / 1.75, e)
}

export function Feed({ target }: { target: THREE.WebGLRenderTarget }) {
  const { scene, camera, material, geometry } = useMemo(() => {
    const scene = new THREE.Scene()
    scene.background = BG
    const camera = new THREE.OrthographicCamera(-FEED_ASPECT, FEED_ASPECT, 1, -1, 0.1, 10)
    camera.position.z = 5
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uAtlas: { value: getAssets().feed },
        uZoom: { value: 1.75 },
        uScroll: { value: 0 },
        uTime: { value: 0 },
        uGen: { value: 0 },
        uChaos: { value: 0 },
        uSame: { value: 0 },
        uRegen: { value: 0 },
        uCols: { value: COLS },
        uBg: { value: BG },
      },
    })
    return { scene, camera, material, geometry: makeGeometry() }
  }, [])

  const state = useMemo(() => ({ scroll: 0, gen: 0 }), [])

  useFrame(({ gl, clock }, dt) => {
    const p = live.smooth
    // the TV is off: nothing to draw
    if (p > beats.powerOff[1] + 0.01) return
    const u = material.uniforms
    const d = Math.min(dt, 0.05)
    state.gen += d
    const speed = 0.12 + 3.2 * Math.pow(span(p, 0.12, 0.42), 2)
    state.scroll += d * speed
    u.uTime.value = clock.elapsedTime
    u.uGen.value = state.gen
    u.uZoom.value = zoomAt(p)
    u.uScroll.value = state.scroll + p * 18
    u.uChaos.value = span(p, 0.22, 0.42)
    u.uSame.value = span(p, 0.26, 0.4) * 0.85
    u.uRegen.value = span(p, 0.08, 0.4)
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
  })

  return createPortal(<mesh geometry={geometry} material={material} frustumCulled={false} />, scene)
}
