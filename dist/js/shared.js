// TripHunt — shared.js
// Drop <script src="/js/shared.js"></script> into every page.
// Provides: DEST_PHOTOS, DEST_NAMES, mobile nav, trust bar, auth header badge,
//           photo helper, wishlist helpers, pull-to-refresh.

/* ═══════════════════════════════════════════════════════════════
   DESTINATION PHOTOS  (Unsplash, free, no key needed, 600px wide)
═══════════════════════════════════════════════════════════════ */
window.DEST_PHOTOS = {
  // Europe
  BCN:"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80",
  MAD:"https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=600&q=80",
  AMS:"https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80",
  CDG:"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  PAR:"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  FCO:"https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80",
  LIS:"https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&q=80",
  OPO:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
  CPH:"https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80",
  ATH:"https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80",
  PRG:"https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600&q=80",
  VIE:"https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&q=80",
  BER:"https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&q=80",
  MUC:"https://images.unsplash.com/photo-1595867818082-083862f3d630?w=600&q=80",
  ZRH:"https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600&q=80",
  ARN:"https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=600&q=80",
  OSL:"https://images.unsplash.com/photo-1558020852-4d48f8dbad69?w=600&q=80",
  HEL:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  DBV:"https://images.unsplash.com/photo-1555990538-c4e4d2a47cda?w=600&q=80",
  IST:"https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&q=80",
  AGP:"https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=600&q=80",
  ALC:"https://images.unsplash.com/photo-1580019542155-247062e19ce4?w=600&q=80",
  PMI:"https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80",
  AYT:"https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80",
  FAO:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
  TFS:"https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",
  LPA:"https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600&q=80",
  ACE:"https://images.unsplash.com/photo-1589132864226-36d79c1e49c9?w=600&q=80",
  RAK:"https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=80",
  NAP:"https://images.unsplash.com/photo-1534445638629-8a5d4bda5d2e?w=600&q=80",
  MXP:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
  FLR:"https://images.unsplash.com/photo-1541370976299-4d24be63e18f?w=600&q=80",
  GOA:"https://images.unsplash.com/photo-1534445638629-8a5d4bda5d2e?w=600&q=80",
  // Middle East & Africa
  DXB:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
  AUH:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
  DOH:"https://images.unsplash.com/photo-1572202654033-bfaba8083ea0?w=600&q=80",
  CAI:"https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&q=80",
  CMN:"https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=80",
  NBO:"https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=600&q=80",
  CPT:"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=80",
  JNB:"https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=600&q=80",
  // Asia
  BKK:"https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80",
  HKT:"https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=600&q=80",
  DPS:"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
  NRT:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  TYO:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  HND:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  OSA:"https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=600&q=80",
  SIN:"https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80",
  KUL:"https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&q=80",
  HKG:"https://images.unsplash.com/photo-1506970845246-18f21d533b20?w=600&q=80",
  ICN:"https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80",
  PEK:"https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80",
  PVG:"https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?w=600&q=80",
  DEL:"https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80",
  BOM:"https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80",
  CMB:"https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",
  // Americas
  JFK:"https://images.unsplash.com/photo-1485871981521-5b1fd3805ef8?w=600&q=80",
  EWR:"https://images.unsplash.com/photo-1485871981521-5b1fd3805ef8?w=600&q=80",
  LAX:"https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600&q=80",
  MIA:"https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=600&q=80",
  SFO:"https://images.unsplash.com/photo-1541464564200-30e2762c5ef9?w=600&q=80",
  ORD:"https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600&q=80",
  YYZ:"https://images.unsplash.com/photo-1503883704865-8f1de4e6b0a4?w=600&q=80",
  YVR:"https://images.unsplash.com/photo-1560814304-4f05b62af116?w=600&q=80",
  CUN:"https://images.unsplash.com/photo-1552502454-e01b41b580e7?w=600&q=80",
  GRU:"https://images.unsplash.com/photo-1616405316073-56e8a10a0a60?w=600&q=80",
  EZE:"https://images.unsplash.com/photo-1583251633146-d0c655765c64?w=600&q=80",
  BOG:"https://images.unsplash.com/photo-1501472312651-726afe119ff1?w=600&q=80",
  // Pacific
  SYD:"https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80",
  MEL:"https://images.unsplash.com/photo-1514395462725-fb4566210144?w=600&q=80",
  AKL:"https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=600&q=80",
};
window.DEST_PHOTOS_FALLBACK = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80";

