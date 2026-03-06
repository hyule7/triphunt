/**

- TripHunt - priceAlert.js
- Netlify Function: POST to create alert, GET (scheduled) to check + email
- 
- Env vars needed:
- RESEND_API_KEY       - from resend.com (free tier: 3000 emails/month)
- SUPABASE_URL         - from supabase.com (free tier)
- SUPABASE_ANON_KEY    - from supabase.com
- TRAVELPAYOUTS_TOKEN  - your existing token
- TRAVELPAYOUTS_MARKER - optional, defaults to 499405
- SITE_URL             - https://triphunt.org
  */

const https = require(“https”);

const cors = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “GET, POST, DELETE, OPTIONS”,
“Content-Type”: “application/json”,
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || “499405”;

// ─── JETRADAR URL BUILDER ─────────────────────────────────────────────────────
// Uses JetRadar (international/UK affiliate domain) not aviasales.com
function buildSearchUrl(origin, dest, adults = 1) {
const pax = parseInt(adults) || 1;
return `https://www.jetradar.com/search/${origin}${dest}?adults=${pax}&currency=GBP&locale=en&marker=${MARKER}`;
}

/* ══════════════════════════════════════════════════════════════
MAIN HANDLER
══════════════════════════════════════════════════════════════ */
exports.handler = async (event) => {
if (event.httpMethod === “OPTIONS”) return { statusCode: 200, headers: cors, body: “” };

const method = event.httpMethod;

if (method === “POST”)   return createAlert(event);
if (method === “DELETE”) return deleteAlert(event);

if (method === “GET” && event.queryStringParameters?.action === “check”) return checkAlerts();
if (method === “GET” && event.queryStringParameters?.email)              return listAlerts(event);

return { statusCode: 405, headers: cors, body: JSON.stringify({ error: “Method not allowed” }) };
};

/* ══════════════════════════════════════════════════════════════
CREATE ALERT
Body: { email, origin, destination, destName, targetPrice, adults }
══════════════════════════════════════════════════════════════ */
async function createAlert(event) {
let body;
try { body = JSON.parse(event.body); } catch { return bad(“Invalid JSON”); }

const { email, origin, destination, destName, targetPrice, adults = 1 } = body;
if (!email || !origin || !destination || !targetPrice) return bad(“Missing required fields”);
if (!/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email))        return bad(“Invalid email”);
if (isNaN(targetPrice) || targetPrice < 1)             return bad(“Invalid target price”);

const alert = {
id:           `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
email:        email.toLowerCase().trim(),
origin:       origin.toUpperCase(),
destination:  destination.toUpperCase(),
dest_name:    destName || destination,
target_price: parseFloat(targetPrice),
adults:       parseInt(adults),
created_at:   new Date().toISOString(),
last_checked: null,
triggered:    false,
};

try {
await supabaseInsert(“price_alerts”, alert);
} catch (e) {
console.error(“Supabase insert failed:”, e.message);
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: “Could not save alert” }) };
}

try {
await sendEmail({
to:      alert.email,
subject: `TripHunt alert set: ${origin} to ${alert.dest_name} under £${targetPrice}`,
html:    confirmationEmail(alert),
});
} catch (e) {
console.error(“Confirmation email failed:”, e.message);
// Non-fatal
}

return {
statusCode: 201,
headers: cors,
body: JSON.stringify({ success: true, alert_id: alert.id, message: “Alert created - we will email you when the price drops.” }),
};
}

/* ══════════════════════════════════════════════════════════════
CHECK ALL ALERTS (called by scheduled function daily)
══════════════════════════════════════════════════════════════ */
async function checkAlerts() {
let alerts;
try {
const data = await supabaseSelect(“price_alerts”, “triggered=eq.false”);
alerts = data || [];
} catch (e) {
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
}

if (!alerts.length) return ok({ checked: 0, triggered: 0 });

const token = process.env.TRAVELPAYOUTS_TOKEN;
let triggered = 0;

for (const alert of alerts) {
try {
const price = await fetchBestPrice(alert.origin, alert.destination, token, alert.adults);
if (price && price <= alert.target_price) {
await sendEmail({
to:      alert.email,
subject: `Price drop! ${alert.origin} to ${alert.dest_name}: £${price} - you wanted £${alert.target_price}`,
html:    priceDropEmail(alert, price),
});
await supabaseUpdate(
“price_alerts”,
{ triggered: true, triggered_price: price, triggered_at: new Date().toISOString() },
`id=eq.${alert.id}`
);
triggered++;
} else {
await supabaseUpdate(“price_alerts”, { last_checked: new Date().toISOString() }, `id=eq.${alert.id}`);
}
} catch (e) {
console.error(`Error checking alert ${alert.id}:`, e.message);
}
await sleep(300);
}

return ok({ checked: alerts.length, triggered });
}

async function listAlerts(event) {
const email = event.queryStringParameters?.email?.toLowerCase();
try {
const data = await supabaseSelect(
“price_alerts”,
`email=eq.${encodeURIComponent(email)}&triggered=eq.false&order=created_at.desc`
);
return ok({ alerts: data || [] });
} catch (e) {
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
}
}

async function deleteAlert(event) {
const id = event.queryStringParameters?.id;
if (!id) return bad(“Missing alert id”);
try {
await supabaseDelete(“price_alerts”, `id=eq.${id}`);
return ok({ deleted: true });
} catch (e) {
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
}
}

/* ══════════════════════════════════════════════════════════════
TRAVELPAYOUTS - get current best price
══════════════════════════════════════════════════════════════ */
async function fetchBestPrice(origin, destination, token, adults = 1) {
const q   = new URLSearchParams({ origin, destination, currency: “GBP”, token, adults, one_way: “false” });
const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${q}`;
try {
const data = await fetchJson(url, token);
if (data?.data?.length) {
return Math.round(Math.min(…data.data.map(f => f.price || Infinity)));
}
} catch (e) {
console.error(“fetchBestPrice error:”, e.message);
}
return null;
}

