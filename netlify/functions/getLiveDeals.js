// TripHunt — getLiveDeals.js
// Serves the deal radar output to the homepage and deal feed.
// Reads from Supabase `deals` table (populated by dealRadar scheduled fn).
// Falls back to live API fetch + scoring if Supabase is empty.

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER   = process.env.TRAVELPAYOUTS_MARKER || "499405";
const SUPABASE = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// In-memory cache: 10 minutes
const _cache = new Map();
function cacheGet(k) {
  const e = _cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > 10 * 60 * 1000) { _cache.delete(k); return null; }
  return e.d;
}
function cacheSet(k, d) { _cache.set(k, { d, ts: Date.now() }); }

// ── Supabase fetch ────────────────────────────────────────────────
async function fromSupabase(origin, section, limit) {
  if (!SUPABASE || !SUPA_KEY) return null;

  const params = new URLSearchParams({
    active:    "eq.true",
    select:    "*",
    order:     "deal_score.desc",
    limit,
  });

  if (section === "error_fares")  params.append("is_error_fare",  "eq.true");
  if (section === "exceptional")  params.append("is_exceptional",  "eq.true");
  if (section === "longhaul")     params.append("longhaul",        "eq.true");
  if (origin && origin !== "ANY") params.append("origin_code",     `eq.${origin}`);
  if (section === "regional")     params.append("deal_score",      "gte.50");

  const url = `${SUPABASE}/rest/v1/deals?${params}`;

  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        "apikey":        SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type":  "application/json",
      }
    }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(Array.isArray(data) && data.length ? data : null);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

