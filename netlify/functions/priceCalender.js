/**

- TripHunt - priceCalendar.js
- Netlify Function: returns a month of prices for the flexible date grid
- Calls TravelPayouts month-matrix API
- 
- GET /.netlify/functions/priceCalendar?origin=LHR&destination=BCN&month=2025-06
  */

const https = require(“https”);

const cors = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “GET, OPTIONS”,
“Content-Type”: “application/json”,
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || “499405”;

const ROUTE_AVERAGES = {
BCN:120, MAD:110, LIS:105, FCO:115, AMS:95,  CDG:90,
DXB:280, AYT:160, PMI:130, TFS:170, LPA:175, FAO:140,
ATH:145, PRG:100, VIE:105, DBV:155, IST:190, ALC:135,
BKK:520, DPS:590, NRT:620, SIN:480, KUL:450, HKT:540,
JFK:380, LAX:420, MIA:390,
};

exports.handler = async (event) => {
if (event.httpMethod === “OPTIONS”) return { statusCode: 200, headers: cors, body: “” };

const token = process.env.TRAVELPAYOUTS_TOKEN;
if (!token) return errResp(“TRAVELPAYOUTS_TOKEN not set”);

const {
origin = “LHR”,
destination,
month,
return_after_days = “7”,
} = event.queryStringParameters || {};

if (!destination) return errResp(“destination required”);

const destUpper = destination.toUpperCase();
const avg       = ROUTE_AVERAGES[destUpper] || 300;
const nights    = parseInt(return_after_days) || 7;

// Default to next month if not specified
let targetMonth = month;
if (!targetMonth) {
const d = new Date();
d.setMonth(d.getMonth() + 1);
targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

try {
const q = new URLSearchParams({
origin:             origin.toUpperCase(),
destination:        destUpper,
month:              targetMonth,
show_to_affiliates: “true”,
currency:           “GBP”,
token,
});

```
const url = `https://api.travelpayouts.com/v2/prices/month-matrix?${q}`;
console.log("Calendar:", url.replace(token, "***"));

// Pass token via header as well (required by v2 API)
const data = await fetchJson(url, token);

const calendar = {};
const prices   = [];

for (const item of (data?.data || [])) {
  const price = item.price || item.value;
  if (!price || !item.depart_date) continue;

  prices.push(price);

  const ratio = price / avg;
  const grade = ratio <= 0.65 ? "exceptional"
              : ratio <= 0.80 ? "great"
              : ratio <= 0.95 ? "good"
              : ratio <= 1.10 ? "fair"
              : "high";

  // Safe date parsing - no UTC shift
  const dep     = item.depart_date.slice(0, 10);
  const retDate = addDays(dep, nights);

  calendar[dep] = {
    price,
    grade,
    booking_url: buildBookingUrl(origin.toUpperCase(), destUpper, dep, retDate, 1),
    return_date: retDate,
  };
}

return {
  statusCode: 200,
  headers: cors,
  body: JSON.stringify({
    origin:      origin.toUpperCase(),
    destination: destUpper,
    month:       targetMonth,
    calendar,
    min_price:   prices.length ? Math.min(...prices) : null,
    max_price:   prices.length ? Math.max(...prices) : null,
    avg_price:   avg,
    marker:      MARKER,
  }),
};
```

} catch (e) {
console.error(“Calendar error:”, e.message);
return errResp(e.message);
}
};

// ─── JETRADAR BOOKING URL (UK/International affiliate domain) ─────────────────
function buildBookingUrl(o, d, dep, ret, adults) {
const pax = parseInt(adults) || 1;
// Parse date parts directly from ISO string to avoid UTC timezone shift
function fmtDDMM(str) {
if (!str) return “”;
const parts = str.slice(0, 10).split(”-”);
return parts[2] + parts[1];   // DDMM, already zero-padded
}
const depFmt = fmtDDMM(dep);
const retFmt = fmtDDMM(ret);
const path   = (depFmt && retFmt)
? `${o}${depFmt}${d}${retFmt}${pax}1`
: `${o}${d}`;

return `https://www.jetradar.com/search/${path}?adults=${pax}&currency=GBP&locale=en&marker=${MARKER}`;
}

// Add N days to a YYYY-MM-DD string safely
function addDays(dateStr, n) {
const parts = dateStr.split(”-”);
const d     = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
d.setUTCDate(d.getUTCDate() + n);
return d.toISOString().slice(0, 10);
}

// ─── HTTP HELPER ──────────────────────────────────────────────────────────────
function fetchJson(url, token) {
return new Promise((resolve, reject) => {
const req = https.get(
url,
{
headers: {
“X-Access-Token”: token,
“Content-Type”: “application/json”,
},
},
(res) => {
let d = “”;
res.on(“data”, c => d += c);
res.on(“end”,  () => {
try { resolve(JSON.parse(d)); }
catch { reject(new Error(`Invalid JSON (${res.statusCode}): ${d.slice(0, 200)}`)); }
});
}
);
req.on(“error”, reject);
req.setTimeout(10000, () => { req.destroy(); reject(new Error(“Timeout”)); });
});
}

function errResp(msg) {
return { statusCode: 400, headers: cors, body: JSON.stringify({ error: msg }) };
}