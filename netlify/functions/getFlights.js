// TripHunt — getFlights.js  v10
// Works with OR without TRAVELPAYOUTS_TOKEN.
// Without token → returns curated static fallback data (not a 500).
const https = require("https");

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER      = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL   = 5 * 60 * 1000;   // 5 min
const _cache      = new Map();

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

// ── Deal grading ─────────────────────────────────────────────────
const ROUTE_AVG = {
  BCN:120,MAD:110,LIS:105,FCO:115,AMS:95,CDG:90,DXB:280,AYT:160,
  PMI:130,TFS:170,LPA:175,FAO:140,ATH:145,PRG:100,VIE:105,DBV:155,
  IST:190,ALC:135,BKK:520,DPS:590,NRT:620,SIN:480,KUL:450,HKT:540,
  JFK:380,LAX:420,MIA:390,ORD:400,SFO:430,CPT:520,NBO:490,
  SYD:780,MEL:800,BNE:790,AKL:850,
};
function grade(price, iata) {
  const avg = ROUTE_AVG[iata] || 250;
  const r   = price / avg;
  if (r <= 0.60) return { score:95, grade:"exceptional", label:"Exceptional Deal" };
  if (r <= 0.75) return { score:82, grade:"great",       label:"Great Deal"       };
  if (r <= 0.90) return { score:68, grade:"good",        label:"Good Price"       };
  if (r <= 1.05) return { score:50, grade:"fair",        label:"Fair Price"       };
  return               { score:28, grade:"high",        label:"Above Average"    };
}
function seats(price, airline) {
  const s = (price % 17) + (airline ? airline.charCodeAt(0) % 7 : 3);
  return [2,3,4,5,6,7,8,9][s % 8];
}

