# TripHunt — Deployment & Setup Guide

**Version:** v8 | Production-ready  
**Stack:** Vanilla HTML/JS + Netlify Functions + Supabase + TravelPayouts

---

## Quick Start (5 minutes to live)

```bash
# 1. Clone / unzip TripHunt_v8
cd TripHunt_v8

# 2. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 3. Set environment variables (see section below)
cp .env.example .env
# Edit .env with your keys

# 4. Test locally
netlify dev

# 5. Deploy
netlify deploy --prod
```

---

## Environment Variables

Set these in **Netlify → Site Settings → Environment Variables**:

| Variable | Required | Where to get it |
|----------|----------|----------------|
| `TRAVELPAYOUTS_TOKEN` | ✅ Yes | [app.travelpayouts.com](https://app.travelpayouts.com) → API → Token |
| `TRAVELPAYOUTS_MARKER` | ✅ Yes | Same page — your affiliate Marker ID |
| `SUPABASE_URL` | ✅ Yes | [supabase.com](https://supabase.com) → Project → Settings → API |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Supabase → Settings → API → service_role key |
| `RESEND_API_KEY` | ✅ Yes | [resend.com](https://resend.com) — free tier: 3,000 emails/month |
| `SITE_URL` | ✅ Yes | `https://www.triphunt.co.uk` |
| `ANTHROPIC_API_KEY` | Optional | [console.anthropic.com](https://console.anthropic.com) — for AI advisor |

---

## Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Run `schema.sql` (paste the entire file contents)
4. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` into Netlify env vars

---

## TravelPayouts Setup

1. Sign up at [travelpayouts.com](https://www.travelpayouts.com)
2. Go to **API** section
3. Copy your **API Token** → `TRAVELPAYOUTS_TOKEN`
4. Copy your **Marker** number → `TRAVELPAYOUTS_MARKER`

> Your current Marker is `499405` — already set as the default fallback in all functions.

---

## Generating SEO Pages (500,000+ pages)

```bash
# Test run — generates 100 pages quickly
node generate-seo-pages.js --limit=100 --output=./flights

# Full run — generates ~500,000 pages (takes ~15 minutes)
node generate-seo-pages.js --output=./flights

# Output structure:
# /flights/london-to-paris.html
# /flights/by-month/london-to-bali-july.html
# /flights/budget/london-under-200.html
# /flights/sitemap.xml          ← submit this to Google Search Console
# /flights/page-index.json      ← build manifest
```

### Add to Netlify Build (automated)

Edit `netlify.toml`:

```toml
[build]
  command = "node generate-seo-pages.js"
  publish = "."
```

This regenerates all SEO pages on every deploy so prices stay fresh.

---

## Submitting to Google Search Console

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property: `https://www.triphunt.co.uk`
3. Verify via Netlify DNS TXT record
4. Submit sitemaps:
   - `https://www.triphunt.co.uk/sitemap.xml`
   - `https://www.triphunt.co.uk/flights/sitemap.xml` (after generating)

---

## File Structure

```
TripHunt_v8/
├── index.html                          # Main homepage + search + all sections
├── robots.txt                          # SEO crawler directives
├── sitemap.xml                         # Static pages sitemap
├── schema.sql                          # Supabase PostgreSQL schema
├── generate-seo-pages.js               # 500,000+ SEO page generator
├── manifest.json                       # PWA manifest
├── sw.js                               # Service worker (offline support)
├── netlify.toml                        # Netlify config + headers + redirects
├── netlify/functions/
│   ├── getFlights.js                   # ✅ FIXED — TravelPayouts API proxy
│   ├── priceAlert.js                   # Price alert create/check/email
│   ├── checkPriceAlerts.js             # Scheduled daily job (7am UTC)
│   ├── getTravelAI.js                  # Claude AI travel advisor
│   ├── trackConversion.js              # Affiliate click tracking
│   ├── priceCalender.js                # Price calendar data
│   └── getKlook.js                     # Klook activities
└── flights/                            # Generated SEO pages (gitignored)
    ├── london-to-paris.html
    ├── by-month/
    ├── budget/
    └── sitemap.xml
```

---

## Netlify Functions — API Endpoints

All functions are available at `/.netlify/functions/[name]`

### `getFlights` — Flight Search

```
GET /.netlify/functions/getFlights?type=search&origin=LHR&destination=BCN&depart_date=2025-07-15&return_date=2025-07-22&adults=2

GET /.netlify/functions/getFlights?type=top_deals&origin=LHR&limit=12

GET /.netlify/functions/getFlights?type=packages&origin=LHR&destination=PMI&nights=7
```

### `priceAlert` — Price Alerts

```
POST /.netlify/functions/priceAlert
Body: { "email": "user@example.com", "origin": "LHR", "destination": "BCN", "destName": "Barcelona", "targetPrice": 100, "adults": 1 }

GET /.netlify/functions/priceAlert?email=user@example.com   # List user's alerts
DELETE /.netlify/functions/priceAlert?id={alert_id}         # Delete an alert
GET /.netlify/functions/priceAlert?action=check             # Trigger alert check (scheduled)
```

---

## Monetisation — Affiliate Partners

| Partner | What it covers | Commission |
|---------|----------------|------------|
| **JetRadar** (TravelPayouts) | Flights | ~1.6% of ticket price |
| **Hotellook** (TravelPayouts) | Hotels | 3–5% of booking |
| **Klook** | Activities & tours | 5–8% per booking |
| **DiscoverCars** | Car hire | ~8% |
| **Compensair** | Flight delay claims | Revenue share |

All affiliate links use `marker=499405` — replace with your own marker.

---

## Growth Roadmap

### Phase 1 — Now (Week 1–2)
- [ ] Deploy to Netlify
- [ ] Set environment variables  
- [ ] Run `schema.sql` in Supabase
- [ ] Generate SEO pages: `node generate-seo-pages.js`
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Resend for price alert emails

### Phase 2 — Traffic (Month 1–3)
- [ ] Write 20 high-quality travel guides (linkable content)
- [ ] Submit to HARO for travel press mentions
- [ ] Launch "Where can I fly cheap?" on social media
- [ ] Build backlinks from travel blogs

### Phase 3 — Scale (Month 3–6)
- [ ] Migrate to Next.js for ISR (Incremental Static Regeneration)
- [ ] Add user accounts (saved searches)
- [ ] A/B test deal card CTAs for higher click-through
- [ ] Add weekly flight deal newsletter

### Revenue Target
- 500k organic visitors/month → £20,000–£48,000/month affiliate revenue
- 1M visitors/month → £40,000–£96,000/month → **£1M+ annually** ✅

---

## Performance Checklist

- ✅ Images use `loading="lazy"` and `decoding="async"`
- ✅ API responses cached in-memory (5 min) + CDN
- ✅ Service worker for offline support
- ✅ Core Web Vitals optimised (LCP target < 1.5s)
- ✅ All affiliate links open in new tab with `noopener`

---

*TripHunt Engineering — Built for £1M+ affiliate revenue*
