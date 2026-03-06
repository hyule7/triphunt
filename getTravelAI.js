// TripHunt - getFlights.js
const https = require("https");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL_MS = 5 * 60 * 1000;
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 500) _cache.delete(_cache.keys().next().value);
}

const ROUTE_AVERAGES = {
  BCN:120,MAD:110,LIS:105,FCO:115,AMS:95,CDG:90,DXB:280,AYT:160,
  PMI:130,TFS:170,LPA:175,FAO:140,ATH:145,PRG:100,VIE:105,DBV:155,
  IST:190,ALC:135,BKK:520,DPS:590,NRT:620,SIN:480,KUL:450,HKT:540,
  JFK:380,LAX:420,MIA:390,ORD:400,SFO:430,YYZ:360,CPT:520,NBO:490,
  SYD:780,MEL:800,BNE:790,AKL:850
};

function calcDealScore(price, iata) {
  const avg = ROUTE_AVERAGES[iata] || 250;
  const ratio = price / avg;
  if (ratio <= 0.60) return { score:95, grade:"exceptional", label:"Exceptional Deal", color:"exceptional" };
  if (ratio <= 0.75) return { score:82, grade:"great",       label:"Great Deal",       color:"great" };
  if (ratio <= 0.90) return { score:68, grade:"good",        label:"Good Price",       color:"good" };
  if (ratio <= 1.05) return { score:50, grade:"fair",        label:"Fair Price",       color:"fair" };
  return               { score:28, grade:"high",        label:"Above Average",    color:"high" };
}

function seatsRemaining(price, airline) {
  const seed = (price % 17) + (airline ? airline.charCodeAt(0) % 7 : 3);
  return [2,3,4,5,6,7,8,9][seed % 8];
}

function fmtDDMM(str) {
  if (!str) return "";
  const p = String(str).slice(0,10).split("-");
  if (p.length !== 3) return "";
  return p[2] + p[1];
}

function addDays(dateStr, n) {
  const p = String(dateStr).slice(0,10).split("-");
  if (p.length !== 3) return "";
  const d = new Date(p[0] + "-" + p[1] + "-" + p[2]);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

function buildBookingUrl(origin, dest, depDate, retDate, adults) {
  const dep = fmtDDMM(depDate);
  const ret = fmtDDMM(retDate);
  const pax = parseInt(adults) || 1;
  let path;
  if (dep && ret) path = origin + dep + dest + ret + pax + "1";
  else if (dep)   path = origin + dep + dest + pax + "1";
  else            path = origin + dest;
  return "https://www.jetradar.com/search/" + path + "?adults=" + pax + "&currency=GBP&locale=en&marker=" + MARKER;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:corsHeaders, body:"" };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return { statusCode:500, headers:corsHeaders, body:JSON.stringify({ error:"TRAVELPAYOUTS_TOKEN not set", flights:[] }) };

  const params = event.queryStringParameters || {};
  const type = params.type || "search";
  const cacheKey = type + ":" + JSON.stringify(params);
  const cached = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:Object.assign({}, corsHeaders, { "X-Cache":"HIT" }), body:JSON.stringify(cached) };

  try {
    let data;
    if (type === "top_deals")  data = await fetchTopDeals(params, token);
    else if (type === "packages") data = await fetchPackages(params, token);
    else data = await fetchFlights(params, token);

    if (data && Array.isArray(data.data)) {
      const destIata = (params.destination || "").toUpperCase();
      data.data = data.data.map(function(item) {
        const price   = item.price || item.value || 0;
        const itemDest = (item.destination || destIata).toUpperCase();
        const deal    = calcDealScore(price, itemDest);
        const depDate = item.depart_date || item.departure_at || params.depart_date || "";
        const retDate = item.return_date || params.return_date || "";
        const adults  = parseInt(params.adults) || 1;
        return Object.assign({}, item, {
          deal_score:  deal.score,
          deal_grade:  deal.grade,
          deal_label:  deal.label,
          deal_color:  deal.color,
          seats_left:  seatsRemaining(price, item.airline),
          booking_url: buildBookingUrl((params.origin||"LHR").toUpperCase(), itemDest, depDate, retDate, adults)
        });
      });
    }

    data.marker = MARKER;
    cacheSet(cacheKey, data);
    return { statusCode:200, headers:Object.assign({}, corsHeaders, { "X-Cache":"MISS" }), body:JSON.stringify(data) };
  } catch(err) {
    console.error("API ERROR:", err.message);
    return { statusCode:500, headers:corsHeaders, body:JSON.stringify({ error:err.message, flights:[], data:[], success:false }) };
  }
};