// ── URL builder ──────────────────────────────────────────────────
function ddmm(s) {
  if (!s) return "";
  const p = String(s).slice(0,10).split("-");
  return p.length === 3 ? p[2] + p[1] : "";
}
function addDays(s, n) {
  const d = new Date(String(s).slice(0,10));
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function bookingUrl(orig, dest, dep, ret, adults) {
  const d = ddmm(dep), r = ddmm(ret), p = parseInt(adults) || 1;
  let path;
  if (d && r) path = orig + d + dest + r + p + "1";
  else if (d)  path = orig + d + dest + p + "1";
  else         path = orig + dest;
  return `https://www.jetradar.com/search/${path}?adults=${p}&currency=GBP&locale=en&marker=${MARKER}`;
}

// ── Static fallback deals (used when no API token) ────────────────
function getFallbackDeals(origin) {
  const now  = new Date();
  function futureDate(weeksOut) {
    const d = new Date(now);
    d.setDate(d.getDate() + weeksOut * 7);
    // push to nearest Tuesday
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
  }

  const tables = {
    LHR: [
      { destination:"BCN", price:89,  airline:"Vueling",  changes:0, weeks:3 },
      { destination:"LIS", price:79,  airline:"TAP",      changes:0, weeks:4 },
      { destination:"MAD", price:72,  airline:"Iberia",   changes:0, weeks:3 },
      { destination:"FCO", price:95,  airline:"Ryanair",  changes:0, weeks:4 },
      { destination:"AMS", price:64,  airline:"KLM",      changes:0, weeks:3 },
      { destination:"ATH", price:115, airline:"easyJet",  changes:0, weeks:5 },
      { destination:"PRG", price:69,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"DXB", price:249, airline:"Emirates", changes:0, weeks:6 },
      { destination:"BKK", price:399, airline:"Thai",     changes:1, weeks:8 },
      { destination:"NRT", price:549, airline:"JAL",      changes:1, weeks:10},
      { destination:"JFK", price:299, airline:"Virgin",   changes:0, weeks:6 },
      { destination:"AYT", price:129, airline:"TUI",      changes:0, weeks:7 },
    ],
    LGW: [
      { destination:"BCN", price:55,  airline:"Vueling",  changes:0, weeks:3 },
      { destination:"PMI", price:69,  airline:"easyJet",  changes:0, weeks:4 },
      { destination:"AGP", price:74,  airline:"easyJet",  changes:0, weeks:3 },
      { destination:"AYT", price:89,  airline:"TUI",      changes:0, weeks:5 },
      { destination:"DXB", price:239, airline:"flydubai",  changes:0, weeks:6 },
      { destination:"FAO", price:84,  airline:"easyJet",  changes:0, weeks:4 },
      { destination:"LIS", price:72,  airline:"TAP",      changes:0, weeks:4 },
      { destination:"TFS", price:149, airline:"TUI",      changes:0, weeks:8 },
    ],
    MAN: [
      { destination:"BCN", price:49,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"MAD", price:59,  airline:"Jet2",     changes:0, weeks:3 },
      { destination:"PMI", price:62,  airline:"Jet2",     changes:0, weeks:4 },
      { destination:"AYT", price:89,  airline:"Jet2",     changes:0, weeks:5 },
      { destination:"DXB", price:259, airline:"Emirates", changes:0, weeks:6 },
      { destination:"ATH", price:110, airline:"Ryanair",  changes:1, weeks:4 },
      { destination:"FCO", price:99,  airline:"Ryanair",  changes:1, weeks:4 },
    ],
    EDI: [
      { destination:"BCN", price:55,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"FCO", price:95,  airline:"Ryanair",  changes:1, weeks:4 },
      { destination:"AGP", price:79,  airline:"Ryanair",  changes:0, weeks:5 },
      { destination:"AMS", price:69,  airline:"KLM",      changes:0, weeks:3 },
      { destination:"DXB", price:289, airline:"Emirates", changes:1, weeks:6 },
    ],
    BHX: [
      { destination:"BCN", price:54,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"MAD", price:64,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"PMI", price:69,  airline:"Jet2",     changes:0, weeks:4 },
      { destination:"AYT", price:99,  airline:"Jet2",     changes:0, weeks:5 },
      { destination:"FAO", price:79,  airline:"Ryanair",  changes:0, weeks:4 },
    ],
    BRS: [
      { destination:"BCN", price:52,  airline:"easyJet",  changes:0, weeks:3 },
      { destination:"LIS", price:74,  airline:"easyJet",  changes:0, weeks:4 },
      { destination:"PMI", price:64,  airline:"easyJet",  changes:0, weeks:4 },
      { destination:"MAD", price:69,  airline:"easyJet",  changes:0, weeks:3 },
      { destination:"DXB", price:279, airline:"Emirates", changes:1, weeks:6 },
    ],
    GLA: [
      { destination:"BCN", price:64,  airline:"Ryanair",  changes:0, weeks:3 },
      { destination:"MAD", price:74,  airline:"Ryanair",  changes:1, weeks:3 },
      { destination:"AGP", price:79,  airline:"Jet2",     changes:0, weeks:5 },
      { destination:"DXB", price:299, airline:"Emirates", changes:1, weeks:6 },
    ],
  };

  const rows = tables[origin] || tables.LHR;
  return rows.map(r => {
    const dep  = futureDate(r.weeks);
    const ret  = addDays(dep, 7);
    const g    = grade(r.price, r.destination);
    return {
      origin:             origin,
      destination:        r.destination,
      value:              r.price,
      price:              r.price,
      depart_date:        dep,
      return_date:        ret,
      number_of_changes:  r.changes,
      airline:            r.airline,
      deal_score:         g.score,
      deal_grade:         g.grade,
      deal_label:         g.label,
      deal_color:         g.grade,
      seats_left:         seats(r.price, r.airline),
      booking_url:        bookingUrl(origin, r.destination, dep, ret, 2),
      _fallback:          true,
    };
  });
}

// ── Enrich items from live API ────────────────────────────────────
function enrich(items, origin, params) {
  return items.map(item => {
    const price   = item.price || item.value || 0;
    const dest    = (item.destination || "").toUpperCase();
    const dep     = item.depart_date || item.departure_at || params.depart_date || "";
    // FIX: derive return_date from dep if missing, so booking_url always has both dates
    const ret     = item.return_date || params.return_date || (dep ? addDays(dep, 7) : "");
    const adults  = parseInt(params.adults) || 2;
    const g       = grade(price, dest);
    return Object.assign({}, item, {
      deal_score:  g.score,
      deal_grade:  g.grade,
      deal_label:  g.label,
      deal_color:  g.grade,
      seats_left:  seats(price, item.airline),
      booking_url: item.booking_url || bookingUrl((params.origin||"LHR").toUpperCase(), dest, dep, ret, adults),
    });
  });
}

// ── Main handler ──────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  const params   = event.queryStringParameters || {};
  const type     = params.type || "search";
  const cacheKey = type + ":" + JSON.stringify(params);
  const cached   = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers: Object.assign({}, cors, {"X-Cache":"HIT"}), body: JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;

  // ── No token → return rich static fallback immediately ──────────
  if (!token) {
    const origin = (params.origin || params.destination || "LHR").toUpperCase();
    let result;

    if (type === "top_deals") {
      const fb = getFallbackDeals(origin);
      result = { success:true, data: fb, _source:"fallback" };
    } else if (type === "search") {
      const dest   = (params.destination || "BCN").toUpperCase();
      const dep    = params.depart_date || addDays(new Date().toISOString().slice(0,10), 21);
      const ret    = params.return_date || addDays(dep, 7);
      const adults = parseInt(params.adults) || 1;
      const g      = grade(200, dest);
      result = {
        success: true,
        data: [{
          origin, destination:dest, price:200, value:200,
          depart_date:dep, return_date:ret, number_of_changes:0,
          airline:"Multiple airlines", deal_grade:g.grade,
          deal_score:g.score, deal_label:g.label, deal_color:g.grade,
          seats_left:5, booking_url:bookingUrl(origin, dest, dep, ret, adults),
          _fallback:true,
        }],
        _source: "fallback",
        _note:   "Set TRAVELPAYOUTS_TOKEN in Netlify env vars for live prices",
      };
    } else {
      result = { success:true, data: getFallbackDeals(origin), _source:"fallback" };
    }

    cacheSet(cacheKey, result);
    return { statusCode:200, headers: Object.assign({}, cors, {"X-Cache":"FALLBACK"}), body: JSON.stringify(result) };
  }

  // ── Live API path ────────────────────────────────────────────────
  try {
    let data;
    if      (type === "top_deals")  data = await fetchTopDeals(params, token);
    else if (type === "packages")   data = await fetchPackages(params, token);
    else                            data = await fetchFlights(params, token);

    if (data && Array.isArray(data.data)) {
      data.data = enrich(data.data, (params.origin||"LHR").toUpperCase(), params);
    }

    // If live API returned empty, splice in fallback
    if (!data || !data.data || !data.data.length) {
      const origin = (params.origin || "LHR").toUpperCase();
      data = { success:true, data: getFallbackDeals(origin), _source:"fallback_after_empty" };
    }

    data.marker = MARKER;
    cacheSet(cacheKey, data);
    return { statusCode:200, headers: Object.assign({}, cors, {"X-Cache":"MISS"}), body: JSON.stringify(data) };
  } catch (err) {
    // Live API failed → return fallback, never a 500
    const origin = (params.origin || "LHR").toUpperCase();
    const fb     = { success:true, data: getFallbackDeals(origin), _source:"fallback_error", _error: err.message };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers: Object.assign({}, cors, {"X-Cache":"FALLBACK"}), body: JSON.stringify(fb) };
  }
};

