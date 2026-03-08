// TripHunt — subscribe.js
// Email signup: stores subscriber in Supabase, sends welcome email via Resend
// POST { email, origin? } → 200 { success, message }

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type":                 "application/json",
};

const SUPABASE  = process.env.SUPABASE_URL;
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY;
const RESEND    = process.env.RESEND_API_KEY;
const SITE_URL  = process.env.SITE_URL || "https://triphunt.org";

function bad(msg, code = 400) {
  return { statusCode: code, headers: CORS, body: JSON.stringify({ error: msg }) };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return bad("Method not allowed", 405);

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return bad("Invalid JSON"); }

  const email  = (body.email || "").trim().toLowerCase();
  const origin = (body.origin || "LHR").toUpperCase();
  const source = body.source || "website";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad("Please enter a valid email address");
  }

  // 1. Store in Supabase
  if (SUPABASE && SUPA_KEY) {
    try {
      await supabaseUpsert("subscribers", {
        email,
        origin_preference: origin,
        source,
        subscribed_at: new Date().toISOString(),
        active: true,
      }, "email");
    } catch(e) {
      console.error("Supabase subscribe error:", e.message);
      // Don't fail — still send welcome email
    }
  }

  // 2. Send welcome email via Resend
  if (RESEND) {
    try {
      await sendResendEmail({
        to: [email],
        subject: "Welcome to TripHunt — Your first deal is waiting ✈️",
        html: welcomeEmailHtml(email, origin),
      });
    } catch(e) {
      console.error("Resend welcome email error:", e.message);
    }
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      success: true,
      message: "You're in! Check your inbox for your first deal alert.",
    }),
  };
};

// ── Email template ────────────────────────────────────────────────────
function welcomeEmailHtml(email, origin) {
  const originNames = {
    LHR:"London Heathrow", LGW:"London Gatwick", MAN:"Manchester",
    EDI:"Edinburgh", BHX:"Birmingham", BRS:"Bristol", LBA:"Leeds Bradford",
    NCL:"Newcastle", GLA:"Glasgow", LPL:"Liverpool",
  };
  const originName = originNames[origin] || origin;
  const unsubUrl = SITE_URL + "/unsubscribe?email=" + encodeURIComponent(email);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0a0f1e 0%,#1a2442 100%);padding:40px 40px 32px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">✈ TripHunt</div>
    <div style="color:#8b9cbf;font-size:13px;margin-top:4px;">Cheap flights from the UK</div>
  </div>
  <!-- Body -->
  <div style="padding:40px;">
    <h1 style="font-size:24px;font-weight:800;color:#0a0f1e;margin:0 0 12px;">You're on the list 🎉</h1>
    <p style="color:#4a5878;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Every week we'll send you the best flight deals departing from <strong style="color:#0a0f1e;">${originName}</strong> — hand-picked from thousands of routes.
    </p>
    <div style="background:#f0f4ff;border-radius:12px;padding:20px;margin:0 0 28px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#8b9cbf;margin-bottom:12px;">What to expect</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">🔥</span><span style="color:#0a0f1e;font-size:14px;"><strong>Deal of the Week</strong> — our best find</span></div>
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">📉</span><span style="color:#0a0f1e;font-size:14px;"><strong>Price drops</strong> on popular routes</span></div>
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">⚡</span><span style="color:#0a0f1e;font-size:14px;"><strong>Error fares</strong> when we spot them</span></div>
      </div>
    </div>
    <a href="${SITE_URL}" style="display:block;text-align:center;background:#2563eb;color:#fff;text-decoration:none;padding:16px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:-.2px;">
      Browse Today's Deals →
    </a>
  </div>
  <!-- Footer -->
  <div style="background:#f4f6fa;padding:20px 40px;text-align:center;border-top:1px solid #e8ecf4;">
    <p style="color:#8b9cbf;font-size:12px;margin:0;">
      TripHunt · <a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">triphunt.org</a><br>
      <a href="${unsubUrl}" style="color:#8b9cbf;text-decoration:underline;">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`;
}

// ── Resend helper ─────────────────────────────────────────────────────
function sendResendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: "TripHunt Deals <deals@triphunt.org>",
      to,
      subject,
      html,
    });
    const req = https.request({
      hostname: "api.resend.com",
      path:     "/emails",
      method:   "POST",
      headers: {
        "Authorization":  "Bearer " + RESEND,
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => {
        try { resolve(JSON.parse(b)); } catch(e) { resolve({}); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Supabase helpers ──────────────────────────────────────────────────
function supabaseUpsert(table, data, onConflict) {
  return supabaseRequest("POST",
    "/rest/v1/" + table + "?on_conflict=" + onConflict,
    data,
    { "Prefer": "resolution=merge-duplicates" }
  );
}

function supabaseRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url     = new URL(SUPABASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey":        SUPA_KEY,
      "Authorization": "Bearer " + SUPA_KEY,
      "Content-Type":  "application/json",
      ...extraHeaders,
    };
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers,
    }, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => {
        try { resolve(b ? JSON.parse(b) : {}); } catch(e) { resolve({}); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
