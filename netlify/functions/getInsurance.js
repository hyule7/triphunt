// TripHunt -- getInsurance.js
// Travel insurance quotes via affiliate partners
// GET ?dest=BCN&dep=2025-04-10&ret=2025-04-17&pax=2&age=35

const CORS = { "Access-Control-Allow-Origin":"*","Content-Type":"application/json" };

// Insurance affiliate partners
const PARTNERS = {
  coverMore:  { name:"Cover-More",  url:"https://www.covermore.co.uk/?ref=triphunt" },
  insureFor:  { name:"InsureFor",   url:"https://www.insurefor.com/?agent=triphunt" },
  coverWise:  { name:"CoverWise",   url:"https://www.coverwise.co.uk/?a=triphunt"   },
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  const p   = event.queryStringParameters || {};
  const dest = p.dest || "BCN";
  const pax  = parseInt(p.pax) || 2;
  const dep  = p.dep  || "";
  const ret  = p.ret  || "";

  // Calculate trip duration
  const days = dep && ret
    ? Math.max(1, Math.round((new Date(ret)-new Date(dep))/86400000))
    : 7;

  // Generate indicative quotes (real quotes require partner API integration)
  const quotes = generateQuotes(dest, days, pax);

  return {
    statusCode: 200,
    headers: { ...CORS, "Cache-Control":"public, s-maxage=3600" },
    body: JSON.stringify({ success:true, data:quotes, disclaimer:"Prices are indicative. Final price confirmed on partner site." })
  };
};

function generateQuotes(dest, days, pax) {
  // Risk factors by region
  const RISK = {
    eu: 1.0, europe: 1.1, usa: 1.8, caribbean: 1.5,
    asia: 1.3, oceania: 1.6, africa: 1.4, worldwide: 1.5,
  };
  const region = getRegion(dest);
  const factor = RISK[region] || 1.2;
  const base   = 8 + (days * 0.8) + (pax * 3);

  return [
    {
      provider:    "Standard Cover",
      icon:        "🛡",
      price:       Math.round(base * factor * pax),
      price_pp:    Math.round(base * factor),
      highlights:  ["£2m medical cover","£1,500 cancellation","Baggage cover"],
      excess:      150,
      rating:      4.2,
      booking_url: PARTNERS.insureFor.url + "&dest=" + dest + "&days=" + days + "&pax=" + pax,
    },
    {
      provider:    "Premium Cover",
      icon:        "⭐",
      price:       Math.round(base * factor * pax * 1.6),
      price_pp:    Math.round(base * factor * 1.6),
      highlights:  ["£10m medical cover","£5,000 cancellation","£3,000 baggage","No excess"],
      excess:      0,
      rating:      4.7,
      recommended: true,
      booking_url: PARTNERS.coverMore.url + "&dest=" + dest + "&days=" + days + "&pax=" + pax,
    },
    {
      provider:    "Budget Cover",
      icon:        "💰",
      price:       Math.round(base * factor * pax * 0.65),
      price_pp:    Math.round(base * factor * 0.65),
      highlights:  ["£1m medical cover","£500 cancellation"],
      excess:      250,
      rating:      3.8,
      booking_url: PARTNERS.coverWise.url + "&dest=" + dest + "&days=" + days + "&pax=" + pax,
    },
  ];
}

function getRegion(dest) {
  const EU = ["BCN","MAD","LIS","FCO","AMS","CDG","ATH","PRG","VIE","DBV","IST","AYT","PMI","TFS","FAO","ALC","VCE","MXP","MUC","BER","CPH","ARN","OSL","HEL","WAW","BUD","DUB","BRU","ZRH"];
  const US = ["JFK","LAX","MIA","SFO","ORD","BOS","SEA","DFW","ATL","DEN"];
  const ASIA = ["BKK","DPS","NRT","SIN","KUL","HKT","CGK","MNL","HKG","PEK","PVG","ICN"];
  const AUS  = ["SYD","MEL","BNE","AKL","PER"];
  if (EU.includes(dest))   return "eu";
  if (US.includes(dest))   return "usa";
  if (ASIA.includes(dest)) return "asia";
  if (AUS.includes(dest))  return "oceania";
  return "worldwide";
}