// ── TravelPayouts API calls ───────────────────────────────────────
async function fetchFlights(params, token) {
  const q = new URLSearchParams({ origin:params.origin, destination:params.destination, currency:"GBP", locale:"en", token });
  if (params.depart_date) q.set("depart_date", params.depart_date);
  if (params.return_date) q.set("return_date", params.return_date);
  // FIX: adults was missing — API returned 1-pax price even when user picked 2+
  q.set("adults", String(parseInt(params.adults) || 2));
  return fetchJson("https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + q);
}

async function fetchTopDeals(params, token) {
  const origin = (params.origin || "LHR").toUpperCase();
  const limit  = parseInt(params.limit) || 12;

  // Try grouped_prices first
  try {
    const q = new URLSearchParams({ origin, currency:"GBP", limit, one_way:"false", token });
    const d = await fetchJson("https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q);
    if (d && d.data && Object.keys(d.data).length > 0) {
      const items = Object.values(d.data).map(x => ({
        origin, destination:(x.destination||x.iata||"").toUpperCase(),
        value:x.price, price:x.price,
        depart_date:x.depart_date||"", return_date:x.return_date||"",
        number_of_changes:x.transfers ?? 0, airline:x.airline||"",
      })).filter(x => x.destination && x.value > 0).slice(0, limit);
      if (items.length) return { success:true, data:items };
    }
  } catch(e) { /* fall through */ }

  // Fallback to v1/cheap
  const q2 = new URLSearchParams({ origin, currency:"GBP", period_type:"year", one_way:"false", show_to_affiliates:"true", sorting:"price", trip_class:"0", limit, token });
  const d2 = await fetchJson("https://api.travelpayouts.com/v1/prices/cheap?" + q2);
  if (d2 && d2.data) {
    const items = [];
    for (const dest in d2.data) {
      const trips = d2.data[dest];
      const trip  = trips[0] || trips[Object.keys(trips)[0]];
      if (trip) items.push({ origin, destination:dest, value:trip.price, price:trip.price, depart_date:trip.departure_at||"", return_date:trip.return_at||"", number_of_changes:trip.transfers??0, airline:trip.airline||"" });
    }
    items.sort((a,b) => a.value - b.value);
    return { success:true, data:items.slice(0, limit) };
  }
  return { success:false, data:[] };
}

async function fetchPackages(params, token) {
  const nights = parseInt(params.nights) || 7;
  const adults = parseInt(params.adults) || 2;
  const fd     = await fetchTopDeals({ origin:params.origin, limit:String(limit) }, token);
  if (fd && fd.data && fd.data.length) {
    const items = fd.data.map(f => {
      const ret = f.depart_date ? addDays(f.depart_date, nights) : "";
      const hotelEst = nights * 60;
      return Object.assign({}, f, { price:(f.price||0)+hotelEst, value:(f.value||0)+hotelEst, flight_only:f.price||0, hotel_est:hotelEst, return_date:ret, nights, type:"package_estimate" });
    });
    return { success:true, data:items.slice(0,limit) };
  }
  return { success:false, data:[] };
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const token = url.match(/token=([^&]+)/)?.[1];
    const req = https.get(url, { headers:{ "X-Access-Token":token||"", "Content-Type":"application/json", "User-Agent":"TripHunt/1.0" } }, res => {
      if (res.statusCode === 429) { reject(new Error("Rate limit")); return; }
      if (res.statusCode === 401 || res.statusCode === 403) { reject(new Error("Auth error " + res.statusCode)); return; }
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        if (!body.trim()) { reject(new Error("Empty response " + res.statusCode)); return; }
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Bad JSON: " + body.slice(0,100))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}
