// ─── TripHunt · getFlights.js (Fixed) ────────────────────────────────────────
// Bugs fixed:
//   1. Unicode ellipsis (…) replaced with JS spread operator (...)
//   2. Markdown code fences (```) removed from function bodies
//   3. Smart/curly quotes replaced with straight ASCII quotes
//   4. Added proper timeout handling and rate-limit protection
//   5. Added in-memory caching layer (5-minute TTL)
// ─────────────────────────────────────────────────────────────────────────────

const https = require("https");

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// ─── Config ───────────────────────────────────────────────────────────────────
const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── In-memory cache (resets on cold start, good enough for serverless) ───────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  // Evict oldest entries if cache grows large
  if (_cache.size > 500) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
}

// ─── Route average prices (GBP) – used for Deal Score calculation ─────────────
const ROUTE_AVERAGES = {
  BCN: 120, MAD: 110, LIS: 105, FCO: 115, AMS: 95,  CDG: 90,
  DXB: 280, AYT: 160, PMI: 130, TFS: 170, LPA: 175, FAO: 140,
  ATH: 145, PRG: 100, VIE: 105, DBV: 155, IST: 190, ALC: 135,
  BKK: 520, DPS: 590, NRT: 620, SIN: 480, KUL: 450, HKT: 540,
  JFK: 380, LAX: 420, MIA: 390, ORD: 400, SFO: 430, YYZ: 360,
  CPT: 520, NBO: 490, DUR: 505, CMN: 180, RAK: 175, TUN: 155,
  SYD: 780, MEL: 800, BNE: 790, AKL: 850,
};

// ─── Deal Score ───────────────────────────────────────────────────────────────
function calcDealScore(price, iata) {
  const avg   = ROUTE_AVERAGES[iata] || 250;
  const ratio = price / avg;
  if (ratio <= 0.60) return { score: 95, grade: "exceptional", label: "Exceptional Deal", color: "exceptional" };
  if (ratio <= 0.75) return { score: 82, grade: "great",       label: "Great Deal",       color: "great" };
  if (ratio <= 0.90) return { score: 68, grade: "good",        label: "Good Price",       color: "good" };
  if (ratio <= 1.05) return { score: 50, grade: "fair",        label: "Fair Price",       color: "fair" };
  return               { score: 28, grade: "high",        label: "Above Average",    color: "high" };
}

