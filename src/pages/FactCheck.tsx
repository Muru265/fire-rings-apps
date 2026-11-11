import { useMemo, useState } from 'react'
import Bars from '../components/Bars'
import type { Bar } from '../components/Bars'
import RegionPick from '../components/RegionPick'
import { AppPage } from '../components/Shell'
import { MONTHS, REGIONS, fmt, fmt1, fr, gapReason, median, ord, useGet } from '../lib/api'
import type { RegionDoc } from '../lib/api'

interface Power { source: string; months: [number, number, number, number][]; points: unknown[] }
const key = (y: number, m: number) => y * 12 + m - 1
const ym = (k: number) => ({ y: Math.floor(k / 12), m: (k % 12) + 1 })
const PRE = 3 // months of weather shown before the season

export default function FactCheck() {
  const [region, setRegion] = useState('se_australia')
  const [start, setStart] = useState(9)
  const [len, setLen] = useState(6)
  const [year, setYear] = useState(2019)
  const doc = useGet<RegionDoc>(fr(`/data/v1/regions/${region}.json`))
  const pow = useGet<Power>(fr(`/data/v1/api/power/${region}.json`))
  return (
    <AppPage id="factcheck" title="Fact-check a season" who="For journalists and scientists"
      decision="Was this season really the worst on record? How did the rain and heat beforehand compare with normal?"
      limit="States what the data show — rank among complete seasons and weather vs normal. It does not say the weather caused the fires. Built on Fire Rings + NASA POWER."
      open={`/r/${region}?from=${year}-${String(start).padStart(2, '0')}&to=${ym(key(year, start) + len - 1).y}-${String(ym(key(year, start) + len - 1).m).padStart(2, '0')}`}>
      <div className="card row">
        <RegionPick value={region} onChange={setRegion} />
        <label className="f">Season starts
          <select value={start} onChange={(e) => setStart(Number(e.target.value))} data-testid="fc-start">{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        <label className="f">Length (months)
          <select value={len} onChange={(e) => setLen(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => <option key={n}>{n}</option>)}</select></label>
        <label className="f">Year it starts
          <input type="number" value={year} min={2003} max={2026} onChange={(e) => setYear(Number(e.target.value))} data-testid="fc-year" /></label>
      </div>
      {doc.status === 'ready' && <Result doc={doc.data} pow={pow.status === 'ready' ? pow.data : null} start={start} len={len} year={year} />}
      {doc.status === 'loading' && <div className="card muted">Loading from Fire Rings…</div>}
      {doc.status === 'error' && <div className="card bad">Could not load: {doc.error}</div>}
    </AppPage>
  )
}

function Result({ doc, pow, start, len, year }: { doc: RegionDoc; pow: Power | null; start: number; len: number; year: number }) {
  const r = useMemo(() => {
    const by = new Map(doc.months.map((x) => [key(x.y, x.m), x]))
    const ok = (k: number) => { const x = by.get(k); return !!x && x.H != null && x.src !== 'T' && !x.flags.includes('mtd') && !x.flags.includes('insufficient') }
    const seasons: { y: number; total: number; lo: number; hi: number }[] = []
    const gaps = new Map<number, string>() // #83: seasons skipped for lack of satellite data keep a labelled slot
    const years = [...new Set(doc.months.map((x) => x.y))]
    for (const y of years) {
      const k0 = key(y, start)
      const ks = Array.from({ length: len }, (_, i) => k0 + i)
      if (!ks.every(ok)) {
        const why = gapReason(ks.map((k) => by.get(k)).filter((x): x is NonNullable<typeof x> => !!x))
        if (why) gaps.set(y, why)
        continue
      }
      seasons.push({ y, total: ks.reduce((a, k) => a + by.get(k)!.H!, 0), lo: ks.reduce((a, k) => a + (by.get(k)!.lo ?? by.get(k)!.H!), 0), hi: ks.reduce((a, k) => a + (by.get(k)!.hi ?? by.get(k)!.H!), 0) })
    }
    const mine = seasons.find((s) => s.y === year) ?? null
    const rank = mine ? 1 + seasons.filter((s) => s.total > mine.total).length : null
    return { seasons, mine, rank, gaps }
  }, [doc, start, len, year])
  const w = useMemo(() => {
    if (!pow) return null
    const pm = new Map(pow.months.map(([y, m, rain, t]) => [key(y, m), { rain, t }]))
    const k0 = key(year, start)
    const pre = Array.from({ length: PRE }, (_, i) => k0 - PRE + i)
    if (!pre.every((k) => pm.has(k))) return null
    const rain = pre.reduce((a, k) => a + pm.get(k)!.rain, 0)
    const t = pre.reduce((a, k) => a + pm.get(k)!.t, 0) / PRE
    const base: { rain: number; t: number }[] = []
    for (let y = 2003; y <= 2022; y++) {
      const ks = pre.map((k) => k + (y - year) * 12)
      if (ks.every((k) => pm.has(k))) base.push({ rain: ks.reduce((a, k) => a + pm.get(k)!.rain, 0), t: ks.reduce((a, k) => a + pm.get(k)!.t, 0) / PRE })
    }
    return { pre, rain, t, rainMed: median(base.map((b) => b.rain)), tMed: median(base.map((b) => b.t)), n: base.length }
  }, [pow, start, year])
  const k0 = key(year, start), k1 = k0 + len - 1
  const label = `${MONTHS[start - 1]} ${year}${len > 1 ? ` – ${MONTHS[ym(k1).m - 1]} ${ym(k1).y}` : ''}`
  const name = REGIONS.find((x) => x.id === doc.id)?.name ?? doc.name
  return (
    <>
      <section className="card" data-testid="fc-sentence">
        <p className="eyebrow">{name} · {label}</p>
        {r.mine && r.rank ? (
          <p className="big" style={{ marginTop: 8 }}>
            <span className="num">{fmt(r.mine.total)}</span> fire-days — {r.rank === 1 ? 'the highest' : r.rank === r.seasons.length ? 'the lowest' : `${ord(r.rank)} highest`} of <span className="num">{r.seasons.length}</span> complete seasons ({r.seasons[0].y}–{r.seasons[r.seasons.length - 1].y}).
          </p>
        ) : <p className="big" style={{ marginTop: 8 }}>No complete data for this season yet — pick an earlier year.</p>}
        {r.mine && <p className="muted small" style={{ marginTop: 4 }}>Range <span className="num">{fmt(r.mine.lo)}–{fmt(r.mine.hi)}</span> (sum of the monthly 90% ranges — wider than the true range).</p>}
        {w && (
          <p style={{ marginTop: 10 }} data-testid="fc-weather">
            In the {PRE} months before ({MONTHS[ym(w.pre[0]).m - 1]}–{MONTHS[ym(w.pre[PRE - 1]).m - 1]} {ym(w.pre[PRE - 1]).y}), rainfall was <b className="num">{fmt(w.rain)} mm</b>,
            {' '}<b className="num">{Math.round((w.rain / w.rainMed) * 100)}%</b> of the {w.n}-year median (<span className="num">{fmt(w.rainMed)} mm</span>); mean temperature was <b className="num">{fmt1(w.t)} °C</b> vs <span className="num">{fmt1(w.tMed)} °C</span>.
          </p>
        )}
        {!w && pow && <p className="small faint" style={{ marginTop: 8 }}>NASA POWER weather is not available for the months before this season.</p>}
        <p className="small faint" style={{ marginTop: 8 }}>This states what the data show; it does not show that the weather caused the fires.</p>
      </section>
      <section className="card">
        <Bars caption={`Every complete ${label.replace(/\d{4}/g, '').replace(/\s+–\s+/, '–').trim()} season, fire-days (MODIS-equivalent)`} unit="fire-days"
          bars={r.seasons.length ? Array.from({ length: r.seasons[r.seasons.length - 1].y - r.seasons[0].y + 1 }, (_, i) => r.seasons[0].y + i).map((y): Bar => {
            const s = r.seasons.find((x) => x.y === y)
            if (s) return { label: String(y), value: s.total, color: y === year ? 'var(--accent)' : 'var(--harm)', note: y === year ? 'selected' : undefined }
            return { label: String(y), value: null, gap: r.gaps.get(y) ?? 'no complete data for this season' }
          }) : []} />
      </section>
    </>
  )
}
