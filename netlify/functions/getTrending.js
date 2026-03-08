// TripHunt -- getTrending.js
// Returns trending routes: deals sorted by composite score of price drop + deal grade
// Also returns "price velocity" -- how much the price has moved

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const CACHE_TTL = 15 * 60 * 1000;
const _cache    = new Map();
function cacheGet(k) { const e = _cache.get(k); if (!e) return null; if (Date.now()-e.ts > CACHE_TTL) { _cache.delete(k); return null; } return e.d; }
function cacheSet(k, d) { _cache.set(k, { d, ts:Date.now() }); }

// Route data: avg price + popularity score (1-10) + emoji
const ROUTES = {
  BCN:{ avg:120, pop:9, emoji:"🌊", name:"Barcelona",    country:"Spain"       },
  MAD:{ avg:110, pop:8, emoji:"🎨", name:"Madrid",       country:"Spain"       },
  LIS:{ avg:105, pop:9, emoji:"🌞", name:"Lisbon",       country:"Portugal"    },
  FCO:{ avg:115, pop:9, emoji:"🍕", name:"Rome",         country:"Italy"       },
  AMS:{ avg:95,  pop:8, emoji:"🚲", name:"Amsterdam",    country:"Netherlands" },
  CDG:{ avg:90,  pop:9, emoji:"🗼", name:"Paris",        country:"France"      },
  DXB:{ avg:280, pop:8, emoji:"🏙️", name:"Dubai",        country:"UAE"         },
  AYT:{ avg:160, pop:7, emoji:"🏖️", name:"Antalya",      country:"Turkey"      },
  PMI:{ avg:130, pop:8, emoji:"🌴", name:"Mallorca",     country:"Spain"       },
  TFS:{ avg:170, pop:7, emoji:"☀️", name:"Tenerife",     country:"Spain"       },
  LPA:{ avg:175, pop:7, emoji:"🌋", name:"Gran Canaria", country:"Spain"       },
  FAO:{ avg:140, pop:7, emoji:"🐠", name:"Faro",         country:"Portugal"    },
  ATH:{ avg:145, pop:8, emoji:"🏛️", name:"Athens",       country:"Greece"      },
  PRG:{ avg:100, pop:7, emoji:"🍺", name:"Prague",       country:"Czechia"     },
  VIE:{ avg:105, pop:7, emoji:"🎭", name:"Vienna",       country:"Austria"     },
  DBV:{ avg:155, pop:8, emoji:"⚓", name:"Dubrovnik",    country:"Croatia"     },
  IST:{ avg:190, pop:7, emoji:"🕌", name:"Istanbul",     country:"Turkey"      },
  ALC:{ avg:135, pop:6, emoji:"🍊", name:"Alicante",     country:"Spain"       },
  BKK:{ avg:520, pop:9, emoji:"🛺", name:"Bangkok",      country:"Thailand"    },
  DPS:{ avg:590, pop:8, emoji:"🌺", name:"Bali",         country:"Indonesia"   },
  NRT:{ avg:620, pop:8, emoji:"⛩️", name:"Tokyo",        country:"Japan"       },
  SIN:{ avg:480, pop:8, emoji:"🦁", name:"Singapore",    country:"Singapore"   },
  KUL:{ avg:450, pop:7, emoji:"🏙️", name:"Kuala Lumpur", country:"Malaysia"    },
  HKT:{ avg:540, pop:7, emoji:"🤿", name:"Phuket",       country:"Thailand"    },
  JFK:{ avg:380, pop:9, emoji:"🗽", name:"New York",     country:"USA"         },
  LAX:{ avg:420, pop:8, emoji:"🎬", name:"Los Angeles",  country:"USA"         },
  MIA:{ avg:390, pop:7, emoji:"🌊", name:"Miami",        country:"USA"         },
  SFO:{ avg:430, pop:7, emoji:"🌉", name:"San Francisco",country:"USA"         },
  CPT:{ avg:520, pop:7, emoji:"🦁", name:"Cape Town",    country:"South Africa"},
  SYD:{ avg:780, pop:8, emoji:"🦘", name:"Sydney",       country:"Australia"   },
};

function ddmm(s) { if (!s) return ""; const p = String(s).slice(0,10).split("-"); return p.length===3?p[2]+p[1]:""; }
function defaultDep() { const d=new Date(); d.setDate(d.getDate()+21); while(d.getDay()!==2) d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function defaultRet(dep) { const d=new Date(dep); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); }

