// TripHunt — getErrorFares.js
// Detects suspiciously cheap fares (potential airline error fares)
// A fare is flagged as error fare if price < 40% of route average

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL = 10 * 60 * 1000;
const _cache    = new Map();

function cacheGet(k) { const e = _cache.get(k); if (!e) return null; if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; } return e.d; }
function cacheSet(k, d) { _cache.set(k, { d, ts: Date.now() }); if (_cache.size > 100) _cache.delete(_cache.keys().next().value); }

const ROUTE_AVG = {
  BCN:120, MAD:110, LIS:105, FCO:115, AMS:95,  CDG:90,  DXB:280, AYT:160,
  PMI:130, TFS:170, LPA:175, FAO:140, ATH:145, PRG:100, VIE:105, DBV:155,
  IST:190, ALC:135, BKK:520, DPS:590, NRT:620, SIN:480, KUL:450, HKT:540,
  JFK:380, LAX:420, MIA:390, ORD:400, SFO:430, CPT:520, NBO:490,
  SYD:780, MEL:800, BNE:790, AKL:850, CAI:180, CMN:130, RKV:200,
};

function isErrorFare(price, iata) {
  const avg = ROUTE_AVG[iata] || 250;
  return price / avg <= 0.40;
}
function isMistakeFare(price, iata) {
  const avg = ROUTE_AVG[iata] || 250;
  return price / avg <= 0.25; // truly extraordinary
}

function ddmm(s) { if (!s) return ""; const p = String(s).slice(0,10).split("-"); return p.length === 3 ? p[2]+p[1] : ""; }
function defaultDep() { const d = new Date(); d.setDate(d.getDate()+21); while(d.getDay()!==2) d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function defaultRet(dep) { const d = new Date(dep); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); }

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers:{ "X-Access-Token": token||"", "User-Agent":"TripHunt/2.0" } }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Bad JSON")); } });
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

const UK_ORIGINS = ["LHR","LGW","MAN","EDI","BHX","BRS","LBA","NCL","GLA","LPL","STN","EMA"];

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const params = event.queryStringParameters || {};
  const origin = params.origin ? params.origin.toUpperCase() : null; // null = scan all UK
  const cacheKey = "errorfares:" + (origin || "ALL");
  const cached = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    // Return curated example error fares for demo
    const result = {
      success: true,
      data: [
        { origin:"LHR", destination:"NRT", price:189, typical:620, saving:431, saving_pct:70, is_mistake_fare:true,  label:"🚨 Possible Mistake Fare", airline:"JAL",    depart_date:defaultDep(), return_date:defaultRet(defaultDep()), booking_url:"https://www.aviasales.com/search/LHR"+ddmm(defaultDep())+"NRT"+ddmm(defaultRet(defaultDep()))+"21?marker="+MARKER+"&currency=GBP&locale=en-GB" },
        { origin:"LHR", destination:"BKK", price:159, typical:520, saving:361, saving_pct:69, is_mistake_fare:true,  label:"🚨 Possible Mistake Fare", airline:"Thai",   depart_date:defaultDep(), return_date:defaultRet(defaultDep()), booking_url:"https://www.aviasales.com/search/LHR"+ddmm(defaultDep())+"BKK"+ddmm(defaultRet(defaultDep()))+"21?marker="+MARKER+"&currency=GBP&locale=en-GB" },
        { origin:"MAN", destination:"DXB", price:89,  typical:280, saving:191, saving_pct:68, is_mistake_fare:false, label:"🔥 Error Fare",            airline:"Emirates",depart_date:defaultDep(), return_date:defaultRet(defaultDep()), booking_url:"https://www.aviasales.com/search/MAN"+ddmm(defaultDep())+"DXB"+ddmm(defaultRet(defaultDep()))+"21?marker="+MARKER+"&currency=GBP&locale=en-GB" },
      ],
      _source: "demo",
      scanned_at: new Date().toISOString(),
    };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:CORS, body:JSON.stringify(result) };
  }

  try {
    const origins = origin ? [origin] : UK_ORIGINS;
    const errorFares = [];

    await Promise.all(origins.map(async orig => {
      try {
        const q = new URLSearchParams({ origin:orig, currency:"GBP", limit:20, one_way:"false", token });
        const raw = await fetchJson("https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q, token);
        if (!raw?.data) return;
        for (const x of Object.values(raw.data)) {
          const dest  = (x.destination || x.iata || "").toUpperCase();
          const price = x.price || 0;
          if (!dest || !price) continue;
          if (isErrorFare(price, dest)) {
            const avg   = ROUTE_AVG[dest] || 250;
            const saving = avg - price;
            const dep   = x.depart_date || defaultDep();
            const ret   = x.return_date || defaultRet(dep);
            const link  = x.link || ("/" + orig + ddmm(dep) + dest + ddmm(ret) + "21");
            errorFares.push({
              origin:         orig,
              destination:    dest,
              price,
              typical:        avg,
              saving,
              saving_pct:     Math.round(saving / avg * 100),
              is_mistake_fare: isMistakeFare(price, dest),
              label:          isMistakeFare(price, dest) ? "🚨 Possible Mistake Fare" : "🔥 Error Fare",
              airline:        x.airline || "",
              depart_date:    dep,
              return_date:    ret,
              link,
              booking_url:    "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB",
            });
          }
        }
      } catch(e) { console.error("Error fare scan failed for", orig, e.message); }
    }));

    errorFares.sort((a, b) => b.saving_pct - a.saving_pct);

    const result = { success:true, data:errorFares, count:errorFares.length, scanned_origins:origins.length, scanned_at:new Date().toISOString(), _source:"live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };

  } catch(e) {
    return { statusCode:500, headers:CORS, body:JSON.stringify({ success:false, error:e.message }) };
  }
};
