# TripHunt v10

## What's fixed in this version

### Root cause of the 404 errors
The Netlify function `getFlights` was returning **HTTP 500** (not 404) when
`TRAVELPAYOUTS_TOKEN` was not set as an environment variable. The frontend
was receiving a non-200 status and throwing — even though fallback code
existed, the error happened before reaching it.

### Fixes applied

**1. `getFlights.js` — always returns HTTP 200**
- No token set → returns rich curated static deals for all major UK airports
  (LHR, LGW, MAN, EDI, BHX, BRS, GLA), never a 500/404
- Live API fails → falls back to static data silently, still 200
- Live API returns empty → splices in static fallback, still 200

**2. `netlify.toml` — redirect order fixed**
- Added explicit `/.netlify/functions/*` pass-through BEFORE the `/*` wildcard
- Changed `node_bundler` from deprecated `zisi` to `esbuild`

**3. `index.html` — JS errors cleaned up**
- Duplicate `const FX` declaration fixed (was causing `SyntaxError`)
- `loadTopDeals()` and `loadHotDealChips()` now handle non-200 silently
- Main flight search wrapped in `if(res.ok)` check
- Subtitle text distinguishes live vs curated data

## Deployment

1. Push all files to GitHub
2. Connect repo to Netlify
3. Set environment variables in **Netlify → Site settings → Environment variables**:

| Variable | Value | Required? |
|---|---|---|
| `TRAVELPAYOUTS_TOKEN` | your token | Optional — site works without it |
| `TRAVELPAYOUTS_MARKER` | `499405` | Optional |
| `ANTHROPIC_API_KEY` | your key | Optional — AI advisor only |

**The site works fully without any env vars set.** Deals show curated
static data. Live prices activate automatically when token is added.

## File structure
```
index.html                          ← Main site (v10)
netlify.toml                        ← Build + redirect config (fixed)
sw.js                               ← Service worker (PWA)
manifest.json                       ← PWA manifest
robots.txt                          ← Crawl rules
sitemap.xml                         ← Sitemap
netlify/functions/
  getFlights.js                     ← Flights + top deals (always returns 200)
  getTravelAI.js                    ← AI advisor (Anthropic)
  getKlook.js                       ← Activities
  priceAlert.js                     ← Price drop signups
  priceCalendar.js                  ← Flexible date calendar (spelling fixed)
  trackConversion.js                ← Analytics
  checkPriceAlerts.js               ← Scheduled daily checker
```
# TripHunt SEO System

## What this adds
Programmatic SEO page generation producing **2,900+ indexable pages** from a single build script.

### Page types generated
| Type | Example URL | Count |
|---|---|---|
| Route pages | `/flights/london-to-barcelona` | 1,232 |
| Month-route | `/flights/london-to-barcelona/january` | 1,440 |
| Cheap-to | `/cheap-flights-to/barcelona` | 77 |
| Flights-from | `/flights-from/london` | 16 |
| Airport guides | `/airports/london-heathrow` | 93 |
| Destination guides | `/destinations/barcelona` | 77 |
| **Total** | | **~2,935** |

### Each page includes
- ✅ Unique H1, meta title, meta description
- ✅ Canonical URL
- ✅ OpenGraph + Twitter card tags
- ✅ JSON-LD: WebPage, BreadcrumbList, FAQPage, TravelAction
- ✅ Internal links to related routes
- ✅ Month-by-month price grid with links
- ✅ FAQ section (5 questions per route page)
- ✅ UK airport alternatives for same destination
- ✅ Nearby destinations in same country
- ✅ Footer with topic cluster links

### Sitemaps generated
- `/sitemap-index.xml` — index of all sitemaps
- `/sitemap-flights.xml` — all route + month-route + flights-from URLs
- `/sitemap-destinations.xml` — cheap-to + destination pages
- `/sitemap-airports.xml` — airport pages

## Deployment

### How it works
1. Push to GitHub
2. Netlify runs `node build-seo.js` during the build step
3. Pages are generated into `seo-pages/`
4. Redirects in `netlify.toml` route clean URLs to the generated files

### Files
```
build-seo.js     ← The generator (run this on deploy)
netlify.toml     ← Updated with SEO redirects + build command
robots.txt       ← Updated with all sitemap references
```

### After deploying
1. Go to Google Search Console → Sitemaps
2. Submit: `https://www.triphunt.co.uk/sitemap-index.xml`
3. Monitor "Coverage" report to see pages being indexed

### Scaling to millions of pages
The current dataset has 93 airports. To expand:
- Add more airports to the `AIRPORTS` array in `build-seo.js`
- Increase FOREIGN destinations — each new destination × 16 UK airports = 16 new route pages
- With 500 destinations: ~8,000 route pages + 72,000 month pages = 80,000+ pages
- With 2,000 destinations: ~500,000+ pages

### Local test run
```bash
node build-seo.js --test   # generates 50 pages quickly
node build-seo.js          # full build (~3,000 pages, <5 seconds)
```
