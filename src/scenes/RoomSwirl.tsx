import { useEffect, useRef, useState } from 'react'
import { FRAME, polyBox, regions } from '../lib/art'
import { prefersReducedMotion } from '../lib/gsap'

/**
 * Frame 3's haze, moving. Komal: "behind the almirah there are curves... those orange lines should
 * move". Her drawing is redrawn every frame through a slow swirling warp that is stretched along her
 * brush strokes (which way they run is read once from the drawing), so the pink and orange swirls
 * slide and ripple along their own curves like silk. The almirah, the bulb on its cord and the
 * stars stay exactly where she drew them. Without WebGL it is just her image.
 */

const PAD = 30 // still margin around the almirah: its cut-out is laid over this, so nothing may slide out of it
const FALL = 40 // px over which the motion fades in around anything still (wide enough that nothing folds over)
const ALONG = 15 // px of drift along a stroke
const ACROSS = 10 // px of ripple across it
const GROUND = 0.55 // how much less the dark ground moves
const LOOP = 200 // s; the drifts below are whole tiles per loop, so it repeats seamlessly
const EASE_IN = 2.5 // s for the motion to grow from her still drawing

const BOX = polyBox(regions.room.almirah, PAD)
const [BX, BY] = regions.room.bulb
const STILL = [...regions.room.stars.map(([x, y]) => [x, y, 54]), [BX, BY, 70]]

const n = (v: number) => v.toFixed(1)

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_img, u_flow, u_noise;
uniform float u_t, u_amp;
const vec2 S = vec2(${n(FRAME.w)}, ${n(FRAME.h)});

// 0 on the almirah, the bulb and its cord, and the stars; 1 in the open haze
float freedom(vec2 p) {
  vec2 o = max(max(vec2(${n(BOX[0])}, ${n(BOX[1])}) - p, p - vec2(${n(BOX[2])}, ${n(BOX[3])})), 0.0);
  float f = smoothstep(0.0, ${n(FALL)}, length(o));
  f *= smoothstep(10.0, ${n(10 + FALL)}, distance(p, vec2(${n(BX + 1)}, clamp(p.y, 0.0, ${n(BY)}))));
  ${STILL.map(([x, y, r]) => `f *= smoothstep(${n(r)}, ${n(r + FALL)}, distance(p, vec2(${n(x)}, ${n(y)})));`).join('\n  ')}
  return f;
}

vec3 texel(vec2 p) { return texture2D(u_img, p / S).rgb; }

