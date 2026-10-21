/**
 * Paper, synthesised: Komal's scrapbook is thick, slightly old paper bound in a homemade card cover.
 *   page turn  the corner lifting (a few tiny crinkles), the sheet swishing through the air (soft and
 *              airy, a swell then a fall), the papery crackle as it bends (thinning out), a muted flop
 *   book open  the glued spine giving way (a short, dry creak), the cover swinging over (a low whoosh),
 *              the card landing flat (a soft flop) and the first page settling on it
 * Same shape as bulbSound.ts: every voice takes a context, an output node and a start time, so it
 * plays live and renders offline. Noise and crackle are made once per context and reused, so a
 * riffle of pages allocates no buffers.
 */
type Out = { c: BaseAudioContext; out: AudioNode }

type Pool = { bufs: AudioBuffer[]; last: number }
type Bank = { white: AudioBuffer; pink: AudioBuffer; pools: Map<string, Pool> }
const banks = new WeakMap<BaseAudioContext, Bank>()

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function normalise(d: Float32Array) {
  let peak = 0
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] /= peak
}

function whiteNoise(c: BaseAudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

/** Pink noise (Paul Kellet's filter): softer and airier than white, so a swish never turns into hiss. */
function pinkNoise(c: BaseAudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const d = b.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
    b6 = w * 0.115926
  }
  normalise(d)
  return b
}

/**
 * Paper crackle: tiny clicks (a sharp edge and a noisy tail, 0.3-2 ms), mostly faint with the odd
 * louder snap, some in little crinkly clusters. `shape` sets the density across the buffer (0..1).
 */
function crackle(c: BaseAudioContext, seconds: number, perSecond: number, shape: (u: number) => number, cluster: number) {
  const sr = c.sampleRate
  const n = Math.ceil(sr * seconds)
  const b = c.createBuffer(1, n, sr)
  const d = b.getChannelData(0)
  const click = (i: number, amp: number) => {
    const len = Math.floor(sr * rand(0.0003, 0.002))
    const sign = Math.random() < 0.5 ? -1 : 1
    for (let k = 0; k < len && i + k < n; k++) d[i + k] += amp * Math.pow(1 - k / len, 2) * (k < 3 ? sign : Math.random() * 2 - 1)
  }
  for (let i = 0; i < n; ) {
    // jump straight to the next click (exponential gaps at the local density), not a coin toss per sample
    const rate = perSecond * shape(i / n)
    i += rate < 1 ? Math.ceil(sr * 0.002) : Math.max(1, Math.floor((-Math.log(1 - Math.random()) * sr) / rate))
    if (i >= n || rate < 1) continue
    const amp = 0.12 + 0.88 * Math.pow(Math.random(), 2.5)
    click(i, amp)
    if (Math.random() < cluster) {
      let j = i
      const m = 2 + Math.floor(Math.random() * 3)
      for (let k = 0; k < m; k++) {
        j += Math.floor(sr * rand(0.0007, 0.004))
        if (j < n) click(j, amp * rand(0.35, 0.9))
      }
    }
  }
  normalise(d)
  return b
}

/** The glued spine letting go: a run of stick-slip pulses, irregular and quickening, then dying away. */
function spineCreak(c: BaseAudioContext, seconds: number) {
  const sr = c.sampleRate
  const n = Math.ceil(sr * seconds)
  const b = c.createBuffer(1, n, sr)
  const d = b.getChannelData(0)
  let period = rand(0.007, 0.011)
  for (let i = 0; i < n; i += Math.max(1, Math.floor(sr * period))) {
    const u = i / n
    const e = Math.min(1, u / 0.12) * Math.pow(1 - u, 1.3)
    // the odd slip that does not catch
    if (Math.random() < 0.88) {
      const amp = e * rand(0.45, 1)
      const len = Math.floor(sr * rand(0.0008, 0.0025))
      for (let k = 0; k < len && i + k < n; k++) d[i + k] += amp * Math.pow(1 - k / len, 2) * (k === 0 ? 1 : (Math.random() * 2 - 1) * 0.5)
    }
    period = Math.min(0.014, Math.max(0.0035, period * rand(0.86, 1.06)))
  }
  normalise(d)
  return b
}

function bank(c: BaseAudioContext) {
  let b = banks.get(c)
  if (!b) {
    b = { white: whiteNoise(c, 1), pink: pinkNoise(c, 2), pools: new Map() }
    banks.set(c, b)
  }
  return b
}