/* ══════════════════════════════════════════════════════════════
EMAIL TEMPLATES
══════════════════════════════════════════════════════════════ */
function confirmationEmail(a) {
const bookUrl = buildSearchUrl(a.origin, a.destination, a.adults);
return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#080c14;color:#eef2ff;padding:32px;max-width:520px;margin:0 auto">

  <div style="background:#0e1420;border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,.08)">
    <div style="font-size:24px;font-weight:900;font-family:Georgia,serif;margin-bottom:6px">Trip<span style="color:#a89df9">Hunt</span></div>
    <h2 style="color:#10b981;margin:16px 0 8px">Alert set!</h2>
    <p style="color:#7b8db0">We will email you the moment we find a price at or below your target.</p>
    <div style="background:#161d2e;border-radius:12px;padding:18px;margin:20px 0">
      <div style="font-size:13px;color:#7b8db0;margin-bottom:4px">Route</div>
      <div style="font-size:18px;font-weight:800">${a.origin} to ${a.dest_name}</div>
      <div style="font-size:13px;color:#7b8db0;margin:10px 0 4px">Your target price</div>
      <div style="font-size:28px;font-weight:900;color:#10b981">Under £${a.target_price}</div>
    </div>
    <a href="${bookUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:99px;font-weight:700;text-decoration:none;font-size:15px">Search now anyway</a>
    <p style="color:#3d4f6e;font-size:11px;margin-top:24px">TripHunt - Zero fees. Always free. <a href="https://triphunt.org/unsubscribe?id=${a.id}" style="color:#7b8db0">Unsubscribe</a></p>
  </div></body></html>`;
}

function priceDropEmail(a, price) {
const bookUrl = buildSearchUrl(a.origin, a.destination, a.adults);
const saving  = a.target_price - price;
return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#080c14;color:#eef2ff;padding:32px;max-width:520px;margin:0 auto">

  <div style="background:#0e1420;border-radius:16px;padding:28px;border:1px solid rgba(16,185,129,.3)">
    <div style="font-size:24px;font-weight:900;font-family:Georgia,serif;margin-bottom:6px">Trip<span style="color:#a89df9">Hunt</span></div>
    <h2 style="color:#10b981;margin:16px 0 8px">Price drop alert!</h2>
    <p style="color:#7b8db0">Your target price was hit. Book fast - airline prices change constantly.</p>
    <div style="background:#161d2e;border-radius:12px;padding:18px;margin:20px 0">
      <div style="font-size:13px;color:#7b8db0">Route</div>
      <div style="font-size:18px;font-weight:800;margin-bottom:12px">${a.origin} to ${a.dest_name}</div>
      <div style="display:flex;gap:24px">
        <div><div style="font-size:11px;color:#7b8db0">Current price</div><div style="font-size:32px;font-weight:900;color:#10b981">£${price}</div></div>
        <div><div style="font-size:11px;color:#7b8db0">Your target</div><div style="font-size:32px;font-weight:900;color:#7b8db0">£${a.target_price}</div></div>
        ${saving > 0 ? `<div><div style="font-size:11px;color:#7b8db0">You save</div><div style="font-size:32px;font-weight:900;color:#f59e0b">£${Math.round(saving)}</div></div>` : ""}
      </div>
    </div>
    <a href="${bookUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 28px;border-radius:99px;font-weight:700;text-decoration:none;font-size:16px">Book now - £${price}</a>
    <p style="color:#3d4f6e;font-size:11px;margin-top:24px">TripHunt - Zero fees. <a href="https://triphunt.org/unsubscribe?id=${a.id}" style="color:#7b8db0">Unsubscribe</a></p>
  </div></body></html>`;
}

