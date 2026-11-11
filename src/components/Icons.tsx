// #90 Original, simple SVG drawings for each app (made for this project from basic shapes — no copied artwork or marks).
import type { ReactElement } from 'react'
// Each icon has role="img" and a title, and carries meaning in words elsewhere on the card (never colour alone).

const S = { width: '100%', height: '100%', display: 'block' } as const

/** App 1 — calendar page with a small flame. */
export function CalendarFlame() {
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label="Calendar with a small flame">
      <rect x="14" y="22" width="92" height="84" rx="10" fill="#FFFDF6" stroke="#2F6B3A" strokeWidth="4" />
      <rect x="14" y="22" width="92" height="22" rx="10" fill="#2F6B3A" />
      <rect x="14" y="36" width="92" height="8" fill="#2F6B3A" />
      <rect x="34" y="12" width="8" height="20" rx="4" fill="#1F2A1C" />
      <rect x="78" y="12" width="8" height="20" rx="4" fill="#1F2A1C" />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={26 + c * 18} y={54 + r * 16} width="11" height="9" rx="2" fill="#D8D0B6" />))}
      <path d="M76 100c-12 0-19-8-19-17 0-10 8-14 10-24 6 5 6 11 5 15 4-2 6-6 6-10 7 6 17 13 17 21 0 9-8 15-19 15z" fill="#C2562A" />
      <path d="M76 100c-6 0-9-4-9-8 0-5 4-7 5-11 3 3 4 6 3 8 3-1 4-3 4-5 3 3 6 6 6 9 0 4-4 7-9 7z" fill="#F2B14A" />
    </svg>
  )
}

/** App 2 — magnifying glass over a newspaper column. */
export function Magnifier() {
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label="Magnifying glass over a newspaper">
      <rect x="10" y="14" width="74" height="92" rx="3" fill="#FBFAF6" stroke="#111" strokeWidth="3" />
      <rect x="20" y="24" width="54" height="8" fill="#111" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="20" y={42 + i * 9} width={i % 3 === 2 ? 34 : 54} height="3.5" fill="#6b655b" />)}
      <circle cx="74" cy="66" r="22" fill="#FFFFFF" fillOpacity=".55" stroke="#111" strokeWidth="6" />
      <rect x="88" y="82" width="10" height="30" rx="5" transform="rotate(-45 93 97)" fill="#A8231B" />
    </svg>
  )
}

/** App 3 — shield (policy) with a small flame mark. */
export function Shield() {
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label="Shield">
      <path d="M60 10l40 14v30c0 28-18 46-40 56C38 100 20 82 20 54V24z" fill="#1F3F8F" />
      <path d="M60 20l30 10.5V54c0 22-13 36-30 45-17-9-30-23-30-45V30.5z" fill="none" stroke="#C9A227" strokeWidth="3" />
      <path d="M60 82c-9 0-14-6-14-13 0-8 7-11 8-18 5 4 5 9 4 12 3-1 5-5 5-8 5 5 11 9 11 15 0 7-6 12-14 12z" fill="#C9A227" />
    </svg>
  )
}

/** App 4 — hazy cloud over a warm sun (smoke season). */
export function HazeCloud() {
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label="Hazy cloud over a warm sun">
      <circle cx="78" cy="44" r="22" fill="#E8915A" />
      <circle cx="78" cy="44" r="30" fill="#E8915A" fillOpacity=".25" />
      <path d="M26 92c-10 0-16-7-16-15s7-15 16-15c2-12 12-20 24-20 11 0 20 7 23 17 2-1 5-1 7-1 11 0 19 8 19 18s-8 16-19 16z" fill="#8E9299" />
      <path d="M30 86c-7 0-11-4-11-9s5-9 11-9c2-9 9-15 19-15 9 0 16 6 18 14 2-1 4-1 6-1 8 0 13 5 13 11s-5 9-13 9z" fill="#B7BAC0" />
      {[0, 1, 2].map((i) => <rect key={i} x={20 + i * 8} y={100 + i * 6} width={70 - i * 16} height="3" rx="1.5" fill="#A6A29A" />)}
    </svg>
  )
}

/** App 5 — volcano cone with a softly glowing lava top (glow pauses under reduced motion via CSS). */
export function Volcano() {
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label="Volcano with glowing lava">
      <defs>
        <radialGradient id="lava" cx="50%" cy="40%" r="50%">
          <stop offset="0" stopColor="#FFD08A" /><stop offset=".5" stopColor="#FF7A2E" /><stop offset="1" stopColor="#FF7A2E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="lava-glow" cx="60" cy="34" r="30" fill="url(#lava)" />
      <path d="M8 108L46 40h28l38 68z" fill="#3A3238" />
      <path d="M46 40h28l-6 10-8-6-8 8-6-12z" fill="#FF7A2E" />
      <path d="M58 44c2 14-4 24 0 38" stroke="#FF7A2E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M64 46c-1 10 5 16 2 28" stroke="#FFB36B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M8 108h104" stroke="#5a5058" strokeWidth="3" />
    </svg>
  )
}

/** App 6 — traffic light; the lit lamp is chosen by the answer (words next to it say which). */
export function TrafficLight({ level }: { level: 'below' | 'about' | 'above' | null }) {
  const on = (k: string, c: string) => (level === k ? c : '#D5DAE0')
  return (
    <svg viewBox="0 0 120 120" style={S} role="img" aria-label={`Traffic light: ${level ?? 'no value'}`}>
      <rect x="38" y="6" width="44" height="108" rx="12" fill="#1C2632" />
      <circle cx="60" cy="28" r="12" fill={on('above', '#D64545')} />
      <circle cx="60" cy="60" r="12" fill={on('about', '#E2A93B')} />
      <circle cx="60" cy="92" r="12" fill={on('below', '#2E9E5B')} />
    </svg>
  )
}

/** Home tile thumbnails reuse the same drawings. */
export const ICONS: Record<string, () => ReactElement> = {
  '/expect': CalendarFlame, '/factcheck': Magnifier, '/insurance': Shield, '/smoke': HazeCloud, '/volcano': Volcano,
  '/land': () => <TrafficLight level="about" />,
}
