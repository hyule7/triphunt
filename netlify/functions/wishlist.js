// TripHunt -- wishlist.js
// Sync user wishlists to Supabase
// GET  ?token=xxx         → { success, data: [...deals] }
// POST { token, deal }    → save deal
// DELETE { token, id }    → remove deal

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type":                 "application/json",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const token = event.headers.authorization?.replace("Bearer ","") || (event.queryStringParameters||{}).token;
  if (!token) return err("Unauthorised", 401);

  // Verify token and get user ID
  let userId;
  try {
    const user = await supabaseReq("GET", "/auth/v1/user", null, { "apikey":SUPABASE_KEY, "Authorization":"Bearer "+token });
    if (user.error || !user.id) return err("Invalid token", 401);
    userId = user.id;
  } catch(e) { return err("Auth error", 401); }

  if (event.httpMethod === "GET") {
    try {
      const rows = await supabaseReq("GET", "/rest/v1/wishlists?user_id=eq." + userId + "&order=created_at.desc", null, serviceHeaders());
      return ok({ data: Array.isArray(rows) ? rows : [] });
    } catch(e) { return err(e.message); }
  }

  if (event.httpMethod === "POST") {
    let body; try { body = JSON.parse(event.body||"{}"); } catch(e) { return err("Bad JSON"); }
    const deal = body.deal;
    if (!deal?.destination || !deal?.price) return err("Missing deal data");
    try {
      await supabaseReq("POST", "/rest/v1/wishlists", {
        user_id:     userId,
        destination: deal.destination,
        origin:      deal.origin || "LHR",
        price:       deal.price,
        airline:     deal.airline || "",
        booking_url: deal.booking_url || "",
        depart_date: deal.depart_date || null,
        return_date: deal.return_date || null,
        created_at:  new Date().toISOString(),
      }, { ...serviceHeaders(), "Prefer":"return=representation" });
      return ok({ message: "Saved to wishlist" });
    } catch(e) { return err(e.message); }
  }

  if (event.httpMethod === "DELETE") {
    let body; try { body = JSON.parse(event.body||"{}"); } catch(e) { return err("Bad JSON"); }
    const { id, destination } = body;
    const filter = id ? "id=eq." + id : "user_id=eq." + userId + "&destination=eq." + destination;
    try {
      await supabaseReq("DELETE", "/rest/v1/wishlists?" + filter, null, serviceHeaders());
      return ok({ message: "Removed from wishlist" });
    } catch(e) { return err(e.message); }
  }

  return err("Method not allowed", 405);
};

function serviceHeaders() {
  return { "apikey":SUPABASE_KEY, "Authorization":"Bearer "+SUPABASE_KEY, "Content-Type":"application/json" };
}

function supabaseReq(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request({ hostname:url.hostname, path:url.pathname+url.search, method, headers }, res => {
      let b = ""; res.on("data", c => b+=c);
      res.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch(e) { resolve({}); } });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function ok(d)  { return { statusCode:200, headers:CORS, body:JSON.stringify({ success:true,  ...d }) }; }
function err(m,c=400){ return { statusCode:c, headers:CORS, body:JSON.stringify({ success:false, error:m }) }; }