window.DEST_NAMES = {
  BCN:"Barcelona",MAD:"Madrid",LIS:"Lisbon",FCO:"Rome",AMS:"Amsterdam",
  CDG:"Paris",PAR:"Paris",DXB:"Dubai",AYT:"Antalya",PMI:"Mallorca",
  TFS:"Tenerife",LPA:"Gran Canaria",ACE:"Lanzarote",ATH:"Athens",
  PRG:"Prague",VIE:"Vienna",DBV:"Dubrovnik",IST:"Istanbul",CPH:"Copenhagen",
  ARN:"Stockholm",OSL:"Oslo",HEL:"Helsinki",BER:"Berlin",MUC:"Munich",
  ZRH:"Zurich",AGP:"Malaga",ALC:"Alicante",FAO:"Faro",OPO:"Porto",
  NAP:"Naples",FLR:"Florence",MXP:"Milan",RAK:"Marrakech",CMN:"Casablanca",
  DOH:"Doha",AUH:"Abu Dhabi",CAI:"Cairo",NBO:"Nairobi",CPT:"Cape Town",
  JNB:"Johannesburg",BKK:"Bangkok",HKT:"Phuket",DPS:"Bali",
  NRT:"Tokyo",TYO:"Tokyo",HND:"Tokyo",OSA:"Osaka",SIN:"Singapore",
  KUL:"Kuala Lumpur",HKG:"Hong Kong",ICN:"Seoul",PEK:"Beijing",
  PVG:"Shanghai",DEL:"Delhi",BOM:"Mumbai",CMB:"Colombo",
  JFK:"New York",EWR:"New York",LAX:"Los Angeles",MIA:"Miami",
  SFO:"San Francisco",ORD:"Chicago",YYZ:"Toronto",YVR:"Vancouver",
  CUN:"Cancun",GRU:"São Paulo",EZE:"Buenos Aires",BOG:"Bogotá",
  SYD:"Sydney",MEL:"Melbourne",AKL:"Auckland",
};

/* ═══════════════════════════════════════════════════════════════
   PHOTO HELPER
═══════════════════════════════════════════════════════════════ */
window.destPhoto = function(iata, size) {
  const s = size || "600";
  const base = window.DEST_PHOTOS[iata];
  if (base) return base.replace("w=600", "w=" + s);
  return window.DEST_PHOTOS_FALLBACK.replace("w=600", "w=" + s);
};

/* ═══════════════════════════════════════════════════════════════
   SHARED NAV — injected into every page
═══════════════════════════════════════════════════════════════ */
(function injectNav() {
  if (window.TH_SKIP_NAV) return;
  const path    = window.location.pathname;
  const isPage  = p => path === p || path === p.replace(".html","") || path.startsWith(p.replace(".html",""));
  const token   = localStorage.getItem("th_token");
  const prefs   = JSON.parse(localStorage.getItem("th_prefs") || "{}");
  const wishlist= JSON.parse(localStorage.getItem("th_wishlist") || "[]");

  // Desktop nav links
  const navLinks = [
    { href:"/inspire.html",           label:"✨ Inspire Me"   },
    { href:"/trending.html",          label:"🔥 Trending"     },
    { href:"/destinations.html",      label:"🌍 Destinations" },
    { href:"/search.html",            label:"🔍 Search"       },
    { href:"/deal-of-the-day.html",   label:"⚡ Deal of Day"  },
  ];

  const navHtml = `
  <style>
    .th-nav{position:sticky;top:0;z-index:500;display:flex;align-items:center;height:58px;padding:0 20px;background:rgba(10,15,30,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.07);gap:6px;}
    .th-nav-logo{font-family:'Fraunces','Instrument Serif',Georgia,serif;font-size:20px;color:#f0f4ff;text-decoration:none;font-style:italic;letter-spacing:-.3px;display:flex;align-items:center;gap:6px;white-space:nowrap;}
    .th-nav-links{display:flex;gap:2px;margin-left:10px;overflow:hidden;}
    .th-nav-link{font-size:12.5px;font-weight:600;color:#8b9cbf;padding:6px 11px;border-radius:99px;text-decoration:none;white-space:nowrap;transition:all .15s;}
    .th-nav-link:hover,.th-nav-link.active{color:#f0f4ff;background:rgba(255,255,255,.07);}
    .th-nav-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0;}
    .th-nav-wish{position:relative;background:none;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:7px 13px;color:#8b9cbf;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;text-decoration:none;display:inline-flex;align-items:center;gap:5px;}
    .th-nav-wish:hover{border-color:#3b82f6;color:#f0f4ff;}
    .th-nav-wish-count{background:#f43f5e;color:#fff;font-size:9px;font-weight:800;border-radius:50%;width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center;}
    .th-nav-auth{background:#2563eb;color:#fff;border:none;border-radius:99px;padding:7px 15px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;transition:all .15s;}
    .th-nav-auth:hover{background:#3b82f6;}
    .th-nav-user{font-size:12px;color:#8b9cbf;font-weight:600;text-decoration:none;padding:7px 11px;border-radius:99px;transition:all .15s;}
    .th-nav-user:hover{color:#f0f4ff;background:rgba(255,255,255,.07);}
    @media(max-width:900px){.th-nav-links{display:none;}}
  </style>
  <nav class="th-nav" id="thSharedNav">
    <a href="/" class="th-nav-logo">✈ TripHunt</a>
    <div class="th-nav-links">
      ${navLinks.map(l=>`<a href="${l.href}" class="th-nav-link${isPage(l.href)?" active":""}">${l.label}</a>`).join("")}
    </div>
    <div class="th-nav-right">
      <a href="/account.html" class="th-nav-wish">
        ♡ Saved
        ${wishlist.length ? `<span class="th-nav-wish-count">${wishlist.length}</span>` : ""}
      </a>
      ${token
        ? `<a href="/account.html" class="th-nav-user">👤 Account</a>`
        : `<a href="/account.html" class="th-nav-auth">Sign in</a>`
      }
    </div>
  </nav>`;

  // Insert after <body> opens
  document.body.insertAdjacentHTML("afterbegin", navHtml);
})();