/** A handful of variants of each crackle, made one per call until there are `n`; then each call takes one it did not just play. */
function pick(c: BaseAudioContext, key: string, make: () => AudioBuffer, n = 5) {
  const pools = bank(c).pools
  let p = pools.get(key)
  if (!p) pools.set(key, (p = { bufs: [], last: -1 }))
  if (p.bufs.length < n) {
    p.last = p.bufs.push(make()) - 1
    return p.bufs[p.last]
  }
  let i = Math.floor(Math.random() * n)
  if (i === p.last) i = (i + 1) % n
  p.last = i
  return p.bufs[i]
}

// the crackle of a page as it bends: comes in fast as the corner lifts, then thins out
const bend = (u: number) => Math.min(1, u / 0.12) * Math.pow(1 - u, 1.5)
const pageCrackle = (c: BaseAudioContext) => crackle(c, 0.44, 900, bend, 0.25)
const quickCrackle = (c: BaseAudioContext) => crackle(c, 0.22, 1000, bend, 0.2)

/** A stretch of a cached noise buffer from a random point, so no two calls line up. */
function play(c: BaseAudioContext, buf: AudioBuffer, t: number, dur: number) {
  const s = c.createBufferSource()
  s.buffer = buf
  s.start(t, Math.random() * Math.max(0, buf.duration - dur - 0.05))
  s.stop(t + dur + 0.02)
  return s
}

/** A whole crackle buffer, sped up or slowed down a touch to fit `dur`. */
function playAll(c: BaseAudioContext, buf: AudioBuffer, t: number, dur: number) {
  const s = c.createBufferSource()
  s.buffer = buf
  s.playbackRate.value = buf.duration / dur
  s.start(t)
  return s
}

function biquad(c: BaseAudioContext, type: BiquadFilterType, freq: number, q: number) {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function gain(c: BaseAudioContext, value: number) {
  const g = c.createGain()
  g.gain.value = value
  return g
}

/**
 * The swell of a swish: rises smoothly to `peakAt` (0..1) and falls away, with an irregular flutter
 * (two slow wobbles and a little smoothed randomness) that is strongest mid-flight.
 */
function swell(dur: number, peakAt: number, flutter: number, rate: number, level: number) {
  const n = Math.max(16, Math.ceil(dur * 400))
  const a = new Float32Array(n)
  const f1 = rate * rand(0.8, 1.25)
  const f2 = rate * rand(1.7, 2.6)
  const p1 = rand(0, 7)
  const p2 = rand(0, 7)
  let wob = 0
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const s = u < peakAt ? Math.pow(Math.sin(((u / peakAt) * Math.PI) / 2), 2) : Math.pow(1 - (u - peakAt) / (1 - peakAt), 1.7)
    wob += (Math.random() * 2 - 1 - wob) * 0.3
    const x = u * dur * 2 * Math.PI
    const w = 0.55 * Math.sin(x * f1 + p1) + 0.3 * Math.sin(x * f2 + p2) + 0.6 * wob
    a[i] = level * s * Math.max(0, 1 + flutter * Math.sin(Math.PI * u) * w)
  }
  return a
}

type Swish = { peakAt: number; lo: number; hi: number; level: number; flutter: number; rate: number; air: number }

/**
 * Air past a moving sheet: pink noise through a wide band-pass that climbs as the sheet speeds up
 * and drops as it slows, a low-pass that opens and closes with it (so it stays soft, never a hiss),
 * and a lower layer for the air it pushes, all under one fluttering swell.
 */
function swish({ c, out }: Out, t: number, dur: number, o: Swish) {
  const src = play(c, bank(c).pink, t, dur)
  const tp = t + dur * o.peakAt
  const bp = biquad(c, 'bandpass', o.lo, 0.7)
  bp.frequency.setValueAtTime(o.lo, t)
  bp.frequency.exponentialRampToValueAtTime(o.hi, tp)
  bp.frequency.exponentialRampToValueAtTime(o.lo * 1.3, t + dur)
  const lp = biquad(c, 'lowpass', o.hi * 1.2, 0.5)
  lp.frequency.setValueAtTime(o.hi * 1.2, t)
  lp.frequency.exponentialRampToValueAtTime(o.hi * 2.4, tp)
  lp.frequency.exponentialRampToValueAtTime(o.hi * 1.1, t + dur)
  const g = gain(c, 0)
  g.gain.setValueCurveAtTime(swell(dur, o.peakAt, o.flutter, o.rate, o.level), t, dur)
  src.connect(bp).connect(lp).connect(g).connect(out)
  if (o.air > 0) src.connect(biquad(c, 'bandpass', 420, 0.8)).connect(gain(c, o.air)).connect(g)
}

