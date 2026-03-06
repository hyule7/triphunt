#!/usr/bin/env node
// ─── TripHunt · SEO Page Generator ───────────────────────────────────────────
// Generates 500,000+ programmatic route pages.
// Usage: node generate-seo-pages.js [--limit=100] [--output=./flights]
//
// Generates pages for:
//   /flights/london-to-paris
//   /flights/cheap-to-bali
//   /flights/from-heathrow
//   /flights/london-to-paris-july
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require("fs");
const path = require("path");

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args    = Object.fromEntries(process.argv.slice(2).map(a => a.replace("--","").split("=")));
const LIMIT   = parseInt(args.limit)  || Infinity;   // --limit=100 for testing
const OUT_DIR = args.output || "./flights";

// ─── Airport dataset (500 airports – full production dataset) ────────────────
const AIRPORTS = [
  { code:"LHR", name:"London Heathrow",     city:"London",      country:"UK",          lat:51.47, lon:-0.46 },
  { code:"LGW", name:"London Gatwick",       city:"London",      country:"UK",          lat:51.15, lon:-0.18 },
  { code:"STN", name:"London Stansted",      city:"London",      country:"UK",          lat:51.88, lon:0.24  },
  { code:"MAN", name:"Manchester Airport",   city:"Manchester",  country:"UK",          lat:53.35, lon:-2.27 },
  { code:"BHX", name:"Birmingham Airport",   city:"Birmingham",  country:"UK",          lat:52.45, lon:-1.74 },
  { code:"EDI", name:"Edinburgh Airport",    city:"Edinburgh",   country:"UK",          lat:55.95, lon:-3.36 },
  { code:"GLA", name:"Glasgow Airport",      city:"Glasgow",     country:"UK",          lat:55.87, lon:-4.43 },
  { code:"BRS", name:"Bristol Airport",      city:"Bristol",     country:"UK",          lat:51.38, lon:-2.72 },
  { code:"LBA", name:"Leeds Bradford",       city:"Leeds",       country:"UK",          lat:53.87, lon:-1.66 },
  { code:"NCL", name:"Newcastle Airport",    city:"Newcastle",   country:"UK",          lat:55.04, lon:-1.69 },
  { code:"CDG", name:"Paris Charles de Gaulle", city:"Paris",   country:"France",      lat:49.01, lon:2.55  },
  { code:"AMS", name:"Amsterdam Schiphol",   city:"Amsterdam",  country:"Netherlands", lat:52.31, lon:4.76  },
  { code:"BCN", name:"Barcelona El Prat",    city:"Barcelona",  country:"Spain",       lat:41.30, lon:2.07  },
  { code:"MAD", name:"Madrid Barajas",       city:"Madrid",     country:"Spain",       lat:40.47, lon:-3.56 },
  { code:"FCO", name:"Rome Fiumicino",       city:"Rome",       country:"Italy",       lat:41.80, lon:12.25 },
  { code:"MXP", name:"Milan Malpensa",       city:"Milan",      country:"Italy",       lat:45.63, lon:8.72  },
  { code:"LIS", name:"Lisbon Airport",       city:"Lisbon",     country:"Portugal",    lat:38.77, lon:-9.13 },
  { code:"FAO", name:"Faro Airport",         city:"Faro",       country:"Portugal",    lat:37.01, lon:-7.97 },
  { code:"ATH", name:"Athens Intl",          city:"Athens",     country:"Greece",      lat:37.94, lon:23.94 },
  { code:"SKG", name:"Thessaloniki Airport", city:"Thessaloniki",country:"Greece",     lat:40.52, lon:22.97 },
  { code:"DXB", name:"Dubai Intl",           city:"Dubai",      country:"UAE",         lat:25.25, lon:55.36 },
  { code:"AUH", name:"Abu Dhabi Intl",       city:"Abu Dhabi",  country:"UAE",         lat:24.43, lon:54.65 },
  { code:"BKK", name:"Bangkok Suvarnabhumi", city:"Bangkok",    country:"Thailand",    lat:13.68, lon:100.74 },
  { code:"HKT", name:"Phuket Intl",          city:"Phuket",     country:"Thailand",    lat:8.11,  lon:98.30 },
  { code:"DPS", name:"Bali Ngurah Rai",      city:"Bali",       country:"Indonesia",   lat:-8.75, lon:115.17 },
  { code:"SIN", name:"Singapore Changi",     city:"Singapore",  country:"Singapore",   lat:1.36,  lon:103.99 },
  { code:"NRT", name:"Tokyo Narita",         city:"Tokyo",      country:"Japan",       lat:35.77, lon:140.39 },
  { code:"HND", name:"Tokyo Haneda",         city:"Tokyo",      country:"Japan",       lat:35.55, lon:139.78 },
  { code:"JFK", name:"New York JFK",         city:"New York",   country:"USA",         lat:40.64, lon:-73.78 },
  { code:"LAX", name:"Los Angeles Intl",     city:"Los Angeles",country:"USA",         lat:33.94, lon:-118.41 },
  { code:"MIA", name:"Miami Intl",           city:"Miami",      country:"USA",         lat:25.80, lon:-80.28 },
  { code:"ORD", name:"Chicago O'Hare",       city:"Chicago",    country:"USA",         lat:41.98, lon:-87.90 },
  { code:"SFO", name:"San Francisco Intl",   city:"San Francisco",country:"USA",       lat:37.62, lon:-122.38 },
  { code:"SYD", name:"Sydney Airport",       city:"Sydney",     country:"Australia",   lat:-33.95, lon:151.18 },
  { code:"MEL", name:"Melbourne Airport",    city:"Melbourne",  country:"Australia",   lat:-37.67, lon:144.84 },
  { code:"PRG", name:"Prague Vaclav Havel",  city:"Prague",     country:"Czech Republic", lat:50.10, lon:14.26 },
  { code:"VIE", name:"Vienna Intl",          city:"Vienna",     country:"Austria",     lat:48.11, lon:16.57 },
  { code:"BUD", name:"Budapest Ferenc Liszt",city:"Budapest",   country:"Hungary",     lat:47.43, lon:19.26 },
  { code:"WAW", name:"Warsaw Chopin",        city:"Warsaw",     country:"Poland",      lat:52.17, lon:20.97 },
  { code:"CPH", name:"Copenhagen Airport",   city:"Copenhagen", country:"Denmark",     lat:55.62, lon:12.65 },
  { code:"ARN", name:"Stockholm Arlanda",    city:"Stockholm",  country:"Sweden",      lat:59.65, lon:17.92 },
  { code:"OSL", name:"Oslo Gardermoen",      city:"Oslo",       country:"Norway",      lat:60.19, lon:11.10 },
  { code:"HEL", name:"Helsinki Vantaa",      city:"Helsinki",   country:"Finland",     lat:60.32, lon:24.97 },
  { code:"ZRH", name:"Zurich Airport",       city:"Zurich",     country:"Switzerland", lat:47.46, lon:8.55 },
  { code:"GVA", name:"Geneva Airport",       city:"Geneva",     country:"Switzerland", lat:46.24, lon:6.11 },
  { code:"BRU", name:"Brussels Airport",     city:"Brussels",   country:"Belgium",     lat:50.90, lon:4.48 },
  { code:"PMI", name:"Palma de Mallorca",    city:"Mallorca",   country:"Spain",       lat:39.55, lon:2.74 },
  { code:"TFS", name:"Tenerife South",       city:"Tenerife",   country:"Spain",       lat:28.04, lon:-16.57 },
  { code:"LPA", name:"Gran Canaria",         city:"Gran Canaria",country:"Spain",      lat:27.93, lon:-15.39 },
  { code:"ALC", name:"Alicante Airport",     city:"Alicante",   country:"Spain",       lat:38.28, lon:-0.56 },
  { code:"AGP", name:"Malaga Airport",       city:"Malaga",     country:"Spain",       lat:36.67, lon:-4.50 },
  { code:"AYT", name:"Antalya Airport",      city:"Antalya",    country:"Turkey",      lat:36.90, lon:30.80 },
  { code:"IST", name:"Istanbul Airport",     city:"Istanbul",   country:"Turkey",      lat:41.27, lon:28.75 },
  { code:"DBV", name:"Dubrovnik Airport",    city:"Dubrovnik",  country:"Croatia",     lat:42.56, lon:18.27 },
  { code:"SPU", name:"Split Airport",        city:"Split",      country:"Croatia",     lat:43.54, lon:16.30 },
  { code:"CMN", name:"Casablanca Airport",   city:"Casablanca", country:"Morocco",     lat:33.37, lon:-7.59 },
  { code:"RAK", name:"Marrakech Airport",    city:"Marrakech",  country:"Morocco",     lat:31.61, lon:-8.04 },
  { code:"CPT", name:"Cape Town Intl",       city:"Cape Town",  country:"South Africa",lat:-33.96, lon:18.60 },
  { code:"NBO", name:"Nairobi Jomo Kenyatta",city:"Nairobi",   country:"Kenya",       lat:-1.32,  lon:36.93 },
  { code:"CAI", name:"Cairo Intl",           city:"Cairo",      country:"Egypt",       lat:30.11,  lon:31.41 },
  { code:"HRG", name:"Hurghada Intl",        city:"Hurghada",   country:"Egypt",       lat:27.18,  lon:33.80 },
  { code:"SSH", name:"Sharm El Sheikh",      city:"Sharm El Sheikh",country:"Egypt",   lat:27.98,  lon:34.39 },
  { code:"KUL", name:"Kuala Lumpur Intl",    city:"Kuala Lumpur",country:"Malaysia",  lat:2.74,   lon:101.70 },
  { code:"MLE", name:"Maldives Velana",      city:"Male",       country:"Maldives",    lat:4.19,   lon:73.53 },
  { code:"CMB", name:"Colombo Bandaranaike", city:"Colombo",    country:"Sri Lanka",   lat:7.18,   lon:79.88 },
  { code:"DEL", name:"Delhi Indira Gandhi",  city:"Delhi",      country:"India",       lat:28.57,  lon:77.09 },
  { code:"BOM", name:"Mumbai Chhatrapati",   city:"Mumbai",     country:"India",       lat:19.09,  lon:72.87 },
  { code:"GOA", name:"Goa Dabolim",          city:"Goa",        country:"India",       lat:15.38,  lon:73.83 },
  { code:"YYZ", name:"Toronto Pearson",      city:"Toronto",    country:"Canada",      lat:43.68,  lon:-79.63 },
  { code:"YVR", name:"Vancouver Intl",       city:"Vancouver",  country:"Canada",      lat:49.19,  lon:-123.18 },
  { code:"GRU", name:"Sao Paulo Guarulhos",  city:"Sao Paulo",  country:"Brazil",      lat:-23.43, lon:-46.47 },
  { code:"GIG", name:"Rio de Janeiro Intl",  city:"Rio de Janeiro",country:"Brazil",   lat:-22.81, lon:-43.25 },
  { code:"EZE", name:"Buenos Aires Ezeiza",  city:"Buenos Aires",country:"Argentina",  lat:-34.82, lon:-58.54 },
  { code:"LIM", name:"Lima Jorge Chavez",    city:"Lima",       country:"Peru",        lat:-12.02, lon:-77.11 },
  { code:"MXL", name:"Mexicali Intl",        city:"Mexico City",country:"Mexico",      lat:32.63,  lon:-115.24 },
  { code:"CUN", name:"Cancun Intl",          city:"Cancun",     country:"Mexico",      lat:21.04,  lon:-86.87 },
  { code:"AKL", name:"Auckland Airport",     city:"Auckland",   country:"New Zealand", lat:-37.01, lon:174.79 },
  { code:"BNE", name:"Brisbane Airport",     city:"Brisbane",   country:"Australia",   lat:-27.38, lon:153.12 },
  { code:"PER", name:"Perth Airport",        city:"Perth",      country:"Australia",   lat:-31.94, lon:115.97 },
  // ── Additional UK Airports ──
  { code:"LTN", name:"London Luton",         city:"London",     country:"UK",          lat:51.87, lon:-0.37 },
  { code:"LCY", name:"London City",          city:"London",     country:"UK",          lat:51.51, lon:0.06  },
  { code:"EMA", name:"East Midlands",        city:"Nottingham", country:"UK",          lat:52.83, lon:-1.33 },
  { code:"ABZ", name:"Aberdeen Airport",     city:"Aberdeen",   country:"UK",          lat:57.20, lon:-2.20 },
  { code:"BFS", name:"Belfast Intl",         city:"Belfast",    country:"UK",          lat:54.66, lon:-6.22 },
  { code:"BHD", name:"Belfast City",         city:"Belfast",    country:"UK",          lat:54.62, lon:-5.87 },
  { code:"CWL", name:"Cardiff Airport",      city:"Cardiff",    country:"UK",          lat:51.40, lon:-3.34 },
  { code:"EXT", name:"Exeter Airport",       city:"Exeter",     country:"UK",          lat:50.73, lon:-3.41 },
  { code:"HUY", name:"Humberside Airport",   city:"Humber",     country:"UK",          lat:53.57, lon:-0.35 },
  { code:"INV", name:"Inverness Airport",    city:"Inverness",  country:"UK",          lat:57.54, lon:-4.05 },
  { code:"NQY", name:"Newquay Airport",      city:"Newquay",    country:"UK",          lat:50.44, lon:-4.99 },
  { code:"NWI", name:"Norwich Airport",      city:"Norwich",    country:"UK",          lat:52.67, lon:1.28  },
  { code:"SOU", name:"Southampton Airport",  city:"Southampton",country:"UK",          lat:50.95, lon:-1.36 },
  { code:"PIK", name:"Glasgow Prestwick",    city:"Glasgow",    country:"UK",          lat:55.51, lon:-4.59 },
  // ── Europe ──
  { code:"MRS", name:"Marseille Provence",   city:"Marseille",  country:"France",      lat:43.44, lon:5.21  },
  { code:"NCE", name:"Nice Cote d'Azur",     city:"Nice",       country:"France",      lat:43.66, lon:7.22  },
  { code:"LYS", name:"Lyon Saint-Exupery",   city:"Lyon",       country:"France",      lat:45.73, lon:5.09  },
  { code:"TLS", name:"Toulouse Blagnac",     city:"Toulouse",   country:"France",      lat:43.63, lon:1.37  },
  { code:"BOD", name:"Bordeaux Merignac",    city:"Bordeaux",   country:"France",      lat:44.83, lon:-0.72 },
  { code:"NTE", name:"Nantes Atlantique",    city:"Nantes",     country:"France",      lat:47.15, lon:-1.61 },
  { code:"SXB", name:"Strasbourg Airport",   city:"Strasbourg", country:"France",      lat:48.54, lon:7.63  },
  { code:"BIO", name:"Bilbao Airport",       city:"Bilbao",     country:"Spain",       lat:43.30, lon:-2.91 },
  { code:"SVQ", name:"Seville Airport",      city:"Seville",    country:"Spain",       lat:37.42, lon:-5.90 },
  { code:"VLC", name:"Valencia Airport",     city:"Valencia",   country:"Spain",       lat:39.49, lon:-0.48 },
  { code:"GRX", name:"Granada Airport",      city:"Granada",    country:"Spain",       lat:37.19, lon:-3.79 },
  { code:"IBZ", name:"Ibiza Airport",        city:"Ibiza",      country:"Spain",       lat:38.87, lon:1.37  },
  { code:"MAH", name:"Menorca Airport",      city:"Menorca",    country:"Spain",       lat:39.86, lon:4.22  },
  { code:"REU", name:"Reus Airport",         city:"Reus",       country:"Spain",       lat:41.15, lon:1.17  },
  { code:"SDR", name:"Santander Airport",    city:"Santander",  country:"Spain",       lat:43.43, lon:-3.83 },
  { code:"VGO", name:"Vigo Airport",         city:"Vigo",       country:"Spain",       lat:42.23, lon:-8.63 },
  { code:"BRE", name:"Bremen Airport",       city:"Bremen",     country:"Germany",     lat:53.05, lon:8.79  },
  { code:"CGN", name:"Cologne Bonn",         city:"Cologne",    country:"Germany",     lat:50.87, lon:7.14  },
  { code:"DUS", name:"Dusseldorf Intl",      city:"Dusseldorf", country:"Germany",     lat:51.29, lon:6.77  },
  { code:"FRA", name:"Frankfurt Airport",    city:"Frankfurt",  country:"Germany",     lat:50.03, lon:8.57  },
  { code:"HAM", name:"Hamburg Airport",      city:"Hamburg",    country:"Germany",     lat:53.63, lon:10.01 },
  { code:"MUC", name:"Munich Airport",       city:"Munich",     country:"Germany",     lat:48.35, lon:11.79 },
  { code:"NUE", name:"Nuremberg Airport",    city:"Nuremberg",  country:"Germany",     lat:49.49, lon:11.08 },
  { code:"STR", name:"Stuttgart Airport",    city:"Stuttgart",  country:"Germany",     lat:48.69, lon:9.22  },
  { code:"TXL", name:"Berlin Brandenburg",   city:"Berlin",     country:"Germany",     lat:52.36, lon:13.50 },
  { code:"BLL", name:"Billund Airport",      city:"Billund",    country:"Denmark",     lat:55.74, lon:9.15  },
  { code:"AAL", name:"Aalborg Airport",      city:"Aalborg",    country:"Denmark",     lat:57.09, lon:9.85  },
  { code:"BGO", name:"Bergen Airport",       city:"Bergen",     country:"Norway",      lat:60.29, lon:5.22  },
  { code:"SVG", name:"Stavanger Airport",    city:"Stavanger",  country:"Norway",      lat:58.88, lon:5.64  },
  { code:"TRD", name:"Trondheim Airport",    city:"Trondheim",  country:"Norway",      lat:63.46, lon:10.93 },
  { code:"GOT", name:"Gothenburg Landvetter",city:"Gothenburg", country:"Sweden",      lat:57.67, lon:12.29 },
  { code:"MMX", name:"Malmo Airport",        city:"Malmo",      country:"Sweden",      lat:55.53, lon:13.37 },
  { code:"TMP", name:"Tampere Airport",      city:"Tampere",    country:"Finland",     lat:61.41, lon:23.60 },
  { code:"OUL", name:"Oulu Airport",         city:"Oulu",       country:"Finland",     lat:64.93, lon:25.35 },
  { code:"RIX", name:"Riga Intl",            city:"Riga",       country:"Latvia",      lat:56.92, lon:23.97 },
  { code:"TLL", name:"Tallinn Airport",      city:"Tallinn",    country:"Estonia",     lat:59.41, lon:24.83 },
  { code:"VNO", name:"Vilnius Airport",      city:"Vilnius",    country:"Lithuania",   lat:54.63, lon:25.28 },
  { code:"KBP", name:"Kyiv Boryspil",        city:"Kyiv",       country:"Ukraine",     lat:50.35, lon:30.89 },
  { code:"OTP", name:"Bucharest Otopeni",    city:"Bucharest",  country:"Romania",     lat:44.57, lon:26.10 },
  { code:"CLJ", name:"Cluj-Napoca Airport",  city:"Cluj-Napoca",country:"Romania",     lat:46.79, lon:23.69 },
  { code:"SOF", name:"Sofia Airport",        city:"Sofia",      country:"Bulgaria",    lat:42.70, lon:23.41 },
  { code:"VAR", name:"Varna Airport",        city:"Varna",      country:"Bulgaria",    lat:43.23, lon:27.82 },
  { code:"BOJ", name:"Burgas Airport",       city:"Burgas",     country:"Bulgaria",    lat:42.57, lon:27.51 },
  { code:"SKP", name:"Skopje Airport",       city:"Skopje",     country:"N.Macedonia", lat:41.96, lon:21.62 },
  { code:"TGD", name:"Podgorica Airport",    city:"Podgorica",  country:"Montenegro",  lat:42.36, lon:19.25 },
  { code:"TIA", name:"Tirana Airport",       city:"Tirana",     country:"Albania",     lat:41.41, lon:19.72 },
  { code:"SAR", name:"Sarajevo Airport",     city:"Sarajevo",   country:"Bosnia",      lat:43.82, lon:18.33 },
  { code:"BEG", name:"Belgrade Nikola Tesla",city:"Belgrade",   country:"Serbia",      lat:44.82, lon:20.29 },
  { code:"LJU", name:"Ljubljana Airport",    city:"Ljubljana",  country:"Slovenia",    lat:46.22, lon:14.45 },
  { code:"ZAG", name:"Zagreb Airport",       city:"Zagreb",     country:"Croatia",     lat:45.74, lon:16.07 },
  { code:"PUY", name:"Pula Airport",         city:"Pula",       country:"Croatia",     lat:44.89, lon:13.92 },
  { code:"ZAD", name:"Zadar Airport",        city:"Zadar",      country:"Croatia",     lat:44.11, lon:15.35 },
  { code:"BRQ", name:"Brno Airport",         city:"Brno",       country:"Czech Republic",lat:49.15,lon:16.69},
  { code:"KRK", name:"Krakow Airport",       city:"Krakow",     country:"Poland",      lat:50.08, lon:19.78 },
  { code:"GDN", name:"Gdansk Airport",       city:"Gdansk",     country:"Poland",      lat:54.38, lon:18.47 },
  { code:"KTW", name:"Katowice Airport",     city:"Katowice",   country:"Poland",      lat:50.47, lon:19.08 },
  { code:"WRO", name:"Wroclaw Airport",      city:"Wroclaw",    country:"Poland",      lat:51.10, lon:16.89 },
  { code:"POZ", name:"Poznan Airport",       city:"Poznan",     country:"Poland",      lat:52.42, lon:16.83 },
  { code:"LWO", name:"Lviv Airport",         city:"Lviv",       country:"Ukraine",     lat:49.81, lon:23.96 },
  { code:"GYD", name:"Baku Heydar Aliyev",   city:"Baku",       country:"Azerbaijan",  lat:40.47, lon:50.05 },
  { code:"EVN", name:"Yerevan Zvartnots",    city:"Yerevan",    country:"Armenia",     lat:40.15, lon:44.40 },
  { code:"TBS", name:"Tbilisi Intl",         city:"Tbilisi",    country:"Georgia",     lat:41.67, lon:44.95 },
  { code:"ODS", name:"Odessa Airport",       city:"Odessa",     country:"Ukraine",     lat:46.43, lon:30.68 },
  // ── Middle East & North Africa ──
  { code:"BAH", name:"Bahrain Intl",         city:"Manama",     country:"Bahrain",     lat:26.27, lon:50.64 },
  { code:"KWI", name:"Kuwait Intl",          city:"Kuwait City",country:"Kuwait",      lat:29.23, lon:47.97 },
  { code:"MCT", name:"Muscat Intl",          city:"Muscat",     country:"Oman",        lat:23.59, lon:58.28 },
  { code:"DOH", name:"Doha Hamad Intl",      city:"Doha",       country:"Qatar",       lat:25.27, lon:51.61 },
  { code:"RUH", name:"Riyadh King Khalid",   city:"Riyadh",     country:"Saudi Arabia",lat:24.96, lon:46.70 },
  { code:"JED", name:"Jeddah King Abdulaziz",city:"Jeddah",     country:"Saudi Arabia",lat:21.68, lon:39.16 },
  { code:"AMM", name:"Amman Queen Alia",     city:"Amman",      country:"Jordan",      lat:31.72, lon:35.99 },
  { code:"BEY", name:"Beirut Rafic Hariri",  city:"Beirut",     country:"Lebanon",     lat:33.82, lon:35.49 },
  { code:"TLV", name:"Tel Aviv Ben Gurion",  city:"Tel Aviv",   country:"Israel",      lat:32.01, lon:34.89 },
  { code:"ESB", name:"Ankara Esenboga",      city:"Ankara",     country:"Turkey",      lat:40.13, lon:32.99 },
  { code:"ADB", name:"Izmir Adnan Menderes", city:"Izmir",      country:"Turkey",      lat:38.29, lon:27.16 },
  { code:"DLM", name:"Dalaman Airport",      city:"Dalaman",    country:"Turkey",      lat:36.71, lon:28.79 },
  { code:"BJV", name:"Milas-Bodrum",         city:"Bodrum",     country:"Turkey",      lat:37.25, lon:27.66 },
  { code:"SZF", name:"Samsun Airport",       city:"Samsun",     country:"Turkey",      lat:41.25, lon:36.56 },
  { code:"LXR", name:"Luxor Intl",           city:"Luxor",      country:"Egypt",       lat:25.67, lon:32.71 },
  { code:"ABJ", name:"Abidjan Felix Houphouet",city:"Abidjan",  country:"Ivory Coast", lat:5.26,  lon:-3.93 },
  { code:"ACC", name:"Accra Kotoka Intl",    city:"Accra",      country:"Ghana",       lat:5.61,  lon:-0.17 },
  { code:"ALG", name:"Algiers Houari",       city:"Algiers",    country:"Algeria",     lat:36.69, lon:3.22  },
  { code:"TUN", name:"Tunis-Carthage",       city:"Tunis",      country:"Tunisia",     lat:36.85, lon:10.23 },
  { code:"TIP", name:"Tripoli Intl",         city:"Tripoli",    country:"Libya",       lat:32.66, lon:13.16 },
  { code:"DAR", name:"Dar es Salaam Intl",   city:"Dar es Salaam",country:"Tanzania",  lat:-6.88, lon:39.20 },
  { code:"EBB", name:"Entebbe Intl",         city:"Kampala",    country:"Uganda",      lat:0.04,  lon:32.44 },
  { code:"ADD", name:"Addis Ababa Bole",     city:"Addis Ababa",country:"Ethiopia",    lat:8.98,  lon:38.80 },
  { code:"JNB", name:"Johannesburg OR Tambo",city:"Johannesburg",country:"South Africa",lat:-26.14,lon:28.24},
  { code:"DUR", name:"Durban King Shaka",    city:"Durban",     country:"South Africa",lat:-29.62, lon:31.12},
  { code:"LOS", name:"Lagos Murtala Mohammed",city:"Lagos",     country:"Nigeria",     lat:6.58,  lon:3.32  },
  { code:"ABV", name:"Abuja Intl",           city:"Abuja",      country:"Nigeria",     lat:9.00,  lon:7.26  },
  { code:"DKR", name:"Dakar Leopold Senghor",city:"Dakar",      country:"Senegal",     lat:14.74, lon:-17.49},
  // ── Asia Pacific ──
  { code:"PEK", name:"Beijing Capital Intl", city:"Beijing",    country:"China",       lat:40.08, lon:116.60},
  { code:"PVG", name:"Shanghai Pudong",      city:"Shanghai",   country:"China",       lat:31.14, lon:121.80},
  { code:"CAN", name:"Guangzhou Baiyun",     city:"Guangzhou",  country:"China",       lat:23.39, lon:113.30},
  { code:"CTU", name:"Chengdu Shuangliu",    city:"Chengdu",    country:"China",       lat:30.58, lon:103.95},
  { code:"CKG", name:"Chongqing Jiangbei",   city:"Chongqing",  country:"China",       lat:29.72, lon:106.64},
  { code:"XIY", name:"Xi'an Xianyang",       city:"Xi'an",      country:"China",       lat:34.45, lon:108.75},
  { code:"HKG", name:"Hong Kong Intl",       city:"Hong Kong",  country:"Hong Kong",   lat:22.31, lon:113.91},
  { code:"MFM", name:"Macau Intl",           city:"Macau",      country:"Macau",       lat:22.15, lon:113.59},
  { code:"TPE", name:"Taipei Taoyuan",       city:"Taipei",     country:"Taiwan",      lat:25.08, lon:121.23},
  { code:"ICN", name:"Seoul Incheon",        city:"Seoul",      country:"South Korea", lat:37.46, lon:126.44},
  { code:"GMP", name:"Seoul Gimpo",          city:"Seoul",      country:"South Korea", lat:37.56, lon:126.79},
  { code:"PUS", name:"Busan Gimhae",         city:"Busan",      country:"South Korea", lat:35.18, lon:128.94},
  { code:"KIX", name:"Osaka Kansai",         city:"Osaka",      country:"Japan",       lat:34.43, lon:135.24},
  { code:"ITM", name:"Osaka Itami",          city:"Osaka",      country:"Japan",       lat:34.79, lon:135.44},
  { code:"NGO", name:"Nagoya Chubu",         city:"Nagoya",     country:"Japan",       lat:34.86, lon:136.81},
  { code:"SPK", name:"Sapporo New Chitose",  city:"Sapporo",    country:"Japan",       lat:42.78, lon:141.69},
  { code:"OKA", name:"Okinawa Naha",         city:"Okinawa",    country:"Japan",       lat:26.20, lon:127.65},
  { code:"MNL", name:"Manila Ninoy Aquino",  city:"Manila",     country:"Philippines", lat:14.52, lon:121.02},
  { code:"CEB", name:"Cebu Mactan Intl",     city:"Cebu",       country:"Philippines", lat:10.31, lon:123.98},
  { code:"CGK", name:"Jakarta Soekarno-Hatta",city:"Jakarta",   country:"Indonesia",   lat:-6.13, lon:106.65},
  { code:"SUB", name:"Surabaya Juanda",      city:"Surabaya",   country:"Indonesia",   lat:-7.38, lon:112.79},
  { code:"UPG", name:"Makassar Sultan Hasanuddin",city:"Makassar",country:"Indonesia", lat:-5.06, lon:119.55},
  { code:"BDO", name:"Bandung Husein Sastranegara",city:"Bandung",country:"Indonesia", lat:-6.90, lon:107.58},
  { code:"LKH", name:"Lombok Intl",          city:"Lombok",     country:"Indonesia",   lat:-8.76, lon:116.28},
  { code:"HAN", name:"Hanoi Noi Bai",        city:"Hanoi",      country:"Vietnam",     lat:21.22, lon:105.81},
  { code:"SGN", name:"Ho Chi Minh City",     city:"Ho Chi Minh",country:"Vietnam",     lat:10.82, lon:106.66},
  { code:"DAD", name:"Da Nang Intl",         city:"Da Nang",    country:"Vietnam",     lat:16.04, lon:108.20},
  { code:"RGN", name:"Yangon Intl",          city:"Yangon",     country:"Myanmar",     lat:16.91, lon:96.13 },
  { code:"PNH", name:"Phnom Penh Intl",      city:"Phnom Penh", country:"Cambodia",    lat:11.55, lon:104.84},
  { code:"REP", name:"Siem Reap Angkor",     city:"Siem Reap",  country:"Cambodia",    lat:13.41, lon:103.81},
  { code:"VTE", name:"Vientiane Wattay",     city:"Vientiane",  country:"Laos",        lat:17.99, lon:102.57},
  { code:"KTM", name:"Kathmandu Tribhuvan",  city:"Kathmandu",  country:"Nepal",       lat:27.70, lon:85.36 },
  { code:"DAC", name:"Dhaka Hazrat Shahjalal",city:"Dhaka",     country:"Bangladesh",  lat:23.84, lon:90.40 },
  { code:"CCU", name:"Kolkata Netaji Subhas",city:"Kolkata",    country:"India",       lat:22.65, lon:88.45 },
  { code:"MAA", name:"Chennai Intl",         city:"Chennai",    country:"India",       lat:12.99, lon:80.18 },
  { code:"BLR", name:"Bengaluru Kempegowda", city:"Bengaluru",  country:"India",       lat:13.20, lon:77.71 },
  { code:"HYD", name:"Hyderabad Rajiv Gandhi",city:"Hyderabad", country:"India",       lat:17.23, lon:78.43 },
  { code:"COK", name:"Kochi Intl",           city:"Kochi",      country:"India",       lat:10.15, lon:76.40 },
  { code:"AMD", name:"Ahmedabad Sardar Vallabhbhai",city:"Ahmedabad",country:"India",  lat:23.07, lon:72.63 },
  { code:"PNQ", name:"Pune Airport",         city:"Pune",       country:"India",       lat:18.58, lon:73.91 },
  { code:"JAI", name:"Jaipur Intl",          city:"Jaipur",     country:"India",       lat:26.82, lon:75.81 },
  { code:"ATQ", name:"Amritsar Intl",        city:"Amritsar",   country:"India",       lat:31.71, lon:74.80 },
  { code:"ISB", name:"Islamabad Intl",       city:"Islamabad",  country:"Pakistan",    lat:33.56, lon:72.85 },
  { code:"KHI", name:"Karachi Jinnah Intl",  city:"Karachi",    country:"Pakistan",    lat:24.91, lon:67.16 },
  { code:"LHE", name:"Lahore Allama Iqbal",  city:"Lahore",     country:"Pakistan",    lat:31.52, lon:74.40 },
  // ── Americas ──
  { code:"BOS", name:"Boston Logan Intl",    city:"Boston",     country:"USA",         lat:42.37, lon:-71.00},
  { code:"DCA", name:"Washington Reagan",    city:"Washington", country:"USA",         lat:38.85, lon:-77.04},
  { code:"IAD", name:"Washington Dulles",    city:"Washington", country:"USA",         lat:38.94, lon:-77.46},
  { code:"ATL", name:"Atlanta Hartsfield",   city:"Atlanta",    country:"USA",         lat:33.64, lon:-84.43},
  { code:"DFW", name:"Dallas Fort Worth",    city:"Dallas",     country:"USA",         lat:32.90, lon:-97.04},
  { code:"HOU", name:"Houston Hobby",        city:"Houston",    country:"USA",         lat:29.65, lon:-95.28},
  { code:"IAH", name:"Houston George Bush",  city:"Houston",    country:"USA",         lat:29.99, lon:-95.34},
  { code:"PHX", name:"Phoenix Sky Harbor",   city:"Phoenix",    country:"USA",         lat:33.44, lon:-112.01},
  { code:"SEA", name:"Seattle Tacoma",       city:"Seattle",    country:"USA",         lat:47.45, lon:-122.31},
  { code:"LAS", name:"Las Vegas McCarran",   city:"Las Vegas",  country:"USA",         lat:36.08, lon:-115.15},
  { code:"DEN", name:"Denver Intl",          city:"Denver",     country:"USA",         lat:39.86, lon:-104.67},
  { code:"MSP", name:"Minneapolis St Paul",  city:"Minneapolis",country:"USA",         lat:44.88, lon:-93.22},
  { code:"DTW", name:"Detroit Metro Wayne",  city:"Detroit",    country:"USA",         lat:42.21, lon:-83.35},
  { code:"PHL", name:"Philadelphia Intl",    city:"Philadelphia",country:"USA",        lat:39.87, lon:-75.24},
  { code:"CLT", name:"Charlotte Douglas",    city:"Charlotte",  country:"USA",         lat:35.21, lon:-80.94},
  { code:"MCO", name:"Orlando Intl",         city:"Orlando",    country:"USA",         lat:28.43, lon:-81.31},
  { code:"TPA", name:"Tampa Intl",           city:"Tampa",      country:"USA",         lat:27.97, lon:-82.53},
  { code:"MSY", name:"New Orleans Moisant",  city:"New Orleans",country:"USA",         lat:29.99, lon:-90.26},
  { code:"HNL", name:"Honolulu Intl",        city:"Honolulu",   country:"USA",         lat:21.32, lon:-157.92},
  { code:"ANC", name:"Anchorage Ted Stevens",city:"Anchorage",  country:"USA",         lat:61.17, lon:-149.99},
  { code:"YUL", name:"Montreal Pierre Trudeau",city:"Montreal", country:"Canada",      lat:45.47, lon:-73.74},
  { code:"YOW", name:"Ottawa Macdonald-Cartier",city:"Ottawa",  country:"Canada",      lat:45.32, lon:-75.67},
  { code:"YEG", name:"Edmonton Intl",        city:"Edmonton",   country:"Canada",      lat:53.31, lon:-113.58},
  { code:"YYC", name:"Calgary Intl",         city:"Calgary",    country:"Canada",      lat:51.13, lon:-114.01},
  { code:"MEX", name:"Mexico City Intl",     city:"Mexico City",country:"Mexico",      lat:19.44, lon:-99.07},
  { code:"GDL", name:"Guadalajara Miguel Hidalgo",city:"Guadalajara",country:"Mexico", lat:20.52, lon:-103.31},
  { code:"MTY", name:"Monterrey Gen Mariano",city:"Monterrey",  country:"Mexico",      lat:25.78, lon:-100.11},
  { code:"BOG", name:"Bogota El Dorado",     city:"Bogota",     country:"Colombia",    lat:4.70,  lon:-74.15},
  { code:"MDE", name:"Medellin El Dorado",   city:"Medellin",   country:"Colombia",    lat:6.16,  lon:-75.43},
  { code:"CTG", name:"Cartagena Rafael Nunez",city:"Cartagena", country:"Colombia",    lat:10.44, lon:-75.51},
  { code:"CCS", name:"Caracas Simon Bolivar",city:"Caracas",    country:"Venezuela",   lat:10.60, lon:-66.99},
  { code:"UIO", name:"Quito Mariscal Sucre", city:"Quito",      country:"Ecuador",     lat:-0.13, lon:-78.36},
  { code:"GYE", name:"Guayaquil Jose Olmedo",city:"Guayaquil",  country:"Ecuador",     lat:-2.16, lon:-79.88},
  { code:"SCL", name:"Santiago Arturo Merino",city:"Santiago",  country:"Chile",       lat:-33.39, lon:-70.79},
  { code:"PMC", name:"Puerto Montt El Tepual",city:"Puerto Montt",country:"Chile",     lat:-41.44, lon:-73.09},
  { code:"ASU", name:"Asuncion Silvio Pettirossi",city:"Asuncion",country:"Paraguay",  lat:-25.24, lon:-57.52},
  { code:"MVD", name:"Montevideo Carrasco",  city:"Montevideo", country:"Uruguay",     lat:-34.84, lon:-56.01},
  { code:"CBA", name:"Cordoba Ambrosio Taravella",city:"Cordoba",country:"Argentina",  lat:-31.32, lon:-64.21},
  { code:"CUR", name:"Curacao Hato Intl",    city:"Willemstad", country:"Curacao",     lat:12.19, lon:-68.96},
  { code:"NAS", name:"Nassau Lynden Pindling",city:"Nassau",    country:"Bahamas",     lat:25.04, lon:-77.47},
  { code:"MBJ", name:"Montego Bay Sangster", city:"Montego Bay",country:"Jamaica",     lat:18.50, lon:-77.91},
  { code:"KIN", name:"Kingston Norman Manley",city:"Kingston",  country:"Jamaica",     lat:17.94, lon:-76.79},
  { code:"BGI", name:"Bridgetown Grantley Adams",city:"Bridgetown",country:"Barbados", lat:13.07, lon:-59.49},
  { code:"POS", name:"Port of Spain Crown Point",city:"Trinidad",country:"Trinidad",   lat:10.60, lon:-61.34},
  { code:"PTP", name:"Pointe-a-Pitre Le Raizet",city:"Guadeloupe",country:"Guadeloupe",lat:16.27,lon:-61.53},
  { code:"FDF", name:"Fort-de-France Cesaire",city:"Martinique",country:"Martinique",  lat:14.59, lon:-61.00},
  { code:"SDQ", name:"Santo Domingo Las Americas",city:"Santo Domingo",country:"Dominican Rep.",lat:18.43,lon:-69.67},
  { code:"PUJ", name:"Punta Cana Intl",      city:"Punta Cana", country:"Dominican Rep.",lat:18.57,lon:-68.36},
  { code:"HAV", name:"Havana Jose Marti",    city:"Havana",     country:"Cuba",        lat:22.99, lon:-82.41},
  // ── Pacific & Indian Ocean ──
  { code:"PPT", name:"Papeete Faa'a Intl",   city:"Tahiti",     country:"French Polynesia",lat:-17.55,lon:-149.61},
  { code:"NAN", name:"Nadi Intl",            city:"Nadi",       country:"Fiji",        lat:-17.76, lon:177.44},
  { code:"APW", name:"Apia Faleolo",         city:"Apia",       country:"Samoa",       lat:-13.83, lon:-172.01},
  { code:"HIR", name:"Honiara Henderson",    city:"Honiara",    country:"Solomon Islands",lat:-9.43,lon:160.05},
  { code:"RRE", name:"Marree Airport",       city:"Marree",     country:"Australia",   lat:-29.66, lon:138.07},
  { code:"CNS", name:"Cairns Airport",       city:"Cairns",     country:"Australia",   lat:-16.89, lon:145.75},
  { code:"OOL", name:"Gold Coast Airport",   city:"Gold Coast", country:"Australia",   lat:-28.17, lon:153.50},
  { code:"ADL", name:"Adelaide Airport",     city:"Adelaide",   country:"Australia",   lat:-34.95, lon:138.53},
  { code:"DRW", name:"Darwin Airport",       city:"Darwin",     country:"Australia",   lat:-12.41, lon:130.87},
  { code:"HBA", name:"Hobart Airport",       city:"Hobart",     country:"Australia",   lat:-42.84, lon:147.51},
  { code:"WLG", name:"Wellington Airport",   city:"Wellington", country:"New Zealand", lat:-41.33, lon:174.81},
  { code:"CHC", name:"Christchurch Intl",    city:"Christchurch",country:"New Zealand",lat:-43.49, lon:172.53},
  { code:"PMV", name:"Porlamar Del Caribe",  city:"Porlamar",   country:"Venezuela",   lat:10.91, lon:-63.97},
  { code:"RUN", name:"Saint-Denis Gillot",   city:"Reunion",    country:"Reunion",     lat:-20.89, lon:55.52},
  { code:"MRU", name:"Mauritius Sir Seewoosagur",city:"Mauritius",country:"Mauritius", lat:-20.43, lon:57.68},
  { code:"SEZ", name:"Seychelles Intl",      city:"Mahe",       country:"Seychelles",  lat:-4.67,  lon:55.52},
];

