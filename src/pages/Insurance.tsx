import { useMemo, useState } from 'react'
import RegionPick from '../components/RegionPick'
import { AppPage } from '../components/Shell'
import type { Hero } from '../components/Shell'
import { Shield } from '../components/Icons'
import { EMBED, MONTHS, REGIONS, fmt, fr, quantile, useGet } from '../lib/api'

type Row = [number, number, number | null, number | null, number | null, number | null, number | null, number | null, string, string]
interface Series { name: string; baseline: [number, number]; months: Row[]; note: string }
const Y0 = 2003, Y1 = 2025

export default function Insurance() {
  const [region, setRegion] = useState('punjab')
  const [p, setP] = useState(90)
  const s = useGet<Series>(fr(`/data/v1/api/series/${region}.json`))
  return (
    <AppPage id="insurance" title="Fire index for insurance" who="For insurers and disaster funds · parametric index (pays on a measured index, not on loss)"
      decision="Which months would have paid out under a simple “fire-days above the usual” trigger — and would the satellite switch in 2012 have triggered false payouts?"
      limit="Illustrative index only, not an insurance product. Area-level (~36 km² cells), satellite heat detections — heat ≠ damage. Trigger = month above the chosen percentile of the same calendar month in 2003–2022."
      open={`/r/${region}`} icon={<Shield />} picker={<RegionPick value={region} onChange={setRegion} />}
      hero={s.status === 'ready' ? insHero(s.data, p, region) : null} error={s.status === 'error' ? s.error : null}>
      <div className="card row">
        <label className="f" style={{ minWidth: 260 }}>Trigger: month above the <b className="num" style={{ color: 'var(--text)' }}>{p}th</b> percentile
          <input type="range" min={50} max={99} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label="Trigger percentile" data-testid="ins-slider" /></label>
      </div>
      {s.status === 'ready' && <Body s={s.data} p={p} />}
    </AppPage>
  )
}

function indexOf(s: Series, p: number) {
    const val = { harm: (x: Row) => x[2], raw: (x: Row) => x[5] }
    const thr: Record<'harm' | 'raw', number[]> = { harm: [], raw: [] }
    for (const k of ['harm', 'raw'] as const)
      for (let m = 1; m <= 12; m++)
        thr[k].push(quantile(s.months.filter((x) => x[1] === m && x[0] >= s.baseline[0] && x[0] <= s.baseline[1] && val[k](x) != null).map((x) => val[k](x)!), p / 100))
    const cells = s.months.filter((x) => x[0] >= Y0 && x[0] <= Y1).map((x) => ({
      y: x[0], m: x[1],
      harm: x[2] != null && x[2] > thr.harm[x[1] - 1], raw: x[5] != null && x[5] > thr.raw[x[1] - 1], H: x[2], raw_v: x[5],
    }))
    const c = (f: (x: typeof cells[number]) => boolean) => cells.filter(f).length
    return { cells, thr, nH: c((x) => x.harm), nR: c((x) => x.raw), rawOnly: c((x) => x.raw && !x.harm && x.y >= 2012), harmOnly: c((x) => x.harm && !x.raw && x.y >= 2012), both: c((x) => x.harm && x.raw) }
}

/** #90 hero wording (values recomputed live from api/series/{region}.json and the slider percentile p):
 *  "With raw satellite data, {x} of {y} payouts would have been triggered by the satellite switch, not by fire."
 *  x = raw-only payout months from 2012 (raw triggers, harmonized does not); y = all raw payout months, 2003–2025.
 *  chips: harmonized payouts · raw payouts · missed by raw (harmonized triggers, raw does not, from 2012). */
function insHero(s: Series, p: number, region: string): Hero {
  const r = indexOf(s, p)
  const name = REGIONS.find((x) => x.id === region)?.name ?? s.name
  return {
    answer: <>With raw satellite data, <span className="num" data-testid="hero-x">{r.rawOnly}</span> of <span className="num" data-testid="hero-y">{r.nR}</span> payouts would have been triggered by the satellite switch, not by fire.</>,
    support: <>{name}, {Y0}–{Y1} · trigger: a month above the {p}th percentile of its 2003–2022 values.</>,
    chips: [['Harmonized payouts', r.nH], ['Raw payouts', r.nR], ['Missed by raw', r.harmOnly]],
  }
}

