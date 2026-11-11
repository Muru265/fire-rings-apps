import { cellToBoundary } from 'h3-js'
import { useMemo, useState } from 'react'
import Bars from '../components/Bars'
import { AppPage } from '../components/Shell'
import { EMBED, MONTHS, fmt, fr, get, ord, useGet } from '../lib/api'
import type { RegionDoc } from '../lib/api'
import { useEffect } from 'react'

// NASA GIBS layer (name and time range checked in the WMS GetCapabilities, 11 Nov 2026: 1980-01 → 2026-08, monthly)
const LAYER = 'MERRA2_Total_Aerosol_Optical_Thickness_550nm_Extinction_Monthly'
const LAYER_LAST = '2026-08'
const BOX: [number, number, number, number] = [73.8, 27.6, 77.6, 32.6]

export default function Smoke() {
  const doc = useGet<RegionDoc>(fr('/data/v1/regions/punjab.json'))
  return (
    <AppPage id="smoke" title="Smoke-season tracker · Punjab–Haryana" who="For air-quality and health teams"
      decision="How big is this October–November crop-burning season compared with the past 25, and where were the fires?"
      limit="Shows detected fire and a NASA aerosol layer side by side — a visual link only. No claims about smoke exposure or health. Fire-days are MODIS-equivalent; recent seasons may be undercounted (detection-time caveat)."
      open="/r/punjab?from=2025-10&to=2025-11">
      {doc.status === 'ready' && <Body doc={doc.data} />}
      {doc.status === 'loading' && <div className="card muted">Loading from Fire Rings…</div>}
      {doc.status === 'error' && <div className="card bad">Could not load: {doc.error}</div>}
    </AppPage>
  )
}

function Body({ doc }: { doc: RegionDoc }) {
  const seasons = useMemo(() => {
    const ys = [...new Set(doc.months.map((m) => m.y))]
    return ys.map((y) => {
      const o = doc.months.find((x) => x.y === y && x.m === 10), n = doc.months.find((x) => x.y === y && x.m === 11)
      const complete = !!(o?.H != null && n?.H != null && !n.flags.includes('mtd') && o.src !== 'T')
      return { y, total: o?.H != null && n?.H != null ? o.H + n.H : o?.H ?? null, complete, partial: !!n?.flags.includes('mtd') || n?.H == null }
    }).filter((s) => s.total != null)
  }, [doc])
  const full = seasons.filter((s) => s.complete)
  const last = full[full.length - 1]
  const rank = last ? 1 + full.filter((s) => s.total! > last.total!).length : null
  const s21 = full.find((s) => s.y === 2021)
  const cur = seasons[seasons.length - 1]
  return (
    <>
      <section className="card" data-testid="smoke-headline">
        <p className="eyebrow">Oct–Nov season, fire-days (MODIS-equivalent)</p>
        {last && <p className="big" style={{ marginTop: 6 }}>Oct–Nov {last.y}: <span className="num">{fmt(last.total)}</span> fire-days — {rank === full.length ? 'the lowest' : `${ord(rank!)} highest`} of {full.length} complete seasons.</p>}
        {s21 && last && last.y > 2021 && <p className="muted" style={{ marginTop: 6 }}>Since 2021 (<span className="num">{fmt(s21.total)}</span>) detected fire-days are down <b className="num" style={{ color: 'var(--text)' }}>{Math.round((1 - last.total! / s21.total!) * 100)}%</b>.</p>}
        {cur && !cur.complete && <p className="small muted" style={{ marginTop: 4 }}>{cur.y} so far (incomplete): <span className="num">{fmt(cur.total)}</span> fire-days.</p>}
        {doc.caveats?.overpass_timing && <p className="small warn" style={{ marginTop: 6 }}>⚑ {doc.caveats.overpass_timing}</p>}
      </section>
      <section className="card">
        <Bars caption="Oct + Nov fire-days per season (hollow = incomplete)" unit="fire-days"
          bars={seasons.map((s) => ({ label: String(s.y), value: s.total, hollow: !s.complete, note: s.complete ? undefined : 'incomplete' }))} />
      </section>
      <AerosolMap doc={doc} />
    </>
  )
}

