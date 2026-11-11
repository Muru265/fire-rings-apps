import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { BASE, EMBED, FIRE_RINGS, setPage } from '../lib/api'
import Inspector from './Inspector'

export const APPS = [
  { path: '/expect', n: 1, title: 'What to expect', who: 'Land managers, firefighters' },
  { path: '/factcheck', n: 2, title: 'Fact-check a season', who: 'Journalists, scientists' },
  { path: '/insurance', n: 3, title: 'Fire index for insurance', who: 'Insurers, disaster funds' },
  { path: '/smoke', n: 4, title: 'Smoke-season tracker', who: 'Air-quality and health teams' },
  { path: '/volcano', n: 5, title: 'Volcano ground-truth check', who: 'Observatories, scientists' },
  { path: '/land', n: 6, title: 'Land & loan screening', who: 'Banks, buyers, supply chains' },
]

export function Header() {
  if (EMBED) return null
  return (
    <header className="top">
      <div className="in">
        <Link to="/" className="brand"><img src="/favicon.svg" alt="" width={22} height={22} />FIRE RINGS APPS <small>Built on the Fire Rings open API</small></Link>
        <nav className="apps" aria-label="Apps">
          {APPS.map((a) => <NavLink key={a.path} to={a.path} className={({ isActive }) => (isActive ? 'active' : '')}>{a.n} · {a.title}</NavLink>)}
        </nav>
      </div>
    </header>
  )
}

/** One app page: who → their decision → live widget → limit line → "Open in Fire Rings". */
export function AppPage({ id, title, who, decision, limit, open, children }: { id: string; title: string; who: string; decision: string; limit: ReactNode; open: string; children: ReactNode }) {
  setPage(id)
  useEffect(() => { document.title = `${title} · Fire Rings Apps` }, [title])
  return (
    <main className="wrap stack" data-page={id}>
      <div style={{ paddingTop: EMBED ? 0 : 24 }}>
        {!EMBED && <p className="eyebrow">{who}</p>}
        <h1 style={{ fontSize: EMBED ? 17 : 32, marginTop: EMBED ? 0 : 6 }}>{title}</h1>
        {!EMBED && <p className="muted" style={{ marginTop: 6, maxWidth: 760 }}><b className="faint">Their decision:</b> {decision}</p>}
      </div>
      {children}
      <p className="limit hide-embed" data-testid="limit">{limit}</p>
      <div className="row hide-embed small">
        <a href={`${FIRE_RINGS}${open}`} target="_blank" rel="noreferrer">Open in Fire Rings ↗</a>
        <span className="faint">Data: {BASE.replace(/^https?:\/\//, '')} (NASA FIRMS MODIS + VIIRS, harmonized)</span>
      </div>
      <Inspector page={id} />
    </main>
  )
}
