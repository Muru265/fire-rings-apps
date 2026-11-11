# Fire Rings Apps

Six example apps built **only** on the [Fire Rings](https://fire-rings.vercel.app) open API — NASA Space Apps 2026
(challenge: *Harmonization of MODIS and VIIRS Hot Spots*). Live: https://fire-rings-apps.vercel.app

Fire Rings harmonizes 25 years of NASA FIRMS active-fire detections (MODIS 2000→, VIIRS 2012→) into one consistent monthly
record. This site shows that other people can build on it: it imports **no Fire Rings code and no raw data**. Every number
arrives over HTTP, and every page has an **API inspector** listing each request (method, URL, status, size, time,
"Open JSON", "Run again").

| # | App | Who | Endpoints used |
|---|---|---|---|
| 1 | What to expect | land managers, firefighters | `/data/v1/api/projection/{region}.json` |
| 2 | Fact-check a season + weather | journalists, scientists | `/data/v1/regions/{region}.json`, `/data/v1/api/power/{region}.json` |
| 3 | Fire index for insurance | insurers, disaster funds | `/data/v1/api/series/{region}.json` |
| 4 | Smoke-season tracker (Punjab) | air-quality and health teams | `/data/v1/regions/punjab.json`, `/data/v1/hexes/punjab/*.json`, NASA GIBS WMS (MERRA-2 monthly aerosol) |
| 5 | Volcano ground-truth check (Piton de la Fournaise) | observatories, scientists | `/data/v1/api/reunion.json` |
| 6 | Land & loan screening | banks, buyers, supply chains | `/data/v1/regions/{region}.json`, `/data/v1/hexes/{region}/*.json` |

Home also reads `/data/v1/meta.json`. Full endpoint list: https://fire-rings.vercel.app/data/v1/api/index.json

## Embed mode
`?embed=1` gives a compact view (no navigation, small visuals, one-line API ticker). When embedded, each call posts
`{source: 'fire-rings-apps', page, lastCallAt, ok}` to the parent window (target origin `https://fire-rings.vercel.app`).
Only `https://fire-rings.vercel.app` (and localhost, for testing) may frame these pages: `Content-Security-Policy:
frame-ancestors` in `vercel.json`.

## Configuration
API base URL: `VITE_FIRE_RINGS_BASE` at build time, or `?base=https://…` at run time. Default
`https://fire-rings.vercel.app`. No keys anywhere: NASA GIBS is public and allows browser calls (CORS); NASA POWER data
come from the cached Fire Rings file.

## Run
```
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/ (Vercel "Vite" preset)
npm test             # Playwright: every page in normal + embed mode, inspector, 360 px
```

## Honest limits
These are planning examples, not emergency services, and there are no weather-based forecasts. Fire-days are satellite heat
detections counted on ~36 km² hexagons (MODIS-equivalent): not burned area, not damage, not ownership. The insurance index
is illustrative, not a product.

## Sources
- NASA FIRMS active fire data (MODIS C6.1 MCD14ML doi:10.5067/FIRMS/MODIS/MCD14ML; VIIRS 375 m VNP14IMGT / VJ114IMGTDL / VJ214IMGTDL), via Fire Rings.
- NASA POWER (power.larc.nasa.gov), MERRA-2, via the cached Fire Rings file.
- NASA GIBS / Worldview imagery: MERRA-2 total aerosol optical thickness 550 nm, monthly (GMAO).
- Smithsonian Institution Global Volcanism Program, *Volcanoes of the World* (eruption periods of Piton de la Fournaise, 233020).
- Libraries: React, React Router, h3-js (Uber H3), Vite, Playwright; fonts Inter, Space Grotesk, JetBrains Mono (Fontsource, SIL OFL).

MIT licence (code). Data licences as per sources.
