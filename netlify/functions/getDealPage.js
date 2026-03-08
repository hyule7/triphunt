// TripHunt — getDealPage.js
// Netlify function that serves SEO-optimised deal pages.
// Route: /deal/:slug → this function renders the HTML.
// netlify.toml: [[redirects]] from="/deal/*" to="/.netlify/functions/getDealPage" status=200

const https  = require("https");
const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";
const SUPABASE = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE_URL = process.env.SITE_URL || "https://www.triphunt.org";

// ── Fallback deal data keyed by common slugs ──────────────────────
const FALLBACK_DEALS = {
  default: {
    origin_city:"London", origin_code:"LHR", dest_name:"Barcelona", dest_code:"BCN",
    dest_country:"Spain", dest_emoji:"🌊", airline:"Vueling", stops:0,
    price:54, typical_price:120, saving_pct:55, saving_amount:66,
    deal_score:82, deal_tier:"exceptional", deal_badge:"EXCEPTIONAL",
    depart_date: futureDate(21), return_date: futureDate(28),
    booking_url:`https://www.aviasales.com/search/LHR${ddmm(futureDate(21))}BCN${ddmm(futureDate(28))}21?marker=${MARKER}&currency=GBP&locale=en-GB`,
    longhaul:false,
  },
};

function futureDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function ddmm(s) { const p = s.slice(0,10).split("-"); return p[2]+p[1]; }
function fmtDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}
function urgencyMsg(score) {
  if (score >= 90) return { text:"🚨 Extreme deal — prices like this vanish within hours", cls:"urgency-extreme" };
  if (score >= 80) return { text:"🔥 Exceptional deal — historically this route averages much higher", cls:"urgency-high" };
  return { text:"⚡ Strong deal — below average for this route", cls:"urgency-medium" };
}

