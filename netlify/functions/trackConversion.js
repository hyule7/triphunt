// TripHunt - trackConversion.js
const https = require("https");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const SUPABASE = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };
  if (event.httpMethod !== "POST") return { statusCode:405, headers:cors, body:JSON.stringify({ error:"Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode:400, headers:cors, body:JSON.stringify({ error:"Invalid JSON" }) }; }

  // FIX: frontend spreads trackClick data object which uses snake_case keys
  //      (deal_score, session_id) — was reading camelCase dealScore/sessionId so these were always null
  const record = {
    origin_code: body.origin      || null,
    dest_code:   body.destination || null,
    price:       body.price       || null,
    partner:     body.partner     || "unknown",
    event_type:  body.event_type  || null,
    section:     body.section     || null,
    deal_score:  body.deal_score  || body.dealScore  || null,   // accept both
    session_id:  body.session_id  || body.sessionId  || null,   // accept both
    user_agent:  event.headers["user-agent"] || null,
    referrer:    body.referrer || event.headers["referer"] || null,
  };

  if (SUPABASE && SUPA_KEY) {
    try {
      await supabaseInsert("conversions", record);
    } catch(e) { console.error("Supabase error:", e.message); }
  }

  console.log("Conversion tracked:", record.partner, record.origin_code, "->", record.dest_code, "GBP" + record.price);
  return { statusCode:200, headers:cors, body:JSON.stringify({ success:true }) };
};

function supabaseInsert(table, data) {
  return new Promise(function(resolve, reject) {
    const url = new URL(SUPABASE + "/rest/v1/" + table);
    const payload = JSON.stringify(data);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: { "apikey":SUPA_KEY, "Authorization":"Bearer " + SUPA_KEY, "Content-Type":"application/json", "Prefer":"return=minimal", "Content-Length":Buffer.byteLength(payload) }
    }, function(res) {
      let b = "";
      res.on("data", function(c) { b += c; });
      res.on("end", function() { resolve(b); });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
