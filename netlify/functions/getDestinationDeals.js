// TripHunt -- getDestinationDeals.js
// Fetches deals to a specific destination from multiple UK origins.
// Used by destination SEO pages to show live prices without changing page structure.

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes
const _cache    = new Map();

function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.d;
}
function cacheSet(k, d) {
  _cache.set(k, { d, ts: Date.now() });
  if (_cache.size > 300) _cache.delete(_cache.keys().next().value);
}

// UK hub airports to scan from
const UK_HUBS = ["LHR", "LGW", "MAN", "EDI", "BHX", "BRS", "LBA"];

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
function gradePrice(price, iata) {
  const avg = ROUTE_AVG[iata] || 250;
  const r   = price / avg;
  if (r <= 0.60) return { grade:"exceptional", label:"🔥 Exceptional Deal" };
  if (r <= 0.75) return { grade:"great",       label:"🔥 Great Deal"       };
  if (r <= 0.90) return { grade:"good",        label:"✓ Good Price"        };
  if (r <= 1.05) return { grade:"fair",        label:"· Fair Price"        };
  return               { grade:"high",        label:"↑ Above Average"     };
}

// Static fallback: cheapest known prices to each destination from each hub
const DEST_PRICES = {
  BCN: { LHR:89, LGW:55, MAN:49, EDI:55, BHX:54, BRS:52 },
  MAD: { LHR:72, LGW:68, MAN:59, EDI:74, BHX:64, BRS:69 },
  LIS: { LHR:79, LGW:72, MAN:89, EDI:89, BRS:74 },
  FCO: { LHR:95, MAN:99, EDI:95, BHX:89 },
  DXB: { LHR:249, LGW:239, MAN:259, EDI:289, BHX:269 },
  AMS: { LHR:64, MAN:75, EDI:69, BHX:79 },
  ATH: { LHR:115, MAN:110, BHX:119 },
  PMI: { LGW:69, MAN:62, BHX:69, BRS:64 },
  AYT: { LHR:129, LGW:89, MAN:89, BHX:99 },
  PRG: { LHR:69, MAN:79, EDI:85 },
  JFK: { LHR:299, MAN:349 },
  BKK: { LHR:399, MAN:449 },
};

function getFallbackDestDeals(destination) {
  const prices = DEST_PRICES[destination] || {};
  const now    = new Date();
  const dep    = (() => { const d = new Date(now); d.setDate(d.getDate()+21); while(d.getDay()!==2) d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  const ret    = (() => { const d = new Date(dep); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); })();
  const hubs   = Object.keys(prices).length ? Object.keys(prices) : ["LHR"];
  return hubs.map(origin => {
    const price = prices[origin] || 150;
    const g     = gradePrice(price, destination);
    const link  = "/" + origin + ddmm(dep) + destination + ddmm(ret) + "21";
    return {
      origin,
      destination,
      price,
      depart_date:  dep,
      return_date:  ret,
      deal_grade:   g.grade,
      deal_label:   g.label,
      link,
      booking_url:  "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB",
      _fallback:    true,
    };
  }).sort((a, b) => a.price - b.price);
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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const params      = event.queryStringParameters || {};
  const destination = (params.destination || "BCN").toUpperCase();
  const limit       = parseInt(params.limit) || 6;
  const cacheKey    = `destdeals:${destination}:${limit}`;
  const cached      = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    const fb = { success:true, data:getFallbackDestDeals(destination).slice(0,limit), _source:"fallback" };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }

  try {
    // Query top UK airports in parallel (limit concurrency to 4)
    const hubs = UK_HUBS.slice(0, 4);
    const results = await Promise.allSettled(hubs.map(async (origin) => {
      const q = new URLSearchParams({ origin, destination, currency:"GBP", locale:"en", one_way:"false", token });
      const data = await fetchJson("https://api.travelpayouts.com/v1/prices/cheap?" + q);
      if (!data || !data.data || !data.data[destination]) return null;
      const trips = data.data[destination];
      const trip  = trips[0] || trips[Object.keys(trips)[0]];
      if (!trip) return null;
      const dep  = trip.departure_at ? trip.departure_at.slice(0,10) : defaultDep();
      const ret  = trip.return_at    ? trip.return_at.slice(0,10)    : defaultRet(dep);
      const g    = gradePrice(trip.price, destination);
      const link = trip.link || ("/" + origin + ddmm(dep) + destination + ddmm(ret) + "21");
      return {
        origin, destination,
        price:             trip.price,
        airline:           trip.airline || "",
        depart_date:       dep,
        return_date:       ret,
        number_of_changes: trip.transfers ?? 0,
        deal_grade:        g.grade,
        deal_label:        g.label,
        link,
        booking_url: trip.link
          ? "https://www.aviasales.com" + trip.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
          : "https://www.aviasales.com/search/" + origin + ddmm(dep) + destination + ddmm(ret) + "21?marker=" + MARKER + "&currency=GBP&locale=en-GB",
      };
    }));

    let items = results
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value)
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);

    if (!items.length) items = getFallbackDestDeals(destination).slice(0, limit);

    const result = { success:true, data:items, marker:MARKER, _source: items[0]?._fallback ? "fallback" : "live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };

  } catch(err) {
    const fb = { success:true, data:getFallbackDestDeals(destination).slice(0,limit), _source:"fallback_error", _error:err.message };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }
};
