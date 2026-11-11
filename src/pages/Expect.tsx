import { useState } from 'react'
import { AppPage } from '../components/Shell'
import { MONTHS, fmt, fr, useGet } from '../lib/api'
import RegionPick from '../components/RegionPick'

interface Checkpoint { day: number; n_years: number; mdape_projection: number; mdape_typical: number; better: 'projection' | 'typical'; range_factor: [number, number] | null }
interface Proj {
  name: string; data_end: string; baseline: [number, number]; unit: string
  months: { m: number; typical: number | null; p10: number | null; p90: number | null; guard?: boolean; note?: string; checkpoints: Checkpoint[] }[]
  current: { y: number; m: number; days: number; so_far: number; typical: number | null; p10: number | null; p90: number | null; projection: number | null; checkpoint: number | null; range: [number, number] | null; better: string; reason: string | null } | null
  next_month: { y: number; m: number; typical: number | null; p10: number | null; p90: number | null } | null
}

export default function Expect() {
  const [region, setRegion] = useState('punjab')
  const p = useGet<Proj>(fr(`/data/v1/api/projection/${region}.json`))
  return (
    <AppPage id="expect" title="What to expect this month" who="For land managers and firefighters"
      decision="How busy will the rest of this month be, and what is normal for next month — for rosters, patrols and equipment."
      limit="Projection from the month so far and 20 years of history — not a weather-based forecast. Values are satellite fire-days (MODIS-equivalent, ~36 km² cells), not burned area."
      open={`/r/${region}`}>
      <RegionPick value={region} onChange={setRegion} />
      {p.status === 'loading' && <div className="card muted">Loading from Fire Rings…</div>}
      {p.status === 'error' && <div className="card bad">Could not load: {p.error}</div>}
      {p.status === 'ready' && <Body d={p.data} />}
    </AppPage>
  )
}

function Body({ d }: { d: Proj }) {
  const c = d.current
  const mo = c ? d.months[c.m - 1] : null
  const cp = c && mo ? mo.checkpoints.find((x) => x.day === c.checkpoint) : null
  const useProj = !!(c && c.better === 'projection' && c.projection != null)
  return (
    <>
      {c && (
        <section className="card" data-testid="expect-headline">
          <p className="eyebrow">{MONTHS[c.m - 1]} {c.y} · day {c.days} of the record · provisional data</p>
          {useProj ? (
            <>
              <p className="big" style={{ marginTop: 8 }}>On current pace: about <span className="num" data-testid="expect-main">{fmt(c.projection)}</span> fire-days{c.range ? <> (range <span className="num">{fmt(c.range[0])}–{fmt(c.range[1])}</span>)</> : ''}.</p>
              {cp && <p className="muted" style={{ marginTop: 6 }}>Past accuracy at day {cp.day}: <b className="num" style={{ color: 'var(--text)' }}>±{Math.round(cp.mdape_projection)}%</b> for this projection vs <span className="num">±{Math.round(cp.mdape_typical)}%</span> for “typical” (median error, {cp.n_years} years tested).</p>}
              <p className="small faint" style={{ marginTop: 6 }}>Typical {MONTHS[c.m - 1]}: <span className="num">{fmt(c.typical)}</span> fire-days (P10–P90 <span className="num">{fmt(c.p10)}–{fmt(c.p90)}</span>). So far: <span className="num">{fmt(c.so_far)}</span>.</p>
            </>
          ) : (
            <>
              <p className="big" style={{ marginTop: 8 }}>{c.reason === 'too little fire to project' ? 'Too little fire to project' : 'Too early to project'} — using typical: about <span className="num" data-testid="expect-main">{fmt(c.typical)}</span> fire-days (P10–P90 <span className="num">{fmt(c.p10)}–{fmt(c.p90)}</span>).</p>
              {cp && <p className="muted" style={{ marginTop: 6 }}>At day {cp.day}, “typical” missed by <b className="num" style={{ color: 'var(--text)' }}>±{Math.round(cp.mdape_typical)}%</b> in past years vs ±{Math.round(cp.mdape_projection)}% for the projection, so typical is shown.{c.projection != null ? <> The pace-based projection would be <span className="num">{fmt(c.projection)}</span>.</> : ''}</p>}
              <p className="small faint" style={{ marginTop: 6 }}>So far: <span className="num">{fmt(c.so_far)}</span> fire-days in {c.days} days.</p>
            </>
          )}
        </section>
      )}
      <div className="grid2">
        {d.next_month && (
          <section className="card">
            <p className="eyebrow">Next month · {MONTHS[d.next_month.m - 1]} {d.next_month.y}</p>
            <p className="big" style={{ marginTop: 6 }}>Typical: <span className="num" data-testid="expect-next">{fmt(d.next_month.typical)}</span> fire-days</p>
            <p className="muted small">Usual range (P10–P90 of {d.baseline[0]}–{d.baseline[1]}): <span className="num">{fmt(d.next_month.p10)}–{fmt(d.next_month.p90)}</span>.</p>
          </section>
        )}
        {mo && mo.checkpoints.length > 0 && (
          <section className="card">
            <p className="eyebrow">How well each method did · {MONTHS[mo.m - 1]}</p>
            <table style={{ marginTop: 8 }}>
              <thead><tr><th>Day</th><th className="r">Projection</th><th className="r">Typical</th><th>Better</th></tr></thead>
              <tbody>{mo.checkpoints.map((x) => (
                <tr key={x.day} style={x.day === c?.checkpoint ? { background: 'var(--surface-2)' } : undefined}>
                  <td className="num">{x.day}</td><td className="num r">±{Math.round(x.mdape_projection)}%</td><td className="num r">±{Math.round(x.mdape_typical)}%</td>
                  <td className="small">{x.better}</td></tr>))}</tbody>
            </table>
            <p className="tiny faint" style={{ marginTop: 6 }}>Median absolute error vs the real full month, each baseline year left out in turn.</p>
          </section>
        )}
        {mo?.guard && <section className="card small muted">{mo.note}</section>}
      </div>
    </>
  )
}

