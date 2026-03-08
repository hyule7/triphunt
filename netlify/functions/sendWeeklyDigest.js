// TripHunt -- sendWeeklyDigest.js
// Netlify Scheduled Function -- runs every Monday at 8:00 UTC
// netlify.toml: [functions.sendWeeklyDigest] schedule = "0 8 * * 1"
//
// Fetches top deals for each subscriber's preferred origin,
// groups by origin to minimise API calls, sends personalised digest.

const https = require("https");

const SUPABASE  = process.env.SUPABASE_URL;
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY;
const RESEND    = process.env.RESEND_API_KEY;
const TP_TOKEN  = process.env.TRAVELPAYOUTS_TOKEN;
const MARKER    = process.env.TRAVELPAYOUTS_MARKER || "499405";
const SITE_URL  = process.env.SITE_URL || "https://triphunt.org";

// ── Destination display names ──────────────────────────────────────
const DEST_NAMES = {
  BCN:"Barcelona",   MAD:"Madrid",    LIS:"Lisbon",     FCO:"Rome",
  AMS:"Amsterdam",   CDG:"Paris",     DXB:"Dubai",      AYT:"Antalya",
  PMI:"Mallorca",    TFS:"Tenerife",  LPA:"Gran Canaria",FAO:"Faro",
  ATH:"Athens",      PRG:"Prague",    VIE:"Vienna",     DBV:"Dubrovnik",
  IST:"Istanbul",    ALC:"Alicante",  BKK:"Bangkok",    DPS:"Bali",
  NRT:"Tokyo",       SIN:"Singapore", KUL:"Kuala Lumpur",HKT:"Phuket",
  JFK:"New York",    LAX:"Los Angeles",MIA:"Miami",     SFO:"San Francisco",
  CPT:"Cape Town",   NBO:"Nairobi",   SYD:"Sydney",     MEL:"Melbourne",
};

const ORIGIN_NAMES = {
  LHR:"London Heathrow", LGW:"London Gatwick", MAN:"Manchester",
  EDI:"Edinburgh",       BHX:"Birmingham",     BRS:"Bristol",
  LBA:"Leeds Bradford",  NCL:"Newcastle",      GLA:"Glasgow",
};

exports.handler = async function() {
  console.log("Weekly digest starting:", new Date().toISOString());

  if (!SUPABASE || !SUPA_KEY || !RESEND) {
    console.log("Missing env vars -- skipping digest");
    return { statusCode: 200 };
  }

  // 1. Fetch active subscribers
  let subscribers;
  try {
    subscribers = await supabaseSelect("subscribers", "active=eq.true&select=email,origin_preference");
  } catch(e) {
    console.error("Failed to fetch subscribers:", e.message);
    return { statusCode: 500 };
  }

  if (!subscribers || !subscribers.length) {
    console.log("No subscribers found");
    return { statusCode: 200 };
  }

  console.log("Subscribers to email:", subscribers.length);

  // 2. Group by origin to minimise API calls
  const byOrigin = {};
  for (const sub of subscribers) {
    const o = (sub.origin_preference || "LHR").toUpperCase();
    if (!byOrigin[o]) byOrigin[o] = [];
    byOrigin[o].push(sub.email);
  }

  // 3. Fetch deals per origin, send digest
  let sent = 0, errors = 0;
  for (const [origin, emails] of Object.entries(byOrigin)) {
    let deals;
    try {
      deals = await fetchDeals(origin, 5);
    } catch(e) {
      console.error("Failed to fetch deals for", origin, e.message);
      deals = getFallbackDeals(origin);
    }

    if (!deals.length) {
      deals = getFallbackDeals(origin);
    }

    // Send to each subscriber for this origin (in batches of 50 via BCC isn't ideal -- send individually for personalisation)
    for (const email of emails) {
      try {
        await sendDigestEmail(email, origin, deals);
        sent++;
        // Small delay to avoid Resend rate limits (100/s)
        await sleep(12);
      } catch(e) {
        console.error("Failed to send to", email, e.message);
        errors++;
      }
    }
  }

  console.log("Digest complete. Sent:", sent, "Errors:", errors);
  return { statusCode: 200 };
};

// ── Fetch deals from TravelPayouts ────────────────────────────────
async function fetchDeals(origin, limit) {
  if (!TP_TOKEN) return [];
  return new Promise(resolve => {
    const q = new URLSearchParams({ origin, currency:"GBP", limit, one_way:"false", token: TP_TOKEN });
    const url = "https://api.travelpayouts.com/aviasales/v3/grouped_prices?" + q;
    https.get(url, { headers:{ "X-Access-Token": TP_TOKEN, "User-Agent":"TripHunt/2.0" } }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data && data.data && Object.keys(data.data).length) {
            const items = Object.values(data.data)
              .map(x => ({
                destination: (x.destination || x.iata || "").toUpperCase(),
                price:        x.price || 0,
                airline:      x.airline || "",
                depart_date:  x.depart_date || defaultDep(),
                return_date:  x.return_date || defaultRet(defaultDep()),
                link:         x.link || "",
              }))
              .filter(x => x.destination && x.price > 0)
              .sort((a, b) => a.price - b.price)
              .slice(0, limit);
            resolve(items);
          } else { resolve([]); }
        } catch(e) { resolve([]); }
      });
    }).on("error", () => resolve([]));
  });
}

