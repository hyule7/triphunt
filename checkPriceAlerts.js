/**

- TripHunt - trackConversion.js
- Netlify Function: logs every outbound affiliate click to Supabase
- for revenue attribution analysis
- 
- Env vars needed:
- SUPABASE_URL
- SUPABASE_ANON_KEY
  */

const cors = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “POST, GET, OPTIONS”,
“Content-Type”: “application/json”,
};

exports.handler = async (event) => {
if (event.httpMethod === “OPTIONS”) return { statusCode: 200, headers: cors, body: “” };

// GET: analytics summary (for a future dashboard)
if (event.httpMethod === “GET”) return getStats(event);

// POST: log a click
if (event.httpMethod === “POST”) return logClick(event);

return { statusCode: 405, headers: cors, body: “” };
};

async function logClick(event) {
let body;
try { body = JSON.parse(event.body || “{}”); } catch { body = {}; }

const ip = event.headers[“x-forwarded-for”]?.split(”,”)[0]?.trim() || “unknown”;
const ua = event.headers[“user-agent”] || “”;

const row = {
id:          `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
event_type:  body.event_type   || “click”,          // click | book_attempt | share
partner:     body.partner      || “unknown”,         // aviasales | booking | gyg | klook | welcomepickups | discovercars | worldnomads
origin:      body.origin       || null,
destination: body.destination  || null,
dest_name:   body.dest_name    || null,
price:       body.price        ? parseFloat(body.price) : null,
deal_grade:  body.deal_grade   || null,              // exceptional | great | good | fair | high
section:     body.section      || null,              // flights | packages | activities | modal | compare
adults:      body.adults       ? parseInt(body.adults) : null,
nights:      body.nights       ? parseInt(body.nights) : null,
is_mobile:   /mobile|android|iphone/i.test(ua),
referrer:    body.referrer     || event.headers[“referer”] || null,
session_id:  body.session_id   || null,
created_at:  new Date().toISOString(),
// Hashed IP for GDPR compliance - never store raw IP
ip_hash:     ip !== “unknown” ? simpleHash(ip) : null,
};

try {
await supabaseInsert(“conversions”, row);
} catch (e) {
// Non-fatal - don’t break affiliate links for analytics failures
console.error(“Conversion log failed:”, e.message);
return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, logged: false }) };
}

return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, logged: true, id: row.id }) };
}

async function getStats(event) {
const qs = event.queryStringParameters || {};
const days = parseInt(qs.days) || 30;

try {
// Clicks by partner (last N days)
const since = new Date(Date.now() - days * 86400000).toISOString();
const data  = await supabaseSelect(“conversions”, `created_at=gte.${since}&order=created_at.desc&limit=500`);

```
if (!data) return ok({ clicks: 0, by_partner: {}, by_dest: {}, by_grade: {} });

const by_partner = {};
const by_dest    = {};
const by_grade   = {};
const by_section = {};
let total_price  = 0;
let price_count  = 0;

for (const row of data) {
  by_partner[row.partner]  = (by_partner[row.partner]  || 0) + 1;
  if (row.dest_name) by_dest[row.dest_name]  = (by_dest[row.dest_name]  || 0) + 1;
  if (row.deal_grade)by_grade[row.deal_grade] = (by_grade[row.deal_grade]|| 0) + 1;
  if (row.section)   by_section[row.section]  = (by_section[row.section] || 0) + 1;
  if (row.price)     { total_price += row.price; price_count++; }
}

return ok({
  period_days:    days,
  total_clicks:   data.length,
  avg_price:      price_count ? Math.round(total_price / price_count) : null,
  by_partner:     sortObj(by_partner),
  by_destination: sortObj(by_dest),
  by_deal_grade:  by_grade,
  by_section:     sortObj(by_section),
  mobile_pct:     data.length ? Math.round(data.filter(r => r.is_mobile).length / data.length * 100) : 0,
});
```

} catch (e) {
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
}
}

/* ══════════════════════════════════════════════════════════════
SUPABASE HELPERS
══════════════════════════════════════════════════════════════ */
function supabaseInsert(table, row) { return sbFetch(`/rest/v1/${table}`, “POST”, row); }
function supabaseSelect(table, filter) { return sbFetch(`/rest/v1/${table}?${filter}`, “GET”); }

function sbFetch(path, method, body) {
const url = process.env.SUPABASE_URL + path;
const key = process.env.SUPABASE_ANON_KEY;
return new Promise((resolve, reject) => {
const u    = new URL(url);
const data = body ? JSON.stringify(body) : null;
const req  = require(“https”).request({
hostname: u.hostname, path: u.pathname + u.search, method,
headers: { “apikey”: key, “Authorization”: `Bearer ${key}`, “Content-Type”: “application/json”, “Prefer”: “return=minimal”, …(data ? { “Content-Length”: Buffer.byteLength(data) } : {}) },
}, res => {
let d = “”;
res.on(“data”, c => d += c);
res.on(“end”,  () => {
if (res.statusCode >= 400) return reject(new Error(`Supabase ${res.statusCode}: ${d.slice(0,200)}`));
try { resolve(d ? JSON.parse(d) : null); } catch { resolve(null); }
});
});
req.on(“error”, reject);
if (data) req.write(data);
req.end();
});
}

function simpleHash(str) {
let h = 0x811c9dc5;
for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
return h.toString(16);
}

function sortObj(obj) {
return Object.fromEntries(Object.entries(obj).sort(([,a],[,b]) => b - a));
}

function ok(data) { return { statusCode: 200, headers: cors, body: JSON.stringify(data) }; }