// #93 star look + twinkle timing (shared by the main app's Stars and its unit test; copied verbatim to the companion).
/** star diameters in CSS px: most 1.5–2 px, ~5% "bright" 3 px stars with a soft glow */
export const STAR = { dMin: 1.5, dMax: 2, dBright: 3, brightShare: 0.05, aMin: 0.6, aMax: 0.85, fullFadeShare: 0.4 }
/** each event lasts 0.8–2 s; gaps of 8–20 s between a star's events → ~9% of stars twinkle at any moment */
export const TWINKLE = { durMin: 800, durMax: 2000, gapMin: 8000, gapMax: 20000 }
/** share of stars inside an event at a random moment (mean duration ÷ mean cycle) */
export const twinkleShare = () => {
  const d = (TWINKLE.durMin + TWINKLE.durMax) / 2, g = (TWINKLE.gapMin + TWINKLE.gapMax) / 2
  return d / (d + g)
}
/** absolute alpha through one twinkle event, p ∈ [0, 1]: rise to pure 1.0 first, then dip (fully off when `fullFade`,
 *  else to 30% of the base) and come back to the base alpha */
export const twinkle = (p: number, base: number, fullFade: boolean) => {
  if (p <= 0 || p >= 1) return base
  if (p < 0.25) return base + (1 - base) * Math.sin((Math.PI / 2) * (p / 0.25))            // base → 1.0
  if (p < 0.4) return 1 - (1 - base) * ((p - 0.25) / 0.15)                                 // 1.0 → base
  const low = fullFade ? 0 : base * 0.3
  return low + (base - low) * (0.5 + 0.5 * Math.cos((2 * Math.PI * (p - 0.4)) / 0.6))       // base → low → base
}