/** A tiny crinkle: a few clicks within a few milliseconds, rung through a narrowish band. */
function crinkle({ c, out }: Out, t: number, freq: number, level: number) {
  const src = play(c, bank(c).white, t, 0.03)
  const bp = biquad(c, 'bandpass', freq, 1.6)
  const g = gain(c, 0)
  let at = t
  const m = 2 + Math.floor(Math.random() * 3)
  for (let k = 0; k < m; k++) {
    g.gain.setValueAtTime(level * rand(0.5, 1), at)
    g.gain.setTargetAtTime(0, at + 0.0004, rand(0.0008, 0.002))
    at += rand(0.0015, 0.005)
  }
  src.connect(bp).connect(g).connect(out)
}

type Flop = { level: number; slap: number; crisp: number; body: number; size: number }

/**
 * A sheet (or the card cover) landing: the puff of air it pushes out (low-passed noise closing
 * down), a muted slap of paper on paper, and a little body under it. Soft attack, nothing rings.
 */
function flop({ c, out }: Out, t: number, o: Flop) {
  const { pink, white } = bank(c)
  const decay = 0.1 * o.size
  const puff = play(c, pink, t, decay + 0.06)
  const lp = biquad(c, 'lowpass', 1500, 0.7)
  lp.frequency.setValueAtTime(1500, t)
  lp.frequency.exponentialRampToValueAtTime(240, t + decay)
  const pg = c.createGain()
  env(pg, t, o.level, 0.005, decay)
  // high-passed, so it is a flop and not a thud
  puff.connect(biquad(c, 'highpass', 150, 0.7)).connect(lp).connect(pg).connect(out)

  const slap = play(c, white, t, 0.06)
  const bp = biquad(c, 'bandpass', o.slap, 1.1)
  const sg = c.createGain()
  env(sg, t + 0.002, o.level * o.crisp, 0.0015, 0.028 * o.size)
  slap.connect(bp).connect(sg).connect(out)

  if (o.body > 0) {
    const osc = c.createOscillator()
    osc.frequency.setValueAtTime(o.body, t)
    osc.frequency.exponentialRampToValueAtTime(o.body * 0.6, t + 0.08 * o.size)
    const og = c.createGain()
    env(og, t, o.level * 0.18, 0.004, 0.07 * o.size)
    osc.connect(og).connect(out)
    osc.start(t)
    osc.stop(t + 0.1 * o.size + 0.02)
  }
}

/** The bend's crackle, band-passed into the paper's range. */
function bendCrackle({ c, out }: Out, t: number, dur: number, buf: AudioBuffer, level: number) {
  const src = playAll(c, buf, t, dur)
  src
    .connect(biquad(c, 'highpass', 900, 0.6))
    .connect(biquad(c, 'bandpass', rand(1900, 2700), 0.55))
    .connect(biquad(c, 'lowpass', 6500, 0.6))
    .connect(gain(c, level))
    .connect(out)
}

/**
 * One page of a thick, slightly old scrapbook turned by hand, about 0.6 s (quick: about 0.3 s, for
 * pages riffling by in a row). Every call varies its timing, pitch and level a little.
 */
export function voicePageTurn(o: Out, t: number, opts: { quick?: boolean } = {}) {
  const { c } = o
  const quick = !!opts.quick
  const k = quick ? rand(0.44, 0.5) : rand(0.92, 1.1)
  const lvl = (quick ? 0.8 : 1) * rand(0.88, 1.05)

  // the corner lifting under a thumb
  let at = t
  const lifts = quick ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < lifts; i++) {
    crinkle(o, at, rand(2400, 4400), lvl * rand(0.18, 0.32))
    at += rand(0.014, 0.032) * k
  }

  // the sheet swishing over, and crackling as it bends
  swish(o, t + 0.03 * k, 0.55 * k, { peakAt: rand(0.34, 0.46), lo: 750, hi: rand(1800, 2400), level: 0.62 * lvl, flutter: 0.5, rate: rand(9, 14), air: 0.35 })
  bendCrackle(o, t + 0.02 * k, 0.44 * k, pick(c, quick ? 'quick' : 'page', () => (quick ? quickCrackle(c) : pageCrackle(c))), 0.6 * lvl)

  // landing, and the sheet settling
  const land = t + rand(0.5, 0.54) * k
  flop(o, land, { level: 0.42 * lvl, slap: rand(1100, 1600), crisp: 0.45, body: quick ? 0 : rand(85, 100), size: quick ? 0.7 : 1 })
  if (!quick && Math.random() < 0.7) crinkle(o, land + rand(0.03, 0.06), rand(2800, 4200), lvl * 0.1)
}

