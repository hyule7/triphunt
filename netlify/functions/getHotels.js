// TripHunt -- getHotels.js
// Hotel search via TravelPayouts / Booking.com affiliate API
// GET ?dest=BCN&checkin=2025-04-10&checkout=2025-04-17&pax=2
// Returns hotels with Booking.com affiliate links (aid=304142)

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

const BOOKING_AID  = "304142"; // TripHunt Booking.com affiliate ID
const TP_TOKEN     = process.env.TRAVELPAYOUTS_TOKEN;
const CACHE_TTL    = 30 * 60 * 1000; // 30 minutes
const _cache       = new Map();

// Destination to city ID mapping (Booking.com city IDs)
const CITY_IDS = {
  BCN:"-372490", MAD:"-390625", LIS:"-2167973", FCO:"-126693", AMS:"-2140479",
  CDG:"-1456928", DXB:"-782831", AYT:"25769", PMI:"-394010", TFS:"-390630",
  ATH:"-814876", PRG:"-553173", VIE:"-1995499", DBV:"13914", IST:"-755070",
  BKK:"-3077214", DPS:"835", NRT:"-246227", SIN:"-73635", JFK:"-2140479",
  KUL:"-2403010", HKT:"-3247091", SYD:"-1603135", CPT:"-1217214",
  GRU:"-617400", MEL:"-1603135", AKL:"-2183517",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const p       = event.queryStringParameters || {};
  const dest    = (p.dest || "BCN").toUpperCase();
  const checkin = p.checkin || defaultCheckin();
  const checkout= p.checkout|| defaultCheckout(checkin);
  const pax     = parseInt(p.pax) || 2;
  const limit   = Math.min(parseInt(p.limit)||6, 12);

  const cacheKey = `hotels_${dest}_${checkin}_${checkout}_${pax}`;
  const cached   = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return ok({ data:cached.d, _source:"cache" });
  }

  try {
    const hotels = await fetchHotels(dest, checkin, checkout, pax, limit);
    _cache.set(cacheKey, { d:hotels, ts:Date.now() });
    return ok({ data:hotels, _source:"live",
      headers:{ ...CORS, "Cache-Control":"public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch(e) {
    const fallback = getDemoHotels(dest, checkin, checkout, pax);
    return ok({ data:fallback, _source:"fallback" });
  }
};

async function fetchHotels(dest, checkin, checkout, pax, limit) {
  if (!TP_TOKEN) return getDemoHotels(dest, checkin, checkout, pax);

  const cityId = CITY_IDS[dest] || dest;
  const nights = Math.max(1, Math.round((new Date(checkout)-new Date(checkin))/86400000));

  // TravelPayouts hotel search API
  const url = "https://engine.hotellook.com/api/v2/lookup.json" +
    "?query=" + encodeURIComponent(dest) +
    "&lang=en-gb" +
    "&lookFor=hotel" +
    "&limit=" + limit +
    "&token=" + TP_TOKEN;

  const raw = await fetchJson(url);
  if (!raw.results?.hotels?.length) return getDemoHotels(dest, checkin, checkout, pax);

  return raw.results.hotels.slice(0, limit).map(h => {
    const price      = h.priceFrom || Math.round(80 + Math.random()*200);
    const totalPrice = price * nights;
    const bookingUrl = buildBookingUrl(h.id || h.slug, dest, checkin, checkout, pax);

    return {
      id:              h.id,
      name:            h.label || h.name || "Hotel",
      stars:           h.stars || 3,
      price_per_night: price,
      total_price:     totalPrice,
      nights,
      rating:          h.rating ? (h.rating / 10).toFixed(1) : null,
      reviews:         h.reviews_count || null,
      location:        h.location?.name || "",
      thumb:           h.photoUrl || null,
      booking_url:     bookingUrl,
      dest,
    };
  });
}

function buildBookingUrl(hotelId, dest, checkin, checkout, pax) {
  const base = "https://www.booking.com/searchresults.html";
  return base +
    "?aid=" + BOOKING_AID +
    "&ss=" + encodeURIComponent(dest) +
    "&checkin=" + checkin +
    "&checkout=" + checkout +
    "&group_adults=" + pax +
    "&no_rooms=1" +
    "&label=triphunt-" + dest.toLowerCase();
}

function getDemoHotels(dest, checkin, checkout, pax) {
  const DEST_HOTELS = {
    BCN:[{name:"Hotel Arts Barcelona",stars:5,price_per_night:189,rating:9.2,reviews:4821}],
    MAD:[{name:"Hotel NH Madrid",stars:4,price_per_night:89,rating:8.5,reviews:3210}],
    LIS:[{name:"Bairro Alto Hotel",stars:5,price_per_night:145,rating:9.1,reviews:2890}],
    FCO:[{name:"Hotel Eden Roma",stars:4,price_per_night:120,rating:8.8,reviews:3456}],
    AMS:[{name:"Hotel V Nesplein",stars:4,price_per_night:135,rating:8.7,reviews:2100}],
    DXB:[{name:"Atlantis The Palm",stars:5,price_per_night:380,rating:9.0,reviews:12000}],
    ATH:[{name:"Hotel Grande Bretagne",stars:5,price_per_night:210,rating:9.3,reviews:5600}],
    BKK:[{name:"Mandarin Oriental Bangkok",stars:5,price_per_night:280,rating:9.5,reviews:8900}],
    NRT:[{name:"Park Hyatt Tokyo",stars:5,price_per_night:520,rating:9.4,reviews:4200}],
  };
  const nights = Math.max(1, Math.round((new Date(checkout)-new Date(checkin))/86400000));
  const base = DEST_HOTELS[dest] || [{name:"Central Hotel",stars:4,price_per_night:110,rating:8.5,reviews:1500}];

  return [
    ...base,
    {name:"Boutique City Hotel",stars:3,price_per_night:Math.round(50+Math.random()*60),rating:8.2,reviews:980},
    {name:"Budget Stay " + dest,stars:2,price_per_night:Math.round(30+Math.random()*30),rating:7.8,reviews:640},
  ].map(h => ({
    ...h,
    total_price:  h.price_per_night * nights,
    nights,
    booking_url:  buildBookingUrl("", dest, checkin, checkout, pax),
    dest,
    _fallback:    true,
  }));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout:6000 }, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    }).on("error", reject).on("timeout", function() { this.destroy(); reject(new Error("timeout")); });
  });
}

function defaultCheckin() {
  const d = new Date(); d.setDate(d.getDate()+28);
  while(d.getDay()!==5) d.setDate(d.getDate()+1); // Friday
  return d.toISOString().slice(0,10);
}
function defaultCheckout(checkin) {
  const d = new Date(checkin); d.setDate(d.getDate()+7);
  return d.toISOString().slice(0,10);
}

function ok(d) {
  const headers = { ...CORS, "Cache-Control":"public, s-maxage=1800", ...(d.headers||{}) };
  return { statusCode:200, headers, body:JSON.stringify({ success:true, data:d.data, _source:d._source }) };
}
