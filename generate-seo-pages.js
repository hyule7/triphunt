/**

- TripHunt Service Worker - sw.js
- Handles: offline caching, background sync, push notifications
- Place this file in your site root (same level as Index.html)
  */

const CACHE_NAME    = “triphunt-v3”;
const STATIC_ASSETS = [
“/”,
“/Index.html”,
“/manifest.json”,
“https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:wght@700;900&display=swap”,
“https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js”,
];

// ── Install: cache static assets
self.addEventListener(“install”, event => {
self.skipWaiting();
event.waitUntil(
caches.open(CACHE_NAME).then(cache =>
Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})))
)
);
});

// ── Activate: clear old caches
self.addEventListener(“activate”, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
).then(() => self.clients.claim())
);
});

// ── Fetch: network-first for API, cache-first for assets
self.addEventListener(“fetch”, event => {
const url = new URL(event.request.url);

// Always network for Netlify functions and external APIs
if (url.pathname.startsWith(”/.netlify/”) ||
url.hostname.includes(“travelpayouts”) ||
url.hostname.includes(“anthropic”) ||
url.hostname.includes(“open-meteo”)) {
event.respondWith(
fetch(event.request).catch(() =>
new Response(JSON.stringify({ error: “offline” }), { headers: { “Content-Type”: “application/json” } })
)
);
return;
}

// Cache-first for static assets (fonts, scripts, images)
if (event.request.method === “GET”) {
event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;
return fetch(event.request).then(response => {
// Cache successful responses from our origin + CDNs
if (response.ok && (url.origin === self.location.origin || url.hostname.includes(“cdnjs”) || url.hostname.includes(“fonts.g”))) {
const clone = response.clone();
caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
}
return response;
}).catch(() =>
caches.match(”/Index.html”).then(r => r || new Response(“Offline”, { status: 503 }))
);
})
);
}
});

// ── Push Notifications (price drop alerts)
self.addEventListener(“push”, event => {
if (!event.data) return;

let data;
try { data = event.data.json(); } catch { data = { title: “TripHunt”, body: event.data.text() }; }

const options = {
body:    data.body || “Price update available”,
icon:    data.icon || “/icons/icon-192.png”,
badge:   “/icons/badge-72.png”,
image:   data.image || null,
data:    { url: data.url || “/” },
actions: [
{ action: “book”,   title: “Book now” },
{ action: “later”,  title: “Remind me later” },
],
vibrate:         [200, 100, 200],
requireInteraction: true,
tag:    data.tag || “triphunt-alert”,
};

event.waitUntil(
self.registration.showNotification(data.title || “TripHunt Price Alert”, options)
);
});

// ── Notification click
self.addEventListener(“notificationclick”, event => {
event.notification.close();

const action = event.action;
const url    = event.notification.data?.url || “/”;

if (action === “later”) return; // just close

event.waitUntil(
clients.matchAll({ type: “window”, includeUncontrolled: true }).then(list => {
for (const client of list) {
if (client.url === url && “focus” in client) return client.focus();
}
if (clients.openWindow) return clients.openWindow(url);
})
);
});

// ── Background sync (retry failed alert registrations)
self.addEventListener(“sync”, event => {
if (event.tag === “sync-alerts”) {
event.waitUntil(syncPendingAlerts());
}
});

async function syncPendingAlerts() {
// Retrieve pending alerts stored in IndexedDB by the frontend
// and retry the POST to /.netlify/functions/priceAlert
// Implementation: frontend stores failed POSTs in localStorage[“th_pending_alerts”]
const pending = JSON.parse(self.localStorage?.getItem?.(“th_pending_alerts”) || “[]”);
for (const alert of pending) {
try {
await fetch(”/.netlify/functions/priceAlert”, {
method:  “POST”,
headers: { “Content-Type”: “application/json” },
body:    JSON.stringify(alert),
});
} catch { /* will retry next sync */ }
}
}