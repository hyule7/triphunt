const https = require(“https”);

const corsHeaders = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “GET, OPTIONS”,
“Content-Type”: “application/json”,
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || “499405”;

const CITY_SLUGS = {
BCN: “barcelona”,   AMS: “amsterdam”,   DXB: “dubai”,
JFK: “new-york”,    NRT: “tokyo”,       TYO: “tokyo”,
HND: “tokyo”,       AGP: “malaga”,      LIS: “lisbon”,
DPS: “bali”,        FCO: “rome”,        CDG: “paris”,
MAD: “madrid”,      ATH: “athens”,      PRG: “prague”,
VIE: “vienna”,      BKK: “bangkok”,     HKT: “phuket”,
SIN: “singapore”,   KUL: “kuala-lumpur”,LAX: “los-angeles”,
MIA: “miami”,       ORD: “chicago”,     SFO: “san-francisco”,
LHR: “london”,      LGW: “london”,      MAN: “manchester”,
EDI: “edinburgh”,   GLA: “glasgow”,     BRS: “bristol”,
BHX: “birmingham”,  DBV: “dubrovnik”,   AYT: “antalya”,
PMI: “majorca”,     TFS: “tenerife”,    LPA: “gran-canaria”,
FAO: “algarve”,     RAK: “marrakech”,   IST: “istanbul”,
ALC: “alicante”,    OPO: “porto”,       CPH: “copenhagen”,
ARN: “stockholm”,   OSL: “oslo”,        HEL: “helsinki”,
ZRH: “zurich”,      GVA: “geneva”,      MXP: “milan”,
BER: “berlin”,      MUC: “munich”,      FRA: “frankfurt”,
};

// Activities that typically offer free cancellation (keyword matching)
const FREE_CANCEL_KEYWORDS = [
“tour”, “walking”, “day trip”, “cruise”, “museum”, “ticket”,
“transfer”, “pass”, “card”, “combo”, “experience”,
];

function hasFreeCancel(name) {
if (!name) return false;
const lower = name.toLowerCase();
return FREE_CANCEL_KEYWORDS.some(kw => lower.includes(kw));
}

// Duration display helper
function formatDuration(raw) {
if (!raw) return null;
if (typeof raw === “number”) return raw < 60 ? `${raw}m` : `${Math.floor(raw/60)}h${raw%60 ? ` ${raw%60}m` : ""}`;
return String(raw);
}

exports.handler = async (event) => {
if (event.httpMethod === “OPTIONS”) {
return { statusCode: 200, headers: corsHeaders, body: “” };
}

const qs = event.queryStringParameters || {};
const { destination, limit = “8” } = qs;

if (!destination) {
return {
statusCode: 400,
headers: corsHeaders,
body: JSON.stringify({ error: “destination parameter required (IATA code)” }),
};
}

const iata = destination.toUpperCase();
const slug = CITY_SLUGS[iata];

if (!slug) {
return {
statusCode: 200,
headers: corsHeaders,
body: JSON.stringify({
activities: [],
source: “no_slug”,
destination: iata,
message: `No city mapping for ${iata} - frontend will use fallback data`,
}),
};
}

const token = process.env.TRAVELPAYOUTS_TOKEN;
if (!token) {
return {
statusCode: 500,
headers: corsHeaders,
body: JSON.stringify({ error: “TRAVELPAYOUTS_TOKEN not configured” }),
};
}

const apiUrl = `https://api.travelpayouts.com/excursions/v1/activities?city=${slug}&limit=${parseInt(limit, 10)}&language=en&currency=GBP&marker=${MARKER}`;

try {
const rawData = await fetchJson(apiUrl, token);

```
const activities = (rawData.data || rawData.activities || rawData || [])
  .slice(0, parseInt(limit, 10))
  .map((a) => {
    const name     = a.name || a.title || "Activity";
    const price    = a.price ? Math.round(a.price) : null;
    const rating   = a.rating ? parseFloat(a.rating) : 4.7;
    const reviews  = a.reviews_count || a.review_count || null;
    const freeCxl  = hasFreeCancel(name);
    const duration = formatDuration(a.duration);

    return {
      id:              a.id || a.activity_id || null,
      name,
      price_raw:       price,
      price:           price ? `from £${price}` : "See price",
      rating:          rating.toFixed(1) + "★",
      rating_raw:      rating,
      reviews:         reviews ? `${reviews.toLocaleString()} reviews` : null,
      image:           a.preview_image || a.image || a.photo || null,
      duration,
      category:        a.category || null,
      free_cancel:     freeCxl,
      free_cancel_tag: freeCxl ? "Free cancellation" : null,
      instant_confirm: true,   // all Klook activities have instant confirmation
      mobile_voucher:  true,   // all Klook activities accept mobile voucher
      url:             a.url || buildActivityUrl(slug, a.id, MARKER),
    };
  });

return {
  statusCode: 200,
  headers: corsHeaders,
  body: JSON.stringify({
    activities,
    destination: iata,
    city: slug,
    total: activities.length,
  }),
};
```

} catch (err) {
console.error(“Activities API error:”, err.message, “| IATA:”, iata, “| Slug:”, slug);
// Graceful degradation - never crash the page
return {
statusCode: 200,
headers: corsHeaders,
body: JSON.stringify({
activities: [],
error: err.message,
destination: iata,
fallback: true,
}),
};
}
};

/* ══════════════════════════════════════════════════════════════
HELPERS
══════════════════════════════════════════════════════════════ */
function fetchJson(url, token) {
return new Promise((resolve, reject) => {
const req = https.get(
url,
{ headers: { “X-Access-Token”: token, “Accept”: “application/json” } },
(res) => {
let body = “”;
res.on(“data”,  chunk => body += chunk);
res.on(“end”,   () => {
try { resolve(JSON.parse(body)); }
catch { reject(new Error(`Invalid JSON from activities API (HTTP ${res.statusCode})`)); }
});
}
);
req.on(“error”, reject);
req.setTimeout(8000, () => { req.destroy(); reject(new Error(“Activities API timeout”)); });
});
}

function buildActivityUrl(citySlug, activityId, marker) {
if (activityId) {
return `https://www.klook.com/en-GB/activity/${activityId}/?aid=${marker}`;
}
return `https://www.klook.com/en-GB/search?query=${encodeURIComponent(citySlug)}&aid=${marker}`;
}