async function fetchFlights(params, token) {
  const q = new URLSearchParams({ origin:params.origin, destination:params.destination, currency:"GBP", locale:"en", token });
  if (params.depart_date) q.set("depart_date", params.depart_date);
  if (params.return_date) q.set("return_date", params.return_date);
  if (params.adults)      q.set("adults", params.adults);
  return fetchJson("https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + q, token);
}

async function fetchTopDeals(params, token) {
  const origin = (params.origin || "LHR").toUpperCase();
  const limit  = parseInt(params.limit) || 12;
  try {
    const q = new URLSearchParams({ origin, currency:"GBP", limit, one_way:"false", token });
    const data = await fetchJson("https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q, token);
    if (data && data.data && Object.keys(data.data).length > 0) {
      const items = Object.values(data.data).map(function(d) {
        return { origin, destination:d.destination||d.iata, value:d.price, price:d.price, depart_date:d.depart_date||"", return_date:d.return_date||"", number_of_changes:d.transfers!=null?d.transfers:0, airline:d.airline||"" };
      }).filter(function(d) { return d.destination && d.value > 0; }).slice(0, limit);
      return { success:true, data:items };
    }
  } catch(e) { console.log("grouped_prices failed:", e.message); }

  try {
    const q = new URLSearchParams({ origin, currency:"GBP", period_type:"year", one_way:"false", show_to_affiliates:"true", sorting:"price", trip_class:"0", limit, token });
    const data = await fetchJson("https://api.travelpayouts.com/v1/prices/cheap?" + q, token);
    if (data && data.data) {
      const items = [];
      for (const dest in data.data) {
        const trips = data.data[dest];
        const trip = trips[0] || trips[Object.keys(trips)[0]];
        if (trip) items.push({ origin, destination:dest, value:trip.price, price:trip.price, depart_date:trip.departure_at||"", return_date:trip.return_at||"", number_of_changes:trip.transfers!=null?trip.transfers:0, airline:trip.airline||"" });
      }
      items.sort(function(a,b) { return a.value - b.value; });
      return { success:true, data:items.slice(0,limit) };
    }
  } catch(e) { console.log("v1/cheap failed:", e.message); }

  return { success:false, data:[] };
}

async function fetchPackages(params, token) {
  const origin = (params.origin || "LHR").toUpperCase();
  const nights = parseInt(params.nights) || 7;
  const adults = parseInt(params.adults) || 1;
  const limit  = parseInt(params.limit)  || 8;
  const flightData = await fetchTopDeals({ origin:params.origin, limit:String(limit) }, token);
  if (flightData && flightData.data && flightData.data.length) {
    const items = flightData.data.map(function(f) {
      const depDate  = f.depart_date || "";
      const retDate  = depDate ? addDays(depDate, nights) : "";
      const hotelEst = nights * 60;
      return Object.assign({}, f, { price:(f.price||0)+hotelEst, value:(f.value||0)+hotelEst, flight_only:f.price||0, hotel_est:hotelEst, return_date:retDate, nights, type:"package_estimate" });
    });
    return { success:true, data:items.slice(0,limit), fallback:true };
  }
  return { success:false, data:[] };
}

function fetchJson(url, token) {
  return new Promise(function(resolve, reject) {
    const req = https.get(url, { headers:{ "X-Access-Token":token, "Content-Type":"application/json", "User-Agent":"TripHunt/1.0" } }, function(res) {
      if (res.statusCode === 429) { reject(new Error("Rate limit exceeded")); return; }
      if (res.statusCode === 401 || res.statusCode === 403) { reject(new Error("Auth error HTTP " + res.statusCode)); return; }
      let body = "";
      res.on("data", function(chunk) { body += chunk; });
      res.on("end", function() {
        if (!body.trim()) { reject(new Error("Empty response HTTP " + res.statusCode)); return; }
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Invalid JSON: " + body.slice(0,200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error("Timeout after 10s")); });
  });
}
