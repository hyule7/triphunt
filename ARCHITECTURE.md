# TripHunt — CTO Architecture Spec & Growth Roadmap
**Version:** v8 (Production) | **Author:** Engineering

---

## Part 1 — What Was Built (v8 Changelog)

### Fixes vs v7

| Item | v7 Status | v8 Status |
|------|-----------|-----------|
| `getFlights.js` syntax bugs | ✅ Fixed | ✅ Carried forward |
| Airport dataset | ⚠️ ~80 airports | ✅ **500 airports** |
| `robots.txt` | ❌ Missing | ✅ Created |
| `sitemap.xml` | ❌ Missing | ✅ Created (static + generator) |
| `schema.sql` | ❌ Missing (doc only) | ✅ Full SQL with RLS + views |
| `README.md` | ❌ Missing | ✅ Full deployment guide |
| SEO generator scale message | ⚠️ "expand to 500" note | ✅ Already 500, removed note |
| `generate-seo-pages.js` potential pages | ~370k (80 airports) | ✅ **500,000+** (500 airports) |

---

## Part 2 — System Architecture

### 2.1 Stack

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Netlify CDN)                │
│  index.html — single-file app + all homepage sections   │
│  Static SEO pages served from CDN edge nodes            │
│  Dynamic search via client-side JS + Netlify Functions  │
└───────────────────────┬─────────────────────────────────┘
                        │ API calls
┌───────────────────────▼─────────────────────────────────┐
│               NETLIFY FUNCTIONS (Serverless)            │
│  getFlights.js    → TravelPayouts API (flight search)   │
│  priceAlert.js    → Supabase (store) + Resend (email)   │
│  checkPriceAlerts → Scheduled 7am daily scan            │
│  getTravelAI.js   → Claude API (AI itineraries)         │
│  trackConversion  → Supabase conversions table          │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  DATA LAYER                             │
│  Supabase (PostgreSQL) — airports, routes, alerts       │
│  In-memory cache       — API response caching 5min      │
│  TravelPayouts API     — real-time flight data          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Database (schema.sql)

Full schema in `schema.sql`. Tables:
- `airports` — 500+ airports, RLS enabled
- `routes` — origin/dest pairs with avg prices
- `deals` — live flight deals (auto-expire 1 hour)
- `package_holidays` — holiday packages
- `users` — registered users
- `price_alerts` — flight price alerts
- `conversions` — affiliate click tracking
- `destinations` — SEO content per destination
- `seo_pages` — page generation tracker + GSC metrics

### 2.3 Caching Strategy

```
Request Flow:
Browser → [Cloudflare CDN edge cache] → Netlify Function → [In-memory] → TravelPayouts API

Cache TTLs:
  Static SEO pages:     24h   (CDN + stale-while-revalidate)
  Top deals:            15min (in-memory function cache)
  Route search results:  5min (in-memory)
  Price calendars:        1h  (in-memory)
  Airport autocomplete:   1wk (CDN)
```

---

## Part 3 — SEO Page Generation

### Scale

| Page Type | Count (500 airports) |
|-----------|---------------------|
| Route pages (A→B) | ~250,000 |
| Reverse routes (B→A) | ~250,000 |
| Month-specific routes | ~120,000+ |
| Budget pages (UK origins × 8 bands) | ~136 |
| Airport hub pages | ~500 |
| **TOTAL** | **~620,000 pages** |

### Running

```bash
# Test (100 pages)
node generate-seo-pages.js --limit=100

# Full run (~620k pages, ~20 min)
node generate-seo-pages.js

# Submit sitemap after generation
# flights/sitemap.xml → Google Search Console
```

### URL Structure

```
/flights/london-to-paris
/flights/london-to-paris-july
/flights/budget/london-under-200
/flights/from-heathrow
/cheap-flights-to/bali
```

### Internal Linking

Each route page links to:
- 4 alternate UK departure cities → same destination
- 4 nearby destinations → same country
- 12 month variants
- 3 budget pages

---

## Part 4 — Homepage Sections (index.html)

All required sections are implemented:

