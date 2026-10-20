/**
 * The old bulb coming on, synthesised:
 *   switch  the wall switch going "tak" (a bakelite click: a bright transient, a small plastic body, a thump)
 *   spark   each flicker: the loose contact in the holder arcing, a 100 Hz mains buzz (50 Hz supply)
 *           chopped by a sputtering envelope, over a spray of tiny crackles that thins out
 *   thunk   the light catching and staying on: a low, damped knock as the holder settles
 *   ticks   the holder and filament ticking as they warm up: a few soft, slowing ticks
 *   drop    the contact breaking again: one short tick
 * Every voice takes a context, an output node and a start time, so the same code plays live and
 * renders offline (see renderBulbPreview).
 */
type Out = { c: BaseAudioContext; out: AudioNode }

function noiseBuffer(c: BaseAudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

/** Sparse electrical crackle: micro-impulses whose density thins out over `seconds`. */
function crackleBuffer(c: BaseAudioContext, seconds: number, perSecond: number) {
  const n = Math.ceil(c.sampleRate * seconds)
  const b = c.createBuffer(1, n, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < n; i++) {
    const t = i / n
    if (Math.random() < (perSecond * Math.pow(1 - t, 1.4)) / c.sampleRate) {
      const amp = 0.3 + Math.random() * 0.7
      const len = 4 + Math.floor(Math.random() * 36)
      const sign = Math.random() < 0.5 ? -1 : 1
      for (let k = 0; k < len && i + k < n; k++) d[i + k] += sign * (Math.random() * 0.6 + 0.4) * amp * Math.pow(1 - k / len, 2)
    }
  }
  return b
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

export function voiceSwitch({ c, out }: Out, t: number) {
  // the snap: a very short band-passed noise transient
  const snap = c.createBufferSource()
  snap.buffer = noiseBuffer(c, 0.03)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600
  bp.Q.value = 1.1
  const g1 = c.createGain()
  env(g1, t, 0.9, 0.0008, 0.018)
  snap.connect(bp).connect(g1).connect(out)
  snap.start(t)
  snap.stop(t + 0.04)
  // the plastic body ringing for a moment
  const body = c.createOscillator()
  body.type = 'triangle'
  body.frequency.setValueAtTime(1150, t)
  body.frequency.exponentialRampToValueAtTime(700, t + 0.03)
  const g2 = c.createGain()
  env(g2, t, 0.22, 0.001, 0.035)
  body.connect(g2).connect(out)
  body.start(t)
  body.stop(t + 0.05)
  // the thump through the wall
  const thump = c.createOscillator()
  thump.frequency.setValueAtTime(170, t)
  thump.frequency.exponentialRampToValueAtTime(60, t + 0.05)
  const g3 = c.createGain()
  env(g3, t, 0.35, 0.002, 0.06)
  thump.connect(g3).connect(out)
  thump.start(t)
  thump.stop(t + 0.08)
}

export function voiceSpark({ c, out }: Out, t: number, level = 1) {
  const dur = 0.05 + Math.random() * 0.07 + level * 0.04
  // mains buzz: 100 Hz and its odd partials, band-passed so it reads as an arc, not a synth
  const buzzGain = c.createGain()
  buzzGain.gain.setValueAtTime(0, t)
  const steps = 18
  for (let k = 0; k <= steps; k++) {
    const tk = t + (k / steps) * dur
    const on = Math.random() < 0.7 ? 1 : 0.15
    buzzGain.gain.setValueAtTime(0.16 * level * on * (1 - (k / steps) * 0.6), tk)
  }
  buzzGain.gain.setValueAtTime(0, t + dur)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1400
  bp.Q.value = 0.8
  bp.connect(buzzGain).connect(out)
  ;[100, 300, 500].forEach((f, i) => {
    const o = c.createOscillator()
    o.type = i === 0 ? 'sawtooth' : 'square'
    o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01)
    const g = c.createGain()
    g.gain.value = [1, 0.35, 0.15][i]
    o.connect(g).connect(bp)
    o.start(t)
    o.stop(t + dur + 0.02)
  })
  // the crackle
  const cr = c.createBufferSource()
  cr.buffer = crackleBuffer(c, dur + 0.06, 520 + level * 360)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1800
  const cg = c.createGain()
  cg.gain.value = 0.55 * (0.6 + level * 0.4)
  cr.connect(hp).connect(cg).connect(out)
  cr.start(t)
}

/**
 * The light catching: a low, dull thunk (felt more than heard), a short wooden-sounding body, a
 * muffled knock, and one softer knock as the holder settles. Nothing rings: every part is damped.
 */
export function voiceThunk({ c, out }: Out, t: number) {
  const knock = (at: number, f: number, vol: number) => {
    const thump = c.createOscillator()
    thump.frequency.setValueAtTime(f, at)
    thump.frequency.exponentialRampToValueAtTime(f * 0.5, at + 0.09)
    const g = c.createGain()
    env(g, at, vol, 0.003, 0.13)
    thump.connect(g).connect(out)
    thump.start(at)
    thump.stop(at + 0.18)

    const body = c.createOscillator()
    body.type = 'triangle'
    body.frequency.setValueAtTime(f * 2.3, at)
    body.frequency.exponentialRampToValueAtTime(f * 1.7, at + 0.06)
    const bg = c.createGain()
    // the body carries the knock on laptop and phone speakers, which drop the low thump
    env(bg, at, vol * 0.45, 0.002, 0.07)
    body.connect(bg).connect(out)
    body.start(at)
    body.stop(at + 0.1)

    const n = c.createBufferSource()
    n.buffer = noiseBuffer(c, 0.04)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 850
    const ng = c.createGain()
    env(ng, at, vol * 0.7, 0.001, 0.025)
    n.connect(lp).connect(ng).connect(out)
    n.start(at)
    n.stop(at + 0.05)
  }
  const f = 135 + Math.random() * 15
  knock(t, f, 0.5)
  knock(t + 0.085 + Math.random() * 0.02, f * 0.9, 0.14)
}

/** Warm-up ticks: small damped clicks, irregular and slowing down, each a little quieter. */
export function voiceTicks({ c, out }: Out, t: number) {
  const gaps = [0, 0.19, 0.17, 0.26, 0.31, 0.4, 0.52]
  let at = t
  gaps.forEach((gap, i) => {
    at += gap * (0.85 + Math.random() * 0.3)
    const vol = 0.8 * Math.pow(0.8, i)
    const f = 1050 + Math.random() * 350
    const n = c.createBufferSource()
    n.buffer = noiseBuffer(c, 0.012)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 3.5
    const ng = c.createGain()
    env(ng, at, vol, 0.0005, 0.008)
    n.connect(bp).connect(ng).connect(out)
    n.start(at)
    n.stop(at + 0.015)
    const o = c.createOscillator()
    o.frequency.setValueAtTime(f * 0.8, at)
    const og = c.createGain()
    env(og, at, vol * 0.12, 0.0008, 0.012)
    o.connect(og).connect(out)
    o.start(at)
    o.stop(at + 0.02)
  })
}

export function voiceDrop({ c, out }: Out, t: number) {
  const cr = c.createBufferSource()
  cr.buffer = crackleBuffer(c, 0.05, 260)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2200
  const g = c.createGain()
  g.gain.value = 0.35
  cr.connect(hp).connect(g).connect(out)
  cr.start(t)
}

/**
 * Dev aid: renders the whole switch-on (switch, four false starts, catch) offline and returns
 * the samples, so the sequence can be checked without speakers.
 */
export async function renderBulbPreview(sampleRate = 44100) {
  const c = new OfflineAudioContext(1, Math.ceil(sampleRate * 4), sampleRate)
  const out = c.createGain()
  out.gain.value = 0.9
  out.connect(c.destination)
  const o = { c, out }
  voiceSwitch(o, 0.05)
  const blips: [number, number][] = [
    [0.3, 0.7],
    [0.62, 0.35],
    [0.86, 0.9],
    [1.18, 0.5],
  ]
  blips.forEach(([t, level], i) => {
    voiceSpark(o, t, level)
    voiceDrop(o, t + 0.16 + i * 0.02)
  })
  voiceSpark(o, 1.45, 0.85)
  voiceThunk(o, 1.47)
  voiceTicks(o, 1.72)
  return c.startRendering()
}
