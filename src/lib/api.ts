// Every number in this app arrives here: plain HTTP GETs to the Fire Rings open API (and public NASA services).
// Each call is recorded for the API inspector and, when embedded in the Fire Rings control room, reported to the parent.
import { useEffect, useState, useSyncExternalStore } from 'react'

const qs = new URLSearchParams(location.search)
export const BASE = (qs.get('base') ?? import.meta.env.VITE_FIRE_RINGS_BASE ?? 'https://fire-rings.vercel.app').replace(/\/$/, '')
export const EMBED = qs.get('embed') === '1'
export const FIRE_RINGS = 'https://fire-rings.vercel.app'
const PARENTS = [FIRE_RINGS, 'http://localhost:4179', 'http://localhost:5173', 'http://localhost:4173']

export interface Call { id: number; method: string; url: string; status: number | null; size: number | null; ms: number | null; ok: boolean | null; at: string; page: string }
let calls: Call[] = []
let nextId = 1
let refresh = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
let currentPage = 'home'
export const setPage = (p: string) => { currentPage = p }

function report(c: Call | undefined) {
  if (!c || !EMBED || window.parent === window) return
  let target = FIRE_RINGS
  try { const r = document.referrer ? new URL(document.referrer).origin : ''; if (PARENTS.includes(r)) target = r } catch { /* default */ }
  window.parent.postMessage({ source: 'fire-rings-apps', page: c.page, lastCallAt: c.at, ok: !!c.ok, url: c.url, status: c.status }, target)
}

const cache = new Map<string, Promise<unknown>>()

/** GET a JSON (or text) URL, recorded in the inspector. The same URL is fetched once per "Run again" cycle. */
export function get<T>(url: string, kind: 'json' | 'text' = 'json'): Promise<T> {
  const key = `${refresh}|${kind}|${url}`
  const hit = cache.get(key)
  if (hit) return hit as Promise<T>
  const c: Call = { id: nextId++, method: 'GET', url, status: null, size: null, ms: null, ok: null, at: new Date().toISOString(), page: currentPage }
  calls = [c, ...calls].slice(0, 80)
  emit()
  const t0 = performance.now()
  const upd = (patch: Partial<Call>) => { calls = calls.map((x) => (x.id === c.id ? { ...x, ...patch } : x)); emit(); report(calls.find((x) => x.id === c.id)) }
  const p = fetch(url).then(async (r) => {
    const text = await r.text()
    upd({ status: r.status, size: new Blob([text]).size, ms: Math.round(performance.now() - t0), ok: r.ok })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (kind === 'json' ? JSON.parse(text) : text) as T
  }).catch((e: Error) => {
    if (calls.find((x) => x.id === c.id)?.ok == null) upd({ ok: false, ms: Math.round(performance.now() - t0) })
    cache.delete(key)
    throw e
  })
  cache.set(key, p)
  return p
}

/** Fire Rings URL from a path. */
export const fr = (path: string) => `${BASE}${path}`

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const useCalls = (): Call[] => useSyncExternalStore(subscribe, () => calls)
export const useRefresh = (): number => useSyncExternalStore(subscribe, () => refresh)
export function runAgain() { refresh++; emit() }

export type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }
export function useGet<T>(url: string | null, kind: 'json' | 'text' = 'json'): Load<T> {
  const r = useRefresh()
  const [s, set] = useState<Load<T>>({ status: 'loading' })
  useEffect(() => {
    if (!url) return
    let alive = true
    set({ status: 'loading' })
    get<T>(url, kind).then((d) => alive && set({ status: 'ready', data: d })).catch((e: Error) => alive && set({ status: 'error', error: e.message }))
    return () => { alive = false }
  }, [url, r, kind])
  return s
}

export const REGIONS = [
  { id: 'punjab', name: 'Punjab–Haryana' },
  { id: 'madagascar', name: 'Madagascar' },
  { id: 'se_australia', name: 'SE Australia' },
  { id: 'mauritius', name: 'Mauritius' },
]
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
export const fmt = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf0.format(Math.round(v)))
export const fmt1 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : (Math.round(v * 10) / 10).toFixed(1))
/** Linear-interpolated quantile (same convention as numpy's default). */
export function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b)
  if (!s.length) return NaN
  const i = (s.length - 1) * q, lo = Math.floor(i)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo)
}
export const median = (a: number[]) => quantile(a, 0.5)
/** #83: why a year/season has no value, from the published month flags — e.g. "not enough satellite data (Jan 2012)" */
export function gapReason(months: { y: number; m: number; flags: string[] }[]): string | null {
  const bad = months.filter((r) => r.flags.includes('insufficient'))
  return bad.length ? `not enough satellite data (${bad.map((r) => `${MONTHS[r.m - 1]} ${r.y}`).join(', ')})` : null
}
export const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}` }

/** Types of the Fire Rings files we read (subset). */
export interface MonthRec { y: number; m: number; H: number | null; lo: number | null; hi: number | null; raw_modis: number | null; raw_viirs: number | null; cov_modis: number | null; cov_viirs: number | null; src: string; flags: string[] }
export interface RegionDoc {
  id: string; name: string; data_end: string; baseline: [number, number]; bbox: [number, number, number, number]
  months: MonthRec[]; climatology: { median: number[]; p10: number[]; p90: number[] } | null
  annual: { y: number; H: number | null; lo: number | null; hi: number | null; complete?: boolean; rankable?: boolean }[]
  k: { month: number[] }; q: { month: number[] } | null; kprime: { month: number[] } | null
  caveats?: { overpass_timing: string | null }; hex_years: number[]
  geo?: { view_bbox: [number, number, number, number] }
}