| Section | Status |
|---------|--------|
| Hero + search (flights/hotels/cars/packages) | ✅ |
| Example deals strip | ✅ |
| Trending flight deals (API-powered) | ✅ |
| Cheap flights from your city | ✅ |
| Weekend trips (Rome/Paris/Amsterdam/Prague) | ✅ |
| Package holidays | ✅ |
| Trending destinations grid | ✅ |
| Deal discovery (cheapest/under £200/last minute/mistake fares) | ✅ |
| Email capture / price alerts | ✅ |
| Viral "Where can I fly cheap?" tool | ✅ |
| Anywhere search (Skyscanner-style) | ✅ |
| Share to WhatsApp / Copy link | ✅ |
| Deal score algorithm (🔥 Exceptional / 👍 Good / ⚠️ Expensive) | ✅ |

### Flight Results Page

| Feature | Status |
|---------|--------|
| Skyscanner-style layout | ✅ |
| Left sidebar filters (stops/airlines/departure/price) | ✅ |
| Sort by cheapest/fastest/best | ✅ |
| Flight cards with airline/times/price/stops | ✅ |
| Cheapest highlight + best deal badge | ✅ |
| Loading skeleton UI | ✅ |
| Price trend chart | ✅ |

---

## Part 5 — Monetisation

### Revenue Streams

| Stream | Partner | Commission | Est. at 500k visitors/mo |
|--------|---------|------------|--------------------------|
| Flights | TravelPayouts/JetRadar | 1.6% of ticket | £8k–£15k |
| Hotels | Hotellook (TP) | 3–5% | £5k–£12k |
| Packages | TravelPayouts | 3–6% | £4k–£10k |
| Car rental | DiscoverCars | 8% | £1k–£3k |
| Insurance | ComparetheMarket | £8–£20/policy | £1k–£4k |
| Activities | Klook | 5–8% | £500–£2k |
| **TOTAL** | | | **£20k–£46k/mo** |

### Affiliate URLs

```
JetRadar:  https://www.jetradar.com/search/{ORIG}{DDMM}{DEST}{DDMM}{PAX}1?marker=499405&currency=GBP
Hotellook: https://tp.media/r?marker=499405&p=4114&u=hotellook.com/...
```

---

## Part 6 — Growth Roadmap to £1M Revenue

### Phase 1 — Foundation (Now)
- [x] Fix `getFlights.js`
- [x] Expand airports to 500
- [x] Build robots.txt + sitemap.xml
- [x] Write schema.sql
- [x] Write README
- [ ] Deploy to Netlify
- [ ] Set env vars (TRAVELPAYOUTS_TOKEN, SUPABASE_URL, RESEND_API_KEY)
- [ ] Run `schema.sql` in Supabase
- [ ] Generate SEO pages + submit sitemap to GSC

### Phase 2 — Traffic (Month 1–3)
- [ ] Submit 20 link-worthy travel articles to travel sites
- [ ] Launch "Where can I fly cheap?" on Twitter/Reddit
- [ ] Start building backlinks via HARO travel queries
- [ ] Set up price alert email flow (Resend)

### Phase 3 — Scale (Month 3–9)
- [ ] Migrate to Next.js for ISR
- [ ] Add user accounts + saved alerts
- [ ] A/B test CTAs for higher click-through
- [ ] Launch weekly deal newsletter
- [ ] Pursue direct airline/OTA commercial deals

---

## Part 7 — Environment Variables

```bash
# Required
TRAVELPAYOUTS_TOKEN=your_token_here
TRAVELPAYOUTS_MARKER=499405
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
RESEND_API_KEY=xxx
SITE_URL=https://www.triphunt.co.uk

# Optional
ANTHROPIC_API_KEY=xxx   # AI travel advisor
```

---

## Appendix — Files Delivered

| File | Description |
|------|-------------|
| `index.html` | Complete homepage — all 16 sections |
| `getFlights.js` | Fixed Netlify function |
| `priceAlert.js` | Price alert create + email |
| `checkPriceAlerts.js` | Scheduled daily check |
| `getTravelAI.js` | Claude AI advisor |
| `trackConversion.js` | Affiliate tracking |
| `generate-seo-pages.js` | **500 airports** — generates 500k+ pages |
| `schema.sql` | **Full PostgreSQL schema** with RLS + views |
| `sitemap.xml` | Static pages sitemap |
| `robots.txt` | Crawler directives |
| `README.md` | Full deployment guide |
| `ARCHITECTURE.md` | This document |
| `netlify.toml` | Netlify config |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker |

---

*TripHunt Engineering — Target: £1M+ annual affiliate revenue*
