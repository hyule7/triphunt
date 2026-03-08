// TripHunt -- getAutocomplete.js
// Proxies TravelPayouts autocomplete API to avoid browser CORS issues.
// Falls back to a built-in airport list if the API is unreachable.
const https = require("https");

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

// Built-in airport list used as fallback (no API needed)
const AIRPORTS = [
  // UK
  {name:"London Heathrow",   code:"LHR", country:"United Kingdom"},
  {name:"London Gatwick",    code:"LGW", country:"United Kingdom"},
  {name:"London Stansted",   code:"STN", country:"United Kingdom"},
  {name:"London Luton",      code:"LTN", country:"United Kingdom"},
  {name:"London City",       code:"LCY", country:"United Kingdom"},
  {name:"Manchester",        code:"MAN", country:"United Kingdom"},
  {name:"Edinburgh",         code:"EDI", country:"United Kingdom"},
  {name:"Birmingham",        code:"BHX", country:"United Kingdom"},
  {name:"Bristol",           code:"BRS", country:"United Kingdom"},
  {name:"Glasgow",           code:"GLA", country:"United Kingdom"},
  {name:"Leeds Bradford",    code:"LBA", country:"United Kingdom"},
  {name:"Newcastle",         code:"NCL", country:"United Kingdom"},
  {name:"Liverpool",         code:"LPL", country:"United Kingdom"},
  {name:"East Midlands",     code:"EMA", country:"United Kingdom"},
  {name:"Belfast International", code:"BFS", country:"United Kingdom"},
  {name:"Cardiff",           code:"CWL", country:"United Kingdom"},
  {name:"Exeter",            code:"EXT", country:"United Kingdom"},
  {name:"Southampton",       code:"SOU", country:"United Kingdom"},
  {name:"Aberdeen",          code:"ABZ", country:"United Kingdom"},
  {name:"Inverness",         code:"INV", country:"United Kingdom"},
  {name:"Doncaster Sheffield", code:"DSA", country:"United Kingdom"},
  {name:"Norwich",           code:"NWI", country:"United Kingdom"},
  // Europe
  {name:"Barcelona",         code:"BCN", country:"Spain"},
  {name:"Madrid",            code:"MAD", country:"Spain"},
  {name:"Malaga",            code:"AGP", country:"Spain"},
  {name:"Palma de Mallorca", code:"PMI", country:"Spain"},
  {name:"Tenerife South",    code:"TFS", country:"Spain"},
  {name:"Gran Canaria",      code:"LPA", country:"Spain"},
  {name:"Lanzarote",         code:"ACE", country:"Spain"},
  {name:"Alicante",          code:"ALC", country:"Spain"},
  {name:"Ibiza",             code:"IBZ", country:"Spain"},
  {name:"Seville",           code:"SVQ", country:"Spain"},
  {name:"Valencia",          code:"VLC", country:"Spain"},
  {name:"Fuerteventura",     code:"FUE", country:"Spain"},
  {name:"Amsterdam",         code:"AMS", country:"Netherlands"},
  {name:"Paris CDG",         code:"CDG", country:"France"},
  {name:"Nice",              code:"NCE", country:"France"},
  {name:"Marseille",         code:"MRS", country:"France"},
  {name:"Lyon",              code:"LYS", country:"France"},
  {name:"Rome Fiumicino",    code:"FCO", country:"Italy"},
  {name:"Milan Malpensa",    code:"MXP", country:"Italy"},
  {name:"Naples",            code:"NAP", country:"Italy"},
  {name:"Venice",            code:"VCE", country:"Italy"},
  {name:"Catania",           code:"CTA", country:"Italy"},
  {name:"Lisbon",            code:"LIS", country:"Portugal"},
  {name:"Porto",             code:"OPO", country:"Portugal"},
  {name:"Faro",              code:"FAO", country:"Portugal"},
  {name:"Athens",            code:"ATH", country:"Greece"},
  {name:"Crete Heraklion",   code:"HER", country:"Greece"},
  {name:"Rhodes",            code:"RHO", country:"Greece"},
  {name:"Santorini",         code:"JTR", country:"Greece"},
  {name:"Mykonos",           code:"JMK", country:"Greece"},
  {name:"Corfu",             code:"CFU", country:"Greece"},
  {name:"Thessaloniki",      code:"SKG", country:"Greece"},
  {name:"Prague",            code:"PRG", country:"Czech Republic"},
  {name:"Vienna",            code:"VIE", country:"Austria"},
  {name:"Budapest",          code:"BUD", country:"Hungary"},
  {name:"Warsaw",            code:"WAW", country:"Poland"},
  {name:"Krakow",            code:"KRK", country:"Poland"},
  {name:"Dubrovnik",         code:"DBV", country:"Croatia"},
  {name:"Split",             code:"SPU", country:"Croatia"},
  {name:"Zadar",             code:"ZAD", country:"Croatia"},
  {name:"Istanbul",          code:"IST", country:"Turkey"},
  {name:"Antalya",           code:"AYT", country:"Turkey"},
  {name:"Bodrum",            code:"BJV", country:"Turkey"},
  {name:"Dalaman",           code:"DLM", country:"Turkey"},
  {name:"Frankfurt",         code:"FRA", country:"Germany"},
  {name:"Munich",            code:"MUC", country:"Germany"},
  {name:"Berlin",            code:"BER", country:"Germany"},
  {name:"Hamburg",           code:"HAM", country:"Germany"},
  {name:"Zurich",            code:"ZRH", country:"Switzerland"},
  {name:"Geneva",            code:"GVA", country:"Switzerland"},
  {name:"Brussels",          code:"BRU", country:"Belgium"},
  {name:"Copenhagen",        code:"CPH", country:"Denmark"},
  {name:"Stockholm Arlanda", code:"ARN", country:"Sweden"},
  {name:"Oslo Gardermoen",   code:"OSL", country:"Norway"},
  {name:"Helsinki",          code:"HEL", country:"Finland"},
  {name:"Reykjavik Keflavik",code:"KEF", country:"Iceland"},
  {name:"Lisbon",            code:"LIS", country:"Portugal"},
  {name:"Riga",              code:"RIX", country:"Latvia"},
  {name:"Tallinn",           code:"TLL", country:"Estonia"},
  {name:"Vilnius",           code:"VNO", country:"Lithuania"},
  // Middle East & Africa
  {name:"Dubai",             code:"DXB", country:"UAE"},
  {name:"Abu Dhabi",         code:"AUH", country:"UAE"},
  {name:"Doha",              code:"DOH", country:"Qatar"},
  {name:"Marrakech",         code:"RAK", country:"Morocco"},
  {name:"Casablanca",        code:"CMN", country:"Morocco"},
  {name:"Cape Town",         code:"CPT", country:"South Africa"},
  {name:"Johannesburg",      code:"JNB", country:"South Africa"},
  {name:"Nairobi",           code:"NBO", country:"Kenya"},
  {name:"Cairo",             code:"CAI", country:"Egypt"},
  // Asia-Pacific
  {name:"Bangkok Suvarnabhumi", code:"BKK", country:"Thailand"},
  {name:"Phuket",            code:"HKT", country:"Thailand"},
  {name:"Bali Denpasar",     code:"DPS", country:"Indonesia"},
  {name:"Singapore Changi",  code:"SIN", country:"Singapore"},
  {name:"Kuala Lumpur",      code:"KUL", country:"Malaysia"},
  {name:"Tokyo Narita",      code:"NRT", country:"Japan"},
  {name:"Tokyo Haneda",      code:"HND", country:"Japan"},
  {name:"Osaka Kansai",      code:"KIX", country:"Japan"},
  {name:"Seoul Incheon",     code:"ICN", country:"South Korea"},
  {name:"Hong Kong",         code:"HKG", country:"Hong Kong"},
  {name:"Sydney",            code:"SYD", country:"Australia"},
  {name:"Melbourne",         code:"MEL", country:"Australia"},
  {name:"Brisbane",          code:"BNE", country:"Australia"},
  {name:"Auckland",          code:"AKL", country:"New Zealand"},
  {name:"Delhi",             code:"DEL", country:"India"},
  {name:"Mumbai",            code:"BOM", country:"India"},
  {name:"Goa",               code:"GOI", country:"India"},
  // Americas
  {name:"New York JFK",      code:"JFK", country:"USA"},
  {name:"New York Newark",   code:"EWR", country:"USA"},
  {name:"Los Angeles",       code:"LAX", country:"USA"},
  {name:"Miami",             code:"MIA", country:"USA"},
  {name:"Chicago O'Hare",    code:"ORD", country:"USA"},
  {name:"San Francisco",     code:"SFO", country:"USA"},
  {name:"Boston",            code:"BOS", country:"USA"},
  {name:"Orlando",           code:"MCO", country:"USA"},
  {name:"Las Vegas",         code:"LAS", country:"USA"},
  {name:"Washington Dulles", code:"IAD", country:"USA"},
  {name:"Cancun",            code:"CUN", country:"Mexico"},
  {name:"Mexico City",       code:"MEX", country:"Mexico"},
  {name:"Toronto Pearson",   code:"YYZ", country:"Canada"},
  {name:"Vancouver",         code:"YVR", country:"Canada"},
  {name:"Montreal",          code:"YUL", country:"Canada"},
  {name:"Sao Paulo",         code:"GRU", country:"Brazil"},
  {name:"Buenos Aires",      code:"EZE", country:"Argentina"},
];

