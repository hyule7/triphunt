// TripHunt Service Worker v4
// Caches key pages for offline use, handles Web Push for price alerts & error fares

const CACHE_NAME    = "triphunt-v4";
const STATIC_ASSETS = [
  "/","/index.html","/inspire.html","/search.html","/results.html",
  "/trending.html","/destinations.html","/deal-of-the-day.html",
  "/deal-card-generator.html","/packages.html","/price-calendar.html",
  "/error-fares.html","/upsell.html","/offline.html",
  "/js/ui.js","/js/deals.js","/js/search.js",
  "/js/results.js","/js/packages.js","/manifest.json",
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(()=>{}));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // API: network first, cache fallback
  if (url.pathname.startsWith("/.netlify/functions/")) {
    e.respondWith(
      fetch(e.request.clone()).then(r => {
        if (r.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => caches.match(e.request).then(c => c || new Response(JSON.stringify({success:false,_offline:true,data:[]}),{headers:{"Content-Type":"application/json"}})))
    );
    return;
  }

  // Fonts: cache first
  if (url.hostname.includes("fonts.")) {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { caches.open(CACHE_NAME).then(cache=>cache.put(e.request,r.clone())); return r; })));
    return;
  }

  // HTML: network first, cache fallback
  if (e.request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(e.request).then(r => { caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())); return r; })
        .catch(() => caches.match(e.request).then(c => c || caches.match("/offline.html")))
    );
    return;
  }

  // Stale while revalidate for everything else
  e.respondWith(caches.match(e.request).then(c => {
    const fresh = fetch(e.request).then(r => { if(r.ok) caches.open(CACHE_NAME).then(cache=>cache.put(e.request,r.clone())); return r; });
    return c || fresh;
  }));
});

// ── PUSH NOTIFICATION HANDLER ────────────────────────────────────
self.addEventListener("push", e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title:"✈️ TripHunt Deal Alert", body: e.data.text() || "A price drop was detected.", url:"/error-fares.html" }; }
  const { title="✈️ TripHunt — Price Alert", body="A deal appeared on your watched route.", url="/", icon="/icons/icon-192.png", badge="/icons/icon-96.png", tag="triphunt-deal", origin="", dest="", price="", saving="", type="deal" } = payload;
  let notifTitle=title, notifBody=body, notifUrl=url, notifTag=tag;
  if (type==="error_fare") { notifTitle=`🚨 Mistake fare: ${origin} → ${dest}`; notifBody=`£${price} return — book before the airline fixes it!`; notifUrl="/error-fares.html"; notifTag="error-fare"; }
  else if (type==="deal" && origin && dest && price) { notifTitle=`🔥 Price drop: ${origin} → ${dest}`; notifBody=`Now £${price} return${saving?" (£"+saving+" off)":""}. Tap to book.`; notifUrl=`/results.html?origin=${origin}&destination=${dest}`; notifTag=`deal-${origin}-${dest}`; }
  e.waitUntil(self.registration.showNotification(notifTitle, { body:notifBody, icon, badge, tag:notifTag, renotify:true, requireInteraction:type==="error_fare", data:{ url:notifUrl, orig:origin, dest, price }, actions:[{action:"book",title:"📖 View deal"},{action:"dismiss",title:"✕ Dismiss"}], vibrate:type==="error_fare"?[200,100,200]:[100,50,100] }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const data=e.notification.data||{};
  const targetUrl=data.url||"/";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => { const ex=clients.find(c=>c.url.includes("triphunt")); if(ex){ex.focus();return ex.navigate(targetUrl);} return self.clients.openWindow(targetUrl); }));
  fetch("/.netlify/functions/trackConversion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"push_click",orig:data.orig,dest:data.dest,price:data.price,ts:Date.now()})}).catch(()=>{});
});

self.addEventListener("sync", e => {
  if (e.tag==="sync-subscriptions") e.waitUntil(self.clients.matchAll().then(cs=>cs.forEach(c=>c.postMessage({type:"sync-subscriptions"}))));
});