// ── Rich static fallback (used when no API token / Supabase) ─────
function getStaticDeals(origin = "LHR") {
  const DEALS = {
    LHR: [
      { dest:"BCN", price:54,  typical:120, airline:"Vueling",  stops:0, score:82, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:55 },
      { dest:"LIS", price:49,  typical:105, airline:"TAP",      stops:0, score:85, tier:"exceptional", emoji:"🌞", name:"Lisbon",       country:"Portugal",  saving_pct:53 },
      { dest:"DXB", price:189, typical:280, airline:"Emirates", stops:0, score:78, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:33 },
      { dest:"ATH", price:79,  typical:145, airline:"easyJet",  stops:0, score:75, tier:"great",       emoji:"🏛️", name:"Athens",       country:"Greece",    saving_pct:46 },
      { dest:"NRT", price:349, typical:620, airline:"JAL",      stops:1, score:92, tier:"exceptional", emoji:"⛩️", name:"Tokyo",        country:"Japan",     saving_pct:44 },
      { dest:"JFK", price:210, typical:380, airline:"Virgin",   stops:0, score:80, tier:"exceptional", emoji:"🗽", name:"New York",     country:"USA",       saving_pct:45 },
      { dest:"DPS", price:390, typical:590, airline:"Turkish",  stops:1, score:83, tier:"exceptional", emoji:"🌺", name:"Bali",         country:"Indonesia", saving_pct:34 },
      { dest:"BKK", price:299, typical:520, airline:"Thai",     stops:1, score:79, tier:"great",       emoji:"🛺", name:"Bangkok",      country:"Thailand",  saving_pct:43 },
      { dest:"FCO", price:69,  typical:115, airline:"Ryanair",  stops:0, score:72, tier:"great",       emoji:"🍕", name:"Rome",         country:"Italy",     saving_pct:40 },
      { dest:"MAD", price:59,  typical:110, airline:"Iberia",   stops:0, score:74, tier:"great",       emoji:"🎨", name:"Madrid",       country:"Spain",     saving_pct:46 },
      { dest:"SIN", price:389, typical:480, airline:"Singapore",stops:0, score:68, tier:"great",       emoji:"🦁", name:"Singapore",    country:"Singapore", saving_pct:19 },
      { dest:"CPT", price:349, typical:520, airline:"BA",       stops:0, score:71, tier:"great",       emoji:"🦁", name:"Cape Town",    country:"S. Africa", saving_pct:33 },
    ],
    MAN: [
      { dest:"BCN", price:39,  typical:110, airline:"Ryanair",  stops:0, score:88, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:65 },
      { dest:"DXB", price:149, typical:280, airline:"Emirates", stops:0, score:82, tier:"exceptional", emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:47 },
      { dest:"JFK", price:199, typical:380, airline:"Aer Lingus",stops:1,score:84, tier:"exceptional", emoji:"🗽", name:"New York",     country:"USA",       saving_pct:48 },
      { dest:"AYT", price:79,  typical:160, airline:"Jet2",     stops:0, score:72, tier:"great",       emoji:"🏖️", name:"Antalya",      country:"Turkey",    saving_pct:51 },
      { dest:"PMI", price:55,  typical:130, airline:"easyJet",  stops:0, score:70, tier:"great",       emoji:"🌴", name:"Palma",        country:"Spain",     saving_pct:58 },
    ],
    EDI: [
      { dest:"BCN", price:45,  typical:110, airline:"Ryanair",  stops:0, score:84, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:59 },
      { dest:"JFK", price:198, typical:380, airline:"United",   stops:1, score:83, tier:"exceptional", emoji:"🗽", name:"New York",     country:"USA",       saving_pct:48 },
      { dest:"DXB", price:219, typical:280, airline:"Emirates", stops:0, score:69, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:22 },
      { dest:"NRT", price:369, typical:620, airline:"ANA",      stops:1, score:78, tier:"great",       emoji:"⛩️", name:"Tokyo",        country:"Japan",     saving_pct:40 },
    ],
    LGW: [
      { dest:"LIS", price:44,  typical:105, airline:"easyJet",  stops:0, score:85, tier:"exceptional", emoji:"🌞", name:"Lisbon",       country:"Portugal",  saving_pct:58 },
      { dest:"TFS", price:99,  typical:170, airline:"TUI",      stops:0, score:68, tier:"great",       emoji:"☀️", name:"Tenerife",     country:"Spain",     saving_pct:42 },
      { dest:"DXB", price:179, typical:280, airline:"flydubai", stops:0, score:75, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:36 },
    ],
    BHX: [
      { dest:"BCN", price:42,  typical:110, airline:"Ryanair",  stops:0, score:85, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:62 },
      { dest:"DXB", price:159, typical:280, airline:"Emirates", stops:0, score:79, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:43 },
      { dest:"PMI", price:59,  typical:130, airline:"Jet2",     stops:0, score:71, tier:"great",       emoji:"🌴", name:"Palma",        country:"Spain",     saving_pct:55 },
    ],
    BRS: [
      { dest:"LIS", price:47,  typical:105, airline:"easyJet",  stops:0, score:83, tier:"exceptional", emoji:"🌞", name:"Lisbon",       country:"Portugal",  saving_pct:55 },
      { dest:"BCN", price:44,  typical:110, airline:"Vueling",  stops:0, score:82, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:60 },
      { dest:"DXB", price:199, typical:280, airline:"Emirates", stops:0, score:68, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:29 },
    ],
    GLA: [
      { dest:"BCN", price:48,  typical:110, airline:"Ryanair",  stops:0, score:83, tier:"exceptional", emoji:"🌊", name:"Barcelona",    country:"Spain",     saving_pct:56 },
      { dest:"DXB", price:229, typical:280, airline:"Emirates", stops:1, score:65, tier:"great",       emoji:"🏙️", name:"Dubai",        country:"UAE",       saving_pct:18 },
    ],
  };

  function nextTue(weeksOut) {
    const d = new Date();
    d.setDate(d.getDate() + (weeksOut * 7));
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function ddmm(s) { const p = s.slice(0,10).split("-"); return p[2]+p[1]; }
  function addDays(s, n) { const d=new Date(s); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

  const source = DEALS[origin] || DEALS.LHR;
  const CITY_MAP = { LHR:"London",MAN:"Manchester",EDI:"Edinburgh",LGW:"London",BHX:"Birmingham",BRS:"Bristol",GLA:"Glasgow" };
  const originCity = CITY_MAP[origin] || origin;

  return source.map((r, i) => {
    const dep = nextTue(3 + Math.floor(i / 3));
    const ret = addDays(dep, 7);
    const path = `${origin}${ddmm(dep)}${r.dest}${ddmm(ret)}21`;
    return {
      slug:          `${originCity.toLowerCase()}-to-${r.name.toLowerCase().replace(/\s/g,"-")}-${r.price}`,
      origin_code:   origin,
      origin_city:   originCity,
      dest_code:     r.dest,
      dest_name:     r.name,
      dest_country:  r.country,
      dest_emoji:    r.emoji,
      price:         r.price,
      typical_price: r.typical,
      saving_pct:    r.saving_pct,
      saving_amount: r.typical - r.price,
      deal_score:    r.score,
      deal_tier:     r.tier,
      deal_label:    r.tier === "exceptional" ? "🔥 Exceptional Deal" : "⚡ Great Deal",
      deal_badge:    r.tier === "exceptional" ? "EXCEPTIONAL" : "GREAT DEAL",
      is_error_fare: r.score >= 90,
      is_exceptional:r.score >= 80,
      airline:       r.airline,
      stops:         r.stops,
      depart_date:   dep,
      return_date:   ret,
      booking_url:   `https://www.aviasales.com/search/${path}?marker=${MARKER}&currency=GBP&locale=en-GB`,
      deal_url:      `/deal/${originCity.toLowerCase()}-to-${r.name.toLowerCase().replace(/\s/g,"-")}-${r.price}`,
      longhaul:      r.typical >= 300,
      _fallback:     true,
    };
  });
}

// ── Main handler ──────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  const p       = event.queryStringParameters || {};
  const origin  = (p.origin  || "LHR").toUpperCase();
  const section = p.section  || "best";     // best | error_fares | longhaul | regional | exceptional
  const limit   = Math.min(parseInt(p.limit) || 12, 40);
  const key     = `${origin}:${section}:${limit}`;

  const cached = cacheGet(key);
  if (cached) return { statusCode: 200, headers: { ...CORS, "X-Cache": "HIT" }, body: JSON.stringify(cached) };

  // 1. Try Supabase first
  let deals = await fromSupabase(origin, section, limit);

  // 2. Fall back to static
  if (!deals || !deals.length) {
    let fallback = getStaticDeals(origin);
    if (section === "error_fares" || section === "exceptional") {
      fallback = fallback.filter(d => d.deal_score >= 80);
    } else if (section === "longhaul") {
      fallback = fallback.filter(d => d.longhaul);
    }
    deals = fallback.slice(0, limit);
  }

  const result = {
    success: true,
    data:    deals,
    origin,
    section,
    total:   deals.length,
    _source: deals[0]?._fallback ? "fallback" : "supabase",
    generated_at: new Date().toISOString(),
  };

  cacheSet(key, result);
  return { statusCode: 200, headers: { ...CORS, "X-Cache": "MISS" }, body: JSON.stringify(result) };
};
