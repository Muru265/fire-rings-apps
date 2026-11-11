import { useEffect, useRef } from 'react'

/** Subtle animated starfield behind the page. Many tiny stars; ~12% twinkle (fade out/in over 3–8 s, so some switch off
 *  while others switch on); very slow drift. ≤30 fps, paused when the tab is hidden, a single static frame under
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
    type S = { x: number; y: number; r: number; a: number; tw: boolean; period: number; phase: number }
    let stars: S[] = []
    const seed = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round((w * h) / 6500 * density)
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() < 0.92 ? 0.4 + Math.random() * 0.6 : 1 + Math.random() * 0.5,
        a: 0.25 + Math.random() * 0.45, tw: Math.random() < 0.12, period: 3000 + Math.random() * 5000, phase: Math.random() * 10000,
      }))
    }
    const draw = (t: number) => {
      g.clearRect(0, 0, w, h)
      for (const s of stars) {
        let a = s.a
        if (s.tw && !reduce) a *= 0.5 + 0.5 * Math.sin(((t + s.phase) / s.period) * Math.PI * 2)
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
