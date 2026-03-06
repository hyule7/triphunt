#!/usr/bin/env node
// TripHunt · Programmatic SEO Engine
// Generates: route pages, month-route, cheap-to, flights-from, airports, destinations
// Usage: node build-seo.js [--test] [--sitemaps]

const fs   = require("fs");
const path = require("path");

const args          = process.argv.slice(2);
const IS_TEST       = args.includes("--test");
const ONLY_SITEMAPS = args.includes("--sitemaps");
const LIMIT         = IS_TEST ? 50 : Infinity;
const SEO_OUT       = path.resolve(__dirname, "..", "seo-pages");
const SITE_URL      = "https://www.triphunt.co.uk";
const TODAY         = new Date().toISOString().slice(0, 10);

// ─── Data ────────────────────────────────────────────────────────────────────
const AIRPORTS = [
  { code:"LHR", name:"London Heathrow",           city:"London",        country:"United Kingdom", lat:51.47,   lon:-0.46,  hub:true  },
  { code:"LGW", name:"London Gatwick",             city:"London",        country:"United Kingdom", lat:51.15,   lon:-0.18,  hub:true  },
  { code:"STN", name:"London Stansted",            city:"London",        country:"United Kingdom", lat:51.88,   lon:0.24,   hub:true  },
  { code:"LTN", name:"London Luton",               city:"London",        country:"United Kingdom", lat:51.87,   lon:-0.37              },
  { code:"MAN", name:"Manchester Airport",         city:"Manchester",    country:"United Kingdom", lat:53.35,   lon:-2.27,  hub:true  },
  { code:"BHX", name:"Birmingham Airport",         city:"Birmingham",    country:"United Kingdom", lat:52.45,   lon:-1.74              },
  { code:"EDI", name:"Edinburgh Airport",          city:"Edinburgh",     country:"United Kingdom", lat:55.95,   lon:-3.36              },
  { code:"GLA", name:"Glasgow Airport",            city:"Glasgow",       country:"United Kingdom", lat:55.87,   lon:-4.43              },
  { code:"BRS", name:"Bristol Airport",            city:"Bristol",       country:"United Kingdom", lat:51.38,   lon:-2.72              },
  { code:"LBA", name:"Leeds Bradford Airport",     city:"Leeds",         country:"United Kingdom", lat:53.87,   lon:-1.66              },
  { code:"NCL", name:"Newcastle Airport",          city:"Newcastle",     country:"United Kingdom", lat:55.04,   lon:-1.69              },
  { code:"EMA", name:"East Midlands Airport",      city:"Nottingham",    country:"United Kingdom", lat:52.83,   lon:-1.33              },
  { code:"ABZ", name:"Aberdeen Airport",           city:"Aberdeen",      country:"United Kingdom", lat:57.20,   lon:-2.20              },
  { code:"BFS", name:"Belfast International",      city:"Belfast",       country:"United Kingdom", lat:54.66,   lon:-6.22              },
  { code:"CWL", name:"Cardiff Airport",            city:"Cardiff",       country:"United Kingdom", lat:51.40,   lon:-3.34              },
  { code:"SOU", name:"Southampton Airport",        city:"Southampton",   country:"United Kingdom", lat:50.95,   lon:-1.36              },
  { code:"CDG", name:"Paris Charles de Gaulle",    city:"Paris",         country:"France",          lat:49.01,   lon:2.55               },
  { code:"AMS", name:"Amsterdam Schiphol",         city:"Amsterdam",     country:"Netherlands",     lat:52.31,   lon:4.76               },
  { code:"BCN", name:"Barcelona El Prat",          city:"Barcelona",     country:"Spain",           lat:41.30,   lon:2.07               },
  { code:"MAD", name:"Madrid Barajas",             city:"Madrid",        country:"Spain",           lat:40.47,   lon:-3.56              },
  { code:"FCO", name:"Rome Fiumicino",             city:"Rome",          country:"Italy",           lat:41.80,   lon:12.25              },
  { code:"MXP", name:"Milan Malpensa",             city:"Milan",         country:"Italy",           lat:45.63,   lon:8.72               },
  { code:"LIS", name:"Lisbon Airport",             city:"Lisbon",        country:"Portugal",        lat:38.77,   lon:-9.13              },
  { code:"FAO", name:"Faro Airport",               city:"Faro",          country:"Portugal",        lat:37.01,   lon:-7.97              },
  { code:"ATH", name:"Athens International",       city:"Athens",        country:"Greece",          lat:37.94,   lon:23.94              },
  { code:"HER", name:"Heraklion Airport",          city:"Heraklion",     country:"Greece",          lat:35.34,   lon:25.18              },
  { code:"RHO", name:"Rhodes Airport",             city:"Rhodes",        country:"Greece",          lat:36.41,   lon:28.09              },
  { code:"PMI", name:"Palma de Mallorca Airport",  city:"Mallorca",      country:"Spain",           lat:39.55,   lon:2.74               },
  { code:"TFS", name:"Tenerife South Airport",     city:"Tenerife",      country:"Spain",           lat:28.04,   lon:-16.57             },
  { code:"LPA", name:"Gran Canaria Airport",       city:"Gran Canaria",  country:"Spain",           lat:27.93,   lon:-15.39             },
  { code:"ALC", name:"Alicante Airport",           city:"Alicante",      country:"Spain",           lat:38.28,   lon:-0.56              },
  { code:"AGP", name:"Malaga Airport",             city:"Malaga",        country:"Spain",           lat:36.67,   lon:-4.50              },
  { code:"IBZ", name:"Ibiza Airport",              city:"Ibiza",         country:"Spain",           lat:38.87,   lon:1.37               },
  { code:"VLC", name:"Valencia Airport",           city:"Valencia",      country:"Spain",           lat:39.49,   lon:-0.48              },
  { code:"SVQ", name:"Seville Airport",            city:"Seville",       country:"Spain",           lat:37.42,   lon:-5.90              },
  { code:"FRA", name:"Frankfurt Airport",          city:"Frankfurt",     country:"Germany",         lat:50.03,   lon:8.57               },
  { code:"MUC", name:"Munich Airport",             city:"Munich",        country:"Germany",         lat:48.35,   lon:11.79              },
  { code:"TXL", name:"Berlin Brandenburg Airport", city:"Berlin",        country:"Germany",         lat:52.36,   lon:13.50              },
  { code:"PRG", name:"Prague Vaclav Havel Airport",city:"Prague",        country:"Czech Republic",  lat:50.10,   lon:14.26              },
  { code:"VIE", name:"Vienna International Airport",city:"Vienna",       country:"Austria",         lat:48.11,   lon:16.57              },
  { code:"BUD", name:"Budapest Ferenc Liszt Airport",city:"Budapest",    country:"Hungary",         lat:47.43,   lon:19.26              },
  { code:"WAW", name:"Warsaw Chopin Airport",      city:"Warsaw",        country:"Poland",          lat:52.17,   lon:20.97              },
  { code:"KRK", name:"Krakow Airport",             city:"Krakow",        country:"Poland",          lat:50.08,   lon:19.78              },
  { code:"CPH", name:"Copenhagen Airport",         city:"Copenhagen",    country:"Denmark",         lat:55.62,   lon:12.65              },
  { code:"ARN", name:"Stockholm Arlanda Airport",  city:"Stockholm",     country:"Sweden",          lat:59.65,   lon:17.92              },
  { code:"OSL", name:"Oslo Gardermoen Airport",    city:"Oslo",          country:"Norway",          lat:60.19,   lon:11.10              },
  { code:"HEL", name:"Helsinki Vantaa Airport",    city:"Helsinki",      country:"Finland",         lat:60.32,   lon:24.97              },
  { code:"ZRH", name:"Zurich Airport",             city:"Zurich",        country:"Switzerland",     lat:47.46,   lon:8.55               },
  { code:"BRU", name:"Brussels Airport",           city:"Brussels",      country:"Belgium",         lat:50.90,   lon:4.48               },
  { code:"DBV", name:"Dubrovnik Airport",          city:"Dubrovnik",     country:"Croatia",         lat:42.56,   lon:18.27              },
  { code:"SPU", name:"Split Airport",              city:"Split",         country:"Croatia",         lat:43.54,   lon:16.30              },
  { code:"AYT", name:"Antalya Airport",            city:"Antalya",       country:"Turkey",          lat:36.90,   lon:30.80              },
  { code:"IST", name:"Istanbul Airport",           city:"Istanbul",      country:"Turkey",          lat:41.27,   lon:28.75              },
  { code:"DLM", name:"Dalaman Airport",            city:"Dalaman",       country:"Turkey",          lat:36.71,   lon:28.79              },
  { code:"BJV", name:"Bodrum Milas Airport",       city:"Bodrum",        country:"Turkey",          lat:37.25,   lon:27.66              },
  { code:"NCE", name:"Nice Cote d'Azur Airport",   city:"Nice",          country:"France",          lat:43.66,   lon:7.22               },
  { code:"OTP", name:"Bucharest Henri Coanda",     city:"Bucharest",     country:"Romania",         lat:44.57,   lon:26.10              },
  { code:"SOF", name:"Sofia Airport",              city:"Sofia",         country:"Bulgaria",        lat:42.70,   lon:23.41              },
  { code:"RAK", name:"Marrakech Menara Airport",   city:"Marrakech",     country:"Morocco",         lat:31.61,   lon:-8.04              },
  { code:"DXB", name:"Dubai International Airport",city:"Dubai",         country:"UAE",             lat:25.25,   lon:55.36              },
  { code:"DOH", name:"Doha Hamad International",   city:"Doha",          country:"Qatar",           lat:25.27,   lon:51.61              },
  { code:"CAI", name:"Cairo International Airport",city:"Cairo",         country:"Egypt",           lat:30.11,   lon:31.41              },
  { code:"HRG", name:"Hurghada International",     city:"Hurghada",      country:"Egypt",           lat:27.18,   lon:33.80              },
  { code:"SSH", name:"Sharm El Sheikh Airport",    city:"Sharm El Sheikh",country:"Egypt",          lat:27.98,   lon:34.39              },
  { code:"NBO", name:"Nairobi Jomo Kenyatta",      city:"Nairobi",       country:"Kenya",           lat:-1.32,   lon:36.93              },
  { code:"CPT", name:"Cape Town International",    city:"Cape Town",     country:"South Africa",    lat:-33.96,  lon:18.60              },
  { code:"MLE", name:"Maldives Velana Airport",    city:"Male",          country:"Maldives",        lat:4.19,    lon:73.53              },
  { code:"BKK", name:"Bangkok Suvarnabhumi Airport",city:"Bangkok",      country:"Thailand",        lat:13.68,   lon:100.74             },
  { code:"HKT", name:"Phuket International Airport",city:"Phuket",       country:"Thailand",        lat:8.11,    lon:98.30              },
  { code:"DPS", name:"Bali Ngurah Rai Airport",    city:"Bali",          country:"Indonesia",       lat:-8.75,   lon:115.17             },
  { code:"SIN", name:"Singapore Changi Airport",   city:"Singapore",     country:"Singapore",       lat:1.36,    lon:103.99             },
  { code:"NRT", name:"Tokyo Narita Airport",       city:"Tokyo",         country:"Japan",           lat:35.77,   lon:140.39             },
  { code:"KIX", name:"Osaka Kansai Airport",       city:"Osaka",         country:"Japan",           lat:34.43,   lon:135.24             },
  { code:"ICN", name:"Seoul Incheon Airport",      city:"Seoul",         country:"South Korea",     lat:37.46,   lon:126.44             },
  { code:"HKG", name:"Hong Kong International",    city:"Hong Kong",     country:"Hong Kong",       lat:22.31,   lon:113.91             },
  { code:"KUL", name:"Kuala Lumpur International", city:"Kuala Lumpur",  country:"Malaysia",        lat:2.74,    lon:101.70             },
  { code:"DEL", name:"Delhi Indira Gandhi Airport",city:"Delhi",         country:"India",           lat:28.57,   lon:77.09              },
  { code:"BOM", name:"Mumbai Chhatrapati Shivaji", city:"Mumbai",        country:"India",           lat:19.09,   lon:72.87              },
  { code:"GOA", name:"Goa International Airport",  city:"Goa",           country:"India",           lat:15.38,   lon:73.83              },
  { code:"CMB", name:"Colombo Bandaranaike Airport",city:"Colombo",      country:"Sri Lanka",       lat:7.18,    lon:79.88              },
  { code:"JFK", name:"New York JFK Airport",       city:"New York",      country:"USA",             lat:40.64,   lon:-73.78             },
  { code:"LAX", name:"Los Angeles International",  city:"Los Angeles",   country:"USA",             lat:33.94,   lon:-118.41            },
  { code:"MIA", name:"Miami International Airport",city:"Miami",         country:"USA",             lat:25.80,   lon:-80.28             },
  { code:"ORD", name:"Chicago O'Hare Airport",     city:"Chicago",       country:"USA",             lat:41.98,   lon:-87.90             },
  { code:"SFO", name:"San Francisco International",city:"San Francisco", country:"USA",             lat:37.62,   lon:-122.38            },
  { code:"CUN", name:"Cancun International Airport",city:"Cancun",       country:"Mexico",          lat:21.04,   lon:-86.87             },
  { code:"YYZ", name:"Toronto Pearson Airport",    city:"Toronto",       country:"Canada",          lat:43.68,   lon:-79.63             },
  { code:"GRU", name:"Sao Paulo Guarulhos Airport",city:"Sao Paulo",     country:"Brazil",          lat:-23.43,  lon:-46.47             },
  { code:"SYD", name:"Sydney Airport",             city:"Sydney",        country:"Australia",       lat:-33.95,  lon:151.18             },
  { code:"MEL", name:"Melbourne Airport",          city:"Melbourne",     country:"Australia",       lat:-37.67,  lon:144.84             },
  { code:"AKL", name:"Auckland Airport",           city:"Auckland",      country:"New Zealand",     lat:-37.01,  lon:174.79             },
  { code:"MRU", name:"Mauritius Sir Seewoosagur",  city:"Mauritius",     country:"Mauritius",       lat:-20.43,  lon:57.68              },
  { code:"SEZ", name:"Seychelles International",   city:"Mahe",          country:"Seychelles",      lat:-4.67,   lon:55.52              },
];