function trendScore(price, dest, airline) {
  const r = ROUTES[dest];
  if (!r) return 0;
  const priceFactor = Math.max(0, 1 - price/r.avg); // 0-1, higher = better deal
  const popFactor   = r.pop / 10;                    // 0-1
  return Math.round((priceFactor * 0.7 + popFactor * 0.3) * 100);
}

function priceDrop(price, dest) {
  const avg = (ROUTES[dest] || {}).avg || 250;
  const drop = avg - price;
  if (drop <= 0) return null;
  return { amount: drop, pct: Math.round(drop/avg*100) };
}

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers:{ "X-Access-Token":token||"", "User-Agent":"TripHunt/2.0" } }, res => {
      let body=""; res.on("data",c=>body+=c);
      res.on("end",()=>{ try{resolve(JSON.parse(body));}catch(e){reject(new Error("Bad JSON"));} });
    });
    req.on("error", reject);
    req.setTimeout(12000, ()=>{ req.destroy(); reject(new Error("Timeout")); });
  });
}

const FALLBACK_TRENDING = () => {
  const dep = defaultDep(), ret = defaultRet(dep);
  return Object.entries(ROUTES).slice(0,12).map(([dest, r]) => {
    const price = Math.round(r.avg * (0.65 + Math.random() * 0.25)); // 65-90% of avg
    const drop  = priceDrop(price, dest);
    const link  = "/LHR" + ddmm(dep) + dest + ddmm(ret) + "21";
    return {
      origin: "LHR", destination: dest, name: r.name, country: r.country, emoji: r.emoji,
      price, trend_score: trendScore(price, dest), price_drop: drop,
      velocity_label: drop && drop.pct > 20 ? "📉 Dropping fast" : drop ? "↓ Below average" : "→ Steady",
      airline: "", depart_date: dep, return_date: ret, link,
      booking_url: "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB",
      _fallback: true,
    };
  }).sort((a,b)=>b.trend_score-a.trend_score);
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };
  const params = event.queryStringParameters || {};
  const origin = (params.origin || "LHR").toUpperCase();
  const limit  = parseInt(params.limit) || 12;
  const cacheKey = "trending:" + origin + ":" + limit;
  const cached = cacheGet(cacheKey);
  if (cached) return { statusCode:200, headers:{ ...CORS, "X-Cache":"HIT" }, body:JSON.stringify(cached) };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    const result = { success:true, data: FALLBACK_TRENDING().slice(0,limit), origin, _source:"demo" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:CORS, body:JSON.stringify(result) };
  }

  try {
    const q = new URLSearchParams({ origin, currency:"GBP", limit:30, one_way:"false", token });
    const raw = await fetchJson("https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q, token);
    let items = [];
    if (raw?.data && Object.keys(raw.data).length) {
      for (const x of Object.values(raw.data)) {
        const dest  = (x.destination||x.iata||"").toUpperCase();
        const price = x.price||0;
        if (!dest||!price) continue;
        const r    = ROUTES[dest];
        const dep  = x.depart_date||defaultDep();
        const ret  = x.return_date||defaultRet(dep);
        const link = x.link || ("/"+origin+ddmm(dep)+dest+ddmm(ret)+"21");
        const drop = priceDrop(price, dest);
        items.push({
          origin, destination:dest,
          name:    r?.name    || dest,
          country: r?.country || "",
          emoji:   r?.emoji   || "✈️",
          price,
          trend_score: trendScore(price, dest),
          price_drop:  drop,
          velocity_label: drop && drop.pct>20 ? "📉 Dropping fast" : drop ? "↓ Below average" : "→ Steady",
          airline: x.airline||"",
          depart_date: dep, return_date: ret, link,
          booking_url: "https://www.aviasales.com"+link+"?marker="+MARKER+"&currency=GBP&locale=en-GB",
        });
      }
      items.sort((a,b)=>b.trend_score-a.trend_score);
      items = items.slice(0, limit);
    }
    if (!items.length) items = FALLBACK_TRENDING().slice(0, limit);
    const result = { success:true, data:items, origin, _source:items[0]?._fallback?"demo":"live" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:{ ...CORS, "X-Cache":"MISS" }, body:JSON.stringify(result) };
  } catch(e) {
    const result = { success:true, data:FALLBACK_TRENDING().slice(0,limit), origin, _source:"fallback_error" };
    cacheSet(cacheKey, result);
    return { statusCode:200, headers:CORS, body:JSON.stringify(result) };
  }
};
