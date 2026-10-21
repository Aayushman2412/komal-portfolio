/**
 * All sound is synthesised with the Web Audio API: no files to load, and every sound can follow
 * the scroll. Off by default; the toggle in the corner unlocks the AudioContext on a user gesture.
 * After the feed it is all old-house sound, as nostalgic as Komal asked for: the wall switch and
 * the bulb, the almirah's latch and creak, pages turning. (No clothes rustle: she asked for it gone.)
 */
import { voiceDrop, voiceSpark, voiceSwitch, voiceThunk, voiceTicks } from './bulbSound'
import { voiceBookOpen, voicePageTurn } from './paperSound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

// continuous layers, driven every frame by `setLevels`
let feedGain: GainNode | null = null
let feedOsc: OscillatorNode[] = []
let staticGain: GainNode | null = null
let staticFilter: BiquadFilterNode | null = null
let roomGain: GainNode | null = null
let humGain: GainNode | null = null

function noise(seconds = 2) {
  const c = ctx!
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function loopNoise(dest: AudioNode) {
  const src = ctx!.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  src.connect(dest)
  src.start()
  return src
}

function build() {
  const c = new AudioContext()
  ctx = c
  master = c.createGain()
  master.gain.value = 0.0
  master.connect(c.destination)
  noiseBuf = noise()

  // the feed: a bright detuned chord that climbs with scroll
  feedGain = c.createGain()
  feedGain.gain.value = 0
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1800
  feedGain.connect(lp).connect(master)
  feedOsc = [220, 277.2, 329.6, 440.4].map((f, i) => {
    const o = c.createOscillator()
    o.type = i % 2 ? 'sawtooth' : 'triangle'
    o.frequency.value = f
    const g = c.createGain()
    g.gain.value = i % 2 ? 0.05 : 0.12
    o.connect(g).connect(feedGain!)
    o.start()
    return o
  })

  // the glitch: static and a whine
  staticGain = c.createGain()
  staticGain.gain.value = 0
  staticFilter = c.createBiquadFilter()
  staticFilter.type = 'bandpass'
  staticFilter.frequency.value = 3200
  staticFilter.Q.value = 0.6
  loopNoise(staticFilter)
  staticFilter.connect(staticGain).connect(master)

  // room tone: brown-ish noise + a mains hum from the bulb
  roomGain = c.createGain()
  roomGain.gain.value = 0
  const roomLp = c.createBiquadFilter()
  roomLp.type = 'lowpass'
  roomLp.frequency.value = 260
  loopNoise(roomLp)
  roomLp.connect(roomGain).connect(master)
  humGain = c.createGain()
  humGain.gain.value = 0
  ;[50, 100, 150].forEach((f, i) => {
    const o = c.createOscillator()
    o.frequency.value = f
    const g = c.createGain()
    g.gain.value = 0.05 / (i + 1)
    o.connect(g).connect(humGain!)
    o.start()
  })
  humGain.connect(master)
}

export const sound = {
  enabled: false,
  async enable(on: boolean) {
    this.enabled = on
    if (on && !ctx) build()
    if (!ctx || !master) return
    if (ctx.state === 'suspended') await ctx.resume()
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.15)
  },

  /** Called every frame with the story state. */
  setLevels(l: { feed: number; climb: number; glitch: number; room: number; bulb: number }) {
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    feedGain!.gain.setTargetAtTime(l.feed * 0.22, t, 0.08)
    feedOsc.forEach((o, i) => o.frequency.setTargetAtTime([220, 277.2, 329.6, 440.4][i] * (1 + l.climb * 1.5), t, 0.1))
    staticGain!.gain.setTargetAtTime(l.glitch * 0.18, t, 0.04)
    staticFilter!.frequency.setTargetAtTime(2000 + l.glitch * 4000, t, 0.05)
    roomGain!.gain.setTargetAtTime(l.room * 0.35, t, 0.3)
    humGain!.gain.setTargetAtTime(l.bulb * 0.25, t, 0.05)
  },

  /** One-shots. */
  powerOff() {
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(32, t + 0.5)
    g.gain.setValueAtTime(0.7, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    o.connect(g).connect(master!)
    o.start(t)
    o.stop(t + 0.65)
    this.burst(0.08, 5000, 0.5)
  },

  click() {
    this.burst(0.03, 2500, 0.4)
  },

  /** The almirah: a latch clunk, then a creak (a resonant filter swept over stick-slip noise). */
  creak(dur = 1.3) {
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    const clunk = ctx.createOscillator()
    const cg = ctx.createGain()
    clunk.type = 'square'
    clunk.frequency.setValueAtTime(220, t)
    clunk.frequency.exponentialRampToValueAtTime(70, t + 0.12)
    cg.gain.setValueAtTime(0.25, t)
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    clunk.connect(cg).connect(master!)
    clunk.start(t)
    clunk.stop(t + 0.2)

    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 18
    bp.frequency.setValueAtTime(420, t + 0.1)
    bp.frequency.linearRampToValueAtTime(780, t + 0.1 + dur * 0.6)
    bp.frequency.linearRampToValueAtTime(520, t + 0.1 + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    // stick-slip: fast tremolo on the amplitude
    for (let k = 0; k < dur * 28; k++) {
      const tk = t + 0.1 + k / 28
      g.gain.setValueAtTime(0.5 + Math.random() * 0.6, tk)
      g.gain.setValueAtTime(0.08, tk + 0.012)
    }
    g.gain.setValueAtTime(0, t + 0.1 + dur)
    src.connect(bp).connect(g).connect(master!)
    src.start(t + 0.1)
    src.stop(t + 0.2 + dur)
  },

  /** The bulb: wall switch, each flicker's arc and crackle, the thunk as it catches, warm-up ticks, the contact dropping out. */
  switchClick(delay = 0) {
    if (ctx && this.enabled) voiceSwitch({ c: ctx, out: master! }, ctx.currentTime + delay)
  },
  bulbSpark(level: number, delay = 0) {
    if (ctx && this.enabled) voiceSpark({ c: ctx, out: master! }, ctx.currentTime + 0.005 + delay, level)
  },
  bulbThunk(delay = 0) {
    if (ctx && this.enabled) voiceThunk({ c: ctx, out: master! }, ctx.currentTime + 0.02 + delay)
  },
  bulbTicks(delay = 0) {
    if (ctx && this.enabled) voiceTicks({ c: ctx, out: master! }, ctx.currentTime + delay)
  },
  bulbDrop(delay = 0) {
    if (ctx && this.enabled) voiceDrop({ c: ctx, out: master! }, ctx.currentTime + delay)
  },

  /** The scrapbook: a page of thick, old paper turned by hand (quick when several riffle by in a row), and its card cover opening. */
  page(quick = false) {
    if (!ctx || !this.enabled) return
    voicePageTurn({ c: ctx, out: master! }, ctx.currentTime + 0.005, { quick })
  },
  bookOpen() {
    if (!ctx || !this.enabled) return
    voiceBookOpen({ c: ctx, out: master! }, ctx.currentTime + 0.005)
  },

  burst(len: number, freq: number, vol: number, q = 0.8) {
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = freq
    bp.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + len)
    src.connect(bp).connect(g).connect(master!)
    src.start(t, Math.random())
    src.stop(t + len + 0.05)
  },
}
