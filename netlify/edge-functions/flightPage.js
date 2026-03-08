// TripHunt — flightPage Edge Function
// Handles ANY /flights/:origin-to-:dest/* URL not covered by static files.
// Renders SEO page at the edge — zero build time, infinite URL space.
// Cached by Netlify CDN after first render.
//
// Covers: any city pair, any dimension combo, future years, new airlines.
// netlify.toml must route: /flights/* to this function (AFTER static file check)

export default async function handler(req, context) {
  const url  = new URL(req.url);
  const path = url.pathname; // e.g. /flights/london-to-barcelona/ryanair/august/2027

  // Parse the path: /flights/{route}/{...dimensions}
  const parts = path.replace(/^\/flights\//, "").split("/").filter(Boolean);
  if (!parts.length) return context.next(); // let Netlify serve static index

  // Extract origin-to-dest from first segment
  const routeMatch = parts[0].match(/^(.+)-to-(.+)$/);
  if (!routeMatch) return context.next();

  const originSlug = routeMatch[1];
  const destSlug   = routeMatch[2];
  const dims       = parts.slice(1); // e.g. ["ryanair","august","2027"]

  // Humanise slugs
  const humanise = s => s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const originCity = humanise(originSlug);
  const destCity   = humanise(destSlug);

  // Detect dimensions
  const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const SEASONS = ["summer","winter","spring","autumn"];
  const CABINS  = ["economy","premium-economy","business-class","first-class"];
  const PAX     = ["solo","couples","family-of-3","family-of-4","group-of-6"];
  const STOPS   = ["direct","one-stop"];
  const DURATIONS=["weekend-break","one-week","two-weeks"];
  const AIRLINES= ["ryanair","easyjet","british-airways","jet2","tui-airways","virgin-atlantic","wizz-air","aer-lingus","emirates","turkish-airlines","lufthansa","air-france","klm","norwegian","transavia","vueling","iberia","tap-air-portugal","flybe","loganair"];

  const month   = dims.find(d => MONTHS.includes(d));
  const season  = dims.find(d => SEASONS.includes(d));
  const cabin   = dims.find(d => CABINS.includes(d));
  const pax     = dims.find(d => PAX.includes(d));
  const stops   = dims.find(d => STOPS.includes(d));
  const duration= dims.find(d => DURATIONS.includes(d));
  const airline = dims.find(d => AIRLINES.includes(d));
  const year    = dims.find(d => /^20[2-9]\d$/.test(d));

  // Build a price (deterministic from route slug so it's consistent)
  const hash = (s) => [...s].reduce((a,c) => (a*31 + c.charCodeAt(0)) & 0xFFFFFF, 0);
  const base  = 79 + (hash(destSlug) % 500);
  const cabinMults = {"economy":1,"premium-economy":1.65,"business-class":3.8,"first-class":7.5};
  const monthFactors = [0.80,0.78,0.88,0.95,1.05,1.20,1.35,1.30,1.05,0.90,0.80,1.10];
  let price = base;
  if (cabin)  price = Math.round(price * (cabinMults[cabin] || 1));
  if (month)  price = Math.round(price * monthFactors[MONTHS.indexOf(month)]);
  if (season === "summer") price = Math.round(price * 1.28);
  if (season === "winter") price = Math.round(price * 0.82);

  // Build title/description
  const dimLabels = [];
  if (airline)  dimLabels.push(humanise(airline));
  if (cabin)    dimLabels.push(humanise(cabin));
  if (month)    dimLabels.push(humanise(month));
  if (season)   dimLabels.push(humanise(season));
  if (year)     dimLabels.push(year);
  if (pax)      dimLabels.push(humanise(pax));
  if (stops)    dimLabels.push(humanise(stops));
  if (duration) dimLabels.push(humanise(duration));

  const dimStr  = dimLabels.length ? ` — ${dimLabels.join(", ")}` : "";
  const title   = `Flights ${originCity} to ${destCity}${dimStr} | From £${price} | TripHunt`;
  const desc    = `Compare cheap flights from ${originCity} to ${destCity}${dimStr ? " (" + dimLabels.join(", ") + ")" : ""}. From £${price}. 100+ airlines. No hidden fees.`;
  const canon   = `https://www.triphunt.org${path}`;

  const SITE_URL = "https://www.triphunt.org";

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canon}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canon}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Home","item":"${SITE_URL}"},
  {"@type":"ListItem","position":2,"name":"Flights","item":"${SITE_URL}/flights/"},
  {"@type":"ListItem","position":3,"name":"${originCity} to ${destCity}","item":"${SITE_URL}/flights/${originSlug}-to-${destSlug}/"},
  {"@type":"ListItem","position":4,"name":"${dimLabels.join(" · ") || "All flights"}","item":"${canon}"}
]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {"@type":"Question","name":"How much are flights from ${originCity} to ${destCity}${dimStr}?","acceptedAnswer":{"@type":"Answer","text":"Flights from ${originCity} to ${destCity}${dimStr} start from £${price} per person return. Prices vary by airline and availability."}},
  {"@type":"Question","name":"Which airlines fly from ${originCity} to ${destCity}?","acceptedAnswer":{"@type":"Answer","text":"Multiple airlines operate routes from ${originCity} to ${destCity}. Use TripHunt to compare all carriers."}}
]}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Fraunces:wght@700;900&display=swap" rel="stylesheet">
<style>
:root{--navy:#070b12;--navy1:#0c1220;--navy2:#141c2e;--acc:#6366f1;--acc2:#818cf8;--grn:#10b981;--txt:#e8edf8;--txt2:#6b7fa3;--txt3:#3d4f6b;--border:rgba(255,255,255,.07);--r8:8px;--r12:12px;--r16:16px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',sans-serif;background:var(--navy);color:var(--txt);-webkit-font-smoothing:antialiased}
.container{max-width:960px;margin:0 auto;padding:0 20px}
nav{position:sticky;top:0;z-index:99;display:flex;align-items:center;gap:12px;padding:0 24px;height:52px;background:rgba(7,11,18,.94);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.logo{font-family:'Fraunces',serif;font-size:18px;font-weight:900;text-decoration:none;color:var(--txt)}
.hero{padding:56px 0 48px;background:linear-gradient(135deg,var(--navy1),var(--navy2))}
.hero-label{font-size:12px;font-weight:700;color:var(--acc2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
h1{font-family:'Fraunces',serif;font-size:clamp(28px,5vw,52px);font-weight:900;line-height:1.08;letter-spacing:-.5px;margin-bottom:12px}
h1 .dest{color:var(--acc2)}
h1 .price{color:var(--grn)}
.hsub{font-size:15px;color:var(--txt2);margin-bottom:24px}
.sbtn{display:inline-block;padding:13px 28px;background:var(--grn);color:#fff;border-radius:var(--r8);font-size:15px;font-weight:800;text-decoration:none;transition:all .2s}
.sbtn:hover{background:#059669;transform:translateY(-2px)}
.stats{display:flex;gap:16px;margin:32px 0;flex-wrap:wrap}
.stat{background:var(--navy1);border:1px solid var(--border);border-radius:var(--r12);padding:16px 20px;flex:1;min-width:120px}
.stat-v{font-family:'Fraunces',serif;font-size:24px;font-weight:900;color:var(--txt)}
.stat-l{font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;margin-top:2px}
.sec{margin:32px 0}
.sec-t{font-family:'Fraunces',serif;font-size:22px;font-weight:900;margin-bottom:16px}
.bc{font-size:12px;color:var(--txt3);padding:14px 0;display:flex;flex-wrap:wrap;gap:4px}
.bc a{color:var(--txt2);text-decoration:none}.bc a:hover{color:var(--txt)}
.bcs{color:var(--txt3)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 14px;background:var(--navy1);border:1px solid var(--border);border-radius:9999px;font-size:13px;font-weight:600;color:var(--txt2);text-decoration:none;transition:all .15s}
.chip:hover{color:var(--txt);border-color:rgba(255,255,255,.14)}
.dim-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.dim-pill{padding:5px 14px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:9999px;font-size:12px;font-weight:700;color:var(--acc2)}
footer{margin-top:60px;padding:24px;text-align:center;font-size:12px;color:var(--txt3);border-top:1px solid var(--border)}
</style>
</head>
<body>
<nav>
  <a class="logo" href="/">✈️ TripHunt</a>
  <a href="/flights/" style="font-size:13px;color:var(--txt2);margin-left:auto">All flights</a>
  <a href="/" style="font-size:13px;color:var(--txt2)">Search</a>
</nav>

<div class="hero">
  <div class="container">
    <div class="bc"><a href="/">Home</a><span class="bcs">›</span><a href="/flights/">Flights</a><span class="bcs">›</span><a href="/flights/${originSlug}-to-${destSlug}/">${originCity} to ${destCity}</a>${dims.length ? `<span class="bcs">›</span><span>${dimLabels.join(" · ")}</span>` : ""}</div>
    ${dimLabels.length ? `<div class="dim-pills">${dimLabels.map(l=>`<span class="dim-pill">${l}</span>`).join("")}</div>` : ""}
    <div class="hero-label">✈️ ${originCity} → ${destCity}</div>
    <h1>Flights <span class="dest">${originCity}</span> to <span class="dest">${destCity}</span>${dimStr ? `<br><span style="font-size:0.6em;color:var(--txt2)">${dimLabels.join(" · ")}</span>` : ""}<br>from <span class="price">£${price}</span></h1>
    <p class="hsub">Compare 100+ airlines · Book in GBP · No hidden fees</p>
    <a href="https://www.jetradar.com/flights/?origin=${originSlug.substring(0,3).toUpperCase()}&destination=${destSlug.substring(0,3).toUpperCase()}&marker=599209" target="_blank" rel="noopener" class="sbtn">✈️ See Live Prices →</a>
  </div>
</div>

<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${price}</div><div class="stat-l">Flights from</div></div>
    ${month  ? `<div class="stat"><div class="stat-v">${humanise(month)}</div><div class="stat-l">Month</div></div>` : ""}
    ${cabin  ? `<div class="stat"><div class="stat-v">${humanise(cabin)}</div><div class="stat-l">Cabin class</div></div>` : ""}
    ${airline? `<div class="stat"><div class="stat-v">${humanise(airline)}</div><div class="stat-l">Airline</div></div>` : ""}
    ${year   ? `<div class="stat"><div class="stat-v">${year}</div><div class="stat-l">Travel year</div></div>` : ""}
    ${stops  ? `<div class="stat"><div class="stat-v">${humanise(stops)}</div><div class="stat-l">Route type</div></div>` : ""}
  </div>

  <section class="sec">
    <h2 class="sec-t">About this flight search</h2>
    <p style="color:var(--txt2);line-height:1.8">
      TripHunt compares fares from ${originCity} to ${destCity}${dimStr}.
      Prices shown are indicative — click through to see live fares for your exact dates.
      ${cabin ? `${humanise(cabin)} fares include ${cabin==="economy"?"standard seating":cabin==="premium-economy"?"extra legroom and enhanced meals":cabin==="business-class"?"lie-flat beds on long-haul and priority boarding":"dedicated suites, fine dining and exclusive lounges"}.` : ""}
      ${airline ? `${humanise(airline)} fares are ${AIRLINES.indexOf(airline) < 8 ? "budget" : "full-service"} — ${AIRLINES.indexOf(airline) < 8 ? "check baggage allowances before booking." : "checked baggage is typically included."}` : ""}
    </p>
  </section>

  <section class="sec">
    <h2 class="sec-t">Explore related searches</h2>
    <div class="chips">
      <a href="/flights/${originSlug}-to-${destSlug}/" class="chip">All ${originCity} → ${destCity} fares</a>
      ${!month  ? '<a href="/flights/'+originSlug+'-to-'+destSlug+'/january/" class="chip">January flights</a><a href="/flights/'+originSlug+'-to-'+destSlug+'/july/" class="chip">July flights</a>' : ""}
      ${!cabin  ? '<a href="/flights/'+originSlug+'-to-'+destSlug+'/business-class/" class="chip">Business class</a>' : ""}
      ${!airline? '<a href="/flights/'+originSlug+'-to-'+destSlug+'/ryanair/" class="chip">Ryanair</a><a href="/flights/'+originSlug+'-to-'+destSlug+'/british-airways/" class="chip">British Airways</a>' : ""}
      ${!year   ? '<a href="/flights/'+originSlug+'-to-'+destSlug+'/2026/" class="chip">2026 flights</a>' : ""}
      <a href="/flights/${originSlug}-to-${destSlug}/direct/" class="chip">Direct flights</a>
      <a href="/flights/${originSlug}-to-${destSlug}/couples/" class="chip">Couples</a>
      <a href="/flights/${originSlug}-to-${destSlug}/family-of-4/" class="chip">Family of 4</a>
    </div>
  </section>
</div>

<footer>
  <p>TripHunt finds cheap flights from UK airports. We earn affiliate commission — you always pay the same as booking direct.</p>
  <p style="margin-top:6px"><a href="/">Home</a> · <a href="/flights/">All Flights</a> · <a href="/error-fares">Error Fares</a> · <a href="/trending">Trending</a></p>
</footer>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag":  "index, follow",
      "X-Edge-Rendered": "1",
    },
  });
}

export const config = {
  // Only fires for /flights/* paths that don't have a static file
  path: "/flights/*",
  excludedPath: [
    "/flights/index.html",
  ],
};
