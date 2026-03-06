// TripHunt - priceCalender.js
const https = require("https");

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
          url:   "https://www.jetradar.com/search/" + origin + (d.depart_date||"").replace(/-/g,"").slice(4) + dest + "?currency=GBP&marker=" + MARKER
        };
      });
      return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, origin, destination:dest, month, data:calendar }) };
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