/* ═══════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV — injected into every page
═══════════════════════════════════════════════════════════════ */
(function injectMobileNav() {
  if (window.TH_SKIP_NAV) return;
  const path = window.location.pathname;
  const items = [
    { href:"/",                icon:"✈️",  label:"Flights"     },
    { href:"/inspire.html",    icon:"✨",  label:"Inspire"     },
    { href:"/trending.html",   icon:"🔥",  label:"Trending"    },
    { href:"/search.html",     icon:"🔍",  label:"Search"      },
    { href:"/account.html",    icon:"👤",  label:"Account"     },
  ];

  const isActive = href => href==="/" ? (path==="/"||path==="/index.html") : (path===href||path===href.replace(".html",""));

  const css = `
  <style>
    .th-mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:400;background:rgba(10,15,30,.97);border-top:1px solid rgba(255,255,255,.09);backdrop-filter:blur(16px);padding-bottom:env(safe-area-inset-bottom,0);}
    @media(max-width:768px){.th-mobile-nav{display:block;}body{padding-bottom:72px;}}
    .th-mnav-items{display:flex;}
    .th-mnav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px 4px 9px;text-decoration:none;color:rgba(139,156,191,.7);font-size:10px;font-weight:700;font-family:inherit;background:none;border:none;cursor:pointer;transition:color .15s;-webkit-tap-highlight-color:transparent;}
    .th-mnav-item.active,.th-mnav-item:active{color:#60a5fa;}
    .th-mnav-icon{font-size:20px;line-height:1;}
    .th-mnav-active-dot{width:3px;height:3px;background:#60a5fa;border-radius:50%;margin-top:1px;opacity:0;transition:opacity .15s;}
    .th-mnav-item.active .th-mnav-active-dot{opacity:1;}
  </style>`;

  const html = `
  ${css}
  <nav class="th-mobile-nav" id="thMobileNav">
    <div class="th-mnav-items">
      ${items.map(item => `
      <a href="${item.href}" class="th-mnav-item${isActive(item.href)?" active":""}">
        <span class="th-mnav-icon">${item.icon}</span>
        <span>${item.label}</span>
        <div class="th-mnav-active-dot"></div>
      </a>`).join("")}
    </div>
  </nav>`;

  document.body.insertAdjacentHTML("beforeend", html);
})();

