import { useEffect, useRef } from 'react'

/** Animated starfield behind the page. Twinkle clearly visible but calm (same as the main app, #79): every star now and
 *  then runs one 1.5–3 s event (brighten to 1.4×, then a full fade out and back in); gaps of 20–90 s, so ~4% of stars
 *  twinkle at any moment; very slow drift. ≤30 fps, paused when the tab is hidden, a single static frame under
 *  prefers-reduced-motion. Fixed, behind everything, pointer-events: none. */
export default function Stars({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    if (!g) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, last = 0
    type S = { x: number; y: number; r: number; a: number; start: number; dur: number }
    const gap = () => 20000 + Math.random() * 70000
    const dur = () => 1500 + Math.random() * 1500
    const twinkle = (p: number) => (p < 0.2 ? 1 + 0.4 * Math.sin((Math.PI * p) / 0.2) : 0.5 + 0.5 * Math.cos((2 * Math.PI * (p - 0.2)) / 0.8))
    let stars: S[] = []
    const seed = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round((w * h) / 6500 * density)
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() < 0.92 ? 0.4 + Math.random() * 0.6 : 1 + Math.random() * 0.5,
        a: 0.25 + Math.random() * 0.45, start: performance.now() + Math.random() * gap(), dur: dur(),
      }))
    }
    const draw = (t: number) => {
      g.clearRect(0, 0, w, h)
      for (const s of stars) {
        let a = s.a
        if (!reduce && t >= s.start) {
          const p = (t - s.start) / s.dur
          if (p >= 1) { s.start = t + gap(); s.dur = dur() } else a = Math.min(1, a * twinkle(p))
        }
        if (!reduce) { s.x += 0.004; if (s.x > w) s.x = 0 }
        g.globalAlpha = Math.max(0, a)
        g.fillStyle = s.r > 1 ? '#FFE9D6' : '#DCE6F5'
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill()
      }
    }
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 33) return
      last = t
      draw(t)
    }
    seed()
    if (reduce) draw(0)
    else raf = requestAnimationFrame(loop)
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(loop) }
    const onResize = () => { seed(); draw(performance.now()) }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize) }
  }, [density])
  return <canvas ref={ref} className="stars" aria-hidden="true" style={{ width: '100%', height: '100%' }} />
}
