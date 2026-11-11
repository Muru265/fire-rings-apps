import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { APPS } from '../components/Shell'
import Inspector from '../components/Inspector'
import { BASE, FIRE_RINGS, fmt, fr, setPage, useGet } from '../lib/api'

interface Meta { data_end: string; regions: { id: string; name: string; months: number }[] }

const DESC: Record<string, string> = {
  '/expect': 'This month: projection from the month so far vs “typical” — whichever tested better in past years. Next month’s usual range.',
  '/factcheck': 'Pick a region and season: rank among complete seasons, plus NASA POWER rain and temperature beforehand vs normal.',
  '/insurance': 'A percentile trigger on harmonized vs raw data, 2003–2025: how many payouts the 2012 satellite switch would fake.',
  '/smoke': 'Punjab’s Oct–Nov burning season vs the past 25, with NASA’s MERRA-2 aerosol layer under the fire hexagons.',
  '/volcano': 'Piton de la Fournaise: did MODIS and VIIRS see each Smithsonian-listed eruption, how fast, and any heat beforehand?',
  '/land': 'Region or box → fire history report: fire-days per year, last 10 years vs normal, worst years, CSV.',
}

export default function Home() {
  setPage('home')
  useEffect(() => { document.title = 'Fire Rings Apps — built on the Fire Rings open API' }, [])
  const meta = useGet<Meta>(fr('/data/v1/meta.json'))
  return (
    <main className="wrap stack" data-page="home">
      <section style={{ paddingTop: 36, maxWidth: 820 }}>
        <p className="eyebrow">Example apps · NASA Space Apps 2026</p>
        <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', marginTop: 8 }}>Six apps built on one open fire record.</h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 17 }}>
          <a href={FIRE_RINGS} target="_blank" rel="noreferrer">Fire Rings</a> harmonizes 25 years of NASA FIRMS fire detections (MODIS 2000→, VIIRS 2012→) into one consistent monthly record and publishes it as an open API.
          This separate site imports none of its code: <b style={{ color: 'var(--text)' }}>every number on these pages comes from {BASE.replace(/^https?:\/\//, '')} over HTTP</b> — open the inspector at the bottom of any page to see each call.
        </p>
        {meta.status === 'ready' && <p className="small faint" style={{ marginTop: 8 }} data-testid="home-meta">Live from the API: {meta.data.regions.length} regions, {fmt(meta.data.regions.reduce((a, r) => a + r.months, 0))} region-months, data through {meta.data.data_end}.</p>}
      </section>
      <section className="tiles" aria-label="Apps">
        {APPS.map((a) => (
          <Link key={a.path} to={a.path} className="card tile" data-testid="app-tile">
            <p className="eyebrow">{a.n} · {a.who}</p>
            <h2 style={{ fontSize: 20, marginTop: 6 }}>{a.title}</h2>
            <p className="small muted" style={{ marginTop: 6 }}>{DESC[a.path]}</p>
          </Link>
        ))}
      </section>
      <p className="small faint">Fire detections: NASA FIRMS (MODIS C6.1, VIIRS 375 m) via Fire Rings. Weather: NASA POWER. Imagery: NASA GIBS / Worldview. Eruption dates: Smithsonian Global Volcanism Program. Planning examples, not emergency services; no forecasts.</p>
      <Inspector page="home" />
    </main>
  )
}
