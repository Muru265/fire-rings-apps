import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { APPS, useTheme } from '../components/Shell'
import { ICONS } from '../components/Icons'
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
  useTheme('home')
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
        {APPS.map((a) => {
          const Icon = ICONS[a.path]
          const dark = a.path === '/volcano'
          // #90: each tile in its app's own colours + icon + the one question it answers (text ≥ 4.5:1 on the tile)
          return (
            <Link key={a.path} to={a.path} className="card tile" data-testid="app-tile" title={DESC[a.path]}
              style={{ background: a.bg, borderColor: a.color, borderWidth: 2, color: dark ? '#F3EDE7' : '#1A1A1A', display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 64, height: 64 }}><Icon /></span>
              <span>
                <span className="eyebrow" style={{ color: dark ? '#CBC1B7' : '#3A3A3A' }}>{a.n} · {a.title}</span>
                <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 19, fontWeight: 700, lineHeight: 1.25, marginTop: 4 }}>{a.q}</span>
                <span style={{ display: 'block', fontSize: 12.5, marginTop: 4, color: dark ? '#CBC1B7' : '#3A3A3A' }}>For {a.who.toLowerCase()}</span>
              </span>
            </Link>
          )
        })}
      </section>
      <p className="small faint">Fire detections: NASA FIRMS (MODIS C6.1, VIIRS 375 m) via Fire Rings. Weather: NASA POWER. Imagery: NASA GIBS / Worldview. Eruption dates: Smithsonian Global Volcanism Program. Planning examples, not emergency services; no forecasts.</p>
      <Inspector page="home" />
    </main>
  )
}