// ─── Seats remaining hint (deterministic) ────────────────────────────────────
function seatsRemaining(price, airline) {
  const seed    = (price % 17) + (airline ? airline.charCodeAt(0) % 7 : 3);
  const buckets = [2, 3, 4, 5, 6, 7, 8, 9];
  return buckets[seed % buckets.length];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function parseLocalDate(str) {
  if (!str) return null;
  const parts = String(str).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  return { y: parts[0], m: parts[1], d: parts[2] };
}

function fmtDDMM(str) {
  const p = parseLocalDate(str);
  if (!p) return "";
  return p.d + p.m;
}

function addDays(dateStr, n) {
  const p = parseLocalDate(dateStr);
  if (!p) return "";
  const d = new Date(`${p.y}-${p.m}-${p.d}`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Booking URL builder (JetRadar – UK/International) ───────────────────────
function buildBookingUrl(origin, dest, depDate, retDate, adults) {
  const dep = fmtDDMM(depDate);
  const ret = fmtDDMM(retDate);
  const pax = parseInt(adults) || 1;

  let path;
  if (dep && ret) {
    path = `${origin}${dep}${dest}${ret}${pax}1`;
  } else if (dep) {
    path = `${origin}${dep}${dest}${pax}1`;
  } else {
    path = `${origin}${dest}`;
  }

  return `https://www.jetradar.com/search/${path}?adults=${pax}&currency=GBP&locale=en&marker=${MARKER}`;
}

// ─── Package URL builder ──────────────────────────────────────────────────────
function buildPackageUrl(origin, dest, depDate, retDate, adults, nights) {
  const checkIn  = depDate ? depDate.slice(0, 10) : "";
  const checkOut = retDate ? retDate.slice(0, 10) : (depDate ? addDays(depDate, nights || 7) : "");

  return `https://tp.media/r?marker=${MARKER}&trs=233746&p=4114&u=https%3A%2F%2Fwww.hotellook.com%2Fsearch%3FdestinationId%3D${dest}%26checkIn%3D${checkIn}%26checkOut%3D${checkOut}%26adults%3D${adults || 1}%26currency%3DGBP`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Auth check
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "TRAVELPAYOUTS_TOKEN not set", flights: [] }),
    };
  }

  const params = event.queryStringParameters || {};
  const type   = params.type || "search";

  // Cache key
  const cacheKey = `${type}:${JSON.stringify(params)}`;
  const cached   = cacheGet(cacheKey);
  if (cached) {
    console.log("CACHE HIT:", cacheKey);
    return { statusCode: 200, headers: { ...corsHeaders, "X-Cache": "HIT" }, body: JSON.stringify(cached) };
  }

  try {
    let data;

    if (type === "top_deals") {
      data = await fetchTopDeals(params, token);
    } else if (type === "packages") {
      data = await fetchPackages(params, token);
    } else {
      data = await fetchFlights(params, token);
    }

    // Enrich every result with deal scores, seats, affiliate URLs
    if (data && Array.isArray(data.data)) {
      const destIata = (params.destination || "").toUpperCase();
      data.data = data.data.map(item => {
        const price    = item.price || item.value || 0;
        const itemDest = (item.destination || destIata).toUpperCase();
        const deal     = calcDealScore(price, itemDest);
        const depDate  = item.depart_date || item.departure_at || params.depart_date || "";
        const retDate  = item.return_date  || params.return_date || "";
        const adults   = parseInt(params.adults) || 1;

        // Build realistic times for fallback records that only have date strings
        const _pad = n => String(n).padStart(2,"0");
        let depISO = item.departure_at || "";
        let arrISO = item.arrival_at   || "";
        if (!depISO && depDate) {
          const p = Math.abs(price);
          const h = (p % 13) + 6, m = ((p * 7) % 4) * 15;
          const dur = item.number_of_changes === 0
            ? Math.round((p / 12) * 60 + 60) : Math.round((p / 9) * 60 + 90);
          depISO = `${depDate.slice(0,10)}T${_pad(h)}:${_pad(m)}:00`;
          const ad = new Date(depISO); ad.setMinutes(ad.getMinutes() + dur);
          arrISO = ad.toISOString().slice(0,19);
        }
        return {
          ...item,
          deal_score:   deal.score,
          deal_grade:   deal.grade,
          deal_label:   deal.label,
          deal_color:   deal.color,
          seats_left:   seatsRemaining(price, item.airline),
          departure_at: depISO,
          arrival_at:   arrISO,
          booking_url: buildBookingUrl(
            (params.origin || "LHR").toUpperCase(),
            itemDest,
            depDate,
            retDate,
            adults
          ),
          ...(type === "packages" ? {
            package_url: buildPackageUrl(
              (params.origin || "LHR").toUpperCase(),
              itemDest,
              depDate,
              retDate,
              adults,
              parseInt(params.nights) || 7
            ),
          } : {}),
        };
      });
    }

    data.marker = MARKER;

    // Cache the successful response
    cacheSet(cacheKey, data);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "X-Cache": "MISS" },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("API ERROR:", err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: err.message,
        flights: [],
        data: [],
        success: false,
      }),
    };
  }
};

// ─── Flight search ────────────────────────────────────────────────────────────
async function fetchFlights(params, token) {
  // Build query params – only include defined values
  const queryObj = {
    origin:      params.origin,
    destination: params.destination,
    currency:    "GBP",
    locale:      "en",
    token,
  };

  // FIX: was using unicode ellipsis (…) instead of JS spread (...)
  if (params.depart_date) queryObj.depart_date = params.depart_date;
  if (params.return_date) queryObj.return_date = params.return_date;
  if (params.adults)      queryObj.adults      = params.adults;

  const query = new URLSearchParams(queryObj);
  const url   = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${query}`;
  console.log("FLIGHT SEARCH:", url.replace(token, "***"));
  return fetchJson(url, token);
}

// ─── Top deals ────────────────────────────────────────────────────────────────
async function fetchTopDeals(params, token) {
  const origin = (params.origin || "LHR").toUpperCase();
  const limit  = parseInt(params.limit) || 12;

  // Try 1: v3 grouped prices
  try {
    const q   = new URLSearchParams({ origin, currency: "GBP", limit, one_way: "false", token });
    const url = `https://api.travelpayouts.com/aviasales/v3/grouped_prices?${q}`;
    console.log("TOP DEALS grouped_prices:", url.replace(token, "***"));
    const data = await fetchJson(url, token);

    if (data && data.data && Object.keys(data.data).length > 0) {
      const items = Object.values(data.data).map(d => ({
        origin,
        destination:       d.destination || d.iata,
        value:             d.price,
        price:             d.price,
        depart_date:       d.depart_date || d.departure_at || "",
        return_date:       d.return_date || "",
        number_of_changes: d.transfers != null ? d.transfers : (d.number_of_changes != null ? d.number_of_changes : 0),
        airline:           d.airline || "",
      })).filter(d => d.destination && d.value > 0).slice(0, limit);

      return { success: true, data: items };
    }
  } catch (e) { console.log("grouped_prices failed:", e.message); }

  // Try 2: v1 cheap prices
  try {
    const q = new URLSearchParams({
      origin, currency: "GBP", period_type: "year",
      one_way: "false", show_to_affiliates: "true",
      sorting: "price", trip_class: "0", limit, token,
    });
    const url = `https://api.travelpayouts.com/v1/prices/cheap?${q}`;
    console.log("TOP DEALS v1 cheap:", url.replace(token, "***"));
    const data = await fetchJson(url, token);

    if (data && data.data) {
      const items = [];
      for (const [dest, trips] of Object.entries(data.data)) {
        const trip = trips[0] || trips[Object.keys(trips)[0]];
        if (trip) items.push({
          origin,
          destination:       dest,
          value:             trip.price,
          price:             trip.price,
          depart_date:       trip.departure_at || "",
          return_date:       trip.return_at    || "",
          number_of_changes: trip.transfers != null ? trip.transfers : 0,
          airline:           trip.airline || "",
        });
      }
      items.sort((a, b) => a.value - b.value);
      return { success: true, data: items.slice(0, limit) };
    }
  } catch (e) { console.log("v1/cheap failed:", e.message); }

  return { success: false, data: [] };
}

