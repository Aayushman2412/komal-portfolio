import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

/**
 * The cursor is a needle with thread, as Komal asked ("I don't want an arrow or anything, I want a
 * needle thread to act as the cursor"). The tip of the needle is the pointer; the thread hangs from
 * its eye and trails behind (a small verlet rope). Over anything clickable the needle tips in to
 * stitch, and a click leaves a stitch that fades. Mouse and pen only; touch keeps the platform's own.
 */
const SEGMENTS = 22
const SEG_LEN = 8
const THREAD = '#d42b45'
const INTERACTIVE = 'button:not([disabled]), a, [data-interactive], .spot, input, label'

type P = { x: number; y: number; px: number; py: number }
type Stitch = { x: number; y: number; a: number; born: number }

export function Cursor() {
  const cv = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const canvas = cv.current!
    const ctx = canvas.getContext('2d')!
    document.documentElement.classList.add('has-needle')

    const pos = { x: -100, y: -100, seen: false }
    const pose = { tilt: 0, dip: 0 }
    const thread: P[] = Array.from({ length: SEGMENTS }, () => ({ x: -100, y: -100, px: -100, py: -100 }))
    const stitches: Stitch[] = []
    let hover = false
    let raf = 0
    let last = performance.now()
    let w = 0
    let h = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    resize()

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pos.x = e.clientX
      pos.y = e.clientY
      if (!pos.seen) {
        pos.seen = true
        thread.forEach((p, i) => {
          p.x = p.px = pos.x + 20
          p.y = p.py = pos.y - 26 + i * SEG_LEN
        })
      }
      const over = !!(e.target as Element | null)?.closest?.(INTERACTIVE)
      if (over !== hover) {
        hover = over
        gsap.to(pose, { tilt: over ? 1 : 0, duration: 0.25, ease: 'power2.out' })
      }
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      gsap.fromTo(pose, { dip: 1 }, { dip: 0, duration: 0.35, ease: 'power2.out' })
      stitches.push({ x: e.clientX, y: e.clientY, a: -0.6 + Math.random() * 0.3, born: performance.now() })
      if (stitches.length > 12) stitches.shift()
    }
    const leave = () => {
      pos.seen = false
      pos.x = pos.y = -100
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (!pos.seen) return

      // the needle: tip on the pointer, eye up and to the right
      const ang = -0.9 - pose.tilt * 0.22
      const len = 36 + pose.tilt * 3
      const dip = pose.dip * 4
      // a click pushes the needle in along its own axis
      const tx = pos.x - Math.cos(ang) * dip
      const ty = pos.y - Math.sin(ang) * dip
      const ex = tx + Math.cos(ang) * len
      const ey = ty + Math.sin(ang) * len

      // stitches left by clicks
      for (let i = stitches.length - 1; i >= 0; i--) {
        const s = stitches[i]
        const age = (now - s.born) / 1200
        if (age >= 1) {
          stitches.splice(i, 1)
          continue
        }
        ctx.strokeStyle = THREAD
        ctx.globalAlpha = 1 - age
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(s.x - Math.cos(s.a) * 7, s.y - Math.sin(s.a) * 7)
        ctx.lineTo(s.x + Math.cos(s.a) * 7, s.y + Math.sin(s.a) * 7)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // the thread: pinned at the eye, verlet for the rest
      thread[0].x = thread[0].px = ex
      thread[0].y = thread[0].py = ey
      for (let i = 1; i < SEGMENTS; i++) {
        const p = thread[i]
        const vx = (p.x - p.px) * 0.94
        const vy = (p.y - p.py) * 0.94
        p.px = p.x
        p.py = p.y
        p.x += vx
        p.y += vy + 1400 * dt * dt
      }
      for (let k = 0; k < 8; k++) {
        for (let i = 1; i < SEGMENTS; i++) {
          const a = thread[i - 1]
          const b = thread[i]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.hypot(dx, dy) || 1
          const diff = (d - SEG_LEN) / d
          if (i === 1) {
            b.x -= dx * diff
            b.y -= dy * diff
          } else {
            a.x += dx * diff * 0.5
            a.y += dy * diff * 0.5
            b.x -= dx * diff * 0.5
            b.y -= dy * diff * 0.5
          }
        }
      }
      ctx.strokeStyle = THREAD
      ctx.lineWidth = 1.7
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(thread[0].x, thread[0].y)
      for (let i = 1; i < SEGMENTS - 1; i++) {
        const mx = (thread[i].x + thread[i + 1].x) / 2
        const my = (thread[i].y + thread[i + 1].y) / 2
        ctx.quadraticCurveTo(thread[i].x, thread[i].y, mx, my)
      }
      ctx.stroke()

      // the needle over its thread
      const nx = Math.cos(ang)
      const ny = Math.sin(ang)
      const ox = -ny
      const oy = nx
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1
      const g = ctx.createLinearGradient(tx + ox * 2, ty + oy * 2, tx - ox * 2, ty - oy * 2)
      g.addColorStop(0, '#f4f6f8')
      g.addColorStop(0.5, '#a9b0b8')
      g.addColorStop(1, '#5f666e')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(ex + ox * 1.9 - nx * 2, ey + oy * 1.9 - ny * 2)
      ctx.quadraticCurveTo(ex + nx * 3, ey + ny * 3, ex - ox * 1.9 - nx * 2, ey - oy * 1.9 - ny * 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      // the eye
      ctx.fillStyle = 'rgba(30,30,34,0.85)'
      ctx.beginPath()
      ctx.ellipse(ex - nx * 4, ey - ny * 4, 2.6, 0.75, ang, 0, Math.PI * 2)
      ctx.fill()
    }
    raf = requestAnimationFrame(frame)

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-needle')
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return <canvas ref={cv} className="needle" aria-hidden />
}