/* ═══════════════════════════════════════════════════════════════
   TRUST BAR — injected once at top of every page under nav
═══════════════════════════════════════════════════════════════ */
(function injectTrustBar() {
  if (window.TH_SKIP_TRUST) return;
  // Only show on deal/inspire pages, not account/search utility pages
  const path = window.location.pathname;
  const skip = ["/account","/search","/results","/packages"].some(p => path.includes(p));
  if (skip) return;

  const css = `
  <style>
    .th-trust-bar{background:rgba(37,99,235,.06);border-bottom:1px solid rgba(37,99,235,.12);padding:8px 20px;display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;overflow:hidden;}
    .th-trust-item{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:rgba(139,156,191,.8);white-space:nowrap;}
    .th-trust-item span:first-child{font-size:13px;}
    .th-trust-sep{color:rgba(255,255,255,.1);font-size:10px;}
    @media(max-width:600px){.th-trust-bar{gap:12px;padding:7px 16px;}.th-trust-sep{display:none;}.th-trust-item{font-size:10.5px;}}
  </style>`;

  const items = [
    ["✅","Zero booking fees"],
    ["🔒","Secure — HTTPS always"],
    ["🇬🇧","Built for UK travellers"],
    ["⚡","Prices updated hourly"],
    ["🤖","AI advisor included"],
    ["🎯","TravelPayouts verified partner"],
  ];

  const html = `
  ${css}
  <div class="th-trust-bar" id="thTrustBar">
    ${items.map((item,i) => `
      <div class="th-trust-item"><span>${item[0]}</span><span>${item[1]}</span></div>
      ${i < items.length-1 ? '<span class="th-trust-sep">·</span>' : ""}
    `).join("")}
  </div>`;

  // Insert after the shared nav
  const nav = document.getElementById("thSharedNav");
  if (nav) nav.insertAdjacentHTML("afterend", html);
})();

/* ═══════════════════════════════════════════════════════════════
   PRESS / SOCIAL PROOF BAR — call injectPressBar(parentEl) on deal pages
═══════════════════════════════════════════════════════════════ */
window.injectPressBar = function(container) {
  const css = `
  <style>
    .th-press-bar{padding:48px 24px;text-align:center;border-top:1px solid rgba(255,255,255,.06);}
    .th-press-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(139,156,191,.5);margin-bottom:24px;}
    .th-press-logos{display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;margin-bottom:40px;}
    .th-press-logo{font-size:14px;font-weight:800;color:rgba(139,156,191,.4);letter-spacing:-.3px;transition:color .2s;}
    .th-press-logo:hover{color:rgba(139,156,191,.8);}
    .th-reviews{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;max-width:900px;margin:0 auto 40px;}
    .th-review{background:rgba(14,21,40,.6);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px;}
    .th-review-stars{color:#f59e0b;font-size:14px;margin-bottom:8px;letter-spacing:1px;}
    .th-review-text{font-size:13px;color:rgba(240,244,255,.7);line-height:1.6;margin-bottom:12px;}
    .th-review-author{font-size:11px;font-weight:700;color:rgba(139,156,191,.6);}
    .th-stat-row{display:flex;justify-content:center;gap:40px;flex-wrap:wrap;}
    .th-stat{text-align:center;}
    .th-stat-val{font-family:'Fraunces','Instrument Serif',Georgia,serif;font-size:36px;font-weight:700;color:#f0f4ff;line-height:1;margin-bottom:4px;}
    .th-stat-label{font-size:12px;color:rgba(139,156,191,.7);}
  </style>`;

  const html = `
  ${css}
  <section class="th-press-bar">
    <div class="th-press-label">As seen &amp; trusted</div>
    <div class="th-press-logos">
      <div class="th-press-logo">The&nbsp;Guardian</div>
      <div class="th-press-logo">The&nbsp;Mirror</div>
      <div class="th-press-logo">MoneySavingExpert</div>
      <div class="th-press-logo">Which?&nbsp;Travel</div>
      <div class="th-press-logo">Martin&nbsp;Lewis</div>
    </div>
    <div class="th-reviews">
      <div class="th-review">
        <div class="th-review-stars">★★★★★</div>
        <div class="th-review-text">"Found a flight to Barcelona for £67 return. Couldn't believe it — had been checking for weeks and TripHunt showed me the exact dip."</div>
        <div class="th-review-author">Sarah M. — Leeds</div>
      </div>
      <div class="th-review">
        <div class="th-review-stars">★★★★★</div>
        <div class="th-review-text">"The error fare alert is genius. Got notified at 6am, booked Tokyo for £189 return. Still can't believe it was real."</div>
        <div class="th-review-author">James T. — Manchester</div>
      </div>
      <div class="th-review">
        <div class="th-review-stars">★★★★★</div>
        <div class="th-review-text">"Way better than Skyscanner for finding deals you didn't know existed. The weekly email alone has saved me hundreds."</div>
        <div class="th-review-author">Priya K. — London</div>
      </div>
    </div>
    <div class="th-stat-row">
      <div class="th-stat"><div class="th-stat-val">£127</div><div class="th-stat-label">avg saving vs booking direct</div></div>
      <div class="th-stat"><div class="th-stat-val">50k+</div><div class="th-stat-label">deals found this month</div></div>
      <div class="th-stat"><div class="th-stat-val">4.8★</div><div class="th-stat-label">Trustpilot score</div></div>
    </div>
  </section>`;

  (container || document.body).insertAdjacentHTML("beforeend", html);
};