function searchLocal(term) {
  const t = term.toLowerCase();
  return AIRPORTS.filter(a =>
    a.name.toLowerCase().startsWith(t) ||
    a.code.toLowerCase() === t ||
    a.name.toLowerCase().includes(t) ||
    a.country.toLowerCase().includes(t)
  ).slice(0, 8).map(a => ({ name: a.name, code: a.code, sub: a.country }));
}

function fetchRemote(term) {
  return new Promise((resolve) => {
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(term)}&locale=en&types[]=airport&types[]=city`;
    const req = https.get(url, { headers: { "User-Agent": "TripHunt/1.0" } }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(data.slice(0, 8).map(item => ({
            name: item.name,
            code: item.code,
            sub:  item.country_name || item.city_name || "",
          })));
        } catch { resolve([]); }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(4000, () => { req.destroy(); resolve([]); });
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  const term = (event.queryStringParameters?.term || "").trim();
  if (!term) {
    return { statusCode: 200, headers: cors, body: JSON.stringify([]) };
  }

  // Always try local first -- instant response
  const local = searchLocal(term);
  if (local.length >= 3) {
    return { statusCode: 200, headers: cors, body: JSON.stringify(local) };
  }

  // Supplement with remote API results if local is sparse
  const remote = await fetchRemote(term);
  const merged = [...local];
  for (const r of remote) {
    if (!merged.find(m => m.code === r.code)) merged.push(r);
    if (merged.length >= 8) break;
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify(merged.slice(0, 8)) };
};