/**
 * A homemade scrapbook's card cover opened, about 1.05 s: the spine and glue giving way, the cover
 * swinging over, landing flat, and the first page settling on it.
 */
export function voiceBookOpen(o: Out, t: number) {
  const { c, out } = o
  const lvl = rand(1.05, 1.18)

  // the spine and glue giving way: a short, dry creak rung through the board, over the glue crackling
  const sp = rand(0.17, 0.22)
  playAll(c, pick(c, 'spine', () => spineCreak(c, 0.2)), t, sp)
    .connect(biquad(c, 'bandpass', rand(950, 1250), 3.5))
    .connect(gain(c, 3.4 * lvl))
    .connect(out)
  const glue = pick(c, 'glue', () => crackle(c, 0.24, 1600, (u) => Math.min(1, u / 0.05) * Math.pow(1 - u, 2), 0.35))
  playAll(c, glue, t + 0.01, sp + 0.04)
    .connect(biquad(c, 'highpass', 1800, 0.6))
    .connect(biquad(c, 'lowpass', 5000, 0.6))
    .connect(gain(c, 0.24 * lvl))
    .connect(out)

  // the cover swinging over: a slow, low whoosh, and the binding flexing as it goes
  const sw = t + sp * 0.7
  const swDur = rand(0.68, 0.78)
  swish(o, sw, swDur, { peakAt: rand(0.6, 0.7), lo: 320, hi: rand(850, 1050), level: 0.32 * lvl, flutter: 0.18, rate: 5, air: 0.9 })
  bendCrackle(o, sw + 0.05, swDur * 0.7, pick(c, 'page', () => pageCrackle(c)), 0.18 * lvl)

  // the card landing flat as the whoosh dies away
  const land = sw + swDur * 0.88
  flop(o, land, { level: 0.7 * lvl, slap: rand(650, 800), crisp: 0.7, body: rand(95, 115), size: 1.6 })

  // and the first page settling on it
  const settle = land + rand(0.06, 0.09)
  swish(o, settle, 0.2, { peakAt: 0.3, lo: 900, hi: 1900, level: 0.16 * lvl, flutter: 0.4, rate: 14, air: 0.3 })
  bendCrackle(o, settle, 0.18, pick(c, 'quick', () => quickCrackle(c)), 0.25 * lvl)
  flop(o, settle + 0.16, { level: 0.14 * lvl, slap: 1400, crisp: 0.45, body: 0, size: 0.7 })
}

/** Dev aid: the book opening, three page turns and a quick riffle, rendered offline. */
export async function renderPaperPreview(sampleRate = 44100) {
  const c = new OfflineAudioContext(1, Math.ceil(sampleRate * 5.2), sampleRate)
  const out = c.createGain()
  out.gain.value = 0.9
  out.connect(c.destination)
  const o = { c, out }
  voiceBookOpen(o, 0.05)
  ;[1.6, 2.4, 3.2].forEach((t) => voicePageTurn(o, t))
  for (let i = 0; i < 4; i++) voicePageTurn(o, 4.0 + i * 0.09, { quick: true })
  return c.startRendering()
}

/**
 * The card cover shut again, about 1.1 s: a slow whoosh as it swings back over, and the board
 * landing flat on the pages. No spine creak: that only gives once, on the way open.
 */
export function voiceBookClose(o: Out, t: number) {
  const { c } = o
  const lvl = rand(1, 1.12)
  const swDur = rand(1.05, 1.15)
  swish(o, t, swDur, { peakAt: rand(0.66, 0.74), lo: 300, hi: rand(800, 1000), level: 0.3 * lvl, flutter: 0.15, rate: 5, air: 0.9 })
  bendCrackle(o, t + 0.04, swDur * 0.6, pick(c, 'page', () => pageCrackle(c)), 0.14 * lvl)
  flop(o, t + swDur * 0.95, { level: 0.85 * lvl, slap: rand(600, 760), crisp: 0.75, body: rand(90, 110), size: 1.8 })
}
