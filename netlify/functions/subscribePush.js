// TripHunt — subscribePush.js
// Handles Web Push API subscription storage
// POST: save a new push subscription with route preferences
// DELETE: remove a subscription

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Content-Type":                 "application/json",
};

const SUPABASE = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE + "/rest/v1" + path);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        "apikey":        SUPA_KEY,
        "Authorization": "Bearer " + SUPA_KEY,
        "Content-Type":  "application/json",
        "Prefer":        method === "POST" ? "return=minimal" : "",
      },
    };
    const req = https.request(opts, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("Timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  if (!SUPABASE || !SUPA_KEY) {
    // Graceful degradation — log and acknowledge without storing
    console.log("Push sub received but Supabase not configured:", event.body?.slice(0, 100));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, _mode: "demo" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "DELETE") {
      // Unsubscribe: remove endpoint from DB
      const endpoint = encodeURIComponent(body.endpoint || "");
      await supabaseRequest("DELETE", `/push_subscriptions?endpoint=eq.${endpoint}`);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === "POST") {
      const { subscription, orig, dest, email } = body;

      if (!subscription?.endpoint) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing subscription" }) };
      }

      // Upsert push subscription
      const record = {
        endpoint:   subscription.endpoint,
        p256dh:     subscription.keys?.p256dh || "",
        auth:       subscription.keys?.auth || "",
        origin_pref: orig || "ANY",
        dest_pref:  dest || "ANY",
        email:      email || null,
        active:     true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabaseRequest("POST", "/push_subscriptions?on_conflict=endpoint", record);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  } catch (e) {
    console.error("subscribePush error:", e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