const ROUTE_AVG = {
  BCN:120,MAD:110,LIS:105,FCO:115,AMS:95,CDG:90,DXB:280,AYT:160,PMI:130,
  TFS:170,LPA:175,FAO:140,ATH:145,HER:140,RHO:150,PRG:100,VIE:105,DBV:155,
  IST:190,ALC:135,IBZ:145,BKK:520,DPS:590,NRT:620,SIN:480,KUL:450,HKT:540,
  JFK:380,LAX:420,MIA:390,ORD:400,SFO:430,YYZ:360,CPT:520,NBO:490,SYD:780,
  MEL:800,AKL:850,CAI:210,HRG:280,SSH:270,RAK:175,GOA:380,DEL:420,BOM:440,
  MLE:650,CMB:480,CUN:550,GRU:620,MXP:115,NCE:120,VLC:125,SVQ:130,DLM:155,
  BJV:160,DOH:260,MRU:620,SEZ:680,HKG:490,ICN:550,KIX:600,SOF:120,OTP:115,
  WAW:95,KRK:90,BUD:100,CPH:120,ARN:130,OSL:125,HEL:130,ZRH:160,BRU:100,
  SPU:150,FRA:110,MUC:115,TXL:105,
};

const AIRLINES = {
  "Spain":        ["Vueling","Iberia","Ryanair","easyJet","Jet2"],
  "Turkey":       ["TUI Airways","Jet2","easyJet","Turkish Airlines"],
  "Greece":       ["easyJet","British Airways","TUI Airways","Jet2"],
  "UAE":          ["Emirates","flydubai","British Airways","Virgin Atlantic"],
  "Thailand":     ["Thai Airways","British Airways","Emirates","Qatar Airways"],
  "Indonesia":    ["Qatar Airways","Emirates","Singapore Airlines"],
  "Japan":        ["Japan Airlines","ANA","British Airways","Virgin Atlantic"],
  "USA":          ["Virgin Atlantic","British Airways","American Airlines","Delta Air Lines"],
  "Australia":    ["Qantas","British Airways","Singapore Airlines","Emirates"],
  "France":       ["Air France","easyJet","British Airways","Ryanair"],
  "Italy":        ["ITA Airways","Ryanair","easyJet","British Airways"],
  "Portugal":     ["TAP Air Portugal","Ryanair","easyJet","Jet2"],
  "Germany":      ["Lufthansa","Ryanair","easyJet","British Airways"],
  default:        ["British Airways","Emirates","Qatar Airways","Lufthansa"],
};

