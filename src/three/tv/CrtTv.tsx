import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getAssets } from '../../lib/assets'
import { beats, live, span } from '../../state/store'
import { L } from '../layout'

/**
 * The family's grey CRT. Its screen samples the AI feed render target through a shader that adds,
 * as the story scrolls: scanlines and barrel curvature, tearing, a rolling picture, static, the
 * colour draining to grey, and finally the classic power-off: picture collapses to a white-hot
 * horizontal line, the line to a dot, the dot fades. Values above 1.0 feed the bloom pass.
 */
const screenVert = /* glsl */ `
  uniform float uBulge;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    vec2 n = uv * 2.0 - 1.0;
    p.z += uBulge * 0.014 * (1.0 - n.x * n.x) * (1.0 - n.y * n.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const screenFrag = /* glsl */ `
  uniform sampler2D uFeed;
  uniform float uTime, uCrt, uGlitch, uOff, uStatic, uGrey, uRoll, uGain;
  varying vec2 vUv;
  float hash(float n){ return fract(sin(n) * 43758.5453123); }
  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 barrel(vec2 uv, float k){ vec2 c = uv - 0.5; return 0.5 + c * (1.0 + k * dot(c, c)); }
  void main() {
    // power-off collapse: vertical first, then horizontal
    float sy = 1.0 - smoothstep(0.0, 0.45, uOff) * 0.994;
    float sx = 1.0 - smoothstep(0.45, 0.82, uOff) * 0.985;
    vec2 c = vUv - 0.5;
    vec2 uv = vec2(c.x / sx, c.y / sy) + 0.5;

    // tearing: random horizontal bands jump sideways
    float bandId = floor(uv.y * 36.0) + floor(uTime * 22.0);
    float tear = step(1.0 - uGlitch * 0.3, hash(bandId));
    uv.x += tear * (hash(bandId * 1.7) - 0.5) * 0.18 * uGlitch;
    // vertical hold slipping
    uv.y = fract(uv.y + uRoll);

    vec2 buv = barrel(uv, 0.28 * uCrt);
    float inside = step(0.0, buv.x) * step(buv.x, 1.0) * step(0.0, buv.y) * step(buv.y, 1.0);
    inside *= step(abs(c.y), sy * 0.5) * step(abs(c.x), sx * 0.5);

    float ca = (0.0015 + 0.012 * uGlitch) * uCrt;
    vec3 col;
    col.r = texture2D(uFeed, buv + vec2(ca, 0.0)).r;
    col.g = texture2D(uFeed, buv).g;
    col.b = texture2D(uFeed, buv - vec2(ca, 0.0)).b;

    // scanlines and a soft aperture-grille
    float scan = 0.5 + 0.5 * sin(buv.y * 480.0 * 3.14159);
    float grille = 0.5 + 0.5 * sin(buv.x * 640.0 * 3.14159 * 2.0);
    col *= mix(1.0, (0.72 + 0.28 * scan) * (0.9 + 0.1 * grille), uCrt);

    // the picture drains to grey, the set is "not working properly"
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(l) * vec3(0.9, 0.95, 1.0), uGrey);

    // static
    float n = hash21(floor(buv * vec2(320.0, 240.0)) + fract(uTime * 9.0) * 91.0);
    col = mix(col, vec3(n), clamp(uStatic, 0.0, 1.0));

    // brightness flicker and vignette
    col *= 1.0 - uGlitch * 0.25 * step(0.7, hash(floor(uTime * 30.0)));
    vec2 v = buv - 0.5;
    col *= mix(1.0, 1.0 - dot(v, v) * 1.8, uCrt);
    col *= inside * uGain;

    // the line: as the picture squashes it burns cream-white (her sketch's yellow line)
    float burn = smoothstep(0.08, 0.45, uOff);
    col = mix(col, vec3(1.0, 0.93, 0.72) * 4.0, burn * inside);
    // the dot dies away, leaving a faint afterglow
    col *= 1.0 - smoothstep(0.82, 1.0, uOff);
    gl_FragColor = vec4(col, 1.0);
  }
