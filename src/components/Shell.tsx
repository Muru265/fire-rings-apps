import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { BASE, EMBED, FIRE_RINGS, setPage } from '../lib/api'
import Inspector from './Inspector'

export const APPS = [
  { path: '/expect', n: 1, title: 'What to expect', who: 'Land managers, firefighters', q: 'Will this month be quieter or busier than usual?', color: '#2F6B3A', bg: '#F3EFE0' },
  { path: '/factcheck', n: 2, title: 'Fact-check a season', who: 'Journalists, scientists', q: 'Was that really the worst fire season on record?', color: '#A8231B', bg: '#F4F1EA' },
  { path: '/insurance', n: 3, title: 'Fire index for insurance', who: 'Insurers, disaster funds', q: 'Would a satellite switch have triggered false payouts?', color: '#1F3F8F', bg: '#F4F6FA' },
  { path: '/smoke', n: 4, title: 'Smoke-season tracker', who: 'Air-quality and health teams', q: 'How big is Punjab’s crop-burning season this year?', color: '#9A3C0D', bg: '#E6E1DA' },
  { path: '/volcano', n: 5, title: 'Volcano ground-truth check', who: 'Observatories, scientists', q: 'Do fire satellites see every eruption of Réunion’s volcano?', color: '#FF7A2E', bg: '#1C1A1F' },
  { path: '/land', n: 6, title: 'Land & loan screening', who: 'Banks, buyers, supply chains', q: 'Has this area had more fire than normal lately?', color: '#2C5A86', bg: '#FFFFFF' },
]

export function Header() {
  if (EMBED) return null
  return (
    <header className="top">
      <div className="in">
        <Link to="/" className="brand"><img src="/favicon.svg" alt="" width={22} height={22} />Fire Rings Apps <small>· built on the Fire Rings open API</small></Link>
        <nav className="apps" aria-label="Apps">
          {APPS.map((a) => <NavLink key={a.path} to={a.path} className={({ isActive }) => (isActive ? 'active' : '')}>{a.n} · {a.title}</NavLink>)}
        </nav>
      </div>
    </header>
  )
}

/** Page theme: CSS variables on body[data-theme] (styles.css). */
export function useTheme(id: string) {
  useEffect(() => {
    document.documentElement.dataset.theme = id
    return () => { delete document.documentElement.dataset.theme }
  }, [id])
}

export interface Hero {
  /** ONE big answer sentence, numbers from the API */
  answer: ReactNode
  /** one short supporting line */
  support?: ReactNode
  /** 2–3 small fact chips: [label, value] */
  chips?: [string, ReactNode][]
  /** optional block right under the answer (verdict stamp, asterisk caveat) */
  extra?: ReactNode
}

const KEY = (id: string) => `fra.showData.${id}`
function readOpen(id: string) { try { return localStorage.getItem(KEY(id)) === '1' } catch { return false } }
function writeOpen(id: string, v: boolean) { try { localStorage.setItem(KEY(id), v ? '1' : '0') } catch { /* private mode */ } }

/** #90 One app page: hero answer card → "Show the data ▾" (all previous charts, tables, controls, collapsed) → footer
 *  (credit + API inspector, always visible). Embed mode (?embed=1): only the hero card + "Open full app ↗". */
export function AppPage({ id, title, who, decision, limit, open, icon, picker, hero, error, credit, children }: {
  id: string; title: string; who: string; decision: string; limit: ReactNode; open: string
  icon: ReactNode; picker?: ReactNode; hero: Hero | null; error?: string | null; credit?: ReactNode; children: ReactNode
}) {
  setPage(id)
  useTheme(id)
  useEffect(() => { document.title = `${title} · Fire Rings Apps` }, [title])
  const [show, setShow] = useState(() => readOpen(id))
  const toggle = () => setShow((v) => { writeOpen(id, !v); return !v })
  const full = `${location.origin}${location.pathname}`
  return (
    <main className="wrap stack app" data-page={id} style={{ paddingTop: EMBED ? 0 : 20 }}>
      <section className="hero" data-testid="hero" aria-labelledby={`${id}-ans`}>
        {picker && <div className="pick">{picker}</div>}
        <div className="ico">{icon}</div>
        <div style={{ minWidth: 0 }}>
          <h1 className="ttl">{title}<span className="hide-embed"> · {who.replace(/^For /, 'for ')}</span></h1>
          {hero ? (
            <>
              <p className="ans" id={`${id}-ans`} data-testid="hero-answer">{hero.answer}</p>
              {hero.extra}
              {hero.support && <p className="sup" data-testid="hero-support">{hero.support}</p>}
              {hero.chips && hero.chips.length > 0 && (
                <div className="chips" data-testid="hero-chips">{hero.chips.map(([l, v]) => <span key={l} className="chip">{l} <b>{v}</b></span>)}</div>
              )}
            </>
          ) : <p className="ans" id={`${id}-ans`} data-testid="hero-loading">{error ? `Could not load from Fire Rings (${error}).` : 'Loading from Fire Rings…'}</p>}
        </div>
        <a className="openfull" href={full} target="_blank" rel="noreferrer" data-testid="open-full">Open full app ↗</a>
      </section>
      {!EMBED && (
        <>
          <button className="btn showdata" onClick={toggle} aria-expanded={show} aria-controls={`${id}-data`} data-testid="show-data">
            {show ? 'Hide the data ▴' : 'Show the data ▾'}</button>
          {show && (
            <div id={`${id}-data`} className="stack" data-testid="data-section">
              <p className="muted" style={{ maxWidth: 760 }}><b className="faint">{who}. Their decision:</b> {decision}</p>
              {children}
              <p className="limit" data-testid="limit">{limit}</p>
              <p className="small"><a href={`${FIRE_RINGS}${open}`} target="_blank" rel="noreferrer">Open in Fire Rings ↗</a></p>
            </div>
          )}
          <footer className="foot stack">
            <p className="small faint" data-testid="credit">Data: {BASE.replace(/^https?:\/\//, '')} (NASA FIRMS MODIS + VIIRS, harmonized){credit ? <> · {credit}</> : ''}. Planning example, not an emergency service.</p>
            <Inspector page={id} />
          </footer>
        </>
      )}
    </main>
  )
}