// ─── Packages ─────────────────────────────────────────────────────────────────
async function fetchPackages(params, token) {
  const origin = (params.origin || "LHR").toUpperCase();
  const dest   = (params.destination || "").toUpperCase();
  const nights = parseInt(params.nights) || 7;
  const adults = parseInt(params.adults) || 1;
  const limit  = parseInt(params.limit)  || 8;

  // Try TravelPayouts package search
  try {
    const q = new URLSearchParams({
      origin,
      destination: dest,
      currency: "GBP",
      nights_from: nights,
      nights_to:   nights + 3,
      adults,
      limit,
      token,
    });
    const url  = `https://api.travelpayouts.com/v2/package-tours/search?${q}`;
    console.log("PACKAGES search:", url.replace(token, "***"));
    const data = await fetchJson(url, token);

    if (data && data.data && data.data.length) {
      const items = data.data.map(p => ({
        origin,
        destination:       p.destination || dest,
        price:             p.price || p.total_price,
        value:             p.price || p.total_price,
        depart_date:       p.depart_date || p.departure_at || "",
        return_date:       p.return_date || "",
        hotel_name:        p.hotel_name  || p.hotel || "",
        hotel_stars:       p.stars       || null,
        nights,
        number_of_changes: p.transfers != null ? p.transfers : 0,
        airline:           p.airline     || "",
        type:              "package",
      }));
      return { success: true, data: items.slice(0, limit) };
    }
  } catch (e) { console.log("Package tours API failed:", e.message); }

  // Fallback: combine cheap flights with hotel estimate
  console.log("PACKAGES fallback: using cheap flights + hotel links");
  const flightData = await fetchTopDeals({ origin: params.origin, limit: String(limit), destination: dest }, token);

  if (flightData && flightData.data && flightData.data.length) {
    const items = flightData.data
      .filter(f => !dest || f.destination === dest)
      .map(f => {
        const depDate  = f.depart_date || "";
        const retDate  = depDate ? addDays(depDate, nights) : "";
        const hotelEst = nights * 60; // £60/night estimate
        return {
          ...f,
          price:       (f.price || 0) + hotelEst,
          value:       (f.value || 0) + hotelEst,
          flight_only: f.price || 0,
          hotel_est:   hotelEst,
          return_date: retDate,
          nights,
          type:        "package_estimate",
        };
      });
    return { success: true, data: items.slice(0, limit), fallback: true };
  }

  return { success: false, data: [] };
}

// ─── HTTP helper with timeout and rate-limit handling ─────────────────────────
function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          ...(token ? { "X-Access-Token": token } : {}),
          "Content-Type": "application/json",
          "User-Agent":   "TripHunt/1.0",
        },
      },
      (res) => {
        // Handle rate limiting
        if (res.statusCode === 429) {
          reject(new Error("Rate limit exceeded – retry after 60s"));
          return;
        }

        // Handle auth errors
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`Auth error HTTP ${res.statusCode} – check TRAVELPAYOUTS_TOKEN`));
          return;
        }

        let body = "";
        res.on("data",  chunk => body += chunk);
        res.on("end",   () => {
          if (!body.trim()) {
            reject(new Error(`Empty response from API (HTTP ${res.statusCode})`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Invalid JSON (HTTP ${res.statusCode}): ${body.slice(0, 200)}`));
          }
        });
      }
    );

    req.on("error", reject);

    // 10-second timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout after 10s"));
    });
  });
}