function Body({ s, p }: { s: Series; p: number }) {
  const r = useMemo(() => indexOf(s, p), [s, p])
  const years = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i)
  const cw = 26, ch = EMBED ? 9 : 14, lx = 40
  return (
    <>
      <section className="card">
        <div className="kpis">
          <div className="kpi">Payout months · harmonized<b data-testid="ins-harm">{r.nH}</b></div>
          <div className="kpi">Payout months · raw data<b data-testid="ins-raw">{r.nR}</b></div>
          <div className="kpi">Raw-only payouts after 2012<b className="warn" data-testid="ins-rawonly">{r.rawOnly}</b>the satellite switch, not fire</div>
          <div className="kpi">Missed by raw after 2012<b>{r.harmOnly}</b>real highs raw data hides</div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>{Y0}–{Y1}. Raw data put new-satellite counts (VIIRS, from 2012) on the same scale as old-satellite counts, so their “usual” is mixed and later years look inflated. Harmonized data convert VIIRS to MODIS-equivalent.</p>
      </section>
      <section className="card">
        <div className="row small" style={{ marginBottom: 8 }}>
          <span className="legend"><span className="sw" style={{ background: 'var(--harm)' }} /> harmonized trigger (top half)</span>
          <span className="legend"><span className="sw" style={{ background: 'var(--raw)' }} /> raw trigger (bottom half)</span>
          <span className="legend"><span className="sw" style={{ background: 'var(--surface-3)' }} /> no payout</span>
        </div>
        <div className="scroll">
          <svg viewBox={`0 0 ${lx + 12 * cw} ${16 + years.length * (ch + 2)}`} width="100%" style={{ maxWidth: 520, display: 'block' }} role="img" aria-label="Payout months, harmonized vs raw, by year and month" data-testid="ins-timeline">
            {MONTHS.map((mn, i) => <text key={mn} x={lx + i * cw + cw / 2} y={11} fontSize={9} textAnchor="middle" fill="var(--faint)" fontFamily="var(--mono)">{mn[0]}</text>)}
            {years.map((y, yi) => (
              <g key={y} transform={`translate(0 ${16 + yi * (ch + 2)})`}>
                <text x={lx - 6} y={ch - 2} fontSize={EMBED ? 8 : 10} textAnchor="end" fill={y === 2012 ? 'var(--text)' : 'var(--faint)'} fontFamily="var(--mono)">{y}</text>
                {Array.from({ length: 12 }, (_, i) => {
                  const c = r.cells.find((x) => x.y === y && x.m === i + 1)
                  return (
                    <g key={i}>
                      <title>{`${MONTHS[i]} ${y}: harmonized ${fmt(c?.H)} (${c?.harm ? 'payout' : 'no'}) · raw ${fmt(c?.raw_v)} (${c?.raw ? 'payout' : 'no'})`}</title>
                      <rect x={lx + i * cw + 1} y={0} width={cw - 2} height={ch / 2} fill={c?.harm ? 'var(--harm)' : 'var(--surface-3)'} />
                      <rect x={lx + i * cw + 1} y={ch / 2} width={cw - 2} height={ch / 2} fill={c?.raw ? 'var(--raw)' : 'var(--surface-2)'} />
                    </g>
                  )
                })}
                {y === 2012 && <line x1={lx} x2={lx + 12 * cw} y1={-1} y2={-1} stroke="var(--muted)" strokeDasharray="3 2" />}
              </g>
            ))}
          </svg>
        </div>
        <p className="tiny faint" style={{ marginTop: 6 }}>Dashed line: 2012, when VIIRS joined. Hover a cell for both values.</p>
      </section>
    </>
  )
}
