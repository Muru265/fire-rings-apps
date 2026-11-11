import { useState } from 'react'
import { fmt } from '../lib/api'

/** gap: why this slot has no value (e.g. "not enough satellite data (Jan 2012)") — drawn as an empty hatched slot (#83) */
export interface Bar { label: string; value: number | null; color?: string; hollow?: boolean; note?: string; gap?: string }

/** Plain SVG bar chart with hover readout and a "View as table" toggle (no chart library). */
export default function Bars({ bars, height = 180, unit, caption }: { bars: Bar[]; height?: number; unit: string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0))
  const W = 1000, M = 22
  const bw = (W - 8) / Math.max(1, bars.length)
  const step = Math.ceil(bars.length / 12)
  const hv = hover != null ? bars[hover] : null
  return (
    <figure style={{ margin: 0 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <figcaption className="small muted">{caption}</figcaption>
        <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setTable((t) => !t)}>{table ? 'View as chart' : 'View as table'}</button>
      </div>
      {table ? (
        <div className="scroll" style={{ maxHeight: 260, marginTop: 6 }}><table><thead><tr><th>Period</th><th className="r">{unit}</th><th>Note</th></tr></thead>
          <tbody>{bars.map((b) => <tr key={b.label}><td className="num">{b.label}</td><td className="num r">{fmt(b.value)}</td><td className="small faint">{b.gap ?? b.note ?? ''}</td></tr>)}</tbody></table></div>
      ) : (
        <svg viewBox={`0 0 ${W} ${height + M}`} width="100%" role="img" aria-label={caption} style={{ display: 'block', marginTop: 6 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <pattern id="bar-gap-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="var(--faint)" strokeWidth="2" />
            </pattern>
          </defs>
          {bars.map((b, i) => {
            if (b.gap) return (
              <g key={b.label} onMouseEnter={() => setHover(i)} data-testid="bar-gap" data-label={b.label}>
                <title>{`${b.label}: ${b.gap}`}</title>
                <rect x={4 + i * bw} y={0} width={bw} height={height} fill="transparent" />
                <rect x={4 + i * bw + bw * 0.12} y={height * 0.72} width={bw * 0.76} height={height * 0.28} fill="url(#bar-gap-hatch)" stroke="var(--border)" strokeDasharray="4 3" strokeWidth={1.5} />
                <text x={4 + i * bw + bw / 2} y={height * 0.72 - 6} textAnchor="middle" fontSize={16} fill="var(--faint)" fontFamily="var(--mono)">n/a</text>
                {i % step === 0 && <text x={4 + i * bw + bw / 2} y={height + 16} textAnchor="middle" fontSize={20} fill="var(--faint)" fontFamily="var(--mono)">{b.label}</text>}
              </g>
            )
            const h = b.value == null ? 0 : (b.value / max) * height
            return (
              <g key={b.label} onMouseEnter={() => setHover(i)}>
                <rect x={4 + i * bw} y={0} width={bw} height={height} fill="transparent" />
                <rect x={4 + i * bw + bw * 0.12} y={height - h} width={bw * 0.76} height={h} rx={2}
                  fill={b.hollow ? 'transparent' : b.color ?? 'var(--harm)'} stroke={b.hollow ? b.color ?? 'var(--harm)' : 'none'} strokeWidth={2}
                  opacity={hover != null && hover !== i ? 0.55 : 1} />
                {i % step === 0 && <text x={4 + i * bw + bw / 2} y={height + 16} textAnchor="middle" fontSize={20} fill="var(--faint)" fontFamily="var(--mono)">{b.label}</text>}
              </g>
            )
          })}
        </svg>
      )}
      <p className="small muted" style={{ minHeight: 20 }} aria-live="polite">{hv ? (hv.gap ? <><b style={{ color: 'var(--text)' }}>{hv.label}</b> · {hv.gap}</> : <><b style={{ color: 'var(--text)' }}>{hv.label}</b> · <span className="num">{fmt(hv.value)}</span> {unit}{hv.note ? ` · ${hv.note}` : ''}</>) : 'Hover a bar for its value.'}</p>
    </figure>
  )
}
