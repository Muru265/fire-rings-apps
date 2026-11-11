import { cellToLatLng } from 'h3-js'
import { useEffect, useMemo, useState } from 'react'
import Bars from '../components/Bars'
import RegionPick from '../components/RegionPick'
import { AppPage } from '../components/Shell'
import { EMBED, REGIONS, fmt, fr, get, median, useGet } from '../lib/api'
import type { MonthRec, RegionDoc } from '../lib/api'

type Box = [number, number, number, number]
const DEFAULT_BOX: Record<string, Box> = { punjab: [75.0, 29.8, 76.2, 31.0], madagascar: [46.0, -20.0, 47.0, -19.0], se_australia: [149.0, -36.0, 150.5, -34.5], mauritius: [57.3, -20.5, 57.8, -19.9] }

/** Same conversion as the Fire Rings box view: raw cell-days ÷ coverage × the month's published ratio (q, 1, k, k·k′). */
function factor(doc: RegionDoc, r: MonthRec): number | null {
  const i = r.m - 1
  if (r.src === 'T') return doc.q?.month[i] ?? null
  if (r.src === 'M') return 1
  if (r.src === 'V') return doc.k.month[i] ?? null
  if (r.src === 'V2') return doc.kprime ? doc.k.month[i] * doc.kprime.month[i] : null
  return null
}

export default function Land() {
  const [region, setRegion] = useState('punjab')
  const [mode, setMode] = useState<'region' | 'box'>('region')
  const [box, setBox] = useState<Box>(DEFAULT_BOX.punjab)
  const [inputs, setInputs] = useState(DEFAULT_BOX.punjab.map(String))
  const doc = useGet<RegionDoc>(fr(`/data/v1/regions/${region}.json`))
  const pick = (r: string) => { setRegion(r); setBox(DEFAULT_BOX[r]); setInputs(DEFAULT_BOX[r].map(String)) }
  const apply = () => { const v = inputs.map(Number); if (v.every(Number.isFinite) && v[0] < v[2] && v[1] < v[3]) setBox(v as Box) }
  return (
    <AppPage id="land" title="Land & loan screening" who="For banks, buyers and supply-chain teams"
      decision="Before a loan, a purchase or a sourcing contract: how often has fire been detected in this area, and were recent years worse than normal?"
      limit="Area-level screening (~36 km² cells): satellite heat detections, not damage, not burned area and not ownership. A box uses the region’s calibration; check on the ground before any decision."
      open={`/r/${region}`}>
      <div className="card stack">
        <RegionPick value={region} onChange={pick} />
        <div className="row">
          <div role="group" aria-label="Area" className="row">
            <button className="btn" aria-pressed={mode === 'region'} onClick={() => setMode('region')} style={mode === 'region' ? { borderColor: 'var(--accent)' } : undefined}>Whole region</button>
            <button className="btn" aria-pressed={mode === 'box'} onClick={() => setMode('box')} style={mode === 'box' ? { borderColor: 'var(--accent)' } : undefined} data-testid="land-box">A box (W/S/E/N)</button>
          </div>
          {mode === 'box' && (<>
            {['W', 'S', 'E', 'N'].map((l, i) => <label key={l} className="f">{l} (°)<input type="number" step="0.1" value={inputs[i]} onChange={(e) => setInputs((v) => v.map((x, j) => (j === i ? e.target.value : x)))} /></label>)}
            <button className="btn primary" onClick={apply}>Apply</button>
          </>)}
        </div>
      </div>
      {doc.status === 'ready' && <Report doc={doc.data} box={mode === 'box' ? box : null} />}
      {doc.status === 'loading' && <div className="card muted">Loading from Fire Rings…</div>}
      {doc.status === 'error' && <div className="card bad">Could not load: {doc.error}</div>}
    </AppPage>
  )
}

interface YearVal { y: number; v: number | null; complete: boolean }

