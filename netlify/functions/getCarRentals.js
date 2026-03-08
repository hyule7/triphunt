// TripHunt — getCarRentals.js
// Car rental via RentalCars.com affiliate (via TravelPayouts)
// GET ?dest=BCN&pickup=2025-04-10&dropoff=2025-04-17&airport=true

const https = require("https");

const CORS = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json" };
const RENTALCARS_AID = "10415"; // TripHunt RentalCars affiliate ID (placeholder)
const TP_TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const _cache = new Map();

// IATA → RentalCars location IDs
const RC_LOCATIONS = {
  BCN:"barcelona_airport_es", MAD:"madrid_barajas_airport_es", LIS:"lisbon_airport_pt",
  FCO:"rome_fiumicino_airport_it", AMS:"amsterdam_schiphol_airport_nl", CDG:"paris_charles_de_gaulle_fr",
  DXB:"dubai_international_airport_ae", AYT:"antalya_airport_tr", ATH:"athens_airport_gr",
  PRG:"prague_vaclav_havel_airport_cz", VIE:"vienna_schwechat_airport_at", IST:"istanbul_airport_tr",
  BKK:"bangkok_suvarnabhumi_airport_th", NRT:"tokyo_narita_airport_jp", SIN:"singapore_changi_airport_sg",
  JFK:"new_york_jfk_airport_us", SYD:"sydney_kingsford_smith_airport_au",
  LHR:"london_heathrow_airport_gb", MAN:"manchester_airport_gb", EDI:"edinburgh_airport_gb",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const p       = event.queryStringParameters || {};
  const dest    = (p.dest || "BCN").toUpperCase();
  const pickup  = p.pickup   || defaultPickup();
  const dropoff = p.dropoff  || defaultDropoff(pickup);

  const cacheKey = `cars_${dest}_${pickup}_${dropoff}`;
  const cached   = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return ok(cached.d);
  }

  const cars = getDemoCars(dest, pickup, dropoff);
  _cache.set(cacheKey, { d:cars, ts:Date.now() });
  return ok(cars);
};

function getDemoCars(dest, pickup, dropoff) {
  const days = Math.max(1, Math.round((new Date(dropoff)-new Date(pickup))/86400000));
  const loc  = RC_LOCATIONS[dest] || dest.toLowerCase() + "_airport";

  const CATEGORIES = [
    { type:"Economy",    icon:"🚗", example:"VW Polo",       price_per_day:18, seats:5, doors:5 },
    { type:"Compact",    icon:"🚙", example:"Ford Focus",    price_per_day:24, seats:5, doors:5 },
    { type:"SUV",        icon:"🚐", example:"Nissan Qashqai",price_per_day:38, seats:5, doors:5 },
    { type:"Premium",    icon:"🏎", example:"BMW 3 Series",  price_per_day:65, seats:5, doors:4 },
    { type:"People Carrier",icon:"🚌",example:"VW Touran",   price_per_day:45, seats:7, doors:5 },
  ];

  return CATEGORIES.map(cat => {
    const totalPrice = cat.price_per_day * days;
    const url = "https://www.rentalcars.com/SearchResults.do" +
      "?affiliateCode=triphunt" +
      "&preflang=en_GB" +
      "&adplat=desktop" +
      "&puLocation=" + encodeURIComponent(dest + " Airport") +
      "&doLocation=" + encodeURIComponent(dest + " Airport") +
      "&puDay=" + pickup.replace(/-/g,"%2F") +
      "&doDay=" + dropoff.replace(/-/g,"%2F") +
      "&puHour=12&puMin=00&doHour=12&doMin=00&cor=gb";
    return {
      type:          cat.type,
      icon:          cat.icon,
      example:       cat.example,
      price_per_day: cat.price_per_day,
      total_price:   totalPrice,
      days,
      seats:         cat.seats,
      doors:         cat.doors,
      includes:      ["Unlimited mileage","Collision damage waiver"],
      booking_url:   url,
      dest,
      _fallback:     true,
    };
  });
}

function defaultPickup()  { const d=new Date(); d.setDate(d.getDate()+28); return d.toISOString().slice(0,10); }
function defaultDropoff(p){ const d=new Date(p); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); }
function ok(data) {
  return { statusCode:200, headers:{...CORS,"Cache-Control":"public, s-maxage=3600"},
    body:JSON.stringify({success:true,data}) };
}
