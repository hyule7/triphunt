// TripHunt - priceAlert.js
// POST to create alert, GET to check + email, DELETE to remove

const https = require("https");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const SUPABASE  = process.env.SUPABASE_URL;
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY;
const RESEND    = process.env.RESEND_API_KEY;
const SITE_URL  = process.env.SITE_URL || "https://www.triphunt.org";
const TP_TOKEN  = process.env.TRAVELPAYOUTS_TOKEN;

function bad(msg) {
  return { statusCode:400, headers:cors, body:JSON.stringify({ error:msg }) };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };
  const method = event.httpMethod;
  if (method === "POST")   return createAlert(event);
  if (method === "DELETE") return deleteAlert(event);
  if (method === "GET" && event.queryStringParameters && event.queryStringParameters.action === "check") return checkAlerts();
  if (method === "GET" && event.queryStringParameters && event.queryStringParameters.email) return listAlerts(event);
  return { statusCode:405, headers:cors, body:JSON.stringify({ error:"Method not allowed" }) };
};

async function createAlert(event) {
  let body;
  try { body = JSON.parse(event.body); } catch(e) { return bad("Invalid JSON"); }
  const email = body.email, origin = body.origin, destination = body.destination;
  const destName = body.destName || destination, targetPrice = body.targetPrice, adults = body.adults || 1;
  if (!email || !origin || !destination || !targetPrice) return bad("Missing required fields");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Invalid email");

  const alert = { email, origin_code:origin.toUpperCase(), dest_code:destination.toUpperCase(), dest_name:destName, target_price:parseFloat(targetPrice), adults:parseInt(adults), active:true };

  if (SUPABASE && SUPA_KEY) {
    try {
      await supabaseInsert("price_alerts", alert);
    } catch(e) { console.error("Supabase error:", e.message); }
  }

  return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, message:"Alert created for " + destName + " under GBP" + targetPrice }) };
}

async function deleteAlert(event) {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return bad("Missing alert id");
  if (SUPABASE && SUPA_KEY) {
    try { await supabaseDelete("price_alerts", id); } catch(e) { console.error(e.message); }
  }
  return { statusCode:200, headers:cors, body:JSON.stringify({ success:true }) };
}

async function listAlerts(event) {
  const email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) return bad("Missing email");
  return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, data:[] }) };
}

async function checkAlerts() {
  console.log("Checking price alerts...");
  if (!SUPABASE || !SUPA_KEY || !TP_TOKEN) {
    return { statusCode:200, headers:cors, body:JSON.stringify({ success:false, message:"Missing env vars" }) };
  }

  try {
    const alerts = await supabaseSelect("price_alerts", "active=eq.true");
    if (!alerts || !alerts.length) return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, checked:0 }) };

    let triggered = 0;
    for (const alert of alerts) {
      try {
        const price = await getLowestPrice(alert.origin_code, alert.dest_code, TP_TOKEN);
        if (price && price <= alert.target_price) {
          await sendAlertEmail(alert, price);
          triggered++;
        }
      } catch(e) { console.error("Alert check error:", e.message); }
    }
    return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, checked:alerts.length, triggered }) };
  } catch(e) {
    return { statusCode:500, headers:cors, body:JSON.stringify({ error:e.message }) };
  }
}

async function getLowestPrice(origin, dest, token) {
  return new Promise(function(resolve) {
    const q = new URLSearchParams({ origin, destination:dest, currency:"GBP", token });
    const url = "https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q;
    https.get(url, { headers:{ "X-Access-Token":token } }, function(res) {
      let body = "";
      res.on("data", function(c) { body += c; });
      res.on("end", function() {
        try {
          const data = JSON.parse(body);
          if (data && data.data) {
            const prices = Object.values(data.data).map(function(d) { return d.price; }).filter(Boolean);
            resolve(prices.length ? Math.min.apply(null, prices) : null);
          } else { resolve(null); }
        } catch(e) { resolve(null); }
      });
    }).on("error", function() { resolve(null); });
  });
}

async function sendAlertEmail(alert, price) {
  if (!RESEND) return;
  // FIX: was origin+dest only — no dates so JetRadar opened blank and commission never fired
  // Now uses DDMM format with depart date closest to alert trigger + 7-night return
  function ddmm(s) {
    if (!s) return "";
    const p = String(s).slice(0,10).split("-");
    return p.length === 3 ? p[2] + p[1] : "";
  }
  function addDays(s, n) {
    const d = new Date(String(s).slice(0,10));
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10);
  }
  // Use next available Tuesday ~3 weeks out as suggested depart date
  const now = new Date();
  now.setDate(now.getDate() + 21);
  while (now.getDay() !== 2) now.setDate(now.getDate() + 1);
  const dep = now.toISOString().slice(0,10);
  const ret = addDays(dep, 7);
  const dd = ddmm(dep), rd = ddmm(ret);
  const path = dd && rd
    ? alert.origin_code + dd + alert.dest_code + rd + "11"
    : alert.origin_code + alert.dest_code;
  const bookingUrl = "https://www.aviasales.com/search/" + path + "?marker=" + MARKER + "&currency=GBP&locale=en-GB";
  const html = "<h2>Price Alert: " + alert.dest_name + "</h2><p>A flight from " + alert.origin_code + " to " + alert.dest_name + " is now available for <strong>GBP" + price + "</strong> - below your target of GBP" + alert.target_price + ".</p><a href='" + bookingUrl + "' style='background:#7c6af7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px'>Book Now</a><p style='color:#666;font-size:12px;margin-top:24px'>TripHunt - " + SITE_URL + "</p>";

  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify({ from:"TripHunt Alerts <alerts@triphunt.org>", to:[alert.email], subject:"Price Drop: Flights to " + alert.dest_name + " from GBP" + price, html });
    const req = https.request({ hostname:"api.resend.com", path:"/emails", method:"POST", headers:{ "Authorization":"Bearer " + RESEND, "Content-Type":"application/json", "Content-Length":Buffer.byteLength(payload) } }, function(res) {
      let b = "";
      res.on("data", function(c) { b += c; });
      res.on("end", function() { resolve(JSON.parse(b)); });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function supabaseInsert(table, data) {
  return supabaseRequest("POST", "/rest/v1/" + table, data);
}

async function supabaseDelete(table, id) {
  return supabaseRequest("DELETE", "/rest/v1/" + table + "?id=eq." + id, null);
}

async function supabaseSelect(table, filter) {
  return supabaseRequest("GET", "/rest/v1/" + table + (filter ? "?" + filter : ""), null);
}

function supabaseRequest(method, path, body) {
  return new Promise(function(resolve, reject) {
    const url = new URL(SUPABASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "apikey":SUPA_KEY, "Authorization":"Bearer " + SUPA_KEY, "Content-Type":"application/json" };
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request({ hostname:url.hostname, path:url.pathname + url.search, method, headers }, function(res) {
      let b = "";
      res.on("data", function(c) { b += c; });
      res.on("end", function() {
        try { resolve(b ? JSON.parse(b) : {}); } catch(e) { resolve({}); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
