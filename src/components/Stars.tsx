import { useEffect, useRef } from 'react'
import { STAR, TWINKLE, twinkle } from '../lib/twinkle'

/** Animated starfield behind the page. #93: stars are clearly visible (1.5–2 px, ~5% bright 3 px ones with a soft
 *  glow, base opacity 0.6–0.85, pure white). Every star now and then runs one 0.8–2 s twinkle (up to full 1.0, then a
 *  dip that fades some stars fully off and back); gaps are spaced so ~9% of stars twinkle at any moment. Very slow
 *  drift. ≤30 fps, paused when the tab is hidden, a single static frame under prefers-reduced-motion.
 *  Fixed, behind everything, pointer-events: none. */
export default function Stars({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    if (!g) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, last = 0
    type S = { x: number; y: number; r: number; bright: boolean; a: number; full: boolean; start: number; dur: number }
    const gap = () => TWINKLE.gapMin + Math.random() * (TWINKLE.gapMax - TWINKLE.gapMin)
    const dur = () => TWINKLE.durMin + Math.random() * (TWINKLE.durMax - TWINKLE.durMin)
    let stars: S[] = []
    const seed = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round((w * h) / 6500 * density)
      stars = Array.from({ length: n }, () => {
        const bright = Math.random() < STAR.brightShare
        return {
          x: Math.random() * w, y: Math.random() * h, bright,
          r: (bright ? STAR.dBright : STAR.dMin + Math.random() * (STAR.dMax - STAR.dMin)) / 2,
          a: STAR.aMin + Math.random() * (STAR.aMax - STAR.aMin), full: Math.random() < STAR.fullFadeShare,
          start: performance.now() + Math.random() * gap(), dur: dur(),
        }
      })
    }
    const draw = (t: number) => {
      g.clearRect(0, 0, w, h)
      g.fillStyle = '#FFFFFF'
      for (const s of stars) {
        let a = s.a
        if (!reduce && t >= s.start) {
          const p = (t - s.start) / s.dur
          if (p >= 1) { s.start = t + gap(); s.dur = dur(); s.full = Math.random() < STAR.fullFadeShare } else a = twinkle(p, s.a, s.full)
        }
        if (!reduce) { s.x += 0.004; if (s.x > w) s.x = 0 }
        if (a <= 0.01) continue
        // soft glow: every star gets a faint halo (survives video compression); bright stars a stronger, wider one
        const hr = s.r * (s.bright ? 3.2 : 2.4)
        const halo = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr)
        halo.addColorStop(0, `rgba(255,255,255,${(s.bright ? 0.45 : 0.22) * a})`); halo.addColorStop(1, 'rgba(255,255,255,0)')
        g.globalAlpha = 1; g.fillStyle = halo
        g.beginPath(); g.arc(s.x, s.y, hr, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#FFFFFF'
        g.globalAlpha = Math.min(1, a)
        g.beginPath(); g.arc(s.x, s.y, s.r + 0.3, 0, Math.PI * 2); g.fill()   // +0.3 px offsets anti-aliasing loss
      }
      g.globalAlpha = 1
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
