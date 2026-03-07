// TripHunt - priceCalendar.js
const https = require("https");

function addDays(s, n) {
  const d = new Date(String(s).slice(0, 10));
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";

function bookingUrl(origin, dest, dep, ret) {
  // Query-string format — reliable, pre-fills all fields on JetRadar
  const p = new URLSearchParams({
    marker:           MARKER,
    currency:         "GBP",
    locale:           "en",
    origin_iata:      origin,
    destination_iata: dest,
    adults:           2,
  });
  if (dep) p.set("depart_date", dep);
  if (ret) p.set("return_date",  ret);
  return "https://www.jetradar.com/flights/?" + p.toString();
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return { statusCode:500, headers:cors, body:JSON.stringify({ error:"TRAVELPAYOUTS_TOKEN not set" }) };

  const params = event.queryStringParameters || {};
  const origin = (params.origin || "LHR").toUpperCase();
  const dest   = (params.destination || "").toUpperCase();
  const month  = params.month || new Date().toISOString().slice(0, 7);

  try {
    const q   = new URLSearchParams({ origin, destination:dest, month, currency:"GBP", token });
    const url = "https://api.travelpayouts.com/v2/prices/month-matrix?" + q;
    console.log("Calendar:", url.replace(token, "***"));

    const data = await fetchJson(url, token);

    if (data && data.data) {
      // Build keyed object { "YYYY-MM-DD": { price, booking_url, grade } }
      const calendar = {};
      const prices   = data.data.map(d => d.price || d.value || 0).filter(Boolean);
      const minP     = prices.length ? Math.min(...prices) : 0;
      const medP     = prices.length ? prices.sort((a,b)=>a-b)[Math.floor(prices.length/2)] : 0;

      data.data.forEach(function(d) {
        const dep   = d.depart_date || d.date || "";
        const ret   = dep ? addDays(dep, 7) : "";
        const price = d.price || d.value || 0;
        const grade = price <= minP * 1.05 ? "best"
                    : price <= medP * 0.85 ? "good"
                    : "fair";
        if (dep) {
          calendar[dep] = {
            price,
            grade,
            booking_url: bookingUrl(origin, dest, dep, ret),
          };
        }
      });

      return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, origin, destination:dest, month, calendar }) };
    }
    return { statusCode:200, headers:cors, body:JSON.stringify({ success:false, calendar:{} }) };
  } catch(err) {
    return { statusCode:500, headers:cors, body:JSON.stringify({ error:err.message, calendar:{} }) };
  }
};

function fetchJson(url, token) {
  return new Promise(function(resolve, reject) {
    const req = https.get(url, { headers:{ "X-Access-Token":token, "Content-Type":"application/json" } }, function(res) {
      let body = "";
      res.on("data", function(c) { body += c; });
      res.on("end", function() {
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error("Timeout")); });
  });
}
