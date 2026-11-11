// Playwright checks for Fire Rings Apps (Round 5A, #90): every page opens with a hero answer card above the fold (360 + 1280 px)
// whose sentence carries the numbers recomputed here from the same Fire Rings API JSON; "Show the data" reveals the old charts;
// the API inspector is visible; embed mode shows only the card; hero text contrast ≥ 4.5:1 from the page's CSS variables.
// Usage: npm run build && node scripts/e2e.mjs [--screens]   (screens → ../PROJECT/docs/screens/apps_r5_*)
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(process.env.SCREENS_DIR ?? resolve(here, '../../PROJECT/docs/screens'))
mkdirSync(out, { recursive: true })
const PORT = 4180
const API = 'https://fire-rings.vercel.app'
const shots = process.argv.includes('--screens')
const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: resolve(here, '..'), stdio: 'ignore', shell: process.platform === 'win32' })
for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}`); break } catch { await new Promise((r) => setTimeout(r, 200)) } }
const base = `http://localhost:${PORT}`
let failed = 0
const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? ` — ${info}` : ''}`); if (!ok) failed++ }

// ---- expected hero numbers, recomputed from the API (same rules as the pages' comments) -------------------------------
const J = async (p) => (await fetch(`${API}${p}`)).json()
const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const fmt = (v) => nf.format(Math.round(v))
const q = (vs, p) => { const s = [...vs].sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo) }
const expected = {}
{
  const p = await J('/data/v1/api/projection/punjab.json'), c = p.current
  expected.expect = c.better === 'projection' && c.projection != null
    ? [c.projection < c.p10 ? 'quieter than usual' : c.projection > c.p90 ? 'busier than usual' : 'about usual', fmt(c.projection)]
    : ['Typical for', fmt(c.typical)]
}
{
  const d = await J('/data/v1/regions/se_australia.json'), key = (y, m) => y * 12 + m - 1
  const by = new Map(d.months.map((x) => [key(x.y, x.m), x]))
  const ok = (k) => { const x = by.get(k); return !!x && x.H != null && x.src !== 'T' && !x.flags.includes('mtd') && !x.flags.includes('insufficient') }
  const seasons = [...new Set(d.months.map((x) => x.y))].map((y) => { const ks = Array.from({ length: 6 }, (_, i) => key(y, 9) + i); return ks.every(ok) ? { y, t: ks.reduce((a, k) => a + by.get(k).H, 0) } : null }).filter(Boolean)
  const mine = seasons.find((s) => s.y === 2019), rank = 1 + seasons.filter((s) => s.t > mine.t).length
  expected.factcheck = [rank === 1 ? `1st of ${seasons.length} seasons` : `ranked ${rank} of ${seasons.length}`]
}
{
  const s = await J('/data/v1/api/series/punjab.json')
  const thr = (c) => Array.from({ length: 12 }, (_, m) => q(s.months.filter((x) => x[1] === m + 1 && x[0] >= s.baseline[0] && x[0] <= s.baseline[1] && x[c] != null).map((x) => x[c]), 0.9))
  const tH = thr(2), tR = thr(5), cells = s.months.filter((x) => x[0] >= 2003 && x[0] <= 2025)
  const raw = (x) => x[5] != null && x[5] > tR[x[1] - 1], harm = (x) => x[2] != null && x[2] > tH[x[1] - 1]
  expected.insurance = [`${cells.filter((x) => raw(x) && !harm(x) && x[0] >= 2012).length} of ${cells.filter(raw).length} payouts`]
}
{
  const d = await J('/data/v1/regions/punjab.json')
  const full = [...new Set(d.months.map((m) => m.y))].map((y) => {
    const o = d.months.find((x) => x.y === y && x.m === 10), n = d.months.find((x) => x.y === y && x.m === 11)
    return o?.H != null && n?.H != null && !n.flags.includes('mtd') && o.src !== 'T' ? { y, t: o.H + n.H } : null
  }).filter(Boolean)
  const last = full.at(-1)
  expected.smoke = [`Oct–Nov ${last.y}`, `in ${full.length} years`]
  const yrs = d.annual.filter((a) => a.complete && a.rankable !== false && a.H != null), lastY = yrs.at(-1).y
  const l10 = yrs.filter((a) => a.y > lastY - 10), normal = q(yrs.filter((a) => a.y >= d.baseline[0] && a.y <= d.baseline[1]).map((a) => a.H), 0.5)
  const r = l10.reduce((a, x) => a + x.H, 0) / l10.length / normal
  expected.land = [r < 0.8 ? 'Below normal' : r > 1.2 ? 'Above normal' : 'About normal', `${r.toFixed(1)}× normal`]
}
{
  const s = (await J('/data/v1/api/reunion.json')).summary
  expected.volcano = [`${s.modis.detected} of ${s.modis.eruptions_in_period} eruptions`, `${s.viirs.detected} of ${s.viirs.eruptions_in_period}`]
}

// old content that "Show the data" must reveal
const PAGES = [
  ['expect', '/expect', '[data-testid="expect-headline"], [data-testid="expect-next"]'],
  ['factcheck', '/factcheck', '[data-testid="fc-sentence"]'],
  ['insurance', '/insurance', '[data-testid="ins-harm"]'],
  ['smoke', '/smoke', '[data-testid="smoke-headline"]'],
  ['volcano', '/volcano', '[data-testid="volcano-summary"]'],
  ['land', '/land', '[data-testid="land-report"]'],
]
const lum = (hex) => { let h = hex.replace('#', ''); if (h.length === 3) h = [...h].map((x) => x + x).join(''); const c = h.match(/../g).map((x) => parseInt(x, 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, r) => r - p); return (x + 0.05) / (y + 0.05) }

const browser = await chromium.launch()
try {
  for (const [w, h, tag] of [[1280, 800, '1280'], [360, 800, '360']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    for (const [id, path, oldSel] of PAGES) {
      await page.goto(`${base}${path}`, { waitUntil: 'load' })
      const ans = page.getByTestId('hero-answer')
      await ans.waitFor({ timeout: 30000 }).catch(() => {})
      const box = await ans.boundingBox()
      check(`${tag} ${id}: hero answer above the fold`, !!box && box.y + box.height <= h, box ? `bottom ${Math.round(box.y + box.height)} of ${h}` : 'no hero')
      const heroTxt = (await page.getByTestId('hero').innerText().catch(() => '')).replace(/\s+/g, ' ')
      const miss = expected[id].filter((e) => !heroTxt.toLowerCase().includes(e.toLowerCase()))
      check(`${tag} ${id}: hero carries the API numbers (${expected[id].join(' | ')})`, miss.length === 0, miss.length ? `missing ${miss.join(', ')} in: ${heroTxt.slice(0, 140)}` : '')
      if (tag === '360') {
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
        check(`360 ${id}: no horizontal scroll`, sw <= cw + 1, `${sw} vs ${cw}`)
      } else {
        // contrast of hero text from the page's CSS variables (answer = --text, support = --muted, on both gradient stops)
        const v = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return ['--text', '--muted', '--hero-a', '--hero-b', '--surface'].map((k) => s.getPropertyValue(k).trim()) })
        const worst = Math.min(...[v[0], v[1]].flatMap((f) => [v[2] || v[4], v[3] || v[4]].map((b) => ratio(f, b))))
        check(`contrast ${id}: hero text ≥ 4.5:1 (worst ${worst.toFixed(2)})`, worst >= 4.5)
        check(`${id}: data collapsed by default`, (await page.getByTestId('data-section').count()) === 0)
      }
      if (shots) await page.screenshot({ path: resolve(out, `apps_r5_${id}_${tag}.png`) })
      await page.getByTestId('show-data').click()
      const old = page.locator(oldSel).first()
      await old.waitFor({ timeout: 20000 }).catch(() => {})
      check(`${tag} ${id}: "Show the data" reveals the previous charts/tables`, await old.isVisible().catch(() => false))
      await page.locator('[data-testid="api-call"][data-ok="true"]').first().waitFor({ timeout: 20000 }).catch(() => {})
      const okCalls = await page.locator('[data-testid="api-call"][data-ok="true"]').count()
      check(`${tag} ${id}: API inspector visible with ≥1 successful call`, (await page.getByTestId('inspector').isVisible()) && okCalls >= 1, `${okCalls} ok`)
      await page.getByTestId('show-data').click() // close again: the next page starts collapsed for this visitor
    }
    // "Show the data" is remembered per visitor
    await page.goto(`${base}/expect`, { waitUntil: 'load' })
    await page.getByTestId('show-data').click()
    await page.reload({ waitUntil: 'load' })
    check(`${tag}: "Show the data" open state remembered`, await page.getByTestId('data-section').isVisible().catch(() => false))
    await page.getByTestId('show-data').click()
    // home: six tiles with icon + question
    await page.goto(`${base}/`, { waitUntil: 'load' })
    await page.getByTestId('app-tile').first().waitFor({ timeout: 15000 })
    const tiles = await page.getByTestId('app-tile').evaluateAll((els) => els.map((e) => ({ svg: !!e.querySelector('svg'), q: e.innerText.includes('?') })))
    check(`${tag} home: six tiles, each with its icon and question`, tiles.length === 6 && tiles.every((t) => t.svg && t.q))
    if (shots) await page.screenshot({ path: resolve(out, `apps_r5_home_${tag}.png`) })
    // inspector "Run again" refetches
    await page.goto(`${base}/expect`, { waitUntil: 'load' })
    await page.locator('[data-testid="api-call"][data-ok="true"]').first().waitFor({ timeout: 20000 })
    const n0 = await page.locator('[data-testid="api-call"]').count()
    await page.getByTestId('run-again').click()
    await page.waitForTimeout(2500)
    check(`${tag}: Run again makes new calls`, (await page.locator('[data-testid="api-call"]').count()) > n0)
    if (errors.length) { console.log(errors); failed++ }
    await ctx.close()
  }
  // embed mode at the control-room window size: only the hero card + "Open full app ↗"
  {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 300 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    for (const [id, path] of PAGES) {
      await page.goto(`${base}${path}?embed=1`, { waitUntil: 'load' })
      await page.getByTestId('hero-answer').waitFor({ timeout: 30000 }).catch(() => {})
      const only = await page.evaluate(() => ({
        nav: document.querySelectorAll('header.top').length, data: document.querySelectorAll('[data-testid="show-data"]').length,
        insp: document.querySelectorAll('[data-testid="inspector"]').length, pick: [...document.querySelectorAll('[data-testid="region-pick"]')].filter((e) => e.offsetParent).length,
      }))
      const open = await page.getByTestId('open-full').isVisible().catch(() => false)
      const card = await page.getByTestId('hero').boundingBox()
      check(`embed ${id}: only the hero card + "Open full app ↗", fits 420×300`, only.nav + only.data + only.insp + only.pick === 0 && open && !!card && card.y >= 0 && card.y + card.height <= 301, card ? `${Math.round(card.height)} px tall` : '')
      const heroTxt = (await page.getByTestId('hero').innerText()).replace(/\s+/g, ' ')
      check(`embed ${id}: answer carries the API numbers`, expected[id].slice(0, 1).every((e) => heroTxt.toLowerCase().includes(e.toLowerCase())))
      if (shots) await page.screenshot({ path: resolve(out, `apps_r5_${id}_embed.png`) })
    }
    await ctx.close()
  }
  // #83 gap slots + #88 wording (inside "Show the data")
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    for (const [path, label] of [['/factcheck', '2011'], ['/land', '2012']]) {
      await page.goto(`${base}${path}`, { waitUntil: 'load' })
      await page.getByTestId('show-data').click()
      const gap = page.locator(`[data-testid="bar-gap"][data-label="${label}"]`)
      await gap.waitFor({ timeout: 20000 }).catch(() => {})
      const t = await gap.locator('title').textContent().catch(() => '')
      check(`#83 ${path}: hatched slot for ${label} — "${t}"`, /not enough satellite data \(.*Jan 2012/.test(t))
      await page.getByTestId('show-data').click()
    }
    await page.goto(`${base}/insurance`, { waitUntil: 'load' })
    const body = await page.locator('body').innerText()
    check('#88 insurance: "parametric index (pays on a measured index, not on loss)", no company name', /parametric index \(pays on a measured index, not on loss\)/i.test(body) && !/floodbase/i.test(body))
    await ctx.close()
  }
} finally {
  await browser.close()
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  server.kill()
}
console.log(failed ? `\n${failed} FAILED` : '\nall companion checks passed')
process.exit(failed ? 1 : 0)