/* ══════════════════════════════════════════════════════════════
SUPABASE HELPERS
══════════════════════════════════════════════════════════════ */
async function supabaseInsert(table, row)          { return supabaseFetch(`/rest/v1/${table}`, “POST”, row); }
async function supabaseSelect(table, filter = “”)  { return supabaseFetch(`/rest/v1/${table}${filter ? "?" + filter : ""}`, “GET”); }
async function supabaseUpdate(table, row, filter)  { return supabaseFetch(`/rest/v1/${table}?${filter}`, “PATCH”, row); }
async function supabaseDelete(table, filter)       { return supabaseFetch(`/rest/v1/${table}?${filter}`, “DELETE”); }

function supabaseFetch(path, method, body) {
const url = process.env.SUPABASE_URL + path;
const key = process.env.SUPABASE_ANON_KEY;
const hdrs = {
“apikey”:        key,
“Authorization”: `Bearer ${key}`,
“Content-Type”:  “application/json”,
“Prefer”:        “return=representation”,
};

return new Promise((resolve, reject) => {
const lib  = url.startsWith(“https”) ? require(“https”) : require(“http”);
const u    = new URL(url);
const data = (body && method !== “GET” && method !== “DELETE”) ? JSON.stringify(body) : null;
const req  = lib.request(
{ hostname: u.hostname, path: u.pathname + u.search, method, headers: hdrs },
res => {
let d = “”;
res.on(“data”, c => d += c);
res.on(“end”,  () => {
if (res.statusCode >= 400) return reject(new Error(`Supabase ${res.statusCode}: ${d.slice(0, 200)}`));
try { resolve(d ? JSON.parse(d) : null); } catch { resolve(null); }
});
}
);
req.on(“error”, reject);
if (data) req.write(data);
req.end();
});
}

/* ══════════════════════════════════════════════════════════════
RESEND EMAIL
══════════════════════════════════════════════════════════════ */
async function sendEmail({ to, subject, html }) {
const key = process.env.RESEND_API_KEY;
if (!key) throw new Error(“RESEND_API_KEY not set”);

return new Promise((resolve, reject) => {
const body = JSON.stringify({ from: “TripHunt [alerts@triphunt.org](mailto:alerts@triphunt.org)”, to, subject, html });
const req  = require(“https”).request(
{
hostname: “api.resend.com”, path: “/emails”, method: “POST”,
headers: {
“Authorization”:  `Bearer ${key}`,
“Content-Type”:   “application/json”,
“Content-Length”: Buffer.byteLength(body),
},
},
res => {
let data = “”;
res.on(“data”, c => data += c);
res.on(“end”,  () =>
res.statusCode < 300
? resolve(JSON.parse(data))
: reject(new Error(`Resend ${res.statusCode}: ${data}`))
);
}
);
req.on(“error”, reject);
req.write(body);
req.end();
});
}

/* ══════════════════════════════════════════════════════════════
MISC HELPERS
══════════════════════════════════════════════════════════════ */
function fetchJson(url, token) {
return new Promise((resolve, reject) => {
const req = https.get(
url,
{ headers: { “X-Access-Token”: token, “Content-Type”: “application/json” } },
res => {
let d = “”;
res.on(“data”, c => d += c);
res.on(“end”,  () => { try { resolve(JSON.parse(d)); } catch { reject(new Error(“Invalid JSON”)); } });
}
);
req.on(“error”, reject);
req.setTimeout(8000, () => { req.destroy(); reject(new Error(“Timeout”)); });
});
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ok(data)  { return { statusCode: 200, headers: cors, body: JSON.stringify(data) }; }
function bad(msg)  { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: msg }) }; }