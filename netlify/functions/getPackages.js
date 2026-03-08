// TripHunt -- getPackages.js
// Package Deal Generator: combines cheap flights with hotel estimates
// Flight links → Aviasales, Hotel links → Booking.com

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER      = process.env.TRAVELPAYOUTS_MARKER || "499405";
const BOOKING_AID = "304142";
const CACHE_TTL   = 20 * 60 * 1000;
const _cache      = new Map();

function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.d;
}
function cacheSet(k, d) {
  _cache.set(k, { d, ts: Date.now() });
  if (_cache.size > 100) _cache.delete(_cache.keys().next().value);
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

// ── Destination data ──────────────────────────────────────────────
const DESTINATIONS = [
  { iata:"BCN", name:"Barcelona",  country:"Spain",        hotel_per_night:90,  city_tax:3.5 },
  { iata:"MAD", name:"Madrid",     country:"Spain",        hotel_per_night:80,  city_tax:1.5 },
  { iata:"LIS", name:"Lisbon",     country:"Portugal",     hotel_per_night:75,  city_tax:2   },
  { iata:"FCO", name:"Rome",       country:"Italy",        hotel_per_night:95,  city_tax:3   },
  { iata:"AMS", name:"Amsterdam",  country:"Netherlands",  hotel_per_night:110, city_tax:7   },
  { iata:"ATH", name:"Athens",     country:"Greece",       hotel_per_night:70,  city_tax:1.5 },
  { iata:"DXB", name:"Dubai",      country:"UAE",          hotel_per_night:120, city_tax:0   },
  { iata:"AYT", name:"Antalya",    country:"Turkey",       hotel_per_night:65,  city_tax:1   },
  { iata:"PMI", name:"Palma",      country:"Spain",        hotel_per_night:80,  city_tax:2   },
  { iata:"PRG", name:"Prague",     country:"Czech Rep.",   hotel_per_night:60,  city_tax:1   },
  { iata:"VIE", name:"Vienna",     country:"Austria",      hotel_per_night:85,  city_tax:3.2 },
  { iata:"BKK", name:"Bangkok",    country:"Thailand",     hotel_per_night:55,  city_tax:0   },
  { iata:"NRT", name:"Tokyo",      country:"Japan",        hotel_per_night:100, city_tax:1.5 },
  { iata:"JFK", name:"New York",   country:"USA",          hotel_per_night:180, city_tax:14  },
];

function buildHotelUrl(destName, checkin, checkout, adults) {
  const p = new URLSearchParams({
    ss:           destName,
    checkin:      checkin  || "",
    checkout:     checkout || "",
    group_adults: adults || 2,
    no_rooms:     1,
    aid:          BOOKING_AID,
    label:        "triphunt-packages",
    lang:         "en-gb",
    currency:     "GBP",
  });
  return "https://www.booking.com/searchresults.html?" + p;
}

// ── Static fallback packages ──────────────────────────────────────
function getFallbackPackages(origin, nights, adults) {
  const dep = defaultDep();
  const ret = addDays(dep, nights);
  const FLIGHT_PRICES = {
    BCN: { LHR:89,  LGW:55,  MAN:49,  EDI:55  },
    MAD: { LHR:72,  LGW:68,  MAN:59,  EDI:74  },
    LIS: { LHR:79,  LGW:72,  MAN:89,  EDI:89  },
    FCO: { LHR:95,  MAN:99,  EDI:95,  BHX:89  },
    AMS: { LHR:64,  MAN:75,  EDI:69,  BHX:79  },
    DXB: { LHR:249, LGW:239, MAN:259, EDI:289 },
    AYT: { LHR:129, LGW:89,  MAN:89,  BHX:99  },
    BKK: { LHR:399, MAN:449 },
    JFK: { LHR:299, MAN:349 },
    ATH: { LHR:115, MAN:110 },
  };

  return DESTINATIONS.slice(0, 8).map(dest => {
    const prices      = FLIGHT_PRICES[dest.iata] || {};
    const flightPrice = prices[origin] || prices.LHR || 150;
    const hotelTotal  = dest.hotel_per_night * nights;
    const totalPP     = Math.round(flightPrice + (hotelTotal / Math.max(1, Math.ceil(adults/2))));
    const total       = totalPP * adults;
    const link        = "/" + origin + ddmm(dep) + dest.iata + ddmm(ret) + adults + "1";
    return {
      destination:  dest.iata,
      dest_name:    dest.name,
      country:      dest.country,
      origin,
      flight_price: flightPrice,
      hotel_price:  hotelTotal,
      hotel_per_night: dest.hotel_per_night,
      total_per_person: totalPP,
      total,
      nights,
      adults,
      depart_date:  dep,
      return_date:  ret,
      link,
      flight_url:   "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB",
      hotel_url:    buildHotelUrl(dest.name, dep, ret, adults),
      _fallback:    true,
    };
  }).sort((a, b) => a.total_per_person - b.total_per_person);
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
  const nights = parseInt(params.nights) || 7;
  const adults = parseInt(params.adults) || 2;
  const limit  = parseInt(params.limit)  || 8;
  const dep    = params.depart_date || defaultDep();
  const ret    = params.return_date || addDays(dep, nights);

  const cacheKey = `packages:${origin}:${nights}:${adults}:${dep}`;
  const cached   = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    const fb = { success:true, data:getFallbackPackages(origin, nights, adults).slice(0, limit), _source:"fallback" };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }

  try {
    // Fetch cheap deals from origin, then wrap each with hotel estimates
    const q = new URLSearchParams({ origin, currency:"GBP", limit:String(limit * 2), one_way:"false", token });
    const raw = await fetchJson("https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q);

    let items = [];
    if (raw && raw.data) {
      for (const [destKey, x] of Object.entries(raw.data)) {
        const dest = DESTINATIONS.find(d => d.iata === destKey.toUpperCase());
        if (!dest || !x.price) continue;
        const flightPrice = x.price;
        const d           = x.depart_date ? x.depart_date.slice(0,10) : dep;
        const r           = x.return_date ? x.return_date.slice(0,10) : addDays(d, nights);
        const hotelTotal  = dest.hotel_per_night * nights;
        const totalPP     = Math.round(flightPrice + (hotelTotal / Math.max(1, Math.ceil(adults/2))));
        const total       = totalPP * adults;
        const link        = x.link || ("/" + origin + ddmm(d) + dest.iata + ddmm(r) + adults + "1");
        items.push({
          destination:      dest.iata,
          dest_name:        dest.name,
          country:          dest.country,
          origin,
          flight_price:     flightPrice,
          hotel_price:      hotelTotal,
          hotel_per_night:  dest.hotel_per_night,
          total_per_person: totalPP,
          total,
          nights,
          adults,
          depart_date:      d,
          return_date:      r,
          airline:          x.airline || "",
          link,
          flight_url:  x.link
            ? "https://www.aviasales.com" + x.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
            : "https://www.aviasales.com/search/" + origin + ddmm(d) + dest.iata + ddmm(r) + adults + "1?marker=" + MARKER + "&currency=GBP&locale=en-GB",
          hotel_url: buildHotelUrl(dest.name, d, r, adults),
        });
      }
      items.sort((a, b) => a.total_per_person - b.total_per_person);
      items = items.slice(0, limit);
    }

    if (!items.length) items = getFallbackPackages(origin, nights, adults).slice(0, limit);

    const result = { success:true, data:items, marker:MARKER, _source: items[0]?._fallback ? "fallback" : "live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };

  } catch(err) {
    const fb = { success:true, data: getFallbackPackages(origin, nights, adults).slice(0, limit), _source:"fallback_error", _error:err.message };
    cacheSet(cacheKey, fb);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"FALLBACK" }, body:JSON.stringify(fb) };
  }
};