`

function bezelGeometry() {
  const rr = (s: THREE.Shape | THREE.Path, w: number, h: number, r: number, cy = 0) => {
    s.moveTo(-w / 2 + r, cy - h / 2)
    s.lineTo(w / 2 - r, cy - h / 2)
    s.quadraticCurveTo(w / 2, cy - h / 2, w / 2, cy - h / 2 + r)
    s.lineTo(w / 2, cy + h / 2 - r)
    s.quadraticCurveTo(w / 2, cy + h / 2, w / 2 - r, cy + h / 2)
    s.lineTo(-w / 2 + r, cy + h / 2)
    s.quadraticCurveTo(-w / 2, cy + h / 2, -w / 2, cy + h / 2 - r)
    s.lineTo(-w / 2, cy - h / 2 + r)
    s.quadraticCurveTo(-w / 2, cy - h / 2, -w / 2 + r, cy - h / 2)
  }
  const shape = new THREE.Shape()
  rr(shape, 0.6, 0.48, 0.03)
  const hole = new THREE.Path()
  rr(hole, 0.47, 0.355, 0.035, L.screen.local.y)
  shape.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 8 })
  return g
}

export function CrtTv({ feed }: { feed: THREE.Texture }) {
  const a = getAssets()
  const screenMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        toneMapped: false,
        uniforms: {
          uFeed: { value: feed },
          uTime: { value: 0 },
          uCrt: { value: 0 },
          uGlitch: { value: 0 },
          uOff: { value: 0 },
          uStatic: { value: 0 },
          uGrey: { value: 0 },
          uRoll: { value: 0 },
          uBulge: { value: 0 },
          uGain: { value: 1 },
        },
      }),
    [feed],
  )
  const glass = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.SpotLight>(null)
  const led = useRef<THREE.MeshBasicMaterial>(null)
  const aim = useRef<THREE.Object3D>(null)
  const bounce = useRef<THREE.PointLight>(null)
  const roll = useRef(0)
  const bezel = useMemo(bezelGeometry, [])
  const glassGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(L.screen.w, L.screen.h, 24, 18)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (L.screen.w / 2)
      const ny = pos.getY(i) / (L.screen.h / 2)
      pos.setZ(i, 0.0145 * (1 - nx * nx) * (1 - ny * ny) + 0.001)
    }
    g.computeVertexNormals()
    return g
  }, [])

  // a spotlight's target has to live in the scene graph for its direction to update
  useEffect(() => {
    if (light.current && aim.current) light.current.target = aim.current
  }, [])

  useFrame(({ clock }, dt) => {
    const p = live.smooth
    const t = clock.elapsedTime
    const u = screenMat.uniforms
    const off = span(p, beats.powerOff[0], beats.powerOff[1])
    const burst = 0.5 + 0.5 * Math.sin(t * 13.0) * Math.sin(t * 3.1)
    const glitch = 0.3 * span(p, 0.28, 0.42) + 0.7 * span(p, 0.47, 0.56) * (0.6 + 0.4 * burst)
    roll.current += dt * span(p, 0.51, 0.565) * 1.6
    u.uTime.value = t
    u.uCrt.value = span(p, 0.24, 0.44)
    u.uBulge.value = span(p, 0.3, 0.46)
    u.uGlitch.value = off > 0 ? glitch * (1 - off) : glitch
    u.uStatic.value = 0.4 * span(p, 0.5, 0.565) * burst
    u.uGrey.value = span(p, 0.43, 0.54)
    u.uRoll.value = roll.current % 1
    u.uOff.value = off
    u.uGain.value = 1 + 0.6 * span(p, 0.4, 0.5)

    const on = 1 - span(p, beats.powerOff[0] + 0.02, beats.powerOff[1])
    const flick = on * (1 - glitch * 0.4 * burst)
    if (light.current) light.current.intensity = 9 * flick
    if (bounce.current) bounce.current.intensity = 0.35 * flick
    if (glass.current) {
      glass.current.opacity = 0.18 * span(p, 0.38, 0.5) + 0.55 * off
      glass.current.visible = glass.current.opacity > 0.01
    }
    // standby LED: green while on, red once the set is off
    if (led.current) led.current.color.set(off > 0.95 ? '#ff2a1a' : '#3dff7a').multiplyScalar(off > 0.95 ? 2.5 : 1.2)
  })

  const plastic = { color: '#a19d93', roughness: 0.58, metalness: 0.0 }
  const sx = L.screen.local
  return (
    <group position={L.tv}>
      <RoundedBox args={[0.62, 0.5, 0.36]} radius={0.03} smoothness={4} position={[0, 0, 0.04]} castShadow receiveShadow>
        <meshStandardMaterial {...plastic} />
      </RoundedBox>
      {/* the tube's tapered back */}
      <mesh position={[0, 0.02, -0.22]} castShadow>
        <boxGeometry args={[0.44, 0.36, 0.24]} />
        <meshStandardMaterial {...plastic} color="#8f8b82" />
      </mesh>
      <mesh geometry={bezel} position={[0, 0, 0.215]} castShadow>
        <meshStandardMaterial {...plastic} color="#9b978d" roughness={0.5} />
      </mesh>
      <mesh position={[0, sx.y, 0.226]}>
        <planeGeometry args={[0.47, 0.355]} />
        <meshStandardMaterial color="#141414" roughness={0.9} />
      </mesh>
      <mesh position={[sx.x, sx.y, sx.z]} material={screenMat}>
        <planeGeometry args={[L.screen.w, L.screen.h, 32, 24]} />
      </mesh>
      <mesh geometry={glassGeo} position={[sx.x, sx.y, sx.z]}>
        <meshStandardMaterial ref={glass} color="#0a0c0b" roughness={0.08} metalness={0.2} transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* the picture's glow spills forward onto the table and floor, never onto the wall behind */}
      <spotLight
        ref={light}
        position={[0, sx.y, 0.3]}
        color="#dfe6ff"
        intensity={0}
        angle={0.95}
        penumbra={1}
        distance={5}
        decay={2}
      />
      <object3D ref={aim} position={[0, sx.y - 0.35, 2.2]} />
      {/* faint bounce off the room so the set's silhouette reads */}
      <pointLight ref={bounce} position={[0.1, 0.25, 0.95]} color="#cdd8ff" intensity={0} distance={3.5} decay={2} />

      {/* speaker grille, buttons, standby LED */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.17, -0.165 - i * 0.012, 0.247]}>
          <boxGeometry args={[0.2, 0.004, 0.002]} />
          <meshStandardMaterial color="#3a3833" roughness={0.9} />
        </mesh>
      ))}
      {[0.08, 0.12, 0.16].map((x) => (
        <mesh key={x} position={[x, -0.19, 0.248]}>
          <boxGeometry args={[0.026, 0.014, 0.008]} />
          <meshStandardMaterial color="#6d6a63" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.235, -0.19, 0.249]}>
        <sphereGeometry args={[0.0045, 12, 8]} />
        <meshBasicMaterial ref={led} color="#3dff7a" toneMapped={false} />
      </mesh>

      {/* crochet doily and rabbit-ear antenna */}
      <mesh rotation={[-Math.PI / 2, 0, 0.3]} position={[0, 0.2515, 0.03]}>
        <circleGeometry args={[0.2, 48]} />
        <meshStandardMaterial map={a.doily} alphaTest={0.4} transparent roughness={1} />
      </mesh>
      <group position={[0.04, 0.26, -0.02]}>
        <mesh>
          <cylinderGeometry args={[0.035, 0.04, 0.025, 20]} />
          <meshStandardMaterial color="#2a2826" roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.1, 0.19, -0.03]} rotation={[-0.15, 0, -s * 0.5]}>
            <cylinderGeometry args={[0.0028, 0.0035, 0.44, 6]} />
            <meshStandardMaterial color="#cfcfcf" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