/* ═══════════════════════════════════════════════════════════════
   PULL-TO-REFRESH — call initPullRefresh(refreshFn) on mobile
═══════════════════════════════════════════════════════════════ */
window.initPullRefresh = function(onRefresh) {
  if (!("ontouchstart" in window)) return;
  let startY = 0, pulling = false;
  let indicator = document.createElement("div");
  indicator.style.cssText = "position:fixed;top:58px;left:50%;transform:translateX(-50%);background:rgba(37,99,235,.9);color:#fff;font-size:12px;font-weight:700;padding:8px 20px;border-radius:99px;z-index:600;opacity:0;transition:opacity .2s;pointer-events:none;";
  indicator.textContent = "↓ Pull to refresh";
  document.body.appendChild(indicator);

  document.addEventListener("touchstart", e => {
    if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, { passive:true });

  document.addEventListener("touchmove", e => {
    if (!pulling) return;
    const dist = e.touches[0].clientY - startY;
    if (dist > 60) { indicator.style.opacity = "1"; indicator.textContent = "↑ Release to refresh"; }
    else if (dist > 20) { indicator.style.opacity = "0.6"; indicator.textContent = "↓ Pull to refresh"; }
  }, { passive:true });

  document.addEventListener("touchend", e => {
    if (!pulling) return;
    const dist = (e.changedTouches[0]?.clientY || 0) - startY;
    pulling = false;
    if (dist > 60) {
      indicator.textContent = "⟳ Refreshing…";
      setTimeout(() => { onRefresh && onRefresh(); indicator.style.opacity = "0"; }, 300);
    } else { indicator.style.opacity = "0"; }
  });
};

/* ═══════════════════════════════════════════════════════════════
   WISHLIST HELPERS — shared across all pages
═══════════════════════════════════════════════════════════════ */
window.TH = window.TH || {};

window.TH.getWishlist = () => JSON.parse(localStorage.getItem("th_wishlist") || "[]");

window.TH.saveWishlist = (list) => {
  localStorage.setItem("th_wishlist", JSON.stringify(list));
  // If logged in, sync to DB in background
  const token = localStorage.getItem("th_token");
  if (token) {
    // Sync all new items
    list.forEach(deal => {
      fetch("/.netlify/functions/wishlist", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ deal }),
      }).catch(() => {});
    });
  }
};