function Report({ doc, box }: { doc: RegionDoc; box: Box | null }) {
  const [boxYears, setBoxYears] = useState<{ years: YearVal[]; cells: number } | 'loading' | null>(null)
  useEffect(() => {
    if (!box) { setBoxYears(null); return }
    let alive = true
    setBoxYears('loading')
    ;(async () => {
      const ids = await get<string[]>(fr(`/data/v1/hexes/${doc.id}/cells.json`))
      const keep = ids.map((c) => { const [la, lo] = cellToLatLng(c); return lo >= box[0] && lo <= box[2] && la >= box[1] && la <= box[3] })
      const files = await Promise.all(doc.hex_years.map((y) => get<{ y: number; m: number[][] }>(fr(`/data/v1/hexes/${doc.id}/${y}.json`)).catch(() => ({ y, m: [] as number[][] }))))
      const raw = new Map<string, number>()
      for (const f of files) f.m.forEach((arr, mi) => { let s = 0; for (let i = 0; i < arr.length; i += 2) if (keep[arr[i]]) s += arr[i + 1]; raw.set(`${f.y}-${mi + 1}`, s) })
      const years: YearVal[] = [...new Set(doc.months.map((r) => r.y))].map((y) => {
        const ms = doc.months.filter((r) => r.y === y)
        let sum = 0, ok = ms.length === 12
        for (const r of ms) {
          const cov = r.src === 'T' || r.src === 'M' ? r.cov_modis : r.cov_viirs
          const f = factor(doc, r)
          if (r.flags.includes('insufficient') || cov == null || cov < 0.6 || f == null) { ok = false; continue }
          sum += ((raw.get(`${r.y}-${r.m}`) ?? 0) / cov) * f
          if (r.flags.includes('mtd')) ok = false
        }
        return { y, v: Math.round(sum * 10) / 10, complete: ok }
      })
      if (alive) setBoxYears({ years, cells: keep.filter(Boolean).length })
    })().catch(() => alive && setBoxYears(null))
    return () => { alive = false }
  }, [box, doc])
  const years: YearVal[] | null = useMemo(() => {
    if (box) return boxYears && boxYears !== 'loading' ? boxYears.years : null
    return doc.annual.map((a) => ({ y: a.y, v: a.H, complete: !!a.complete && a.rankable !== false }))
  }, [box, boxYears, doc])
  const name = REGIONS.find((r) => r.id === doc.id)?.name ?? doc.name
  if (box && boxYears === 'loading') return <div className="card muted">Adding up the hexagons inside the box…</div>
  if (!years) return null
  const full = years.filter((y) => y.complete && y.v != null)
  const lastY = full.length ? full[full.length - 1].y : 0
  const last10 = full.filter((y) => y.y > lastY - 10)
  const base = full.filter((y) => y.y >= doc.baseline[0] && y.y <= doc.baseline[1])
  const normal = median(base.map((y) => y.v!))
  const mean10 = last10.reduce((a, y) => a + y.v!, 0) / Math.max(1, last10.length)
  const worst = [...full].sort((a, b) => b.v! - a.v!).slice(0, 3)
  const zeroYears = full.filter((y) => y.v === 0).length
  const area = box ? `box ${box.join(', ')}` : name
  const csv = () => {
    const head = `# Fire Rings Apps · fire history report · ${area} · fire-days (MODIS-equivalent, ~36 km² cells) per year · source ${fr(`/data/v1/regions/${doc.id}.json`)}${box ? ' + hexes' : ''} · screening only: heat detections, not damage or ownership`
    const blob = new Blob([[head, 'year,fire_days,complete', ...years.map((y) => `${y.y},${y.v ?? ''},${y.complete}`)].join('\n') + '\n'], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fire-history_${doc.id}${box ? '_box' : ''}.csv`; a.click()
  }
  return (
    <>
      <section className="card" data-testid="land-report">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">Fire history report · {area}{box && boxYears && boxYears !== 'loading' ? ` · ${boxYears.cells} hexagons` : ''}</p>
          <button className="btn hide-embed" onClick={csv} data-testid="land-csv">Download report (CSV)</button>
        </div>
        {box && boxYears && boxYears !== 'loading' && boxYears.cells === 0 ? <p className="big" style={{ marginTop: 8 }}>No fire hexagons of {name} fall inside this box since 2001.</p> : (
          <div className="kpis" style={{ marginTop: 10 }}>
            <div className="kpi">Last 10 complete years ({lastY - 9}–{lastY})<b data-testid="land-mean10">{fmt(mean10)}</b>fire-days per year (mean)</div>
            <div className="kpi">Normal ({doc.baseline[0]}–{doc.baseline[1]} median)<b>{fmt(normal)}</b>fire-days per year</div>
            <div className="kpi">Last 10 years vs normal<b>{normal > 0 ? `${(mean10 / normal).toFixed(1)}×` : '—'}</b>{mean10 > normal ? 'above' : 'at or below'} normal</div>
            <div className="kpi">Worst years<b style={{ fontSize: 16 }}>{worst.map((w) => w.y).join(' · ')}</b>{worst.map((w) => fmt(w.v)).join(' · ')} fire-days</div>
          </div>
        )}
        {zeroYears > 0 && <p className="small muted" style={{ marginTop: 8 }}>{zeroYears} complete year(s) with no detected fire.</p>}
      </section>
      <section className="card">
        <Bars caption={`Fire-days per year, ${area} (hollow = incomplete year)`} unit="fire-days" height={EMBED ? 110 : 180}
          bars={years.map((y) => ({ label: String(y.y), value: y.v, hollow: !y.complete, note: y.complete ? undefined : 'incomplete' }))} />
      </section>
    </>
  )
}
