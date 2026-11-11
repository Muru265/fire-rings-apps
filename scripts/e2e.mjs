// Playwright checks for Fire Rings Apps: every page loads real numbers from the Fire Rings API in normal and embed
// mode, the inspector shows ≥1 successful call per page, no horizontal scroll at 360 px. Screenshots → screens/.
// Usage: npm run build && node scripts/e2e.mjs [--screens]
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(process.env.SCREENS_DIR ?? resolve(here, '../screens'))
mkdirSync(out, { recursive: true })
const PORT = 4180
const shots = process.argv.includes('--screens')
const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: resolve(here, '..'), stdio: 'ignore', shell: process.platform === 'win32' })
for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}`); break } catch { await new Promise((r) => setTimeout(r, 200)) } }
const base = `http://localhost:${PORT}`
const PAGES = [
  ['home', '/', '[data-testid="home-meta"]'],
  ['expect', '/expect', '[data-testid="expect-main"]'],
  ['factcheck', '/factcheck', '[data-testid="fc-sentence"] .num'],
  ['insurance', '/insurance', '[data-testid="ins-harm"]'],
  ['smoke', '/smoke', '[data-testid="smoke-headline"] .num'],
  ['volcano', '/volcano', '[data-testid="volcano-summary"] b'],
  ['land', '/land', '[data-testid="land-mean10"]'],
]
let failed = 0
const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? ` — ${info}` : ''}`); if (!ok) failed++ }
const browser = await chromium.launch()
try {
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [360, 800, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    for (const [id, path, sel] of PAGES) {
      for (const embed of tag === 'desktop' ? [false, true] : [false]) {
        await page.goto(`${base}${path}${embed ? '?embed=1' : ''}`, { waitUntil: 'load' })
        const el = page.locator(sel).first()
        await el.waitFor({ timeout: 30000 }).catch(() => {})
        const txt = (await el.innerText().catch(() => '')).trim()
        check(`${tag}${embed ? ' embed' : ''} ${id}: real number shown`, /\d/.test(txt), txt.slice(0, 40))
        if (embed) {
          const tick = await page.getByTestId('api-ticker').innerText().catch(() => '')
          check(`embed ${id}: API ticker shows a 200`, /\b200\b/.test(tick), tick.slice(0, 80))
          check(`embed ${id}: no site nav`, (await page.locator('header.top').count()) === 0)
        } else {
          const ok = await page.locator('[data-testid="api-call"][data-ok="true"]').count()
          check(`${tag} ${id}: inspector lists ≥1 successful call`, ok >= 1, `${ok} ok`)
        }
        if (tag === 'mobile') {
          const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
          check(`360px ${id}: no horizontal scroll`, sw <= cw + 1, `${sw} vs ${cw}`)
        }
        if (shots) { await page.waitForTimeout(800); await page.screenshot({ path: resolve(out, `apps_${id}${embed ? '_embed' : ''}_${tag}.png`), fullPage: !embed }) }
      }
    }
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
} finally {
  await browser.close()
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  server.kill()
}
console.log(failed ? `\n${failed} FAILED` : '\nall companion checks passed')
process.exit(failed ? 1 : 0)
