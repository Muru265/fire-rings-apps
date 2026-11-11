import { useMemo } from 'react'
import { AppPage } from '../components/Shell'
import { EMBED, fmt, fr, useGet } from '../lib/api'

interface SensorRec { detected: boolean; first_detection: string | null; lag_days: number | null; detections: number; volcano_flagged: number; detection_days: number; pre30_detections: number | null }
interface Eruption { gvp_eruption_number: number; start: string; end: string; area: string | null; source: string; url: string; sensors: { modis: SensorRec | null; viirs: SensorRec | null } }
interface SumS { eruptions_in_period: number; detected: number; median_lag_days: number | null; pre30_eruptions_tested: number; pre30_eruptions_with_detections: number }
interface Reunion {
  name: string; first_day: string; last_day: string; coverage: string; note: string; eruption_list: string
  sources: { detections: string; eruptions: string; eruptions_url: string }
  summary: { modis: SumS; viirs: SumS; both: { eruptions: number; detection_days_modis: number; detection_days_viirs: number; detections_modis: number; detections_viirs: number } }
  eruptions: Eruption[]
  series: Record<'modis' | 'viirs', { detections: (number | null)[]; available: [string, string] }>
}

export default function Volcano() {
  const d = useGet<Reunion>(fr('/data/v1/api/reunion.json'))
  return (
    <AppPage id="volcano" title="Volcano ground-truth check · Piton de la Fournaise" who="For volcano observatories and scientists"
      decision="Do the fire satellites see every eruption of Réunion’s volcano, how fast, and do old and new sensors agree once put on one scale?"
      limit="Not an eruption forecast. Eruption dates come from the Smithsonian Global Volcanism Program; each eruption links to its source. Satellite detections are heat at overpass times only."
      open="/proof">
      {d.status === 'loading' && <div className="card muted">Loading from Fire Rings…</div>}
      {d.status === 'error' && <div className="card warn" data-testid="volcano-pending">The Réunion series is not published yet (eruption list pending). {d.error}</div>}
      {d.status === 'ready' && <Body d={d.data} />}
    </AppPage>
  )
}

const day = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86_400_000

