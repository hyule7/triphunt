// TripHunt - priceCalendar.js
// FIX: bookingUrl now uses DDMM (not MMDD), includes return date + adults for commission
const https = require("https");

// JetRadar path needs DDMM e.g. "0504" for 5 Apr — NOT MMDD "0405"
function ddmm(s) {
  if (!s) return "";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? p[2] + p[1] : "";
}
function addDays(s, n) {
  const d = new Date(String(s).slice(0, 10));
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return { statusCode:500, headers:cors, body:JSON.stringify({ error:"TRAVELPAYOUTS_TOKEN not set" }) };

  const params = event.queryStringParameters || {};
  const origin = (params.origin || "LHR").toUpperCase();
  const dest   = (params.destination || "").toUpperCase();
  const month  = params.month || new Date().toISOString().slice(0,7);

  try {
    const q = new URLSearchParams({ origin, destination:dest, month, currency:"GBP", token });
    const url = "https://api.travelpayouts.com/v2/prices/month-matrix?" + q;
    console.log("Calendar:", url.replace(token, "***"));

    const data = await fetchJson(url, token);

    if (data && data.data) {
      const calendar = data.data.map(function(d) {
        return {
          date:  d.depart_date || d.date,
          price: d.price || d.value,
          // FIX: was .replace(/-/g,"").slice(4) which gave MMDD (wrong)
          // ddmm() gives DDMM e.g. "0504" = 5 Apr; include 7-night return + adults for commission
          url: (function() {
            var dep = d.depart_date || d.date || "";
            var ret = dep ? addDays(dep, 7) : "";
            var dd  = ddmm(dep), rd = ddmm(ret);
            var path = dd && rd ? origin + dd + dest + rd + "11" : origin + dest;
            return "https://www.jetradar.com/search/" + path + "?adults=1&currency=GBP&locale=en&marker=" + MARKER;
          })()
        };
      });
      // FIX: frontend reads data.calendar — was returning as 'data' key so calendar always showed empty
      return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, origin, destination:dest, month, calendar }) };
    }
    return { statusCode:200, headers:cors, body:JSON.stringify({ success:false, data:[] }) };
  } catch(err) {
    return { statusCode:500, headers:cors, body:JSON.stringify({ error:err.message, data:[] }) };
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