// ── Static fallback deals ─────────────────────────────────────────
function getFallbackDeals(origin) {
  const DEALS = {
    LHR: [
      { destination:"BCN", price:89,  airline:"Vueling"  },
      { destination:"LIS", price:79,  airline:"TAP"      },
      { destination:"MAD", price:72,  airline:"Iberia"   },
      { destination:"AMS", price:64,  airline:"KLM"      },
      { destination:"ATH", price:115, airline:"easyJet"  },
    ],
    MAN: [
      { destination:"BCN", price:49, airline:"Ryanair" },
      { destination:"MAD", price:59, airline:"Jet2"    },
      { destination:"AMS", price:75, airline:"KLM"     },
    ],
    EDI: [
      { destination:"BCN", price:55, airline:"Ryanair" },
      { destination:"AMS", price:69, airline:"KLM"     },
    ],
    LGW: [
      { destination:"PMI", price:69, airline:"easyJet" },
      { destination:"BCN", price:55, airline:"Vueling" },
    ],
  };
  const base = DEALS[origin] || DEALS.LHR;
  const dep  = defaultDep();
  const ret  = defaultRet(dep);
  return base.map(r => ({ ...r, depart_date: dep, return_date: ret, link: "" }));
}

// ── Build booking URL ─────────────────────────────────────────────
function buildUrl(origin, dest, dep, ret, link) {
  if (link) {
    return "https://www.aviasales.com" + link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB";
  }
  const dd = ddmm(dep), rd = ddmm(ret);
  const path = origin + dd + dest + rd + "21";
  return "https://www.aviasales.com/search/" + path + "?marker=" + MARKER + "&currency=GBP&locale=en-GB";
}

// ── Send digest email ─────────────────────────────────────────────
function sendDigestEmail(email, origin, deals) {
  const originName = ORIGIN_NAMES[origin] || origin;
  const unsubUrl   = SITE_URL + "/unsubscribe?email=" + encodeURIComponent(email);
  const topDeal    = deals[0];
  const topDest    = topDeal ? (DEST_NAMES[topDeal.destination] || topDeal.destination) : "Europe";
  const topPrice   = topDeal ? topDeal.price : 0;

  const dealsHtml = deals.map((d, i) => {
    const destName = DEST_NAMES[d.destination] || d.destination;
    const url      = buildUrl(origin, d.destination, d.depart_date, d.return_date, d.link);
    const dateStr  = d.depart_date ? fmtDate(d.depart_date) : "";
    const isBest   = i === 0;
    return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #f0f2f8;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              ${isBest ? '<div style="display:inline-block;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:99px;margin-bottom:4px;">🔥 Best Deal</div><br>' : ""}
              <strong style="font-size:16px;color:#0a0f1e;">${origin} → ${destName}</strong><br>
              <span style="font-size:13px;color:#8b9cbf;">${d.airline}${dateStr ? " · " + dateStr : ""} · Return</span>
            </td>
            <td style="text-align:right;white-space:nowrap;padding-left:16px;">
              <div style="font-size:22px;font-weight:800;color:#0a0f1e;">£${d.price}</div>
              <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;margin-top:4px;">Book →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0a0f1e 0%,#1a2442 100%);padding:32px 40px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">✈ TripHunt</div>
    <div style="color:#8b9cbf;font-size:13px;margin-top:4px;">This week's best deals from ${originName}</div>
  </div>
  <!-- Hero deal -->
  ${topDeal ? `
  <div style="background:#eff6ff;padding:24px 40px;border-bottom:1px solid #e0e8f9;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#2563eb;margin-bottom:8px;">Deal of the Week</div>
    <div style="font-size:28px;font-weight:900;color:#0a0f1e;">${origin} → ${topDest}</div>
    <div style="font-size:38px;font-weight:900;color:#2563eb;line-height:1.1;">£${topPrice} <span style="font-size:16px;color:#8b9cbf;font-weight:400;">return</span></div>
    <a href="${buildUrl(origin, topDeal.destination, topDeal.depart_date, topDeal.return_date, topDeal.link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:700;margin-top:16px;">
      Book This Deal →
    </a>
  </div>` : ""}
  <!-- All deals -->
  <div style="padding:24px 40px;">
    <div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b9cbf;margin-bottom:8px;">This week's picks</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${dealsHtml}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${SITE_URL}" style="display:inline-block;background:#0a0f1e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
        See All Deals →
      </a>
    </div>
  </div>
  <!-- Footer -->
  <div style="background:#f4f6fa;padding:20px 40px;text-align:center;border-top:1px solid #e8ecf4;">
    <p style="color:#8b9cbf;font-size:12px;margin:0;">
      TripHunt · <a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">triphunt.org</a><br>
      Prices shown are per person, may vary. <a href="${unsubUrl}" style="color:#8b9cbf;text-decoration:underline;">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`;

  return resendSend({
    to: [email],
    subject: `✈ ${origin} → ${topDest} from £${topPrice} this week`,
    html,
  });
}

// ── Resend send ───────────────────────────────────────────────────
function resendSend({ to, subject, html }) {
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
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch(e) { resolve({}); } });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Supabase ──────────────────────────────────────────────────────
function supabaseSelect(table, filter) {
  return supabaseRequest("GET", "/rest/v1/" + table + (filter ? "?" + filter : ""), null);
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(SUPABASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey":        SUPA_KEY,
      "Authorization": "Bearer " + SUPA_KEY,
      "Content-Type":  "application/json",
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
      res.on("end", () => { try { resolve(b ? JSON.parse(b) : []); } catch(e) { resolve([]); } });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function ddmm(s) {
  if (!s) return "";
  const p = String(s).slice(0,10).split("-");
  return p.length === 3 ? p[2] + p[1] : "";
}
function defaultDep() {
  const d = new Date(); d.setDate(d.getDate() + 21);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0,10);
}
function defaultRet(dep) {
  const d = new Date(dep); d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0,10);
}
function fmtDate(s) {
  try {
    return new Date(s).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  } catch(e) { return ""; }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
