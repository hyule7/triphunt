// TripHunt -- searchFlights.js
// Called by results.html when user submits a flight search.
// Hits prices_for_dates first, falls back to v1/prices/cheap, then static.

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const _cache    = new Map();

function cacheGet(k) {
  const e = _cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.d;
}
function cacheSet(k, d) {
  _cache.set(k, { d, ts: Date.now() });
  if (_cache.size > 500) _cache.delete(_cache.keys().next().value);
}

// ── Helpers ───────────────────────────────────────────────────────
function ddmm(s) {
  if (!s) return "";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? p[2] + p[1] : "";
}
function addDays(s, n) {
  const d = new Date(String(s).slice(0, 10));
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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
function bookingUrl(orig, dest, dep, ret, adults) {
  const p  = parseInt(adults) || 2;
  const sd = dep || defaultDep();
  const sr = ret || defaultRet(sd);
  const path = orig + ddmm(sd) + dest + ddmm(sr) + p + "1";
  return "https://www.aviasales.com/search/" + path + "?marker=" + MARKER + "&currency=GBP&locale=en-GB";
}

const ROUTE_AVG = {
  BCN:120, MAD:110, LIS:105, FCO:115, AMS:95,  CDG:90,  DXB:280, AYT:160,
  PMI:130, TFS:170, LPA:175, FAO:140, ATH:145, PRG:100, VIE:105, DBV:155,
  IST:190, ALC:135, BKK:520, DPS:590, NRT:620, SIN:480, KUL:450, HKT:540,
  JFK:380, LAX:420, MIA:390, ORD:400, SFO:430, CPT:520, NBO:490,
  SYD:780, MEL:800,
};
function gradePrice(price, iata) {
  const avg = ROUTE_AVG[iata] || 250;
  const r   = price / avg;
  if (r <= 0.60) return { grade:"exceptional", label:"🔥 Exceptional Deal", score:95 };
  if (r <= 0.75) return { grade:"great",       label:"🔥 Great Deal",       score:82 };
  if (r <= 0.90) return { grade:"good",        label:"✓ Good Price",        score:68 };
  if (r <= 1.05) return { grade:"fair",        label:"· Fair Price",        score:50 };
  return               { grade:"high",        label:"↑ Above Average",     score:28 };
}

function enrich(items, origin, dep, ret, adults) {
  return items.map(item => {
    const price = item.price || item.value || 0;
    const dest  = (item.destination || "").toUpperCase();
    const d     = item.depart_date || item.departure_at || dep || "";
    const r     = item.return_date || item.return_at    || ret || (d ? addDays(d, 7) : "");
    const g     = gradePrice(price, dest);
    // Prefer API's own link field -- https://www.aviasales.com + deal.link
    const link  = item.link || ("/" + origin + ddmm(d) + dest + ddmm(r) + (parseInt(adults)||2) + "1");
    return {
      ...item,
      origin,
      destination: dest,
      depart_date: d,
      return_date: r,
      deal_grade:  g.grade,
      deal_label:  g.label,
      deal_score:  g.score,
      link,
      booking_url: item.link
        ? "https://www.aviasales.com" + item.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
        : bookingUrl(origin, dest, d, r, adults),
    };
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
      if (res.statusCode === 429) { reject(new Error("Rate limited")); return; }
      if (res.statusCode === 401 || res.statusCode === 403) { reject(new Error("Auth")); return; }
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

  const params      = event.queryStringParameters || {};
  const origin      = (params.origin      || "LHR").toUpperCase();
  const destination = (params.destination || "BCN").toUpperCase();
  const dep         = params.depart_date || defaultDep();
  const ret         = params.return_date || defaultRet(dep);
  const adults      = String(parseInt(params.adults) || 2);

  const cacheKey = `search:${origin}:${destination}:${dep}:${ret}:${adults}`;
  const cached   = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;

  // No token → static fallback
  if (!token) {
    const g = gradePrice(200, destination);
    const link = "/" + origin + ddmm(dep) + destination + ddmm(ret) + parseInt(adults) + "1";
    const result = {
      success: true,
      data: [{
        origin, destination, price:200, airline:"Multiple airlines",
        depart_date:dep, return_date:ret, number_of_changes:0,
        deal_grade:g.grade, deal_label:g.label, deal_score:g.score,
        link,
        booking_url: bookingUrl(origin, destination, dep, ret, adults),
        _fallback: true,
      }],
      _source: "fallback",
      _note: "Set TRAVELPAYOUTS_TOKEN in Netlify env vars for live prices",
    };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(result) };
  }

  try {
    // Primary: prices_for_dates with specific route
    const q = new URLSearchParams({ origin, destination, currency:"GBP", locale:"en", token, adults });
    if (dep) q.set("depart_date", dep);
    if (ret) q.set("return_date", ret);

    let data = await fetchJson("https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + q);
    let items = (data && data.data) ? data.data : [];

    // If no exact date results, try without dates
    if (!items.length) {
      const q2 = new URLSearchParams({ origin, destination, currency:"GBP", locale:"en", token, adults });
      const data2 = await fetchJson("https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + q2);
      items = (data2 && data2.data) ? data2.data : [];
    }

    // If still nothing, try cheap endpoint
    if (!items.length) {
      const q3 = new URLSearchParams({ origin, destination, currency:"GBP", one_way:"false", sorting:"price", trip_class:"0", token });
      const data3 = await fetchJson("https://api.travelpayouts.com/v1/prices/cheap?" + q3);
      if (data3 && data3.data && data3.data[destination]) {
        const trips = data3.data[destination];
        items = Object.values(trips).map(t => ({
          origin, destination, price:t.price,
          depart_date: t.departure_at ? t.departure_at.slice(0,10) : dep,
          return_date:  t.return_at   ? t.return_at.slice(0,10)   : ret,
          number_of_changes: t.transfers ?? 0,
          airline: t.airline || "",
          link: t.link || null,
        }));
      }
    }

    const enriched = enrich(items, origin, dep, ret, adults);
    enriched.sort((a, b) => a.price - b.price);

    if (!enriched.length) {
      const g    = gradePrice(150, destination);
      const link = "/" + origin + ddmm(dep) + destination + ddmm(ret) + parseInt(adults) + "1";
      enriched.push({
        origin, destination, price:150, airline:"Multiple airlines",
        depart_date:dep, return_date:ret, number_of_changes:0,
        deal_grade:g.grade, deal_label:g.label, deal_score:g.score,
        link,
        booking_url: bookingUrl(origin, destination, dep, ret, adults),
        _fallback: true,
      });
    }

    const result = { success:true, data:enriched, marker:MARKER, _source:"live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };

  } catch(err) {
    const g    = gradePrice(180, destination);
    const link = "/" + origin + ddmm(dep) + destination + ddmm(ret) + parseInt(adults) + "1";
    const fb   = {
      success:true,
      data: [{
        origin, destination, price:180, airline:"Multiple airlines",
        depart_date:dep, return_date:ret, number_of_changes:0,
        deal_grade:g.grade, deal_label:g.label, deal_score:g.score,
        link,
        booking_url: bookingUrl(origin, destination, dep, ret, adults),
        _fallback: true,
      }],
      _source:"fallback_error", _error:err.message,
    };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }
};
