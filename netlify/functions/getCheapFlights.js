// TripHunt -- getCheapFlights.js
// Cheap Flight Discovery Engine
// Scans cheap_routes, compares vs average price, flags price drops.

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const _cache    = new Map();

function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.d;
}
function cacheSet(k, d) {
  _cache.set(k, { d, ts: Date.now() });
  if (_cache.size > 100) _cache.delete(_cache.keys().next().value);
}

const ROUTE_AVG = {
  BCN:120, MAD:110, LIS:105, FCO:115, AMS:95,  CDG:90,  DXB:280, AYT:160,
  PMI:130, TFS:170, LPA:175, FAO:140, ATH:145, PRG:100, VIE:105, DBV:155,
  IST:190, ALC:135, BKK:520, DPS:590, NRT:620, SIN:480, KUL:450, HKT:540,
  JFK:380, LAX:420, MIA:390, ORD:400, SFO:430, CPT:520, NBO:490,
  SYD:780, MEL:800,
};

function ddmm(s) {
  if (!s) return "";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? p[2] + p[1] : "";
}
function defaultDep() {
  const d = new Date(); d.setDate(d.getDate() + 21);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function defaultRet(dep) {
  const d = new Date(dep); d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function analyseRoute(origin, dest, price, dep, ret) {
  const avg      = ROUTE_AVG[dest.toUpperCase()] || 250;
  const saving   = Math.round(avg - price);
  const pct      = Math.round((saving / avg) * 100);
  const isPriceDrop = pct >= 20;
  const r        = price / avg;
  let grade, label;
  if (r <= 0.55) { grade = "exceptional"; label = "🔥 Price Drop"; }
  else if (r <= 0.72) { grade = "great"; label = "🔥 Great Deal"; }
  else if (r <= 0.88) { grade = "good";  label = "✓ Good Price"; }
  else if (r <= 1.05) { grade = "fair";  label = "· Fair";       }
  else                { grade = "high";  label = "↑ High";        }

  const sd   = dep || defaultDep();
  const sr   = ret || defaultRet(sd);
  const link = "/" + origin + ddmm(sd) + dest.toUpperCase() + ddmm(sr) + "21";
  return {
    origin,
    destination:     dest.toUpperCase(),
    price,
    typical_price:   avg,
    saving:          Math.max(0, saving),
    saving_pct:      Math.max(0, pct),
    is_price_drop:   isPriceDrop,
    deal_grade:      grade,
    deal_label:      label,
    depart_date:     sd,
    return_date:     sr,
    link,
    booking_url:     "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB",
  };
}

// Curated static cheap routes for fallback
function getFallbackCheapRoutes(origin) {
  const STATIC = {
    LHR: [
      { destination:"AMS", price:44,  dep_weeks:3 },
      { destination:"BCN", price:62,  dep_weeks:4 },
      { destination:"MAD", price:55,  dep_weeks:3 },
      { destination:"LIS", price:69,  dep_weeks:5 },
      { destination:"PRG", price:49,  dep_weeks:3 },
      { destination:"VIE", price:59,  dep_weeks:4 },
      { destination:"FCO", price:79,  dep_weeks:4 },
      { destination:"DXB", price:219, dep_weeks:6 },
    ],
    MAN: [
      { destination:"BCN", price:39,  dep_weeks:3 },
      { destination:"MAD", price:49,  dep_weeks:3 },
      { destination:"PMI", price:55,  dep_weeks:4 },
      { destination:"AYT", price:79,  dep_weeks:5 },
    ],
    EDI: [
      { destination:"BCN", price:45,  dep_weeks:3 },
      { destination:"AGP", price:69,  dep_weeks:5 },
      { destination:"AMS", price:59,  dep_weeks:3 },
    ],
    LGW: [
      { destination:"BCN", price:42,  dep_weeks:3 },
      { destination:"PMI", price:52,  dep_weeks:4 },
      { destination:"FAO", price:64,  dep_weeks:4 },
    ],
  };
  const rows = STATIC[origin] || STATIC.LHR;
  const now = new Date();
  return rows.map(r => {
    const d = new Date(now); d.setDate(d.getDate() + r.dep_weeks * 7);
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    const dep = d.toISOString().slice(0, 10);
    const retD = new Date(dep); retD.setDate(retD.getDate() + 7);
    const ret = retD.toISOString().slice(0, 10);
    return { ...analyseRoute(origin, r.destination, r.price, dep, ret), _fallback:true };
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "X-Access-Token": process.env.TRAVELPAYOUTS_TOKEN || "",
        "Content-Type":   "application/json",
        "User-Agent":     "TripHunt/2.0",
      }
    }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Bad JSON")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const params = event.queryStringParameters || {};
  const origin = (params.origin || "LHR").toUpperCase();
  const limit  = parseInt(params.limit) || 12;
  const cacheKey = `cheap:${origin}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    const fb = getFallbackCheapRoutes(origin).slice(0, limit);
    const result = { success:true, data:fb, _source:"fallback" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(result) };
  }

  try {
    // cheap_routes: best prices grouped by destination
    const q = new URLSearchParams({ origin, currency:"GBP", token });
    const raw = await fetchJson("https://api.travelpayouts.com/aviasales/v3/cheap_routes?" + q);

    let items = [];
    if (raw && raw.data) {
      for (const destKey in raw.data) {
        const entry = raw.data[destKey];
        if (!entry || !entry.price) continue;
        const dep = entry.depart_date ? entry.depart_date.slice(0,10) : null;
        const ret = entry.return_date ? entry.return_date.slice(0,10) : null;
        const analysed = analyseRoute(origin, destKey, entry.price, dep, ret);
        if (entry.link) {
          analysed.link        = entry.link;
          analysed.booking_url = "https://www.aviasales.com" + entry.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB";
        }
        items.push({ ...analysed, airline: entry.airline || "" });
      }
      // Sort: price drops first, then by saving_pct desc
      items.sort((a, b) => {
        if (a.is_price_drop !== b.is_price_drop) return b.is_price_drop ? 1 : -1;
        return b.saving_pct - a.saving_pct;
      });
      items = items.slice(0, limit);
    }

    if (!items.length) {
      items = getFallbackCheapRoutes(origin).slice(0, limit);
    }

    const result = { success:true, data:items, marker:MARKER, _source: items[0]?._fallback ? "fallback" : "live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };

  } catch(err) {
    const fb = { success:true, data: getFallbackCheapRoutes(origin).slice(0, limit), _source:"fallback_error", _error:err.message };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }
};