function Body({ d }: { d: Reunion }) {
  const W = 1000, LH = EMBED ? 40 : 70
  const d0 = day(d.first_day), d1 = day(d.last_day)
  const x = (t: number) => ((t - d0) / (d1 - d0)) * W
  const lanes = useMemo(() => (['modis', 'viirs'] as const).map((k) => {
    const arr = d.series[k].detections
    const px = new Array(W).fill(null) as (number | null)[]
    arr.forEach((v, i) => { if (v == null) return; const j = Math.min(W - 1, Math.floor((i / arr.length) * W)); px[j] = Math.max(px[j] ?? 0, v) })
    const max = Math.max(1, ...px.map((v) => v ?? 0))
    return { k, px, max }
  }), [d])
  const s = d.summary
  const pre = (k: 'modis' | 'viirs') => s[k].pre30_eruptions_tested
    ? `${s[k].pre30_eruptions_with_detections} of ${s[k].pre30_eruptions_tested}` : 'not testable'
  return (
    <>
      <section className="card" data-testid="volcano-summary">
        <div className="kpis">
          <div className="kpi">MODIS saw<b>{s.modis.detected} / {s.modis.eruptions_in_period}</b>eruptions in its period</div>
          <div className="kpi">VIIRS saw<b>{s.viirs.detected} / {s.viirs.eruptions_in_period}</b>eruptions since 2012</div>
          <div className="kpi">Median first-detection lag<b>{s.modis.median_lag_days ?? '—'} d · {s.viirs.median_lag_days ?? '—'} d</b>MODIS · VIIRS</div>
          <div className="kpi">Same eruptions, detection-days<b>{fmt(s.both.detection_days_modis)} · {fmt(s.both.detection_days_viirs)}</b>MODIS · VIIRS ({s.both.eruptions} eruptions)</div>
        </div>
        <p style={{ marginTop: 12 }} data-testid="volcano-pretest"><b>Any extra heat in the 30 days before each eruption?</b> MODIS: {pre('modis')} eruptions had detections in the 30 days before (outside other eruptions); VIIRS: {pre('viirs')}. {s.modis.pre30_eruptions_with_detections + s.viirs.pre30_eruptions_with_detections === 0 ? 'No pre-eruption heat was detected — these sensors give no early warning here.' : 'Detections before an eruption were found in some cases; check each one below before reading anything into them.'}</p>
        <p className="small muted" style={{ marginTop: 6 }}>Detection-days = days with ≥1 detection, the same presence logic Fire Rings uses to put old and new sensors on one scale. VIIRS’s finer pixels give many more detections per day (detections on the same eruptions: MODIS {fmt(s.both.detections_modis)}, VIIRS {fmt(s.both.detections_viirs)}).</p>
      </section>
      <section className="card">
        <p className="eyebrow">Daily detections per sensor · shaded = GVP eruption periods</p>
        <svg viewBox={`0 0 ${W} ${2 * LH + 30}`} width="100%" role="img" aria-label="Daily detections per sensor with eruption periods" style={{ display: 'block', marginTop: 8 }} data-testid="volcano-timeline">
          {d.eruptions.map((e) => <rect key={e.gvp_eruption_number} x={x(day(e.start))} width={Math.max(2, x(day(e.end) + 1) - x(day(e.start)))} y={0} height={2 * LH + 6} fill="var(--accent)" opacity={0.18}><title>{`${e.start} → ${e.end}`}</title></rect>)}
          {lanes.map((l, li) => (
            <g key={l.k} transform={`translate(0 ${li * (LH + 6)})`}>
              <text x={4} y={12} fontSize={12} fill="var(--muted)" fontFamily="var(--mono)">{l.k === 'modis' ? 'MODIS' : 'VIIRS'} (max {l.max}/day)</text>
              {l.px.map((v, i) => v ? <rect key={i} x={i} width={1.2} y={LH - (v / l.max) * (LH - 16)} height={(v / l.max) * (LH - 16)} fill={l.k === 'modis' ? 'var(--modis)' : 'var(--viirs)'} /> : null)}
              <line x1={0} x2={W} y1={LH} y2={LH} stroke="var(--border)" />
            </g>
          ))}
          {Array.from({ length: Math.floor((d1 - d0) / 365.25 / 5) + 1 }, (_, i) => 2001 + i * 5).map((yr) => (
            <text key={yr} x={Math.max(22, x(day(`${yr}-01-01`)))} y={2 * LH + 26} fontSize={12} fill="var(--faint)" fontFamily="var(--mono)" textAnchor="middle">{yr}</text>
          ))}
        </svg>
        <p className="tiny faint" style={{ marginTop: 4 }}>{d.coverage}</p>
      </section>
      {!EMBED && (
        <section className="card">
          <p className="eyebrow">Every eruption ({d.eruptions.length}) · detections / detection-days / first-detection lag</p>
          <div className="scroll" style={{ marginTop: 8 }}>
            <table data-testid="volcano-table">
              <thead><tr><th>GVP period</th><th>MODIS</th><th>VIIRS</th><th>30 days before (M · V)</th><th>Source</th></tr></thead>
              <tbody>{d.eruptions.map((e) => {
                const f = (v: SensorRec | null) => v == null ? <span className="faint">no data</span> : v.detected ? <span className="num">{fmt(v.detections)} / {v.detection_days} d / {v.lag_days! >= 0 ? `+${v.lag_days}` : v.lag_days} d</span> : <span className="bad">not detected</span>
                return (
                  <tr key={e.gvp_eruption_number}>
                    <td className="num">{e.start} → {e.end}</td><td>{f(e.sensors.modis)}</td><td>{f(e.sensors.viirs)}</td>
                    <td className="num">{e.sensors.modis?.pre30_detections ?? '—'} · {e.sensors.viirs?.pre30_detections ?? '—'}</td>
                    <td><a href={e.url} target="_blank" rel="noreferrer" title={e.source}>GVP #{e.gvp_eruption_number}</a></td>
                  </tr>)
              })}</tbody>
            </table>
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>{d.note} Detections: {d.sources.detections}.</p>
        </section>
      )}
    </>
  )
}