const MONTHS = [
  {slug:"january",   label:"January",   short:"Jan", factor:0.80, peak:false},
  {slug:"february",  label:"February",  short:"Feb", factor:0.78, peak:false},
  {slug:"march",     label:"March",     short:"Mar", factor:0.88, peak:false},
  {slug:"april",     label:"April",     short:"Apr", factor:0.95, peak:false},
  {slug:"may",       label:"May",       short:"May", factor:1.05, peak:false},
  {slug:"june",      label:"June",      short:"Jun", factor:1.20, peak:true },
  {slug:"july",      label:"July",      short:"Jul", factor:1.35, peak:true },
  {slug:"august",    label:"August",    short:"Aug", factor:1.30, peak:true },
  {slug:"september", label:"September", short:"Sep", factor:1.05, peak:false},
  {slug:"october",   label:"October",   short:"Oct", factor:0.90, peak:false},
  {slug:"november",  label:"November",  short:"Nov", factor:0.80, peak:false},
  {slug:"december",  label:"December",  short:"Dec", factor:1.10, peak:true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const UK   = AIRPORTS.filter(a => a.country === "United Kingdom");
const HUBS = UK.filter(a => a.hub);
const FOREIGN = AIRPORTS.filter(a => a.country !== "United Kingdom");

function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function cSlug(a){ return slug(a.city); }
function aSlug(a){ return slug(a.name); }
function cheap(d){ return Math.round((ROUTE_AVG[d.code]||299)*0.72); }
function avg(d){ return ROUTE_AVG[d.code]||299; }
function airlines(d){ return (AIRLINES[d.country]||AIRLINES.default).slice(0,4).join(", "); }
function cheapMonth(d){ return ["BCN","MAD","ATH","DXB","BKK","HKT","DPS","AYT","TFS","LPA"].includes(d.code)?"November":"February"; }

function flightHrs(a,b){
  const R=6371,r=d=>d*Math.PI/180;
  const dl=r(b.lat-a.lat),dn=r(b.lon-a.lon);
  const c=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2;
  const dist=2*R*Math.atan2(Math.sqrt(c),Math.sqrt(1-c));
  const h=dist/850+0.5;
  return `${Math.floor(h)}h ${Math.round((h%1)*60)}m`;
}

function write(p, html){
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p, html, "utf8");
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const CSS = `
:root{--c0:#070b12;--c1:#0c1220;--c2:#141c2e;--c3:#1e2b42;--acc:#6366f1;--acc2:#818cf8;--grn:#10b981;--yel:#f59e0b;--txt:#e8edf8;--txt2:#6b7fa3;--txt3:#3d4f6b;--border:rgba(255,255,255,.07);--r8:8px;--r12:12px;--r16:16px;--r20:20px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Outfit',system-ui,sans-serif;background:var(--c0);color:var(--txt);line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.container{max-width:1140px;margin:0 auto;padding:0 20px}
.site-header{position:sticky;top:0;z-index:100;background:rgba(7,11,18,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:14px 0}
.hi{display:flex;align-items:center;justify-content:space-between;gap:16px}
.logo{font-size:22px;font-weight:800;letter-spacing:-.5px}
.logo .hunt{color:var(--acc2)}
.hnav{display:flex;gap:24px;font-size:14px;font-weight:500}
.hnav a{color:var(--txt2);transition:color .2s}
.hnav a:hover{color:var(--txt)}
.hcta{padding:8px 20px;background:var(--acc);color:#fff;font-weight:700;font-size:14px;border-radius:99px;transition:opacity .2s}
.hcta:hover{opacity:.85}
.bc{padding:14px 0;font-size:13px;color:var(--txt3);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.bc a{color:var(--txt2);transition:color .15s}
.bc a:hover{color:var(--acc2)}
.bcs{color:var(--txt3)}
.hero{padding:56px 0 40px;background:radial-gradient(ellipse 80% 60% at 50% -20%,rgba(99,102,241,.12) 0%,transparent 70%);text-align:center}
.hero-label{display:inline-block;padding:5px 14px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);color:var(--acc2);font-size:12px;font-weight:700;border-radius:99px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px}
.h1{font-size:clamp(28px,5vw,52px);font-weight:800;line-height:1.15;margin-bottom:14px}
.h1 .dest{color:var(--acc2)}
.h1 .price{color:var(--grn)}
.hsub{font-size:16px;color:var(--txt2);margin-bottom:32px;max-width:560px;margin-left:auto;margin-right:auto}
.sbtn{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#fff;font-weight:700;font-size:16px;padding:16px 36px;border-radius:99px;transition:transform .2s,box-shadow .2s;box-shadow:0 0 32px rgba(99,102,241,.35)}
.sbtn:hover{transform:translateY(-2px);box-shadow:0 4px 40px rgba(99,102,241,.5)}
.stats{display:flex;justify-content:center;flex-wrap:wrap;gap:0;background:var(--c1);border:1px solid var(--border);border-radius:var(--r20);margin:32px 0;overflow:hidden}
.stat{flex:1;min-width:120px;text-align:center;padding:20px 16px;border-right:1px solid var(--border)}
.stat:last-child{border-right:none}
.stat-v{font-size:26px;font-weight:800;color:var(--acc2)}
.stat-l{font-size:12px;color:var(--txt2);margin-top:2px}
.sec{padding:48px 0}
.sec-h{margin-bottom:24px}
.sec-t{font-size:24px;font-weight:700}
.sec-s{font-size:14px;color:var(--txt2);margin-top:6px}
.igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.icard{background:var(--c1);border:1px solid var(--border);border-radius:var(--r16);padding:22px;transition:border-color .2s}
.icard:hover{border-color:rgba(99,102,241,.3)}
.icard-ico{font-size:22px;margin-bottom:10px}
.icard-t{font-size:14px;font-weight:700;color:var(--acc2);margin-bottom:8px}
.icard-b{font-size:14px;color:var(--txt2);line-height:1.7}
.months{display:flex;flex-wrap:wrap;gap:8px}
.mpill{padding:8px 18px;background:var(--c2);border:1px solid var(--border);border-radius:99px;font-size:13px;font-weight:500;color:var(--txt2);transition:.2s}
.mpill:hover,.mpill.cheap{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3);color:var(--grn)}
.mpill.peak{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2);color:var(--yel)}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--c1);border:1px solid var(--border);border-radius:var(--r12);font-size:14px;color:var(--txt2);transition:.2s}
.chip:hover{border-color:rgba(99,102,241,.4);color:var(--txt);background:var(--c2)}
.chip-p{font-weight:700;color:var(--grn);font-size:13px;margin-left:auto}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
.dcard{background:var(--c1);border:1px solid var(--border);border-radius:var(--r16);padding:18px;display:block;transition:.2s;text-align:center}
.dcard:hover{border-color:rgba(99,102,241,.4);transform:translateY(-2px)}
.dcard-c{font-weight:700;font-size:16px;margin-bottom:4px}
.dcard-n{font-size:12px;color:var(--txt2);margin-bottom:10px}
.dcard-p{font-size:22px;font-weight:800;color:var(--grn)}
.dcard-l{font-size:11px;color:var(--txt2);margin-top:2px}
.faq-list{border-top:1px solid var(--border)}
.faq-item{border-bottom:1px solid var(--border);padding:20px 0}
.faq-q{font-weight:700;font-size:15px;margin-bottom:10px}
.faq-a{font-size:14px;color:var(--txt2);line-height:1.75}
.site-footer{background:var(--c1);border-top:1px solid var(--border);padding:48px 0 32px;margin-top:80px}
.fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:32px;margin-bottom:40px}
.fcol-t{font-size:13px;font-weight:700;color:var(--txt);margin-bottom:14px;letter-spacing:.5px;text-transform:uppercase}
.flinks{display:flex;flex-direction:column;gap:8px}
.flinks a{font-size:14px;color:var(--txt2);transition:color .15s}
.flinks a:hover{color:var(--acc2)}
.fbot{border-top:1px solid var(--border);padding-top:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--txt2)}
@media(max-width:700px){.stats{flex-direction:column}.stat{border-right:none;border-bottom:1px solid var(--border)}.hnav{display:none}.hero{padding:40px 0 28px}}`;

function head({title,desc,canonical,schema=[]}){
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<meta name="description" content="${desc.replace(/"/g,"'")}"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc.replace(/"/g,"'")}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:site_name" content="TripHunt"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc.replace(/"/g,"'")}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
${schema.map(s=>`<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
<style>${CSS}</style>
</head>`;
}

function header(){return `<header class="site-header"><div class="container hi">
  <a href="/" class="logo">Trip<span class="hunt">Hunt</span></a>
  <nav class="hnav"><a href="/">Flights</a><a href="/destinations/">Destinations</a><a href="/airports/">Airports</a><a href="/cheap-flights-to/">Cheap Flights</a></nav>
  <a href="/" class="hcta">Search Flights</a>
</div></header>`;}

function footer(origin){
  const routeLinks = origin
    ? FOREIGN.slice(0,6).map(d=>`<a href="/flights/${cSlug(origin)}-to-${cSlug(d)}">${origin.city} → ${d.city}</a>`).join("\n")
    : HUBS.slice(0,6).map(h=>`<a href="/flights-from/${cSlug(h)}">Flights from ${h.city}</a>`).join("\n");
  return `<footer class="site-footer"><div class="container">
  <div class="fgrid">
    <div><div class="fcol-t">Popular Routes</div><div class="flinks">${routeLinks}</div></div>
    <div><div class="fcol-t">UK Airports</div><div class="flinks">${HUBS.map(a=>`<a href="/airports/${aSlug(a)}">${a.name}</a>`).join("\n")}</div></div>
    <div><div class="fcol-t">Destinations</div><div class="flinks"><a href="/destinations/barcelona">Barcelona</a><a href="/destinations/dubai">Dubai</a><a href="/destinations/bangkok">Bangkok</a><a href="/destinations/bali">Bali</a><a href="/destinations/new-york">New York</a><a href="/destinations/rome">Rome</a></div></div>
    <div><div class="fcol-t">TripHunt</div><div class="flinks"><a href="/">Search Flights</a><a href="/destinations/">All Destinations</a><a href="/airports/">Airports</a><a href="/sitemap-index.xml">Sitemap</a></div></div>
  </div>
  <div class="fbot"><span>© ${new Date().getFullYear()} TripHunt · Compare cheap flights from the UK</span><span>Prices indicative. TripHunt earns affiliate commission on bookings.</span></div>
</div></footer>`;}

function bcrumb(o){return `<nav class="bc">${o.map((c,i)=>(i===o.length-1?`<span>${c.n}</span>`:`<a href="${c.u}">${c.n}</a><span class="bcs">›</span>`)).join("")}</nav>`;}

function breadcrumbSchema(crumbs){return{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs.map((c,i)=>( {"@type":"ListItem","position":i+1,"name":c.n,"item":`${SITE_URL}${c.u}`}))};}
function faqSchema(faqs){return{"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(f=>({  "@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))  };}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROUTE PAGE /flights/london-to-barcelona
// ─────────────────────────────────────────────────────────────────────────────
function routePage(o, d){
  const url=`/flights/${cSlug(o)}-to-${cSlug(d)}`;
  const cp=cheap(d), ap=avg(d), ft=flightHrs(o,d), al=airlines(d), cm=cheapMonth(d);
  const title=`Cheap Flights ${o.city} to ${d.city} | From £${cp} | TripHunt`;
  const desc=`Compare cheap flights from ${o.city} to ${d.city}. Prices from £${cp} return. Book with ${al.split(",")[0]} and more. No hidden fees.`;

  const altOrigins = UK.filter(a=>a.code!==o.code).slice(0,5);
  const nearbyD    = AIRPORTS.filter(a=>a.country===d.country&&a.code!==d.code).slice(0,5);
  const topFrom    = FOREIGN.sort((a,b)=>(ROUTE_AVG[a.code]||999)-(ROUTE_AVG[b.code]||999)).slice(0,6);

  const schemas=[
    {"@context":"https://schema.org","@type":"WebPage","name":title,"description":desc,"url":`${SITE_URL}${url}`},
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
      {"@type":"ListItem","position":2,"name":"Flights","item":`${SITE_URL}/flights/`},
      {"@type":"ListItem","position":3,"name":`${o.city} to ${d.city}`,"item":`${SITE_URL}${url}`}
    ]},
    faqSchema([
      {q:`How much are flights from ${o.city} to ${d.city}?`,a:`Flights from ${o.city} to ${d.city} start from £${cp} return. The average price is around £${ap}. Book 6–8 weeks ahead for European routes or 3–5 months for long-haul.`},
      {q:`How long is the flight from ${o.city} to ${d.city}?`,a:`The flight time from ${o.city} to ${d.city} is approximately ${ft}. Direct flights are available on selected dates and airlines.`},
      {q:`What airlines fly from ${o.city} to ${d.city}?`,a:`Airlines flying this route include ${al}. Use TripHunt to compare all carriers for your dates.`},
      {q:`What is the cheapest month to fly from ${o.city} to ${d.city}?`,a:`${cm} is typically the cheapest month. July and August are most expensive due to school holidays.`},
      {q:`Do I need a visa for ${d.city}?`,a:`UK passport holders should check current visa requirements for ${d.country} on the UK Government foreign travel advice website before booking.`},
    ]),
    {"@context":"https://schema.org","@type":"TravelAction","fromLocation":{"@type":"Airport","name":o.name,"iataCode":o.code},"toLocation":{"@type":"Airport","name":d.name,"iataCode":d.code}}
  ];

  const monthLinks = MONTHS.map(m=>{
    const p=Math.round(ap*m.factor*0.72);
    return `<a href="${url}/${m.slug}" class="mpill ${m.peak?"peak":p<cp*1.1?"cheap":""}">${m.label} <strong>£${p}</strong></a>`;
  }).join("\n");

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:schemas})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Flights",u:"/flights/"},{n:`${o.city} Flights`,u:`/flights-from/${cSlug(o)}`},{n:`${o.city} to ${d.city}`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${o.code} → ${d.code} · ${d.country}</div>
  <h1 class="h1">Cheap Flights ${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">Compare 100+ airlines · Book in GBP · No hidden fees · Free price alerts</p>
  <a href="/?origin=${o.code}&destination=${d.code}" class="sbtn">✈️ Search Flights Now</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Cheapest found</div></div>
    <div class="stat"><div class="stat-v">£${ap}</div><div class="stat-l">Average price</div></div>
    <div class="stat"><div class="stat-v">${ft}</div><div class="stat-l">Flight time</div></div>
    <div class="stat"><div class="stat-v">${cm}</div><div class="stat-l">Cheapest month</div></div>
    <div class="stat"><div class="stat-v">${al.split(",")[0].trim()}</div><div class="stat-l">Top airline</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">About This Route</h2><p class="sec-s">Everything you need to know before booking ${o.city} to ${d.city}</p></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Flight Duration</div><div class="icard-b">The flight from ${o.city} to ${d.city} takes approximately <strong>${ft}</strong>. Direct and connecting services are available depending on the airline and season.</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Price Guide</div><div class="icard-b">Prices start from <strong>£${cp}</strong> return. The average fare is around <strong>£${ap}</strong>. Budget airlines offer the cheapest options; full-service carriers include more luggage allowance.</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Best Time to Book</div><div class="icard-b">Book <strong>6–8 weeks ahead</strong> for European fares, or <strong>3–5 months</strong> for long-haul. Tuesday and Wednesday departures tend to be cheapest.</div></div>
      <div class="icard"><div class="icard-ico">🛫</div><div class="icard-t">Airlines Flying This Route</div><div class="icard-b">Popular airlines include <strong>${al}</strong>. Compare all carriers on TripHunt to find the best deal for your dates.</div></div>
      <div class="icard"><div class="icard-ico">🌍</div><div class="icard-t">${d.city} Airport</div><div class="icard-b">${d.name} (${d.code}) serves ${d.city} in ${d.country}. Check terminal info and transport links before you travel.</div></div>
      <div class="icard"><div class="icard-ico">💡</div><div class="icard-t">Money-Saving Tips</div><div class="icard-b">Use TripHunt's flexible search to compare prices across a full month. Set a <a href="/" style="color:var(--acc2)">price alert</a> to get notified when fares drop.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Search by Month</h2><p class="sec-s">Cheapest months to fly from ${o.city} to ${d.city}</p></div>
    <div class="months">${monthLinks}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Fly to ${d.city} from Other UK Airports</h2></div>
    <div class="chips">${altOrigins.map(a=>`<a href="/flights/${cSlug(a)}-to-${cSlug(d)}" class="chip">✈️ ${a.city} → ${d.city}<span class="chip-p">from £${cheap(d)}</span></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other ${d.country} Destinations from ${o.city}</h2></div>
    <div class="chips">${nearbyD.map(nd=>`<a href="/flights/${cSlug(o)}-to-${cSlug(nd)}" class="chip">✈️ ${o.city} → ${nd.city}<span class="chip-p">from £${cheap(nd)}</span></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">More Popular Flights from ${o.city}</h2></div>
    <div class="dgrid">${topFrom.map(td=>`<a href="/flights/${cSlug(o)}-to-${cSlug(td)}" class="dcard"><div class="dcard-c">${td.city}</div><div class="dcard-n">${td.country}</div><div class="dcard-p">£${cheap(td)}</div><div class="dcard-l">from ${o.city}</div></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Frequently Asked Questions</h2></div>
    <div class="faq-list">
      <div class="faq-item"><div class="faq-q">How much are flights from ${o.city} to ${d.city}?</div><div class="faq-a">Flights start from £${cp} return. The average price is around £${ap}. Prices vary by season and how far ahead you book.</div></div>
      <div class="faq-item"><div class="faq-q">How long is the flight from ${o.city} to ${d.city}?</div><div class="faq-a">The flight time is approximately ${ft}. Direct flights are available on selected dates.</div></div>
      <div class="faq-item"><div class="faq-q">Which airlines fly from ${o.city} to ${d.city}?</div><div class="faq-a">Airlines include ${al}. Use TripHunt to compare all carriers for your travel dates.</div></div>
      <div class="faq-item"><div class="faq-q">What's the cheapest month to fly?</div><div class="faq-a">${cm} typically offers the lowest fares. Summer (July–August) and school holidays are most expensive.</div></div>
      <div class="faq-item"><div class="faq-q">Do I need a visa for ${d.country}?</div><div class="faq-a">Check current visa requirements for ${d.country} on the UK Government's foreign travel advice website before booking.</div></div>
    </div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MONTH-ROUTE PAGE /flights/london-to-barcelona/january
// ─────────────────────────────────────────────────────────────────────────────
function monthPage(o, d, m){
  const url=`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}`;
  const ap=avg(d), mp=Math.round(ap*m.factor*0.72);
  const title=`${o.city} to ${d.city} in ${m.label} | From £${mp} | TripHunt`;
  const desc=`Find cheap flights from ${o.city} to ${d.city} in ${m.label} from £${mp}. ${m.peak?"Book early — peak season.":"Great value month to fly."}`;

  const schemas=[
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
      {"@type":"ListItem","position":2,"name":`${o.city} to ${d.city}`,"item":`${SITE_URL}/flights/${cSlug(o)}-to-${cSlug(d)}`},
      {"@type":"ListItem","position":3,"name":m.label,"item":`${SITE_URL}${url}`}
    ]},
    faqSchema([{q:`How much are flights from ${o.city} to ${d.city} in ${m.label}?`,a:`Flights from ${o.city} to ${d.city} in ${m.label} start from £${mp}. ${m.peak?"This is peak season — book early.":"Good value time to fly."}`}])
  ];

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:schemas})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}`},{n:m.label,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">📅 ${m.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${o.city} to <span class="dest">${d.city}</span><br>in <span class="dest">${m.label}</span> from <span class="price">£${mp}</span></h1>
  <p class="hsub">${m.peak?"Peak season — book early for best prices.":"Good value month — lower fares, fewer crowds."} Compare 100+ airlines.</p>
  <a href="/?origin=${o.code}&destination=${d.code}" class="sbtn">✈️ Search ${m.label} Flights</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${mp}</div><div class="stat-l">From in ${m.short}</div></div>
    <div class="stat"><div class="stat-v">${m.peak?"Peak":"Value"}</div><div class="stat-l">Season</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Flying ${o.city} to ${d.city} in ${m.label}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">${m.label} Prices</div><div class="icard-b">Flights from ${o.city} to ${d.city} in ${m.label} start from <strong>£${mp}</strong>. ${m.peak?"Peak season — fares rise quickly, book as early as possible.":"Quieter month offering better value fares and a more relaxed experience."}</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Booking Advice</div><div class="icard-b">${m.peak?"For peak season travel, book 3–4 months ahead.":"Booking 4–6 weeks ahead usually secures a good fare."} Set a TripHunt price alert to be notified when fares change.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Months from ${o.city} to ${d.city}</h2></div>
    <div class="months">${MONTHS.filter(mx=>mx.slug!==m.slug).map(mx=>{const p=Math.round(ap*mx.factor*0.72);return`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${mx.slug}" class="mpill ${mx.peak?"peak":""}">${mx.label} £${p}</a>`;}).join("\n")}</div>
  </section>
  <p style="text-align:center;padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}" style="color:var(--acc2)">← All flights ${o.city} to ${d.city}</a></p>
</div>
${footer(o)}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHEAP FLIGHTS TO /cheap-flights-to/barcelona
// ─────────────────────────────────────────────────────────────────────────────
function cheapToPage(d){
  const url=`/cheap-flights-to/${cSlug(d)}`;
  const cp=cheap(d);
  const title=`Cheap Flights to ${d.city} | From £${cp} | TripHunt`;
  const desc=`Compare cheap flights to ${d.city}, ${d.country}. Prices from £${cp} from UK airports. Book with ${airlines(d).split(",")[0].trim()} and more.`;

  const schemas=[
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
      {"@type":"ListItem","position":2,"name":"Cheap Flights To","item":`${SITE_URL}/cheap-flights-to/`},
      {"@type":"ListItem","position":3,"name":d.city,"item":`${SITE_URL}${url}`}
    ]},
    faqSchema([{q:`How do I find cheap flights to ${d.city}?`,a:`Use TripHunt to compare prices from all major UK airports to ${d.city}. Cheapest fares start from £${cp}. Book midweek at least 6 weeks ahead for best prices.`}])
  ];

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:schemas})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Cheap Flights To",u:"/cheap-flights-to/"},{n:d.city,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ Cheap Flights to ${d.country}</div>
  <h1 class="h1">Cheap Flights to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">Compare from all UK airports · 100+ airlines · No hidden fees</p>
  <a href="/?destination=${d.code}" class="sbtn">✈️ Find Cheapest Flights</a>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Fly to ${d.city} from UK Airports</h2><p class="sec-s">Choose your nearest departure airport</p></div>
    <div class="dgrid">${UK.slice(0,10).map(uk=>`<a href="/flights/${cSlug(uk)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${uk.city}</div><div class="dcard-n">${uk.name}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">to ${d.city}</div></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">About ${d.city}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">🌍</div><div class="icard-t">Destination</div><div class="icard-b">${d.city} is located in ${d.country}. The main airport is ${d.name} (${d.code}). Check visa requirements before booking.</div></div>
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Airlines</div><div class="icard-b">Airlines serving ${d.city} from the UK include <strong>${airlines(d)}</strong>.</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Cheapest Month</div><div class="icard-b"><strong>${cheapMonth(d)}</strong> typically offers the lowest fares to ${d.city}.</div></div>
    </div>
  </section>
</div>
${footer()}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FLIGHTS FROM /flights-from/london
// ─────────────────────────────────────────────────────────────────────────────
function flightsFromPage(o){
  const url=`/flights-from/${cSlug(o)}`;
  const title=`Flights from ${o.city} | Compare Cheap Flights | TripHunt`;
  const desc=`Compare cheap flights from ${o.city} (${o.code}). Search 100+ airlines. Hundreds of destinations worldwide.`;
  const topD=FOREIGN.sort((a,b)=>(ROUTE_AVG[a.code]||999)-(ROUTE_AVG[b.code]||999)).slice(0,12);

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},{"@type":"ListItem","position":2,"name":"Flights From","item":`${SITE_URL}/flights-from/`},{"@type":"ListItem","position":3,"name":o.city,"item":`${SITE_URL}${url}`}]}]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Flights From",u:"/flights-from/"},{n:o.city,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${o.name} · ${o.code}</div>
  <h1 class="h1">Flights from <span class="dest">${o.city}</span></h1>
  <p class="hsub">Search hundreds of destinations from ${o.name}. Compare 100+ airlines. No hidden fees.</p>
  <a href="/?origin=${o.code}" class="sbtn">✈️ Search from ${o.city}</a>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Popular Destinations from ${o.city}</h2></div>
    <div class="dgrid">${topD.map(d=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">from ${o.city}</div></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other UK Airports</h2></div>
    <div class="chips">${UK.filter(a=>a.code!==o.code).slice(0,8).map(a=>`<a href="/flights-from/${cSlug(a)}" class="chip">✈️ Flights from ${a.city}</a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AIRPORT PAGE /airports/london-heathrow
// ─────────────────────────────────────────────────────────────────────────────
function airportPage(a){
  const url=`/airports/${aSlug(a)}`;
  const title=`${a.name} (${a.code}) | Cheap Flights & Airport Guide | TripHunt`;
  const desc=`Flights from ${a.name} (${a.code}). Compare prices to 200+ destinations. Terminal info, airlines, and travel tips.`;
  const topD=FOREIGN.sort((x,y)=>(ROUTE_AVG[x.code]||999)-(ROUTE_AVG[y.code]||999)).slice(0,10);
  const nearby=AIRPORTS.filter(x=>x.country===a.country&&x.code!==a.code).slice(0,5);

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:[{"@context":"https://schema.org","@type":"Airport","name":a.name,"iataCode":a.code,"address":{"@type":"PostalAddress","addressCountry":a.country,"addressLocality":a.city}},{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},{"@type":"ListItem","position":2,"name":"Airports","item":`${SITE_URL}/airports/`},{"@type":"ListItem","position":3,"name":a.name,"item":`${SITE_URL}${url}`}]}]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Airports",u:"/airports/"},{n:a.name,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">🛫 ${a.code} · ${a.city}, ${a.country}</div>
  <h1 class="h1"><span class="dest">${a.name}</span><br>Airport Guide</h1>
  <p class="hsub">Compare cheap flights from ${a.name}. 200+ destinations. No hidden fees.</p>
  <a href="/?origin=${a.code}" class="sbtn">✈️ Search from ${a.code}</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">${a.code}</div><div class="stat-l">IATA Code</div></div>
    <div class="stat"><div class="stat-v">${a.city}</div><div class="stat-l">City</div></div>
    <div class="stat"><div class="stat-v">${a.country}</div><div class="stat-l">Country</div></div>
    <div class="stat"><div class="stat-v">200+</div><div class="stat-l">Destinations</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Popular Flights from ${a.name}</h2></div>
    <div class="dgrid">${topD.map(d=>`<a href="/flights/${cSlug(a)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">return</div></a>`).join("\n")}</div>
  </section>
  ${nearby.length?`<section class="sec"><div class="sec-h"><h2 class="sec-t">Nearby Airports</h2></div><div class="chips">${nearby.map(n=>`<a href="/airports/${aSlug(n)}" class="chip">🛫 ${n.name} (${n.code})</a>`).join("\n")}</div></section>`:""}
</div>
${footer(a)}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DESTINATION PAGE /destinations/barcelona
// ─────────────────────────────────────────────────────────────────────────────
function destPage(d){
  const url=`/destinations/${cSlug(d)}`;
  const cp=cheap(d);
  const title=`${d.city} Travel Guide | Flights from £${cp} | TripHunt`;
  const desc=`Plan your trip to ${d.city}. Compare cheap flights from £${cp}. Best time to visit, airlines, travel tips and more.`;

  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},{"@type":"ListItem","position":2,"name":"Destinations","item":`${SITE_URL}/destinations/`},{"@type":"ListItem","position":3,"name":d.city,"item":`${SITE_URL}${url}`}]},faqSchema([{q:`When is the best time to visit ${d.city}?`,a:`${cheapMonth(d)} typically offers the lowest flight prices to ${d.city}. Summer months are most expensive but popular. Shoulder seasons (spring/autumn) offer a good balance.`},{q:`How do I get to ${d.city} from the UK?`,a:`Fly to ${d.name} (${d.code}) from UK airports. Airlines including ${airlines(d)} operate this route.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Destinations",u:"/destinations/"},{n:d.city,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">🌍 ${d.country} · ${d.code}</div>
  <h1 class="h1"><span class="dest">${d.city}</span><br>Travel Guide</h1>
  <p class="hsub">Flights from £${cp} · ${d.name} · Compare 100+ airlines</p>
  <a href="/?destination=${d.code}" class="sbtn">✈️ Find Flights to ${d.city}</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Flights from</div></div>
    <div class="stat"><div class="stat-v">${d.code}</div><div class="stat-l">Airport code</div></div>
    <div class="stat"><div class="stat-v">${cheapMonth(d)}</div><div class="stat-l">Cheapest month</div></div>
    <div class="stat"><div class="stat-v">${airlines(d).split(",")[0].trim()}</div><div class="stat-l">Top airline</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Fly to ${d.city} from the UK</h2></div>
    <div class="chips">${HUBS.map(o=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}" class="chip">✈️ ${o.city} → ${d.city}<span class="chip-p">from £${cheap(d)}</span></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">About ${d.city}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Getting There</div><div class="icard-b">Fly to ${d.name} (${d.code}) from UK airports. Airlines: <strong>${airlines(d)}</strong>.</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Best Time to Visit</div><div class="icard-b"><strong>${cheapMonth(d)}</strong> offers the lowest fares. Summer is popular but expensive. Shoulder seasons give a good balance.</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Flight Prices</div><div class="icard-b">Flights to ${d.city} start from <strong>£${cp}</strong> return. Set a TripHunt price alert to catch fare drops.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Frequently Asked Questions</h2></div>
    <div class="faq-list">
      <div class="faq-item"><div class="faq-q">When is the best time to visit ${d.city}?</div><div class="faq-a">${cheapMonth(d)} typically has the lowest flight prices. Summer is most expensive. Shoulder seasons offer a good balance of price and experience.</div></div>
      <div class="faq-item"><div class="faq-q">How do I get to ${d.city} from the UK?</div><div class="faq-a">Fly to ${d.name} (${d.code}). Airlines: ${airlines(d)}. Use TripHunt to compare prices and find the cheapest fare.</div></div>
    </div>
  </section>
</div>
${footer()}
</body></html>`;
}

// ─── Sitemaps ─────────────────────────────────────────────────────────────────
function xmlSitemap(urls){
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u=>`  <url>\n    <loc>${SITE_URL}${u.loc}</loc>\n    <lastmod>${u.lastmod||TODAY}</lastmod>\n    <changefreq>${u.changefreq||"weekly"}</changefreq>\n    <priority>${u.priority||"0.7"}</priority>\n  </url>`).join("\n")}
</urlset>`;
}

function sitemapIndex(maps){
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map(s=>`  <sitemap>\n    <loc>${SITE_URL}${s}</loc>\n    <lastmod>${TODAY}</lastmod>\n  </sitemap>`).join("\n")}
</sitemapindex>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main(){
  console.log("\n🚀 TripHunt SEO Engine");
  console.log(`📁 Output: ${SEO_OUT}`);
  console.log(`🔧 Mode: ${IS_TEST?"TEST (50 pages)":"FULL BUILD"}`);
  console.log("─".repeat(48));

  const t0=Date.now();
  let total=0;
  const flightUrls=[], destUrls=[], apUrls=[];

  // Index pages
  write(`${SEO_OUT}/flights/index.html`, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Cheap Flights UK | TripHunt</title><link rel="canonical" href="${SITE_URL}/flights/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1">Cheap Flights from the <span class="dest">UK</span></h1><p class="hsub">Compare 100+ airlines. 200+ destinations. No hidden fees.</p><a href="/" class="sbtn">✈️ Search All Flights</a></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">Flights by UK Airport</h2></div><div class="dgrid">${HUBS.map(h=>`<a href="/flights-from/${cSlug(h)}" class="dcard"><div class="dcard-c">${h.city}</div><div class="dcard-n">${h.name}</div><div class="dcard-p">${h.code}</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);

  write(`${SEO_OUT}/destinations/index.html`, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Travel Destinations | TripHunt</title><link rel="canonical" href="${SITE_URL}/destinations/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1">Travel <span class="dest">Destinations</span></h1><p class="hsub">Explore the world. Compare cheap flights from UK airports.</p><a href="/" class="sbtn">✈️ Search Flights</a></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">Popular Destinations from the UK</h2></div><div class="dgrid">${FOREIGN.slice(0,24).map(d=>`<a href="/destinations/${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">from UK</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);

  write(`${SEO_OUT}/airports/index.html`, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Airport Guides | TripHunt</title><link rel="canonical" href="${SITE_URL}/airports/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1"><span class="dest">Airport</span> Guides</h1><p class="hsub">Terminal info, airlines, and cheap flights from airports worldwide.</p></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">Browse Airports</h2></div><div class="dgrid">${AIRPORTS.slice(0,30).map(a=>`<a href="/airports/${aSlug(a)}" class="dcard"><div class="dcard-c">${a.code}</div><div class="dcard-n">${a.city}</div><div class="dcard-p" style="font-size:12px">${a.country}</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);

  flightUrls.push({loc:"/flights/",priority:"0.9",changefreq:"daily"});
  destUrls.push({loc:"/destinations/",priority:"0.9",changefreq:"weekly"});
  apUrls.push({loc:"/airports/",priority:"0.8",changefreq:"weekly"});

  if(!ONLY_SITEMAPS){
    // Route pages
    console.log("✈️  Route pages...");
    let rc=0;
    outer: for(const o of UK){
      for(const d of FOREIGN){
        if(total>=LIMIT) break outer;
        write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/index.html`, routePage(o,d));
        flightUrls.push({loc:`/flights/${cSlug(o)}-to-${cSlug(d)}/`,priority:"0.85",changefreq:"daily"});
        rc++;total++;
        if(rc%25===0) process.stdout.write(`\r   ${rc} route pages`);
      }
    }
    console.log(`\r   ✅ ${rc} route pages`);

    // Month pages (hubs only for scale)
    if(!IS_TEST){
      console.log("📅  Month pages...");
      let mc=0;
      mout: for(const o of HUBS){
        for(const d of FOREIGN.slice(0,30)){
          for(const m of MONTHS){
            if(total>=LIMIT) break mout;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/index.html`, monthPage(o,d,m));
            flightUrls.push({loc:`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/`,priority:"0.65",changefreq:"monthly"});
            mc++;total++;
            if(mc%100===0) process.stdout.write(`\r   ${mc} month pages`);
          }
        }
      }
      console.log(`\r   ✅ ${mc} month pages`);
    }

    // Cheap-to pages
    console.log("💰  Cheap-to pages...");
    for(const d of FOREIGN){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/cheap-flights-to/${cSlug(d)}/index.html`, cheapToPage(d));
      destUrls.push({loc:`/cheap-flights-to/${cSlug(d)}/`,priority:"0.80",changefreq:"weekly"});
      total++;
    }
    console.log(`   ✅ ${FOREIGN.length} cheap-to pages`);

    // Flights-from pages
    console.log("🛫  Flights-from pages...");
    for(const o of UK){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/flights-from/${cSlug(o)}/index.html`, flightsFromPage(o));
      flightUrls.push({loc:`/flights-from/${cSlug(o)}/`,priority:"0.80",changefreq:"weekly"});
      total++;
    }
    console.log(`   ✅ ${UK.length} flights-from pages`);

    // Airport pages
    console.log("🛫  Airport pages...");
    for(const a of AIRPORTS){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/airports/${aSlug(a)}/index.html`, airportPage(a));
      apUrls.push({loc:`/airports/${aSlug(a)}/`,priority:"0.75",changefreq:"monthly"});
      total++;
    }
    console.log(`   ✅ ${AIRPORTS.length} airport pages`);

    // Destination pages
    console.log("🌍  Destination pages...");
    for(const d of FOREIGN){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/destinations/${cSlug(d)}/index.html`, destPage(d));
      destUrls.push({loc:`/destinations/${cSlug(d)}/`,priority:"0.78",changefreq:"weekly"});
      total++;
    }
    console.log(`   ✅ ${FOREIGN.length} destination pages`);
  }

  // Sitemaps
  console.log("🗺️   Writing sitemaps...");
  write(path.resolve(SEO_OUT,"..","sitemap-flights.xml"),      xmlSitemap(flightUrls));
  write(path.resolve(SEO_OUT,"..","sitemap-destinations.xml"), xmlSitemap(destUrls));
  write(path.resolve(SEO_OUT,"..","sitemap-airports.xml"),     xmlSitemap(apUrls));
  write(path.resolve(SEO_OUT,"..","sitemap-index.xml"),        sitemapIndex(["/sitemap.xml","/sitemap-index.xml","/sitemap-flights.xml","/sitemap-destinations.xml","/sitemap-airports.xml"]));
  console.log("   ✅ Sitemaps written");

  const secs=((Date.now()-t0)/1000).toFixed(1);
  console.log("─".repeat(48));
  console.log(`\n✅ ${total.toLocaleString()} pages in ${secs}s`);
  console.log(`   Flight URLs:      ${flightUrls.length}`);
  console.log(`   Destination URLs: ${destUrls.length}`);
  console.log(`   Airport URLs:     ${apUrls.length}`);
  console.log(`\n📋 Next: commit & push → Netlify auto-builds on deploy`);
  console.log(`   Submit sitemap-index.xml to Google Search Console\n`);
}

main();