function AerosolMap({ doc }: { doc: RegionDoc }) {
  const [y, setY] = useState(2025)
  const [m, setM] = useState(11)
  const [open, setOpen] = useState(!EMBED)
  const [hex, setHex] = useState<{ id: string; v: number }[] | null>(null)
  const ok = `${y}-${String(m).padStart(2, '0')}` <= LAYER_LAST
  useEffect(() => {
    if (!open) return
    let alive = true
    setHex(null)
    Promise.all([get<string[]>(fr('/data/v1/hexes/punjab/cells.json')), get<{ m: number[][] }>(fr(`/data/v1/hexes/punjab/${y}.json`))]).then(([ids, yf]) => {
      if (!alive) return
      const arr = yf.m[m - 1] ?? []
      const out: { id: string; v: number }[] = []
      for (let i = 0; i < arr.length; i += 2) out.push({ id: ids[arr[i]], v: arr[i + 1] })
      setHex(out)
    }).catch(() => alive && setHex([]))
    return () => { alive = false }
  }, [open, y, m])
  const W = 640, H = Math.round(W * (BOX[3] - BOX[1]) / (BOX[2] - BOX[0]))
  const px = (lon: number) => ((lon - BOX[0]) / (BOX[2] - BOX[0])) * W
  const py = (lat: number) => ((BOX[3] - lat) / (BOX[3] - BOX[1])) * H
  const wms = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${LAYER}&STYLES=&CRS=EPSG:4326&BBOX=${BOX[1]},${BOX[0]},${BOX[3]},${BOX[2]}&WIDTH=${W}&HEIGHT=${H}&FORMAT=image/png&TRANSPARENT=true&TIME=${y}-${String(m).padStart(2, '0')}-01`
  const wv = `https://worldview.earthdata.nasa.gov/?v=${BOX[0] - 1},${BOX[1] - 1},${BOX[2] + 1},${BOX[3] + 1}&l=${LAYER},Coastlines_15m&t=${y}-${String(m).padStart(2, '0')}-15-T00:00:00Z`
  const max = Math.max(1, ...(hex ?? []).map((h) => h.v))
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow">NASA aerosol (MERRA-2 monthly) under the fire hexagons</p>
          <p className="small muted">Aerosol optical thickness at 550 nm from NASA GIBS; dots = hexagons with fire that month (bigger = more fire-days, raw counts).</p>
        </div>
        <div className="row">
          <select value={m} onChange={(e) => setM(Number(e.target.value))} aria-label="Month">{[10, 11].map((x) => <option key={x} value={x}>{MONTHS[x - 1]}</option>)}</select>
          <select value={y} onChange={(e) => setY(Number(e.target.value))} aria-label="Year">{doc.hex_years.filter((x) => x <= 2026).map((x) => <option key={x}>{x}</option>)}</select>
        </div>
      </div>
      {!open ? (
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>Open map</button>
      ) : (
        <div style={{ position: 'relative', marginTop: 10, maxWidth: W }}>
          {ok ? <img src={wms} alt={`NASA MERRA-2 aerosol optical thickness, ${MONTHS[m - 1]} ${y}, Punjab box`} width={W} height={H} style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--surface-2)', borderRadius: 8 }} data-testid="gibs-img" />
            : <div className="small muted" style={{ aspectRatio: `${W}/${H}`, background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>The NASA aerosol layer is published to {LAYER_LAST}; pick an earlier month.</div>}
          <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            {(hex ?? []).map((h) => {
              const b = cellToBoundary(h.id)
              const [la, lo] = b.reduce((a, p) => [a[0] + p[0] / b.length, a[1] + p[1] / b.length], [0, 0])
              return <circle key={h.id} cx={px(lo)} cy={py(la)} r={1 + 3.5 * Math.sqrt(h.v / max)} fill="#FF7A45" fillOpacity={0.85} stroke="#0A0E14" strokeWidth={0.4} />
            })}
          </svg>
        </div>
      )}
      <p className="small" style={{ marginTop: 8 }}><a href={wv} target="_blank" rel="noreferrer" data-testid="worldview-link">See {MONTHS[m - 1]} {y} on NASA Worldview ↗</a> <span className="faint">· Imagery: NASA GIBS / Worldview, MERRA-2 (GMAO).</span></p>
    </section>
  )
}