// Bicubic from five bilinear taps (the four corner ones are negligible), a little sharper than
// Catmull-Rom so her grain stays crisp wherever a pixel has drifted to; at a whole-pixel offset it
// returns that texel exactly
vec3 sharp(vec2 p) {
  const float A = -0.75;
  vec2 c = floor(p - 0.5) + 0.5, f = p - c, g = 1.0 - f;
  vec2 w0 = A * f * g * g, w3 = A * f * f * g, w12 = 1.0 - w0 - w3;
  vec2 w2 = (A + 2.0) * g * g * g - (A + 3.0) * g * g + 1.0;
  vec2 a = c - 1.0, b = c + w2 / w12, e = c + 2.0;
  vec3 sum = texel(vec2(b.x, a.y)) * (w12.x * w0.y) + texel(vec2(a.x, b.y)) * (w0.x * w12.y)
    + texel(b) * (w12.x * w12.y) + texel(vec2(e.x, b.y)) * (w3.x * w12.y) + texel(vec2(b.x, e.y)) * (w12.x * w3.y);
  return sum / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, S.y - gl_FragCoord.y); // her pixels, y down
  float f = freedom(p) * u_amp;
  if (f <= 0.0) {
    gl_FragColor = vec4(texel(p), 1.0);
    return;
  }
  vec3 flow = texture2D(u_flow, p / S).rgb;
  vec2 v = flow.rg * 2.0 - 1.0; // stroke direction as a doubled angle, scaled by how clear it is
  // two octaves of swirling noise drifting different ways
  vec2 g = texture2D(u_noise, p / 1600.0 + u_t * vec2(${-5 / LOOP}, ${2 / LOOP})).rg * 2.0 - 1.0;
  g += 0.6 * (texture2D(u_noise, p / 700.0 + u_t * vec2(${6 / LOOP}, ${-7 / LOOP})).ba * 2.0 - 1.0);
  // split it into along the stroke and across it, and let the along part dominate
  vec2 along = 0.5 * (g + vec2(v.x * g.x + v.y * g.y, v.y * g.x - v.x * g.y));
  vec2 d = (${n(ALONG)} * along + ${n(ACROSS)} * (g - along)) * f * (1.0 - ${GROUND} * flow.b);
  vec2 q = abs(p + d);
  gl_FragColor = vec4(sharp(S - abs(S - q)), 1.0); // mirrored at her frame's edges, not smeared
}
`

/** A box blur along rows, written transposed so that the next pass runs down the columns. */
function pass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, wrap: boolean) {
  const at = Int32Array.from({ length: w + 2 * r + 1 }, (_, i) => (wrap ? (i - r + w) % w : Math.min(w - 1, Math.max(0, i - r))))
  const k = 1 / (2 * r + 1)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let s = 0
    for (let i = 0; i <= 2 * r; i++) s += src[row + at[i]]
    for (let x = 0; x < w; x++) {
      dst[x * h + y] = s * k
      s += src[row + at[x + 2 * r + 1]] - src[row + at[x]]
    }
  }
}

/** Three box blurs ~ a Gaussian, in place. Edges wrap (for tiling noise) or clamp. */
function blur(a: Float32Array, w: number, h: number, r: number, wrap = false) {
  const tmp = new Float32Array(a.length)
  for (let i = 0; i < 3; i++) {
    pass(a, tmp, w, h, r, wrap)
    pass(tmp, a, h, w, r, wrap)
  }
  return a
}

function still(x: number, y: number) {
  if (x > BOX[0] && x < BOX[2] && y > BOX[1] && y < BOX[3]) return true
  for (let i = 0; i < STILL.length; i++) {
    const s = STILL[i]
    if ((x - s[0]) * (x - s[0]) + (y - s[1]) * (y - s[1]) < s[2] * s[2]) return true
  }
  return false
}

/**
 * Which way her brush strokes run: a smoothed structure tensor of the drawing's colour gradients,
 * stored as the strokes' doubled angle (RG, so a stroke has no "forwards") scaled by how clearly
 * they run that way, plus darkness (B) so the ground can move less. Quarter resolution is plenty.
 */
function strokeField(img: ImageBitmap) {
  const w = FRAME.w / 4
  const h = FRAME.h / 4
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  ctx.canvas.width = w
  ctx.canvas.height = h
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const [xx, xy, yy, lum] = Array.from({ length: 4 }, () => new Float32Array(w * h))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = y * w + x
      const i = q * 4
      lum[q] = (px[i] + px[i + 1] + px[i + 2]) / 3
      // the almirah, stars and bulb are left out: their hard edges would drown out the strokes around them
      if (!x || !y || x === w - 1 || y === h - 1 || still(x * 4 + 2, y * 4 + 2)) continue
      for (let c = 0; c < 3; c++) {
        const gx = px[i + 4 + c] - px[i - 4 + c]
        const gy = px[i + w * 4 + c] - px[i - w * 4 + c]
        xx[q] += gx * gx
        xy[q] += gx * gy
        yy[q] += gy * gy
      }
    }
  }
  for (const a of [xx, xy, yy, lum]) blur(a, w, h, 5)
  const out = new Uint8Array(w * h * 4)
  for (let q = 0; q < w * h; q++) {
    const e = xx[q] - yy[q]
    const f = 2 * xy[q]
    const m = Math.sqrt(e * e + f * f) || 1
    const clear = Math.min(1, (1.6 * m) / (xx[q] + yy[q] + 1e-3))
    // the strokes run across the gradient: turning 90 degrees flips the doubled angle
    out[q * 4] = 127.5 - 127.5 * clear * (e / m)
    out[q * 4 + 1] = 127.5 - 127.5 * clear * (f / m)
    out[q * 4 + 2] = 255 * Math.min(1, Math.max(0, (120 - lum[q]) / 70))
    out[q * 4 + 3] = 255
  }
  return { w, h, data: out }
}

/** Tileable curl noise: RG and BA are two unrelated swirling fields, so it eddies rather than swells. */
function curlNoise(size = 128) {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5
  const out = new Uint8Array(size * size * 4)
  for (const ch of [0, 2]) {
    const s = blur(Float32Array.from({ length: size * size }, rand), size, size, 5, true)
    const at = (x: number, y: number) => s[((y + size) % size) * size + ((x + size) % size)]
    const v = new Float32Array(size * size * 2)
    let rms = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 2
        v[i] = at(x, y + 1) - at(x, y - 1)
        v[i + 1] = at(x - 1, y) - at(x + 1, y)
        rms += v[i] * v[i] + v[i + 1] * v[i + 1]
      }
    }
    const k = 1 / (2.5 * Math.sqrt(rms / (size * size)))
    for (let i = 0; i < size * size; i++) {
      out[i * 4 + ch] = 127.5 + 127.5 * Math.max(-1, Math.min(1, v[i * 2] * k))
      out[i * 4 + ch + 1] = 127.5 + 127.5 * Math.max(-1, Math.min(1, v[i * 2 + 1] * k))
    }
  }
  return { w: size, h: size, data: out }
}

type Pixels = { w: number; h: number; data: Uint8Array }

const box = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const

export function RoomSwirl({ src, active }: { src: string; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const play = useRef<((on: boolean) => void) | null>(null)
  const on = useRef(active)
  const [mode, setMode] = useState<'loading' | 'gl' | 'img'>('loading')

  useEffect(() => {
    on.current = active
    play.current?.(active)
  }, [active])

  useEffect(() => {
    const el = canvas.current
    const gl = el?.getContext('webgl', { alpha: false, premultipliedAlpha: false, antialias: false, depth: false, stencil: false })
    if (!el || !gl) {
      setMode('img')
      return
    }
    let alive = true
    let ready = false
    let raf = 0
    let last = 0
    let t = 0
    let age = 0
    const lost = () => {
      ready = false
      cancelAnimationFrame(raf)
      setMode('img')
    }
    el.addEventListener('webglcontextlost', lost)

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, source)
      gl.compileShader(s)
      gl.attachShader(prog, s)
      gl.deleteShader(s) // freed with the program
    }
    const prog = gl.createProgram()!
    shader(gl.VERTEX_SHADER, VERT)
    shader(gl.FRAGMENT_SHADER, FRAG)
    gl.bindAttribLocation(prog, 0, 'a')
    gl.linkProgram(prog)
    const buf = gl.createBuffer()
    const textures: WebGLTexture[] = []

    const texture = (unit: number, from: ImageBitmap | Pixels, repeat = false) => {
      const tex = gl.createTexture()!
      textures.push(tex)
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      if ('data' in from) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, from.w, from.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, from.data)
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, from)
    }

    const uT = gl.getUniformLocation(prog, 'u_t')
    const uAmp = gl.getUniformLocation(prog, 'u_amp')
    const draw = () => {
      const k = Math.min(1, age / EASE_IN)
      gl.uniform1f(uT, t)
      gl.uniform1f(uAmp, k * k * (3 - 2 * k))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      t = (t + dt) % LOOP
      age += dt
      draw()
      raf = requestAnimationFrame(tick)
    }
    play.current = (go) => {
      cancelAnimationFrame(raf)
      if (!ready || !go || prefersReducedMotion()) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const setup = (img: ImageBitmap, field: Pixels, noise: Pixels) => {
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return setMode('img')
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      // her pixels as they are: top row first, no premultiplying (the bitmap is decoded the same way)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      texture(0, img)
      texture(1, field)
      texture(2, noise, true)
      ;['u_img', 'u_flow', 'u_noise'].forEach((u, i) => gl.uniform1i(gl.getUniformLocation(prog, u), i))
      ready = true
      draw() // still her drawing exactly: the motion eases in from here
      setMode('gl')
      play.current?.(on.current)
    }

    // decode from a blob, which browsers do off the main thread, and crunch numbers when idle
    const idle = () => new Promise((go) => ('requestIdleCallback' in window ? requestIdleCallback(go) : setTimeout(go, 1)))
    const decode = (blob: Blob, scale = 1) =>
      createImageBitmap(blob, { premultiplyAlpha: 'none', resizeWidth: FRAME.w * scale, resizeHeight: FRAME.h * scale, resizeQuality: 'high' })
    ;(async () => {
      const blob = await (await fetch(src)).blob() // from the cache: the room's art is preloaded
      if (!alive) return
      const [full, small] = await Promise.all([decode(blob), decode(blob, 1 / 4)])
      await idle()
      if (!alive) return
      const field = strokeField(small)
      small.close()
      await idle()
      if (!alive) return
      const noise = curlNoise()
      await idle()
      if (!alive || gl.isContextLost()) return
      setup(full, field, noise)
      full.close()
    })().catch(() => alive && setMode('img'))

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      play.current = null
      el.removeEventListener('webglcontextlost', lost)
      textures.forEach((tex) => gl.deleteTexture(tex))
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [src])

  return (
    <>
      {mode !== 'img' && <canvas ref={canvas} width={FRAME.w} height={FRAME.h} style={{ ...box, visibility: mode === 'gl' ? 'inherit' : 'hidden' }} />}
      {mode !== 'gl' && <img src={src} alt="" draggable={false} style={box} />}
    </>
  )
}