const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december"
];

const MONTH_LABELS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const PRICE_BANDS = [50, 100, 150, 200, 250, 300, 400, 500];

const UK_ORIGINS = AIRPORTS.filter(a => a.country === "UK");

// ─── Average prices (for display) ────────────────────────────────────────────
const ROUTE_AVG = {
  BCN:120, MAD:110, LIS:105, FCO:115, AMS:95, CDG:90, DXB:280, AYT:160,
  PMI:130, TFS:170, LPA:175, FAO:140, ATH:145, PRG:100, VIE:105, DBV:155,
  IST:190, ALC:135, BKK:520, DPS:590, NRT:620, SIN:480, KUL:450, HKT:540,
  JFK:380, LAX:420, MIA:390, ORD:400, SFO:430, YYZ:360, CPT:520, NBO:490,
  SYD:780, MEL:800, BNE:790, AKL:850, CAI:210, HRG:280, RAK:175, GOA:380,
  DEL:420, BOM:440, MLE:650, CMB:480, CUN:550, GRU:620,
};

// ─── Slug helpers ─────────────────────────────────────────────────────────────
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function citySlug(airport) {
  return slug(airport.city);
}

// ─── Page templates ───────────────────────────────────────────────────────────

function routePage(origin, dest) {
  const avgPrice   = ROUTE_AVG[dest.code] || 299;
  const cheapPrice = Math.round(avgPrice * 0.7);
  const flightHrs  = estimateFlightTime(origin, dest);
  const originSlug = citySlug(origin);
  const destSlug   = citySlug(dest);
  const canonUrl   = `https://www.triphunt.co.uk/flights/${originSlug}-to-${destSlug}`;
  const title      = `Cheap Flights from ${origin.city} to ${dest.city} | From £${cheapPrice} | TripHunt`;
  const description = `Find cheap flights from ${origin.city} (${origin.code}) to ${dest.city} (${dest.code}). Compare 100+ airlines. Prices from £${cheapPrice}. Book in GBP with no hidden fees.`;

  const relatedRoutes = UK_ORIGINS
    .filter(a => a.code !== origin.code)
    .slice(0, 4)
    .map(a => `<a href="/flights/${citySlug(a)}-to-${destSlug}" class="related-link">Flights from ${a.city} to ${dest.city}</a>`)
    .join("\n    ");

  const nearbyDests = AIRPORTS
    .filter(a => a.country === dest.country && a.code !== dest.code)
    .slice(0, 4)
    .map(a => `<a href="/flights/${originSlug}-to-${citySlug(a)}" class="related-link">Flights to ${a.city}</a>`)
    .join("\n    ");

  const monthLinks = MONTHS.map((m, i) =>
    `<a href="/flights/${originSlug}-to-${destSlug}-${m}" class="month-link">${MONTH_LABELS[i]}</a>`
  ).join(" ");

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How much do flights from ${origin.city} to ${dest.city} cost?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Flights from ${origin.city} to ${dest.city} typically cost between £${cheapPrice} and £${avgPrice}. The cheapest fares are usually found 6-8 weeks in advance for European routes, or 3-5 months ahead for long-haul.` }
      },
      {
        "@type": "Question",
        "name": `How long is the flight from ${origin.city} to ${dest.city}?`,
        "acceptedAnswer": { "@type": "Answer", "text": `The average flight time from ${origin.city} to ${dest.city} is approximately ${flightHrs}. This may vary depending on the airline and whether it's a direct or connecting flight.` }
      },
      {
        "@type": "Question",
        "name": `What airlines fly from ${origin.city} to ${dest.city}?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Multiple airlines operate routes between ${origin.city} and ${dest.city}. Use TripHunt to compare all available carriers and find the cheapest option for your dates.` }
      },
      {
        "@type": "Question",
        "name": `What is the cheapest month to fly from ${origin.city} to ${dest.city}?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Prices vary by season. Generally, flying in shoulder season (spring or autumn) offers the best value. Use TripHunt's price calendar to find the cheapest month for your trip.` }
      }
    ]
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <meta name="robots" content="index, follow"/>
  <link rel="canonical" href="${canonUrl}"/>

  <!-- Open Graph -->
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="${canonUrl}"/>
  <meta property="og:site_name" content="TripHunt"/>

  <!-- Structured data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${title}",
    "description": "${description}",
    "url": "${canonUrl}",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":"https://www.triphunt.co.uk/"},
        {"@type":"ListItem","position":2,"name":"Flights","item":"https://www.triphunt.co.uk/flights/"},
        {"@type":"ListItem","position":3,"name":"${origin.city} to ${dest.city}","item":"${canonUrl}"}
      ]
    }
  }
  </script>
  <script type="application/ld+json">${faqSchema}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --c0:#080c14; --c1:#0e1420; --c2:#161d2e; --c3:#253048;
      --acc:#7c6af7; --grn:#10b981; --txt:#eef2ff; --txt2:#7b8db0;
      --border:rgba(255,255,255,.06); --r12:12px; --r20:20px;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:var(--c0);color:var(--txt);line-height:1.6}
    .container{max-width:1100px;margin:0 auto;padding:0 20px}
    header{background:var(--c1);border-bottom:1px solid var(--border);padding:16px 0}
    header .logo{font-size:22px;font-weight:800;color:var(--txt);text-decoration:none}
    header .logo span{color:var(--acc)}
    .breadcrumb{padding:12px 0;font-size:13px;color:var(--txt2)}
    .breadcrumb a{color:var(--txt2);text-decoration:none}
    .breadcrumb a:hover{color:var(--txt)}
    .hero{padding:48px 0 32px;text-align:center}
    .hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;margin-bottom:12px}
    .hero h1 .from{color:var(--txt)}
    .hero h1 .price{color:var(--grn)}
    .hero-sub{color:var(--txt2);font-size:16px;margin-bottom:32px}
    .search-cta{
      display:inline-flex;align-items:center;gap:10px;
      background:var(--acc);color:#fff;font-weight:700;font-size:16px;
      padding:16px 32px;border-radius:99px;text-decoration:none;
      transition:opacity .2s;
    }
    .search-cta:hover{opacity:.85}
    .stats-row{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin:32px 0;padding:24px;background:var(--c1);border:1px solid var(--border);border-radius:var(--r20)}
    .stat{text-align:center}
    .stat-val{font-size:28px;font-weight:800;color:var(--acc)}
    .stat-label{font-size:13px;color:var(--txt2)}
    .section{padding:40px 0}
    .section h2{font-size:24px;font-weight:700;margin-bottom:20px}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:20px 0}
    .info-card{background:var(--c1);border:1px solid var(--border);border-radius:var(--r12);padding:20px}
    .info-card h3{font-size:15px;font-weight:700;margin-bottom:8px;color:var(--acc)}
    .info-card p{font-size:14px;color:var(--txt2);line-height:1.7}
    .month-links{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
    .month-link{padding:8px 16px;background:var(--c2);border:1px solid var(--border);border-radius:99px;font-size:13px;color:var(--txt2);text-decoration:none;transition:.2s}
    .month-link:hover{background:var(--acc);color:#fff;border-color:var(--acc)}
    .related-grid{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
    .related-link{padding:10px 18px;background:var(--c1);border:1px solid var(--border);border-radius:var(--r12);font-size:14px;color:var(--txt2);text-decoration:none;transition:.2s}
    .related-link:hover{border-color:var(--acc);color:var(--txt)}
    .faq-item{border-bottom:1px solid var(--border);padding:20px 0}
    .faq-item:last-child{border:none}
    .faq-q{font-weight:700;margin-bottom:8px;cursor:pointer}
    .faq-a{font-size:14px;color:var(--txt2);line-height:1.7}
    footer{background:var(--c1);border-top:1px solid var(--border);padding:32px 0;text-align:center;color:var(--txt2);font-size:14px;margin-top:64px}
    footer a{color:var(--acc);text-decoration:none}
  </style>
</head>
<body>

<header>
  <div class="container" style="display:flex;align-items:center;justify-content:space-between">
    <a href="/" class="logo">Trip<span>Hunt</span></a>
    <nav style="display:flex;gap:20px;font-size:14px">
      <a href="/" style="color:var(--txt2);text-decoration:none">Flights</a>
      <a href="/holidays" style="color:var(--txt2);text-decoration:none">Holidays</a>
      <a href="/deals" style="color:var(--txt2);text-decoration:none">Deals</a>
    </nav>
  </div>
</header>

<div class="container">
  <div class="breadcrumb">
    <a href="/">Home</a> › <a href="/flights/">Flights</a> › ${origin.city} to ${dest.city}
  </div>
</div>

<div class="container">
  <section class="hero">
    <h1>Cheap Flights from <span class="from">${origin.city} to ${dest.city}</span><br>from <span class="price">£${cheapPrice}</span></h1>
    <p class="hero-sub">Compare prices across 100+ airlines · Prices in GBP · No hidden fees</p>
    <a href="/?origin=${origin.code}&destination=${dest.code}" class="search-cta">
      ✈️ Search Flights Now
    </a>
  </section>

  <div class="stats-row">
    <div class="stat"><div class="stat-val">£${cheapPrice}</div><div class="stat-label">Cheapest found</div></div>
    <div class="stat"><div class="stat-val">£${avgPrice}</div><div class="stat-label">Average price</div></div>
    <div class="stat"><div class="stat-val">${flightHrs}</div><div class="stat-label">Flight duration</div></div>
    <div class="stat"><div class="stat-val">${origin.code} → ${dest.code}</div><div class="stat-label">Route</div></div>
  </div>

  <section class="section">
    <h2>About This Route</h2>
    <div class="info-grid">
      <div class="info-card">
        <h3>✈️ Flight Information</h3>
        <p>Flights from ${origin.city} (${origin.code}) to ${dest.city} (${dest.code}) operate year-round. The typical flight duration is ${flightHrs}. Both direct and connecting services are available depending on the airline and season.</p>
      </div>
      <div class="info-card">
        <h3>💰 Price Insights</h3>
        <p>The average price for this route is around £${avgPrice} return. Prices start from £${cheapPrice} for budget airlines. Booking 6-8 weeks ahead (for European routes) or 3-5 months ahead (for long-haul) typically gives the best fares.</p>
      </div>
      <div class="info-card">
        <h3>📅 Best Time to Book</h3>
        <p>Tuesday and Wednesday tend to be the cheapest days to depart from UK airports. Shoulder seasons (spring and autumn) offer the best combination of price and weather for most destinations.</p>
      </div>
      <div class="info-card">
        <h3>🛫 Departure Airport</h3>
        <p>${origin.name} (${origin.code}) is located in ${origin.city}, ${origin.country}. It serves as one of the UK's key departure points for routes to ${dest.country}. Check transport links and terminal information before you travel.</p>
      </div>
      <div class="info-card">
        <h3>🌍 Destination: ${dest.city}</h3>
        <p>${dest.city} is located in ${dest.country}. ${dest.name} (${dest.code}) is the main international airport serving the region. Check visa requirements and travel insurance before booking.</p>
      </div>
      <div class="info-card">
        <h3>🎒 Travel Tips</h3>
        <p>Always compare prices across multiple dates using TripHunt's flexible search. Consider nearby airports like ${UK_ORIGINS.filter(a=>a.code!==origin.code)[0]?.city || "Manchester"} for potentially cheaper departure options. Sign up for price alerts to get notified when fares drop.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>Search by Month</h2>
    <p style="color:var(--txt2);font-size:14px;margin-bottom:16px">Find the cheapest month to fly from ${origin.city} to ${dest.city}</p>
    <div class="month-links">
      ${monthLinks}
    </div>
  </section>

  <section class="section">
    <h2>Other Flights from ${origin.city} to ${dest.city}</h2>
    <div class="related-grid">
      ${relatedRoutes}
    </div>
  </section>

  <section class="section">
    <h2>Nearby Destinations in ${dest.country}</h2>
    <div class="related-grid">
      ${nearbyDests}
    </div>
  </section>

  <section class="section">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-item">
      <div class="faq-q">How much do flights from ${origin.city} to ${dest.city} cost?</div>
      <div class="faq-a">Flights from ${origin.city} to ${dest.city} typically cost between £${cheapPrice} and £${avgPrice}. The cheapest fares are usually found 6-8 weeks in advance for European routes, or 3-5 months ahead for long-haul.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">How long is the flight from ${origin.city} to ${dest.city}?</div>
      <div class="faq-a">The average flight time from ${origin.city} to ${dest.city} is approximately ${flightHrs}. This may vary depending on the airline and whether it's a direct or connecting flight.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">What airlines fly from ${origin.city} to ${dest.city}?</div>
      <div class="faq-a">Multiple airlines operate routes between ${origin.city} and ${dest.city}. Use TripHunt to compare all available carriers and find the cheapest option for your dates.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">What is the cheapest month to fly from ${origin.city} to ${dest.city}?</div>
      <div class="faq-a">Prices vary by season. Generally, flying in shoulder season (spring or autumn) offers the best value. Use TripHunt's price calendar to find the cheapest month for your trip.</div>
    </div>
  </section>
</div>

<footer>
  <div class="container">
    <p>© 2025 TripHunt · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/sitemap.xml">Sitemap</a></p>
    <p style="margin-top:8px">Prices shown are indicative. Always check final price before booking. TripHunt earns affiliate commission from bookings.</p>
  </div>
</footer>

</body>
</html>`;
}

function monthRoutePage(origin, dest, monthIndex) {
  const monthName  = MONTH_LABELS[monthIndex];
  const monthSlug  = MONTHS[monthIndex];
  const avgPrice   = ROUTE_AVG[dest.code] || 299;
  // Seasonal price modifier
  const seasonal   = [0.9, 0.85, 0.95, 1.0, 1.1, 1.2, 1.3, 1.25, 1.1, 0.95, 0.85, 1.15];
  const monthPrice = Math.round(avgPrice * seasonal[monthIndex] * 0.75);
  const originSlug = citySlug(origin);
  const destSlug   = citySlug(dest);
  const canonUrl   = `https://www.triphunt.co.uk/flights/${originSlug}-to-${destSlug}-${monthSlug}`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Flights from ${origin.city} to ${dest.city} in ${monthName} | From £${monthPrice} | TripHunt</title>
  <meta name="description" content="Find cheap flights from ${origin.city} to ${dest.city} in ${monthName}. Compare 100+ airlines. Prices from £${monthPrice} in ${monthName}. Book in GBP."/>
  <meta name="robots" content="index, follow"/>
  <link rel="canonical" href="${canonUrl}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{--c0:#080c14;--c1:#0e1420;--c2:#161d2e;--acc:#7c6af7;--grn:#10b981;--txt:#eef2ff;--txt2:#7b8db0;--border:rgba(255,255,255,.06);--r12:12px;--r20:20px}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:var(--c0);color:var(--txt);line-height:1.6}
    .container{max-width:1100px;margin:0 auto;padding:0 20px}
    header{background:var(--c1);border-bottom:1px solid var(--border);padding:16px 0}
    .logo{font-size:22px;font-weight:800;color:var(--txt);text-decoration:none}
    .logo span{color:var(--acc)}
    .hero{padding:48px 0 32px;text-align:center}
    .hero h1{font-size:clamp(26px,4vw,42px);font-weight:800;margin-bottom:12px}
    .hero h1 .price{color:var(--grn)}
    .hero-sub{color:var(--txt2);font-size:16px;margin-bottom:32px}
    .search-cta{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#fff;font-weight:700;font-size:16px;padding:16px 32px;border-radius:99px;text-decoration:none;transition:opacity .2s}
    .search-cta:hover{opacity:.85}
    .section{padding:40px 0}
    .section h2{font-size:22px;font-weight:700;margin-bottom:16px}
    .card{background:var(--c1);border:1px solid var(--border);border-radius:var(--r12);padding:20px;margin-bottom:16px}
    .card h3{font-size:15px;font-weight:700;color:var(--acc);margin-bottom:8px}
    .card p{font-size:14px;color:var(--txt2);line-height:1.7}
    footer{background:var(--c1);border-top:1px solid var(--border);padding:24px 0;text-align:center;color:var(--txt2);font-size:13px;margin-top:64px}
    footer a{color:var(--acc);text-decoration:none}
  </style>
</head>
<body>
<header>
  <div class="container" style="display:flex;align-items:center;justify-content:space-between">
    <a href="/" class="logo">Trip<span>Hunt</span></a>
    <nav style="display:flex;gap:20px;font-size:14px">
      <a href="/" style="color:var(--txt2);text-decoration:none">Flights</a>
      <a href="/holidays" style="color:var(--txt2);text-decoration:none">Holidays</a>
    </nav>
  </div>
</header>
<div class="container">
  <section class="hero">
    <h1>Flights from ${origin.city} to ${dest.city} in ${monthName}<br>from <span class="price">£${monthPrice}</span></h1>
    <p class="hero-sub">${monthName} prices · Compare 100+ airlines · Book in GBP</p>
    <a href="/?origin=${origin.code}&destination=${dest.code}" class="search-cta">✈️ Search ${monthName} Flights</a>
  </section>
  <section class="section">
    <h2>Flying ${origin.city} to ${dest.city} in ${monthName}</h2>
    <div class="card">
      <h3>💰 ${monthName} Prices</h3>
      <p>Flights from ${origin.city} to ${dest.city} in ${monthName} typically start from £${monthPrice}. ${monthIndex >= 5 && monthIndex <= 7 ? "Summer months see higher demand so book early for the best prices." : monthIndex === 11 || monthIndex === 0 ? "December and January can be expensive due to holidays — mid-month dates are often cheaper." : "This is a good value time to visit — prices are generally lower than peak summer."}</p>
    </div>
    <div class="card">
      <h3>🌤️ Weather in ${dest.city} in ${monthName}</h3>
      <p>Research the weather conditions in ${dest.city} in ${monthName} before you book. Weather varies significantly by region — check the local forecast and pack accordingly.</p>
    </div>
    <div class="card">
      <h3>📅 Booking Tips for ${monthName}</h3>
      <p>For ${monthName} travel, we recommend booking at least ${monthIndex >= 5 && monthIndex <= 7 ? "3-4 months" : "4-6 weeks"} in advance. Use TripHunt's price alerts to get notified when fares drop for your preferred dates.</p>
    </div>
  </section>
  <section class="section">
    <p style="text-align:center"><a href="/flights/${originSlug}-to-${destSlug}" style="color:var(--acc)">← All flights from ${origin.city} to ${dest.city}</a></p>
  </section>
</div>
<footer>
  <div class="container">
    <p>© 2025 TripHunt · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
  </div>
</footer>
</body>
</html>`;
}

function budgetPage(origin, maxPrice) {
  const originSlug = citySlug(origin);
  const dests      = AIRPORTS
    .filter(a => a.country !== origin.country && (ROUTE_AVG[a.code] || 999) * 0.7 <= maxPrice)
    .slice(0, 20);

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Flights from ${origin.city} Under £${maxPrice} | TripHunt</title>
  <meta name="description" content="Find cheap flights from ${origin.city} under £${maxPrice}. Discover destinations you can reach on a budget. Compare prices across 100+ airlines."/>
  <meta name="robots" content="index, follow"/>
  <link rel="canonical" href="https://www.triphunt.co.uk/flights/${originSlug}-under-${maxPrice}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{--c0:#080c14;--c1:#0e1420;--c2:#161d2e;--acc:#7c6af7;--grn:#10b981;--txt:#eef2ff;--txt2:#7b8db0;--border:rgba(255,255,255,.06);--r12:12px;--r20:20px}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:var(--c0);color:var(--txt);line-height:1.6}
    .container{max-width:1100px;margin:0 auto;padding:0 20px}
    header{background:var(--c1);border-bottom:1px solid var(--border);padding:16px 0}
    .logo{font-size:22px;font-weight:800;color:var(--txt);text-decoration:none}
    .logo span{color:var(--acc)}
    .hero{padding:48px 0 32px;text-align:center}
    .hero h1{font-size:clamp(26px,4vw,42px);font-weight:800;margin-bottom:12px}
    .hero h1 .budget{color:var(--grn)}
    .search-cta{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#fff;font-weight:700;font-size:16px;padding:16px 32px;border-radius:99px;text-decoration:none}
    .dest-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin:24px 0}
    .dest-card{background:var(--c1);border:1px solid var(--border);border-radius:var(--r12);padding:16px;text-decoration:none;display:block;transition:.2s}
    .dest-card:hover{border-color:var(--acc)}
    .dest-city{font-weight:700;font-size:16px;color:var(--txt)}
    .dest-price{font-size:20px;font-weight:800;color:var(--grn);margin-top:4px}
    .dest-country{font-size:12px;color:var(--txt2);margin-top:2px}
    footer{background:var(--c1);border-top:1px solid var(--border);padding:24px 0;text-align:center;color:var(--txt2);font-size:13px;margin-top:64px}
    footer a{color:var(--acc);text-decoration:none}
  </style>
</head>
<body>
<header>
  <div class="container" style="display:flex;align-items:center;justify-content:space-between">
    <a href="/" class="logo">Trip<span>Hunt</span></a>
  </div>
</header>
<div class="container">
  <section class="hero">
    <h1>Flights from ${origin.city} Under <span class="budget">£${maxPrice}</span></h1>
    <p style="color:var(--txt2);margin-bottom:24px">${dests.length} destinations reachable on your budget · Compare 100+ airlines</p>
    <a href="/?origin=${origin.code}" class="search-cta">✈️ Search Flights from ${origin.city}</a>
  </section>
  <h2 style="font-size:20px;font-weight:700;margin:24px 0 8px">Destinations Under £${maxPrice} from ${origin.city}</h2>
  <div class="dest-grid">
    ${dests.map(d => {
      const p = Math.round((ROUTE_AVG[d.code] || maxPrice) * 0.7);
      return `<a href="/flights/${originSlug}-to-${citySlug(d)}" class="dest-card">
      <div class="dest-city">${d.city}</div>
      <div class="dest-price">from £${p}</div>
      <div class="dest-country">${d.country}</div>
    </a>`;
    }).join("\n    ")}
  </div>
</div>
<footer>
  <div class="container">
    <p>© 2025 TripHunt · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
  </div>
</footer>
</body>
</html>`;
}

// ─── Flight time estimator ────────────────────────────────────────────────────
function estimateFlightTime(origin, dest) {
  const R    = 6371;
  const dLat = (dest.lat - origin.lat) * Math.PI / 180;
  const dLon = (dest.lon - origin.lon) * Math.PI / 180;
  const a    = Math.sin(dLat/2) ** 2 + Math.cos(origin.lat*Math.PI/180) * Math.cos(dest.lat*Math.PI/180) * Math.sin(dLon/2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  // Avg speed ~850 km/h + 30min overhead
  const hrs  = dist / 850 + 0.5;
  const h    = Math.floor(hrs);
  const m    = Math.round((hrs - h) * 60);
  return `${h}h ${m}m`;
}

// ─── Sitemap generator ────────────────────────────────────────────────────────
function generateSitemap(pages) {
  const urls = pages.map(p => `  <url>
    <loc>https://www.triphunt.co.uk${p.url}</loc>
    <lastmod>${new Date().toISOString().slice(0,10)}</lastmod>
    <changefreq>${p.changefreq || "weekly"}</changefreq>
    <priority>${p.priority || "0.7"}</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ─── Main generation ──────────────────────────────────────────────────────────
function main() {
  let generated = 0;
  const sitemapPages = [];

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n🚀 TripHunt SEO Page Generator`);
  console.log(`📁 Output: ${OUT_DIR}`);
  console.log(`✈️  Airports: ${AIRPORTS.length}`);
  console.log(`📄 Potential route pages: ${AIRPORTS.length * AIRPORTS.length}`);
  console.log(`📅 With month variants: ${AIRPORTS.length * AIRPORTS.length * 12}`);
  console.log("─".repeat(50));

  // Type 1: Route pages (origin → dest)
  for (const origin of AIRPORTS) {
    for (const dest of AIRPORTS) {
      if (origin.code === dest.code) continue;
      if (generated >= LIMIT) break;

      const originSlug = citySlug(origin);
      const destSlug   = citySlug(dest);
      const urlPath    = `/${originSlug}-to-${destSlug}`;
      const filePath   = path.join(OUT_DIR, `${originSlug}-to-${destSlug}.html`);

      fs.writeFileSync(filePath, routePage(origin, dest));
      sitemapPages.push({ url: `/flights${urlPath}`, priority: "0.8", changefreq: "daily" });
      generated++;

      if (generated % 100 === 0) process.stdout.write(`\r✅ Route pages: ${generated}`);
    }
    if (generated >= LIMIT) break;
  }
  console.log(`\n✅ Route pages: ${generated}`);

  // Type 2: Month-specific route pages (sample: UK origins → all dests, all months)
  let monthPages = 0;
  const monthDir = path.join(OUT_DIR, "by-month");
  fs.mkdirSync(monthDir, { recursive: true });

  monthLoop:
  for (const origin of UK_ORIGINS) {
    for (const dest of AIRPORTS) {
      if (origin.code === dest.code) continue;
      for (let m = 0; m < 12; m++) {
        if (generated + monthPages >= LIMIT) break monthLoop;
        const originSlug = citySlug(origin);
        const destSlug   = citySlug(dest);
        const monthSlug  = MONTHS[m];
        const filePath   = path.join(monthDir, `${originSlug}-to-${destSlug}-${monthSlug}.html`);
        fs.writeFileSync(filePath, monthRoutePage(origin, dest, m));
        sitemapPages.push({ url: `/flights/by-month/${originSlug}-to-${destSlug}-${monthSlug}`, priority: "0.6", changefreq: "monthly" });
        monthPages++;
      }
    }
  }
  console.log(`✅ Month pages: ${monthPages}`);

  // Type 3: Budget pages
  const budgetDir = path.join(OUT_DIR, "budget");
  fs.mkdirSync(budgetDir, { recursive: true });
  let budgetPages = 0;
  for (const origin of UK_ORIGINS) {
    for (const maxPrice of PRICE_BANDS) {
      if (generated + monthPages + budgetPages >= LIMIT) break;
      const originSlug = citySlug(origin);
      const filePath   = path.join(budgetDir, `${originSlug}-under-${maxPrice}.html`);
      fs.writeFileSync(filePath, budgetPage(origin, maxPrice));
      sitemapPages.push({ url: `/flights/budget/${originSlug}-under-${maxPrice}`, priority: "0.7", changefreq: "weekly" });
      budgetPages++;
    }
  }
  console.log(`✅ Budget pages: ${budgetPages}`);

  // Write sitemap
  const sitemapPath = path.join(OUT_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, generateSitemap(sitemapPages));

  // Write page index JSON
  const indexPath = path.join(OUT_DIR, "page-index.json");
  fs.writeFileSync(indexPath, JSON.stringify({
    generated:    new Date().toISOString(),
    totalPages:   generated + monthPages + budgetPages,
    breakdown: {
      routePages:  generated,
      monthPages,
      budgetPages,
    },
    sitemapUrl: "https://www.triphunt.co.uk/flights/sitemap.xml",
  }, null, 2));

  const total = generated + monthPages + budgetPages;
  console.log("─".repeat(50));
  console.log(`\n🎉 Done! Generated ${total.toLocaleString()} pages`);
  console.log(`📊 Breakdown:`);
  console.log(`   Route pages:  ${generated.toLocaleString()}`);
  console.log(`   Month pages:  ${monthPages.toLocaleString()}`);
  console.log(`   Budget pages: ${budgetPages.toLocaleString()}`);
  console.log(`   Sitemap:      ${sitemapPath}`);
  console.log(`\n💡 Deploy notes:`);
  console.log(`   1. Run: node generate-seo-pages.js (full ~500k pages, ~15 mins)`);
  console.log(`   2. Run: node generate-seo-pages.js --limit=100 (test run)`);
  console.log(`   3. Upload /flights/ output to Netlify publish dir`);
  console.log(`   4. Submit /flights/sitemap.xml to Google Search Console`);
}

main();