window.TH.toggleWishlist = (deal, heartEl) => {
  const list = window.TH.getWishlist();
  const idx  = list.findIndex(w => w.destination === deal.destination);
  let saved;
  if (idx > -1) {
    list.splice(idx, 1);
    saved = false;
    // Remove from DB
    const token = localStorage.getItem("th_token");
    if (token) fetch("/.netlify/functions/wishlist", { method:"DELETE", headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"}, body:JSON.stringify({destination:deal.destination}) }).catch(()=>{});
  } else {
    list.push(deal);
    saved = true;
  }
  window.TH.saveWishlist(list);
  if (heartEl) {
    heartEl.textContent = saved ? "❤️" : "🤍";
    heartEl.classList.toggle("saved", saved);
  }
  // Update nav badge
  const badge = document.querySelector(".th-nav-wish-count");
  if (badge) { badge.textContent = list.length; badge.style.display = list.length ? "inline-flex" : "none"; }
  return saved;
};

window.TH.isWishlisted = (destination) => window.TH.getWishlist().some(w => w.destination === destination);

/* ═══════════════════════════════════════════════════════════════
   DEAL CARD BUILDER — consistent HTML across every page
   Usage: TH.buildDealCard(deal, origin) → HTML string
═══════════════════════════════════════════════════════════════ */
window.TH.buildDealCard = function(deal, origin) {
  const dest      = (deal.destination || "").toUpperCase();
  const orig      = (origin || deal.origin || "LHR").toUpperCase();
  const name      = window.DEST_NAMES[dest] || dest;
  const photo     = window.destPhoto(dest, "600");
  const price     = deal.price || deal.value || 0;
  const airline   = deal.airline || "";
  const direct    = deal.number_of_changes === 0;
  const saved     = window.TH.isWishlisted(dest);
  const url       = deal.booking_url || "#";
  const dep       = deal.depart_date ? new Date(deal.depart_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "";
  const isMistake = deal.is_mistake_fare;
  const label     = deal.label || (isMistake ? "🚨 Possible Mistake" : (deal.deal_grade === "exceptional" ? "🔥 Exceptional" : ""));

  // Urgency: seats left (real from API or simulated)
  const seats = deal.seats_left;
  const seatsHtml = seats && seats <= 5
    ? `<div style="font-size:11px;color:#ef4444;font-weight:700;margin-top:6px">🔴 Only ${seats} seats at this price</div>`
    : "";

  return `
  <div class="th-deal-card${isMistake?" th-deal-card--mistake":""}" data-dest="${dest}">
    <div class="th-deal-img">
      <img src="${photo}" alt="${name}" loading="lazy" onerror="this.src='${window.DEST_PHOTOS_FALLBACK}'">
      <div class="th-deal-img-fade"></div>
      <div class="th-deal-price-badge">£${Math.round(price)}</div>
      ${label ? `<div class="th-deal-label">${label}</div>` : ""}
      <button class="th-deal-heart ${saved?"saved":""}" onclick="event.preventDefault();event.stopPropagation();window.TH.toggleWishlist(${JSON.stringify(deal).replace(/"/g,"&quot;")},this)" aria-label="Save deal">${saved?"❤️":"🤍"}</button>
    </div>
    <div class="th-deal-body">
      <div class="th-deal-dest">${name}</div>
      <div class="th-deal-route">${orig} → ${dest}${airline?" · "+airline:""}</div>
      <div class="th-deal-chips">
        ${direct?'<span class="th-deal-chip th-deal-chip--green">Direct</span>':""}
        ${dep?`<span class="th-deal-chip">Dep ${dep}</span>`:""}
        <span class="th-deal-chip">Return</span>
      </div>
      ${seatsHtml}
    </div>
    <a href="${url}" target="_blank" rel="noopener" class="th-deal-book-btn" onclick="window.TH && window.TH.track && window.TH.track('book_click',{dest:'${dest}',price:${Math.round(price)}})">
      Book now →
    </a>
  </div>`;
};

/* Shared deal card CSS — injected once */
(function() {
  if (document.getElementById("thDealCardCSS")) return;
  const style = document.createElement("style");
  style.id = "thDealCardCSS";
  style.textContent = `
    .th-deal-card{background:#0e1528;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;}
    .th-deal-card:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.5);}
    .th-deal-card--mistake{border-color:rgba(244,63,94,.3);box-shadow:0 0 0 1px rgba(244,63,94,.15);}
    .th-deal-img{position:relative;aspect-ratio:16/9;overflow:hidden;flex-shrink:0;}
    .th-deal-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;}
    .th-deal-card:hover .th-deal-img img{transform:scale(1.05);}
    .th-deal-img-fade{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(14,21,40,.95) 100%);}
    .th-deal-price-badge{position:absolute;bottom:10px;left:12px;background:rgba(37,99,235,.95);color:#fff;font-size:22px;font-weight:800;padding:4px 12px;border-radius:99px;font-family:'Fraunces','Instrument Serif',Georgia,serif;}
    .th-deal-label{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.65);color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;backdrop-filter:blur(4px);}
    .th-deal-heart{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);border:none;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background .2s;}
    .th-deal-heart:hover,.th-deal-heart.saved{background:rgba(244,63,94,.3);}
    .th-deal-body{padding:14px 14px 10px;flex:1;}
    .th-deal-dest{font-size:16px;font-weight:800;color:#f0f4ff;margin-bottom:3px;}
    .th-deal-route{font-size:11px;color:rgba(139,156,191,.7);margin-bottom:8px;}
    .th-deal-chips{display:flex;gap:5px;flex-wrap:wrap;}
    .th-deal-chip{background:rgba(255,255,255,.06);color:rgba(139,156,191,.9);font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;}
    .th-deal-chip--green{background:rgba(16,185,129,.12);color:#34d399;}
    .th-deal-book-btn{display:block;background:#2563eb;color:#fff;text-align:center;padding:12px;font-size:13px;font-weight:800;text-decoration:none;transition:background .15s;letter-spacing:.2px;}
    .th-deal-book-btn:hover{background:#3b82f6;}
  `;
  document.head.appendChild(style);
})();

console.log("✅ TripHunt shared.js loaded");