// ── Fetch deal from Supabase by slug ─────────────────────────────
async function fetchDeal(slug) {
  if (!SUPABASE || !SUPA_KEY) return null;
  return new Promise((resolve) => {
    const url = `${SUPABASE}/rest/v1/deals?slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`;
    https.get(url, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(Array.isArray(data) && data.length ? data[0] : null);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

// ── HTML page template ────────────────────────────────────────────
function renderPage(deal, slug) {
  const urg = urgencyMsg(deal.deal_score);
  const depFmt = fmtDate(deal.depart_date);
  const retFmt = fmtDate(deal.return_date);
  const shareUrl   = `${SITE_URL}/deal/${slug}`;
  const shareText  = `✈️ ${deal.origin_city} → ${deal.dest_name} from £${deal.price} (${deal.saving_pct}% off!) `;
  const waShare    = `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`;
  const twShare    = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const fbShare    = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const altOrigins = deal.origin_code === "LHR"
    ? ["Manchester","Edinburgh","Birmingham","Bristol"]
    : ["London","Manchester","Edinburgh"];
  const isError   = deal.is_error_fare || deal.deal_score >= 90;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${deal.origin_city} to ${deal.dest_name} from £${deal.price} | TripHunt Deals</title>
<meta name="description" content="${deal.saving_pct}% off flights from ${deal.origin_city} to ${deal.dest_name}. Was £${deal.typical_price} — now £${deal.price} return. ${deal.airline ? 'Flying ' + deal.airline + '. ' : ''}Book now before this deal sells out.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE_URL}/deal/${slug}">

<!-- Open Graph for viral sharing -->
<meta property="og:type"        content="article">
<meta property="og:title"       content="${deal.dest_emoji} ${deal.origin_city} → ${deal.dest_name} from £${deal.price} — ${deal.saving_pct}% off!">
<meta property="og:description" content="Usually £${deal.typical_price}. Save £${deal.saving_amount}. ${deal.airline || 'Multiple airlines'}. ${deal.stops === 0 ? 'Direct flight.' : ''} Book through TripHunt — zero fees.">
<meta property="og:url"         content="${SITE_URL}/deal/${slug}">
<meta property="og:image"       content="${SITE_URL}/og/deal-${deal.dest_code?.toLowerCase()}.jpg">
<meta name="twitter:card"       content="summary_large_image">
<meta name="twitter:title"      content="${deal.dest_emoji} £${deal.price} flights: ${deal.origin_city} → ${deal.dest_name}">
<meta name="twitter:description" content="${deal.saving_pct}% below average. Save £${deal.saving_amount}. ${deal.airline || ''}. Zero booking fees.">

<!-- Structured data -->
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"Product",
  "name":"${deal.origin_city} to ${deal.dest_name} Flight Deal",
  "description":"Return flights from ${deal.origin_city} to ${deal.dest_name} from £${deal.price}. ${deal.saving_pct}% below historical average price of £${deal.typical_price}.",
  "offers":{
    "@type":"Offer",
    "price":"${deal.price}",
    "priceCurrency":"GBP",
    "availability":"https://schema.org/LimitedAvailability",
    "url":"${SITE_URL}/deal/${slug}",
    "validFrom":"${new Date().toISOString()}",
    "validThrough":"${deal.expires_at || futureDate(3)}"
  },
  "brand":{"@type":"Brand","name":"${deal.airline || 'Multiple Airlines'}"}
}
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,900&display=swap" rel="stylesheet">
<style>
:root{--navy:#08101f;--navy1:#0c1525;--navy2:#111e32;--navy3:#172440;--border:rgba(255,255,255,.08);--border2:rgba(255,255,255,.14);--acc:#2563eb;--grn:#10b981;--red:#ef4444;--yel:#f59e0b;--txt:#eef2ff;--txt2:#8b9cbf;--txt3:#4a5878;--r8:8px;--r12:12px;--r16:16px;--r24:24px;--r99:9999px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',sans-serif;background:var(--navy);color:var(--txt);-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:inherit;text-decoration:none}

/* NAV */
nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:16px;padding:0 24px;height:52px;background:rgba(8,16,31,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.nav-logo{font-family:'Fraunces',serif;font-size:19px;font-weight:900}
.nav-back{font-size:13px;color:var(--txt2);margin-left:auto}
.nav-back:hover{color:var(--txt)}

/* URGENCY BANNER */
.urgency-banner{padding:10px 24px;text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid}
.urgency-extreme{background:rgba(239,68,68,.12);color:#fca5a5;border-color:rgba(239,68,68,.2)}
.urgency-high{background:rgba(245,158,11,.1);color:#fcd34d;border-color:rgba(245,158,11,.15)}
.urgency-medium{background:rgba(37,99,235,.1);color:#93c5fd;border-color:rgba(37,99,235,.15)}

/* HERO */
.deal-hero{max-width:860px;margin:0 auto;padding:40px 24px 0}
.deal-breadcrumb{font-size:12px;color:var(--txt3);margin-bottom:16px}
.deal-breadcrumb a{color:var(--txt3)}
.deal-breadcrumb a:hover{color:var(--txt2)}
.deal-badge-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.badge{padding:5px 14px;border-radius:var(--r99);font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase}
.badge-exceptional{background:rgba(245,158,11,.15);color:#fcd34d;border:1px solid rgba(245,158,11,.25)}
.badge-error{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.2)}
.badge-direct{background:rgba(16,185,129,.1);color:#6ee7b7;border:1px solid rgba(16,185,129,.15)}
.badge-longhaul{background:rgba(139,92,246,.1);color:#c4b5fd;border:1px solid rgba(139,92,246,.15)}

.deal-title{font-family:'Fraunces',serif;font-size:clamp(32px,6vw,56px);font-weight:900;line-height:1.05;letter-spacing:-1px;margin-bottom:10px}
.deal-title .dest-emoji{font-size:.85em}
.deal-subtitle{font-size:16px;color:var(--txt2);margin-bottom:24px}

/* PRICE CARD */
.price-card{background:var(--navy1);border:1px solid var(--border2);border-radius:var(--r24);padding:28px;margin-bottom:20px;display:flex;align-items:center;gap:28px;flex-wrap:wrap}
.price-main{flex-shrink:0}
.price-amount{font-family:'Fraunces',serif;font-size:64px;font-weight:900;color:var(--grn);line-height:1}
.price-pp{font-size:14px;color:var(--txt3);margin-top:2px}
.price-compare{flex:1;min-width:180px}
.price-was{font-size:14px;color:var(--txt3);text-decoration:line-through;margin-bottom:4px}
.price-saving{font-size:20px;font-weight:800;color:var(--grn);margin-bottom:4px}
.price-bar-wrap{margin-top:10px}
.price-bar-label{font-size:11px;color:var(--txt3);margin-bottom:4px;font-weight:600}
.price-bar{height:6px;background:var(--navy3);border-radius:var(--r99);overflow:hidden}
.price-bar-fill{height:100%;background:linear-gradient(90deg,var(--grn),#34d399);border-radius:var(--r99)}
.book-btn{padding:16px 32px;background:var(--grn);color:#fff;border-radius:var(--r12);font-size:16px;font-weight:800;font-family:'Outfit',sans-serif;border:none;cursor:pointer;white-space:nowrap;transition:all .2s;display:inline-block}
.book-btn:hover{background:#059669;transform:translateY(-2px);box-shadow:0 8px 32px rgba(16,185,129,.3)}

/* DETAILS GRID */
.details-grid{max-width:860px;margin:0 auto 24px;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.details-grid{grid-template-columns:1fr}.price-card{flex-direction:column;align-items:flex-start}}
.detail-card{background:var(--navy1);border:1px solid var(--border);border-radius:var(--r16);padding:18px}
.detail-label{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
.detail-value{font-size:15px;font-weight:700;color:var(--txt)}
.detail-sub{font-size:12px;color:var(--txt2);margin-top:2px}

/* SHARE */
.share-section{max-width:860px;margin:0 auto 24px;padding:0 24px}
.share-card{background:var(--navy2);border:1px solid var(--border);border-radius:var(--r16);padding:20px}
.share-title{font-size:14px;font-weight:800;margin-bottom:14px}
.share-btns{display:flex;gap:10px;flex-wrap:wrap}
.share-btn{padding:10px 18px;border-radius:var(--r8);font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:'Outfit',sans-serif;display:flex;align-items:center;gap:6px;transition:all .15s}
.share-btn:hover{transform:translateY(-1px);filter:brightness(1.1)}
.share-wa{background:#25d366;color:#fff}
.share-tw{background:#1da1f2;color:#fff}
.share-fb{background:#1877f2;color:#fff}
.share-copy{background:var(--navy3);color:var(--txt);border:1px solid var(--border2)}

/* SEO CONTENT */
.seo-section{max-width:860px;margin:0 auto 32px;padding:0 24px}
.seo-section h2{font-family:'Fraunces',serif;font-size:22px;font-weight:900;margin-bottom:12px}
.seo-section p{font-size:14px;color:var(--txt2);line-height:1.8;margin-bottom:10px}
.faq-item{border-top:1px solid var(--border);padding:16px 0}
.faq-q{font-size:14px;font-weight:700;margin-bottom:6px;cursor:pointer}
.faq-a{font-size:13px;color:var(--txt2);line-height:1.7}

/* MORE DEALS */
.more-deals{max-width:860px;margin:0 auto 40px;padding:0 24px}
.more-deals h2{font-family:'Fraunces',serif;font-size:20px;font-weight:900;margin-bottom:14px}
.alt-origin-links{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.alt-link{padding:8px 16px;background:var(--navy2);border:1px solid var(--border2);border-radius:var(--r99);font-size:13px;font-weight:600;color:var(--txt2);transition:all .15s}
.alt-link:hover{color:var(--txt);background:var(--navy3)}

/* EMAIL CAPTURE */
.email-bar{background:linear-gradient(135deg,var(--navy2),var(--navy3));border-top:1px solid var(--border);padding:32px 24px;text-align:center}
.email-bar h2{font-family:'Fraunces',serif;font-size:22px;font-weight:900;margin-bottom:6px}
.email-bar p{font-size:13px;color:var(--txt2);margin-bottom:20px}
.email-form{display:flex;gap:10px;max-width:400px;margin:0 auto;justify-content:center;flex-wrap:wrap}
.email-input{flex:1;min-width:200px;background:var(--navy1);border:1px solid var(--border2);border-radius:var(--r8);padding:11px 16px;font-family:'Outfit',sans-serif;font-size:14px;color:var(--txt);outline:none}
.email-input:focus{border-color:var(--grn)}
.email-submit{padding:11px 22px;background:var(--grn);color:#fff;border-radius:var(--r8);font-size:14px;font-weight:800;border:none;cursor:pointer;font-family:'Outfit',sans-serif;white-space:nowrap}
.footer{padding:20px 24px;text-align:center;font-size:12px;color:var(--txt3);border-top:1px solid var(--border)}
.footer a{color:var(--txt2)}
</style>
</head>
<body>

<nav>
  <a class="nav-logo" href="/">✈️ TripHunt</a>
  <a class="nav-back" href="/">← All deals</a>
</nav>

<div class="urgency-banner ${urg.cls}">${urg.text}</div>

<!-- HERO -->
<div class="deal-hero">
  <div class="deal-breadcrumb">
    <a href="/">Home</a> › <a href="/deals">Deals</a> › ${deal.origin_city} to ${deal.dest_name}
  </div>
  <div class="deal-badge-row">
    ${isError ? `<span class="badge badge-error">🚨 ${deal.deal_score >= 95 ? "Legendary" : "Error Fare"}</span>` : `<span class="badge badge-exceptional">🔥 ${deal.deal_badge || "Exceptional"}</span>`}
    ${deal.stops === 0 ? `<span class="badge badge-direct">Direct flight</span>` : ""}
    ${deal.longhaul ? `<span class="badge badge-longhaul">Long-haul</span>` : ""}
  </div>
  <h1 class="deal-title">
    <span class="dest-emoji">${deal.dest_emoji}</span>
    ${deal.origin_city} to ${deal.dest_name} from £${deal.price}
  </h1>
  <p class="deal-subtitle">
    ${deal.saving_pct}% below the average price for this route · Usually £${deal.typical_price}
    ${deal.airline ? ` · ${deal.airline}` : ""}
    ${deal.stops === 0 ? " · Direct" : ` · ${deal.stops} stop`}
  </p>

  <!-- PRICE CARD -->
  <div class="price-card">
    <div class="price-main">
      <div class="price-amount">£${deal.price}</div>
      <div class="price-pp">per person return</div>
    </div>
    <div class="price-compare">
      <div class="price-was">Typical price: £${deal.typical_price}</div>
      <div class="price-saving">You save £${deal.saving_amount} (${deal.saving_pct}%)</div>
      <div class="price-bar-wrap">
        <div class="price-bar-label">Price vs. historical average</div>
        <div class="price-bar">
          <div class="price-bar-fill" style="width:${Math.max(8, 100 - deal.saving_pct)}%"></div>
        </div>
      </div>
    </div>
    <a class="book-btn" href="${deal.booking_url}" target="_blank" rel="noopener"
       onclick="trackClick('${slug}')">
      Book This Deal →
    </a>
  </div>
</div>

<!-- DETAILS GRID -->
<div class="details-grid">
  <div class="detail-card">
    <div class="detail-label">Departure</div>
    <div class="detail-value">${deal.origin_city}</div>
    <div class="detail-sub">${deal.origin_airport || deal.origin_code}</div>
  </div>
  <div class="detail-card">
    <div class="detail-label">Destination</div>
    <div class="detail-value">${deal.dest_name}, ${deal.dest_country}</div>
    <div class="detail-sub">${deal.dest_code} Airport</div>
  </div>
  <div class="detail-card">
    <div class="detail-label">Outbound</div>
    <div class="detail-value">${depFmt || "Flexible dates"}</div>
    <div class="detail-sub">${deal.airline || "Multiple airlines"}</div>
  </div>
  <div class="detail-card">
    <div class="detail-label">Return</div>
    <div class="detail-value">${retFmt || "Flexible"}</div>
    <div class="detail-sub">${deal.stops === 0 ? "Direct" : `${deal.stops} stop`}</div>
  </div>
</div>

<!-- SHARE -->
<div class="share-section">
  <div class="share-card">
    <div class="share-title">📤 Share this deal with friends</div>
    <div class="share-btns">
      <a class="share-btn share-wa" href="${waShare}" target="_blank" rel="noopener">💬 WhatsApp</a>
      <a class="share-btn share-tw" href="${twShare}" target="_blank" rel="noopener">🐦 Twitter</a>
      <a class="share-btn share-fb" href="${fbShare}" target="_blank" rel="noopener">👥 Facebook</a>
      <button class="share-btn share-copy" onclick="copyDealLink('${shareUrl}', this)">🔗 Copy link</button>
    </div>
  </div>
</div>

<!-- SEO CONTENT -->
<div class="seo-section">
  <h2>About this deal: ${deal.origin_city} → ${deal.dest_name}</h2>
  <p>
    TripHunt detected this flight deal from ${deal.origin_city} (${deal.origin_code}) to ${deal.dest_name}, ${deal.dest_country}
    at £${deal.price} per person return — ${deal.saving_pct}% below the historical average of £${deal.typical_price}.
    ${deal.airline ? `The fare is operated by ${deal.airline}. ` : ""}
    ${deal.stops === 0 ? "This is a direct flight — no layovers. " : `The route involves ${deal.stops} stop. `}
  </p>
  <p>
    Deal scores are calculated using our proprietary algorithm that compares current prices against 12 months of historical data,
    weighted by route popularity, fare rarity, and departure airport demand.
    This deal scored ${deal.deal_score}/100 — placing it in the <strong>${deal.deal_tier}</strong> tier.
    We recommend booking quickly as fares at this level typically sell out within a few hours.
  </p>

  <h2 style="margin-top:24px">Frequently asked questions</h2>
  <div class="faq-item">
    <div class="faq-q">Is £${deal.price} really that cheap for ${deal.origin_city} to ${deal.dest_name}?</div>
    <div class="faq-a">Yes. The historical average for this route is around £${deal.typical_price} return per person. At £${deal.price}, this fare is ${deal.saving_pct}% below average — making it one of the cheapest fares we've seen on this route.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">Will this price still be available when I click?</div>
    <div class="faq-a">Cheap fares disappear quickly — sometimes within hours. We recommend clicking through immediately. If the exact fare has gone, the page will show the next best available price for the route.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">Are there any booking fees?</div>
    <div class="faq-a">TripHunt charges zero fees. You book directly with the airline or partner site and pay exactly what's shown. We earn a small affiliate commission from our booking partners at no extra cost to you.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">What if I want to fly from a different UK airport?</div>
    <div class="faq-a">Check prices from other UK airports below — similar deals are often available from multiple departure points.</div>
  </div>
</div>

<!-- ALT ORIGINS -->
<div class="more-deals">
  <h2>Same deal from other UK airports</h2>
  <div class="alt-origin-links">
    ${altOrigins.map(c =>
      `<a class="alt-link" href="/cheap-flights-to/${deal.dest_code.toLowerCase()}?origin=${c.substring(0,3).toUpperCase()}">From ${c} →</a>`
    ).join("")}
    <a class="alt-link" href="/">Compare all airports →</a>
  </div>
  <a class="book-btn" href="${deal.booking_url}" target="_blank" rel="noopener" style="font-size:15px;padding:14px 28px;">
    ✈️ Book ${deal.origin_city} → ${deal.dest_name} from £${deal.price} →
  </a>
</div>

<!-- EMAIL CAPTURE -->
<div class="email-bar">
  <h2>Get the next deal before it sells out</h2>
  <p>Join 47,000+ UK deal hunters. Get the top 3 deals of the week, every Monday.</p>
  <form class="email-form" onsubmit="subscribeEmail(event)">
    <input type="email" class="email-input" placeholder="your@email.com" required>
    <button type="submit" class="email-submit">Alert me</button>
  </form>
</div>

<footer class="footer">
  <p>TripHunt finds cheap flights and error fares from UK airports. We earn affiliate commission when you book — you always pay the same as booking direct.</p>
  <p style="margin-top:6px"><a href="/">Home</a> · <a href="/error-fares">Error Fares</a> · <a href="/trending">Trending</a> · <a href="/share">Share & Earn</a></p>
</footer>

<script>
function trackClick(slug) {
  try {
    fetch('/.netlify/functions/trackConversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'deal_click', slug, ts: Date.now() }),
    });
  } catch(e) {}
}

function copyDealLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    setTimeout(() => btn.innerHTML = orig, 2000);
  });
}

async function subscribeEmail(e) {
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  const btn   = e.target.querySelector('button');
  btn.textContent = 'Subscribing…';
  try {
    await fetch('/.netlify/functions/subscribe', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ email, source:'deal_page', dest:'${deal.dest_code}', origin:'${deal.origin_code}' }),
    });
  } catch(e) {}
  btn.textContent = '✅ Done!';
}
</script>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────
exports.handler = async (event) => {
  // Extract slug from path: /deal/london-to-bali-390 → london-to-bali-390
  const slug = (event.path || "").replace(/^\/deal\//, "").split("?")[0] || "default";

  // Try Supabase first
  let deal = await fetchDeal(slug);

  // Fall back to static
  if (!deal) deal = FALLBACK_DEALS[slug] || FALLBACK_DEALS.default;
  if (!deal) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Deal not found</h1><a href="/">← Back to TripHunt</a>`,
    };
  }

  const html = renderPage(deal, slug);
  return {
    statusCode: 200,
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag":  "index, follow",
    },
    body: html,
  };
};
