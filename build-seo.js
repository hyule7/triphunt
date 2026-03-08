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
const SEO_OUT       = path.resolve(__dirname, "seo-pages");
const SITE_URL      = "https://www.triphunt.org";
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
  { code:"SEZ", name:"Seychelles International Airport", city:"Mahe",          country:"Seychelles",     lat:-4.67,  lon:55.52  },
  { code:"ACE", name:"Lanzarote Airport",            city:"Lanzarote",     country:"Spain",           lat:28.95,  lon:-13.61 },
  { code:"FUE", name:"Fuerteventura Airport",        city:"Fuerteventura", country:"Spain",           lat:28.45,  lon:-13.86 },
  { code:"GRX", name:"Granada Airport",              city:"Granada",       country:"Spain",           lat:37.19,  lon:-3.79  },
  { code:"MAH", name:"Menorca Airport",              city:"Menorca",       country:"Spain",           lat:39.86,  lon:4.22   },
  { code:"ORY", name:"Paris Orly Airport",           city:"Paris",         country:"France",          lat:48.72,  lon:2.36   },
  { code:"NCE", name:"Nice Cote d'Azur Airport",     city:"Nice",          country:"France",          lat:43.66,  lon:7.22   },
  { code:"MRS", name:"Marseille Provence Airport",   city:"Marseille",     country:"France",          lat:43.44,  lon:5.21   },
  { code:"LYS", name:"Lyon Saint-Exupery Airport",   city:"Lyon",          country:"France",          lat:45.73,  lon:5.09   },
  { code:"BOD", name:"Bordeaux Merignac Airport",    city:"Bordeaux",      country:"France",          lat:44.83,  lon:-0.72  },
  { code:"TLS", name:"Toulouse Blagnac Airport",     city:"Toulouse",      country:"France",          lat:43.63,  lon:1.37   },
  { code:"NTE", name:"Nantes Atlantique Airport",    city:"Nantes",        country:"France",          lat:47.15,  lon:-1.61  },
  { code:"CIA", name:"Rome Ciampino Airport",        city:"Rome",          country:"Italy",           lat:41.80,  lon:12.59  },
  { code:"BGY", name:"Milan Bergamo Airport",        city:"Milan",         country:"Italy",           lat:45.67,  lon:9.70   },
  { code:"NAP", name:"Naples International Airport", city:"Naples",        country:"Italy",           lat:40.89,  lon:14.29  },
  { code:"VCE", name:"Venice Marco Polo Airport",    city:"Venice",        country:"Italy",           lat:45.51,  lon:12.35  },
  { code:"CTA", name:"Catania Fontanarossa Airport", city:"Catania",       country:"Italy",           lat:37.47,  lon:15.07  },
  { code:"PMO", name:"Palermo Falcone Airport",      city:"Palermo",       country:"Italy",           lat:38.18,  lon:13.10  },
  { code:"BLQ", name:"Bologna Marconi Airport",      city:"Bologna",       country:"Italy",           lat:44.53,  lon:11.29  },
  { code:"FLR", name:"Florence Peretola Airport",    city:"Florence",      country:"Italy",           lat:43.81,  lon:11.20  },
  { code:"OPO", name:"Porto Francisco Sa Airport",   city:"Porto",         country:"Portugal",        lat:41.24,  lon:-8.68  },
  { code:"FNC", name:"Madeira Airport",              city:"Madeira",       country:"Portugal",        lat:32.70,  lon:-16.78 },
  { code:"CFU", name:"Corfu Ioannis Kapodistrias",   city:"Corfu",         country:"Greece",          lat:39.60,  lon:19.91  },
  { code:"KGS", name:"Kos Island International",     city:"Kos",           country:"Greece",          lat:36.79,  lon:27.09  },
  { code:"ZTH", name:"Zakynthos International",      city:"Zakynthos",     country:"Greece",          lat:37.75,  lon:20.88  },
  { code:"JMK", name:"Mykonos Island Airport",       city:"Mykonos",       country:"Greece",          lat:37.44,  lon:25.35  },
  { code:"JTR", name:"Santorini Thira Airport",      city:"Santorini",     country:"Greece",          lat:36.40,  lon:25.48  },
  { code:"CHQ", name:"Chania International Airport", city:"Chania",        country:"Greece",          lat:35.53,  lon:24.15  },
  { code:"HAM", name:"Hamburg Airport",              city:"Hamburg",       country:"Germany",         lat:53.63,  lon:10.01  },
  { code:"DUS", name:"Dusseldorf Airport",           city:"Dusseldorf",    country:"Germany",         lat:51.29,  lon:6.77   },
  { code:"CGN", name:"Cologne Bonn Airport",         city:"Cologne",       country:"Germany",         lat:50.87,  lon:7.14   },
  { code:"STR", name:"Stuttgart Airport",            city:"Stuttgart",     country:"Germany",         lat:48.69,  lon:9.22   },
  { code:"EIN", name:"Eindhoven Airport",            city:"Eindhoven",     country:"Netherlands",     lat:51.45,  lon:5.37   },
  { code:"BRU", name:"Brussels Airport",             city:"Brussels",      country:"Belgium",         lat:50.90,  lon:4.48   },
  { code:"BGO", name:"Bergen Airport",               city:"Bergen",        country:"Norway",          lat:60.29,  lon:5.22   },
  { code:"GOT", name:"Gothenburg Landvetter Airport",city:"Gothenburg",    country:"Sweden",          lat:57.67,  lon:12.29  },
  { code:"BLL", name:"Billund Airport",              city:"Billund",       country:"Denmark",         lat:55.74,  lon:9.15   },
  { code:"RVN", name:"Rovaniemi Airport",            city:"Rovaniemi",     country:"Finland",         lat:66.56,  lon:25.83  },
  { code:"GDN", name:"Gdansk Lech Walesa Airport",   city:"Gdansk",        country:"Poland",          lat:54.38,  lon:18.47  },
  { code:"WRO", name:"Wroclaw Airport",              city:"Wroclaw",       country:"Poland",          lat:51.10,  lon:16.89  },
  { code:"CLJ", name:"Cluj-Napoca Airport",          city:"Cluj-Napoca",   country:"Romania",         lat:46.79,  lon:23.69  },
  { code:"VAR", name:"Varna Airport",                city:"Varna",         country:"Bulgaria",        lat:43.23,  lon:27.82  },
  { code:"RIX", name:"Riga International Airport",   city:"Riga",          country:"Latvia",          lat:56.92,  lon:23.97  },
  { code:"TLL", name:"Tallinn Airport",              city:"Tallinn",       country:"Estonia",         lat:59.41,  lon:24.83  },
  { code:"VNO", name:"Vilnius Airport",              city:"Vilnius",       country:"Lithuania",       lat:54.63,  lon:25.28  },
  { code:"LJU", name:"Ljubljana Airport",            city:"Ljubljana",     country:"Slovenia",        lat:46.22,  lon:14.45  },
  { code:"TIA", name:"Tirana International Airport", city:"Tirana",        country:"Albania",         lat:41.41,  lon:19.72  },
  { code:"PUY", name:"Pula Airport",                 city:"Pula",          country:"Croatia",         lat:44.89,  lon:13.92  },
  { code:"ZAD", name:"Zadar Airport",                city:"Zadar",         country:"Croatia",         lat:44.11,  lon:15.35  },
  { code:"SAW", name:"Istanbul Sabiha Gokcen",       city:"Istanbul",      country:"Turkey",          lat:40.90,  lon:29.31  },
  { code:"ADB", name:"Izmir Adnan Menderes Airport", city:"Izmir",         country:"Turkey",          lat:38.29,  lon:27.16  },
  { code:"AGA", name:"Agadir Al Massira Airport",    city:"Agadir",        country:"Morocco",         lat:30.32,  lon:-9.41  },
  { code:"LXR", name:"Luxor International Airport",  city:"Luxor",         country:"Egypt",           lat:25.67,  lon:32.71  },
  { code:"TUN", name:"Tunis Carthage Airport",       city:"Tunis",         country:"Tunisia",         lat:36.85,  lon:10.23  },
  { code:"AUH", name:"Abu Dhabi International",      city:"Abu Dhabi",     country:"UAE",             lat:24.43,  lon:54.65  },
  { code:"BAH", name:"Bahrain International Airport",city:"Manama",        country:"Bahrain",         lat:26.27,  lon:50.64  },
  { code:"MCT", name:"Muscat International Airport", city:"Muscat",        country:"Oman",            lat:23.59,  lon:58.28  },
  { code:"AMM", name:"Amman Queen Alia Airport",     city:"Amman",         country:"Jordan",          lat:31.72,  lon:35.99  },
  { code:"RUH", name:"Riyadh King Khalid Airport",   city:"Riyadh",        country:"Saudi Arabia",    lat:24.96,  lon:46.70  },
  { code:"JED", name:"Jeddah King Abdulaziz Airport",city:"Jeddah",        country:"Saudi Arabia",    lat:21.68,  lon:39.16  },
  { code:"ABJ", name:"Abidjan Felix Houphouet",      city:"Abidjan",       country:"Ivory Coast",     lat:5.26,   lon:-3.93  },
  { code:"ACC", name:"Accra Kotoka Airport",         city:"Accra",         country:"Ghana",           lat:5.61,   lon:-0.17  },
  { code:"LOS", name:"Lagos Murtala Mohammed",       city:"Lagos",         country:"Nigeria",         lat:6.58,   lon:3.32   },
  { code:"DAR", name:"Dar es Salaam Airport",        city:"Dar es Salaam", country:"Tanzania",        lat:-6.88,  lon:39.20  },
  { code:"ADD", name:"Addis Ababa Bole Airport",     city:"Addis Ababa",   country:"Ethiopia",        lat:8.98,   lon:38.80  },
  { code:"COK", name:"Kochi International Airport",  city:"Kochi",         country:"India",           lat:10.15,  lon:76.40  },
  { code:"BLR", name:"Bengaluru Kempegowda Airport", city:"Bengaluru",     country:"India",           lat:13.20,  lon:77.71  },
  { code:"HYD", name:"Hyderabad Rajiv Gandhi Airport",city:"Hyderabad",    country:"India",           lat:17.23,  lon:78.43  },
  { code:"MAA", name:"Chennai International Airport",city:"Chennai",       country:"India",           lat:12.99,  lon:80.18  },
  { code:"CNX", name:"Chiang Mai International",     city:"Chiang Mai",    country:"Thailand",        lat:18.77,  lon:98.96  },
  { code:"DMK", name:"Bangkok Don Mueang Airport",   city:"Bangkok",       country:"Thailand",        lat:13.91,  lon:100.61 },
  { code:"CGK", name:"Jakarta Soekarno Hatta",       city:"Jakarta",       country:"Indonesia",       lat:-6.13,  lon:106.65 },
  { code:"HAN", name:"Hanoi Noi Bai Airport",        city:"Hanoi",         country:"Vietnam",         lat:21.22,  lon:105.81 },
  { code:"SGN", name:"Ho Chi Minh City Airport",     city:"Ho Chi Minh City",country:"Vietnam",       lat:10.82,  lon:106.66 },
  { code:"DAD", name:"Da Nang International Airport",city:"Da Nang",       country:"Vietnam",         lat:16.04,  lon:108.20 },
  { code:"MNL", name:"Manila Ninoy Aquino Airport",  city:"Manila",        country:"Philippines",     lat:14.52,  lon:121.02 },
  { code:"HND", name:"Tokyo Haneda Airport",         city:"Tokyo",         country:"Japan",           lat:35.55,  lon:139.78 },
  { code:"KIX", name:"Osaka Kansai Airport",         city:"Osaka",         country:"Japan",           lat:34.43,  lon:135.24 },
  { code:"ICN", name:"Seoul Incheon Airport",        city:"Seoul",         country:"South Korea",     lat:37.46,  lon:126.44 },
  { code:"HKG", name:"Hong Kong International",      city:"Hong Kong",     country:"Hong Kong",       lat:22.31,  lon:113.91 },
  { code:"PEK", name:"Beijing Capital Airport",      city:"Beijing",       country:"China",           lat:40.08,  lon:116.60 },
  { code:"PVG", name:"Shanghai Pudong Airport",      city:"Shanghai",      country:"China",           lat:31.14,  lon:121.80 },
  { code:"TPE", name:"Taipei Taoyuan Airport",       city:"Taipei",        country:"Taiwan",          lat:25.08,  lon:121.23 },
  { code:"KTM", name:"Kathmandu Tribhuvan Airport",  city:"Kathmandu",     country:"Nepal",           lat:27.70,  lon:85.36  },
  { code:"EWR", name:"New York Newark Airport",      city:"New York",      country:"USA",             lat:40.69,  lon:-74.17 },
  { code:"BOS", name:"Boston Logan Airport",         city:"Boston",        country:"USA",             lat:42.37,  lon:-71.00 },
  { code:"LAS", name:"Las Vegas Harry Reid Airport", city:"Las Vegas",     country:"USA",             lat:36.08,  lon:-115.15},
  { code:"MCO", name:"Orlando International Airport",city:"Orlando",       country:"USA",             lat:28.43,  lon:-81.31 },
  { code:"SEA", name:"Seattle Tacoma Airport",       city:"Seattle",       country:"USA",             lat:47.45,  lon:-122.31},
  { code:"ATL", name:"Atlanta Hartsfield Airport",   city:"Atlanta",       country:"USA",             lat:33.64,  lon:-84.43 },
  { code:"YUL", name:"Montreal Pierre Trudeau Airport",city:"Montreal",    country:"Canada",          lat:45.47,  lon:-73.74 },
  { code:"GIG", name:"Rio de Janeiro Galeao Airport",city:"Rio de Janeiro",country:"Brazil",          lat:-22.81, lon:-43.25 },
  { code:"EZE", name:"Buenos Aires Ezeiza Airport",  city:"Buenos Aires",  country:"Argentina",       lat:-34.82, lon:-58.54 },
  { code:"SCL", name:"Santiago Arturo Merino Airport",city:"Santiago",     country:"Chile",           lat:-33.39, lon:-70.79 },
  { code:"BOG", name:"Bogota El Dorado Airport",     city:"Bogota",        country:"Colombia",        lat:4.70,   lon:-74.15 },
  { code:"LIM", name:"Lima Jorge Chavez Airport",    city:"Lima",          country:"Peru",            lat:-12.02, lon:-77.11 },
  { code:"MBJ", name:"Montego Bay Sangster Airport", city:"Montego Bay",   country:"Jamaica",         lat:18.50,  lon:-77.91 },
  { code:"BGI", name:"Bridgetown Grantley Adams",    city:"Bridgetown",    country:"Barbados",        lat:13.07,  lon:-59.49 },
  { code:"PUJ", name:"Punta Cana International",     city:"Punta Cana",    country:"Dominican Republic",lat:18.57,lon:-68.36},
  { code:"NAS", name:"Nassau Lynden Pindling Airport",city:"Nassau",       country:"Bahamas",         lat:25.04,  lon:-77.47 },
  { code:"BNE", name:"Brisbane Airport",             city:"Brisbane",      country:"Australia",       lat:-27.38, lon:153.12 },
  { code:"PER", name:"Perth Airport",                city:"Perth",         country:"Australia",       lat:-31.94, lon:115.97 },
  { code:"ADL", name:"Adelaide Airport",             city:"Adelaide",      country:"Australia",       lat:-34.95, lon:138.53 },
  { code:"CHC", name:"Christchurch International",   city:"Christchurch",  country:"New Zealand",     lat:-43.49, lon:172.53 },
  { code:"PPT", name:"Papeete Faaa Airport",         city:"Tahiti",        country:"French Polynesia",lat:-17.55, lon:-149.61},
  { code:"NAN", name:"Nadi International Airport",   city:"Nadi",          country:"Fiji",            lat:-17.76, lon:177.44 },
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
  ACE:165,FUE:170,GRX:145,MAH:135,ORY:88,MRS:110,LYS:115,BOD:110,TLS:108,
  NTE:105,CIA:110,BGY:108,NAP:125,VCE:120,CTA:130,PMO:128,BLQ:118,FLR:122,
  OPO:112,FNC:160,CFU:145,KGS:148,ZTH:145,JMK:165,JTR:165,CHQ:140,
  HAM:108,DUS:112,CGN:108,STR:110,EIN:88,BGO:128,GOT:120,BLL:115,
  RVN:145,GDN:92,WRO:93,CLJ:110,VAR:130,RIX:110,TLL:112,VNO:108,LJU:118,
  TIA:120,PUY:148,ZAD:145,SAW:185,ADB:162,AGA:170,LXR:275,TUN:190,
  AUH:275,BAH:290,MCT:300,AMM:265,RUH:340,JED:330,ABJ:520,ACC:510,LOS:530,
  DAR:480,ADD:490,COK:450,BLR:440,HYD:445,MAA:448,CNX:530,DMK:510,CGK:580,
  HAN:540,SGN:550,DAD:545,MNL:560,HND:615,PEK:580,PVG:575,TPE:570,KTM:520,
  EWR:375,BOS:370,LAS:450,MCO:420,SEA:440,ATL:410,YUL:365,GIG:615,EZE:680,
  SCL:690,BOG:620,LIM:650,MBJ:580,BGI:560,PUJ:570,NAS:545,BNE:790,PER:810,
  ADL:795,CHC:845,PPT:890,NAN:820,
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
  "France":        ["Air France","easyJet","British Airways","Ryanair"],
  "Italy":         ["ITA Airways","Ryanair","easyJet","British Airways"],
  "Netherlands":   ["KLM","easyJet","Ryanair","British Airways"],
  "Belgium":       ["Brussels Airlines","Ryanair","easyJet","British Airways"],
  "Norway":        ["Norwegian","British Airways","SAS","easyJet"],
  "Sweden":        ["SAS","Norwegian","Ryanair","British Airways"],
  "Denmark":       ["SAS","easyJet","Ryanair","British Airways"],
  "Finland":       ["Finnair","British Airways","Norwegian","Ryanair"],
  "Poland":        ["LOT","Ryanair","Wizz Air","easyJet"],
  "Croatia":       ["easyJet","British Airways","Ryanair","Jet2"],
  "Bulgaria":      ["Wizz Air","Ryanair","easyJet","British Airways"],
  "Romania":       ["Wizz Air","Ryanair","TAROM","British Airways"],
  "Czech Republic":["Czech Airlines","easyJet","Ryanair","British Airways"],
  "Hungary":       ["Wizz Air","Ryanair","British Airways","easyJet"],
  "Austria":       ["Austrian Airlines","easyJet","Ryanair","British Airways"],
  "Switzerland":   ["Swiss","British Airways","easyJet","Edelweiss"],
  "Qatar":         ["Qatar Airways","British Airways"],
  "Saudi Arabia":  ["British Airways","Saudi Arabian Airlines","Virgin Atlantic"],
  "Oman":          ["Oman Air","British Airways","Emirates"],
  "Jordan":        ["Royal Jordanian","British Airways","easyJet"],
  "Morocco":       ["Royal Air Maroc","easyJet","Ryanair","British Airways"],
  "Egypt":         ["EgyptAir","easyJet","TUI Airways","Jet2"],
  "Tunisia":       ["Tunisair","British Airways","TUI Airways","Jet2"],
  "South Africa":  ["British Airways","Virgin Atlantic","South African Airways"],
  "Kenya":         ["Kenya Airways","British Airways","Ethiopian Airlines"],
  "Ethiopia":      ["Ethiopian Airlines","British Airways"],
  "Ghana":         ["British Airways","Virgin Atlantic","Ethiopian Airlines"],
  "Nigeria":       ["British Airways","Virgin Atlantic","Air Peace"],
  "India":         ["British Airways","Air India","Jet2","Virgin Atlantic"],
  "Sri Lanka":     ["SriLankan Airlines","British Airways","Emirates"],
  "Maldives":      ["British Airways","Emirates","Qatar Airways","Sri Lankan"],
  "Nepal":         ["Nepal Airlines","British Airways","Qatar Airways"],
  "Thailand":      ["Thai Airways","British Airways","Emirates","Qatar Airways"],
  "Indonesia":     ["Garuda","Singapore Airlines","Emirates","Qatar Airways"],
  "Vietnam":       ["Vietnam Airlines","British Airways","Emirates","Qatar Airways"],
  "Philippines":   ["Philippine Airlines","British Airways","Emirates"],
  "Malaysia":      ["AirAsia","Malaysia Airlines","British Airways"],
  "Cambodia":      ["Cambodia Angkor Air","British Airways","Qatar Airways"],
  "Japan":         ["Japan Airlines","ANA","British Airways","Virgin Atlantic"],
  "South Korea":   ["Korean Air","Asiana","British Airways"],
  "Hong Kong":     ["Cathay Pacific","British Airways","Virgin Atlantic"],
  "China":         ["Air China","British Airways","Virgin Atlantic"],
  "Taiwan":        ["EVA Air","China Airlines","British Airways"],
  "USA":           ["Virgin Atlantic","British Airways","American Airlines","Delta"],
  "Canada":        ["Air Canada","British Airways","Virgin Atlantic","WestJet"],
  "Mexico":        ["Aeromexico","British Airways","Virgin Atlantic","TUI"],
  "Jamaica":       ["British Airways","Virgin Atlantic","TUI Airways","Jet2"],
  "Barbados":      ["British Airways","Virgin Atlantic","TUI Airways","Jet2"],
  "Dominican Republic":["British Airways","TUI Airways","Virgin Atlantic","Jet2"],
  "Bahamas":       ["British Airways","Virgin Atlantic","American Airlines"],
  "Brazil":        ["British Airways","LATAM","TAP Air Portugal","Virgin Atlantic"],
  "Argentina":     ["British Airways","LATAM","Iberia","Air Europa"],
  "Chile":         ["British Airways","LATAM","Iberia"],
  "Colombia":      ["Avianca","British Airways","Iberia","Virgin Atlantic"],
  "Peru":          ["LATAM","British Airways","Iberia","Air Europa"],
  "Australia":     ["Qantas","British Airways","Singapore Airlines","Emirates"],
  "New Zealand":   ["Air New Zealand","British Airways","Qantas","Singapore Airlines"],
  "Fiji":          ["Fiji Airways","British Airways","Singapore Airlines"],
  "Mauritius":     ["Air Mauritius","British Airways","Emirates","Air France"],
  "Seychelles":    ["Air Seychelles","British Airways","Emirates","Qatar Airways"],
  default:         ["British Airways","Emirates","Qatar Airways","Lufthansa"],
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

const MARKER = "499405";

// Build a JetRadar deep-link with pre-filled dates/pax
// Path format: /search/LHR0601BCN080111 (origin+MMDD+dest+MMDD+adults+1)
function jrUrl(orig, dest, weeksOut=3, nights=7, adults=1){
  const dep=new Date();
  dep.setDate(dep.getDate()+weeksOut*7);
  while(dep.getDay()!==2) dep.setDate(dep.getDate()+1);
  const ret=new Date(dep);
  ret.setDate(ret.getDate()+nights);
  // JetRadar path format: DDMM (day first, then month)
  const dd=String(dep.getDate()).padStart(2,'0')+String(dep.getMonth()+1).padStart(2,'0');
  const rd=String(ret.getDate()).padStart(2,'0')+String(ret.getMonth()+1).padStart(2,'0');
  return `https://www.aviasales.com/search/${orig}${dd}${dest}${rd}${adults}1?marker=${MARKER}&currency=GBP&locale=en-GB`;
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
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn" onclick="if(window.trackClick)trackClick({event_type:'click',partner:'jetradar',section:'seo_hero'})">✈️ See Live Prices on JetRadar →</a>
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
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn" onclick="if(window.trackClick)trackClick({event_type:'click',partner:'jetradar',section:'seo_month_hero'})">✈️ See ${m.label} Prices on JetRadar →</a>
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
  <a href="${jrUrl(UK[0].code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ See Cheapest Flights on JetRadar →</a>
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
  <a href="${jrUrl(o.code,'BCN',3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search from ${o.city} on JetRadar →</a>
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
  <a href="${jrUrl(a.code,'BCN',3,7,1)}" target="_blank" rel="noopener" class="sbtn" onclick="if(window.trackClick)trackClick({event_type:'click',partner:'jetradar',section:'seo_airport'})">✈️ Search Flights from ${a.city} on JetRadar →</a>
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
  <a href="${jrUrl(UK[0].code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Find Flights to ${d.city} on JetRadar →</a>
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
// ─── bestTimePage ─────────────────────────────────────────────────────────────
function bestTimePage(d){
  const url=`/best-time-to-visit/${cSlug(d)}`;
  const title=`Best Time to Visit ${d.city} | When to Go | TripHunt`;
  const desc=`Plan your trip to ${d.city}. Find out the best time to visit, weather by month, peak seasons, and when to get the cheapest flights from the UK.`;
  const pF=cheap(d);
  const monthRows=MONTHS.map(m=>{
    const p=Math.round(avg(d)*m.factor*0.72);
    return `<div class="mpill ${m.peak?"peak":p<pF*1.1?"cheap":""}">${m.label}<strong>£${p}</strong>${m.peak?"🔥":"✅"}</div>`;
  }).join("");
  const schemas=[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
    {"@type":"ListItem","position":2,"name":"Best Time to Visit","item":`${SITE_URL}/best-time-to-visit/`},
    {"@type":"ListItem","position":3,"name":d.city,"item":`${SITE_URL}${url}`}
  ]},faqSchema([
    {q:`When is the best time to visit ${d.city}?`,a:`The best time to visit ${d.city} depends on your priorities. For cheapest flights, try ${cheapMonth(d)}. For best weather, the ideal time is typically spring or autumn when crowds are lower and prices more reasonable.`},
    {q:`What is the cheapest month to fly to ${d.city}?`,a:`${cheapMonth(d)} is typically the cheapest month to fly from the UK to ${d.city}, with fares starting from £${pF}.`},
  ])];
  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:schemas})}
<body>${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Best Time to Visit",u:"/best-time-to-visit/"},{n:d.city,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">📅 When to Visit · ${d.city} · ${d.country}</div>
  <h1 class="h1">Best Time to Visit <span class="dest">${d.city}</span></h1>
  <p class="hsub">Month-by-month weather, prices and tips for visiting ${d.city} from the UK</p>
  <a href="${jrUrl(UK[0].code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn" onclick="if(window.trackClick)trackClick({event_type:'click',partner:'jetradar',section:'seo_best_time'})">✈️ Find Cheap Flights to ${d.city} on JetRadar →</a>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Flights to ${d.city} by Month</h2><p class="sec-s">Green = cheapest · Orange = peak season</p></div>
    <div class="months">${monthRows}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Fly to ${d.city} from Your Nearest Airport</h2></div>
    <div class="dgrid">${UK.slice(0,8).map(o=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${o.city}</div><div class="dcard-n">${o.name}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">to ${d.city}</div></a>`).join("")}</div>
  </section>
</div>${footer()}</body></html>`;
}

// ─── weekendPage ──────────────────────────────────────────────────────────────
function weekendPage(o, dests){
  const url=`/weekend-trips/${cSlug(o)}`;
  const title=`Weekend Trips from ${o.city} | Cheap Short Breaks | TripHunt`;
  const desc=`Find the best weekend breaks from ${o.city}. Compare cheap flights to Europe and beyond. Prices from £${cheap(dests[0]||FOREIGN[0])}.`;
  const schemas=[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
    {"@type":"ListItem","position":2,"name":"Weekend Trips","item":`${SITE_URL}/weekend-trips/`},
    {"@type":"ListItem","position":3,"name":`From ${o.city}`,"item":`${SITE_URL}${url}`}
  ]}];
  return `${head({title,desc,canonical:`${SITE_URL}${url}`,schema:schemas})}
<body>${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Weekend Trips",u:"/weekend-trips/"},{n:`From ${o.city}`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">🏙️ Weekend Breaks · ${o.code}</div>
  <h1 class="h1">Weekend Trips from <span class="dest">${o.city}</span></h1>
  <p class="hsub">Compare cheap short break flights from ${o.name}. Perfect for 2–4 night getaways.</p>
  <a href="${jrUrl(o.code,'BCN',2,3,1)}" target="_blank" rel="noopener" class="sbtn" onclick="if(window.trackClick)trackClick({event_type:'click',partner:'jetradar',section:'seo_weekend'})">✈️ Search Weekend Flights on JetRadar →</a>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Top Weekend Destinations from ${o.city}</h2><p class="sec-s">Easy 1–3 hour flights · European city breaks and beach getaways</p></div>
    <div class="dgrid">${dests.map(d=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">from ${o.city} · ${flightHrs(o,d)}</div></a>`).join("")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Weekend Trips from Other UK Airports</h2></div>
    <div class="chips">${UK.filter(a=>a.code!==o.code).map(a=>`<a href="/weekend-trips/${cSlug(a)}" class="chip">✈️ From ${a.city}</a>`).join("")}</div>
  </section>
</div>${footer()}</body></html>`;
}

// ─── weekendIndexPage ─────────────────────────────────────────────────────────
function weekendIndexPage(){
  return `${head({title:"Weekend Breaks from the UK | Cheap Short Breaks | TripHunt",desc:"Find cheap weekend breaks from UK airports. Compare flights to 200+ destinations for the perfect 2–4 night getaway.",canonical:`${SITE_URL}/weekend-trips/`,schema:[]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">Weekend Breaks from the <span class="dest">UK</span></h1>
  <p class="hsub">Short-haul flights for the perfect 2–4 night getaway. Compare prices from all major UK airports.</p>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Find Weekend Trips from Your Airport</h2></div>
    <div class="dgrid">${UK.map(o=>`<a href="/weekend-trips/${cSlug(o)}" class="dcard"><div class="dcard-c">${o.city}</div><div class="dcard-n">${o.name}</div><div class="dcard-p">${o.code}</div></a>`).join("")}</div>
  </section>
</div>${footer()}</body></html>`;
}

// ─── cheapToIndexPage ─────────────────────────────────────────────────────────
function cheapToIndexPage(){
  const sorted=FOREIGN.sort((a,b)=>(ROUTE_AVG[a.code]||999)-(ROUTE_AVG[b.code]||999));
  return `${head({title:"Cheap Flights To | All Destinations | TripHunt",desc:"Find cheap flights to 200+ destinations from the UK. Compare prices and book with TripHunt.",canonical:`${SITE_URL}/cheap-flights-to/`,schema:[]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">Cheap Flights To <span class="dest">Everywhere</span></h1>
  <p class="hsub">Browse every destination we cover. All prices from UK airports.</p>
</div></div>
<div class="container">
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">All Destinations</h2></div>
    <div class="dgrid">${sorted.map(d=>`<a href="/cheap-flights-to/${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">from UK</div></a>`).join("")}</div>
  </section>
</div>${footer()}</body></html>`;
}



// ═══════════════════════════════════════════════════════════════════════════════
// NEW DIMENSIONS — added in v31 to reach 1M+ pages
// ═══════════════════════════════════════════════════════════════════════════════

// ── New dimension data ────────────────────────────────────────────────────────

const CABINS = [
  { slug: "economy",          label: "Economy",           short: "Economy",   priceMult: 1.0,  note: "Best value fares, shared cabin"                },
  { slug: "premium-economy",  label: "Premium Economy",   short: "Prem Eco",  priceMult: 1.65, note: "Extra legroom, better meals"                    },
  { slug: "business-class",   label: "Business Class",    short: "Business",  priceMult: 3.8,  note: "Lie-flat beds on long-haul, priority boarding"  },
  { slug: "first-class",      label: "First Class",       short: "First",     priceMult: 7.5,  note: "Suites, fine dining, dedicated check-in"        },
];

const PAX_TYPES = [
  { slug: "solo",            label: "Solo Travel",        adults: 1, note: "Best value for lone travellers — more seat choices"        },
  { slug: "couples",         label: "Couples",            adults: 2, note: "Most searched — prices shown per person return"            },
  { slug: "family-of-3",     label: "Family of 3",        adults: 3, note: "Includes 1 child seat; check airline family policies"     },
  { slug: "family-of-4",     label: "Family of 4",        adults: 4, note: "Book early — 4 adjacent seats sell out quickly"           },
  { slug: "group-of-6",      label: "Group of 6",         adults: 6, note: "Group fares available on selected routes"                 },
];

const STOP_TYPES = [
  { slug: "direct",    label: "Direct Flights",        stops: 0, note: "No layover — fastest option"            },
  { slug: "one-stop",  label: "1-Stop Flights",        stops: 1, note: "Via connection hub — often cheaper"     },
];

const DURATIONS = [
  { slug: "weekend-break",    label: "Weekend Break",   nights: "2–3",  note: "Thu–Mon perfect for a city break"    },
  { slug: "one-week",         label: "1 Week",          nights: "7",    note: "Classic week holiday"                },
  { slug: "two-weeks",        label: "2 Weeks",         nights: "14",   note: "Best value for beach holidays"       },
];

const YEARS = [
  { slug: "2025", label: "2025", note: "Book now for 2025 travel"         },
  { slug: "2026", label: "2026", note: "Early booking discounts available" },
  { slug: "2027", label: "2027", note: "Best prices for advance planning"  },
];

const BUDGET_BRACKETS = [
  { slug: "under-100",  label: "Under £100",  max: 100  },
  { slug: "under-150",  label: "Under £150",  max: 150  },
  { slug: "under-200",  label: "Under £200",  max: 200  },
  { slug: "under-300",  label: "Under £300",  max: 300  },
  { slug: "under-400",  label: "Under £400",  max: 400  },
  { slug: "under-500",  label: "Under £500",  max: 500  },
];

const UK_AIRLINES = [
  { slug: "ryanair",       name: "Ryanair",                 code: "FR", type: "budget"   },
  { slug: "easyjet",       name: "easyJet",                 code: "U2", type: "budget"   },
  { slug: "british-airways", name: "British Airways",       code: "BA", type: "full"     },
  { slug: "jet2",          name: "Jet2",                    code: "LS", type: "leisure"  },
  { slug: "tui-airways",   name: "TUI Airways",             code: "BY", type: "leisure"  },
  { slug: "virgin-atlantic", name: "Virgin Atlantic",       code: "VS", type: "full"     },
  { slug: "wizz-air",      name: "Wizz Air",                code: "W6", type: "budget"   },
  { slug: "aer-lingus",    name: "Aer Lingus",              code: "EI", type: "budget"   },
  { slug: "emirates",      name: "Emirates",                code: "EK", type: "full"     },
  { slug: "turkish-airlines", name: "Turkish Airlines",     code: "TK", type: "full"     },
  { slug: "lufthansa",     name: "Lufthansa",               code: "LH", type: "full"     },
  { slug: "air-france",    name: "Air France",              code: "AF", type: "full"     },
  { slug: "klm",           name: "KLM",                     code: "KL", type: "full"     },
  { slug: "norwegian",     name: "Norwegian",               code: "DY", type: "budget"   },
  { slug: "flybe",         name: "Flybe",                   code: "BE", type: "regional" },
  { slug: "loganair",      name: "Loganair",                code: "LM", type: "regional" },
  { slug: "tap-air-portugal", name: "TAP Air Portugal",     code: "TP", type: "full"     },
  { slug: "iberia",        name: "Iberia",                  code: "IB", type: "full"     },
  { slug: "vueling",       name: "Vueling",                 code: "VY", type: "budget"   },
  { slug: "transavia",     name: "Transavia",               code: "HV", type: "budget"   },
];

// Additional city origins (not just airport codes) — expands city-to-city space
const UK_CITIES_EXTENDED = [
  "London","Manchester","Edinburgh","Birmingham","Glasgow","Bristol","Leeds","Newcastle",
  "Liverpool","Sheffield","Nottingham","Cardiff","Belfast","Leicester","Southampton",
  "Portsmouth","Oxford","Cambridge","Exeter","Norwich","York","Bath","Coventry",
  "Derby","Sunderland","Brighton","Reading","Milton Keynes","Stoke-on-Trent","Preston",
  "Wolverhampton","Plymouth","Swansea","Aberdeen","Inverness","Dundee","Stirling",
  "St Andrews","Middlesbrough","Swindon","Gloucester","Peterborough","Luton","Watford",
];

const DEST_CITIES_EXTENDED = [
  // Already in FOREIGN — this extends to 300+ cities
  "Paris","Amsterdam","Rome","Madrid","Barcelona","Lisbon","Athens","Prague","Vienna",
  "Budapest","Warsaw","Krakow","Copenhagen","Stockholm","Oslo","Helsinki","Zurich",
  "Brussels","Dublin","Reykjavik","Tallinn","Riga","Vilnius","Ljubljana","Bratislava",
  "Sarajevo","Skopje","Tirana","Podgorica","Valletta","Nicosia","Limassol","Paphos",
  "Thessaloniki","Mykonos","Santorini","Corfu","Zakynthos","Crete","Rhodes","Kos",
  "Larnaca","Antalya","Istanbul","Bodrum","Dalaman","Izmir","Cappadocia","Trabzon",
  "Dubai","Abu Dhabi","Doha","Muscat","Riyadh","Amman","Beirut","Tel Aviv","Cairo",
  "Marrakech","Casablanca","Fez","Agadir","Tunis","Djerba","Hurghada","Sharm El-Sheikh",
  "Cape Town","Nairobi","Zanzibar","Mauritius","Maldives","Seychelles","Reunion",
  "Bangkok","Phuket","Koh Samui","Chiang Mai","Singapore","Kuala Lumpur","Bali","Jakarta",
  "Tokyo","Osaka","Kyoto","Seoul","Hong Kong","Macau","Shanghai","Beijing","Guangzhou",
  "Sydney","Melbourne","Brisbane","Perth","Auckland","Queenstown","Fiji","Bora Bora",
  "New York","Los Angeles","Miami","Las Vegas","San Francisco","Chicago","Boston","Orlando",
  "Toronto","Montreal","Vancouver","Cancun","Mexico City","Havana","Jamaica","Barbados",
  "Trinidad","Antigua","St Lucia","Dominican Republic","Nassau","Turks and Caicos",
  "Rio de Janeiro","Buenos Aires","Bogota","Lima","Cartagena","Santiago","Montevideo",
  "Tenerife","Gran Canaria","Lanzarote","Fuerteventura","Palma","Ibiza","Menorca",
  "Malaga","Seville","Valencia","Alicante","Murcia","Bilbao","San Sebastian","Girona",
  "Porto","Faro","Funchal","Ponta Delgada","Milan","Venice","Florence","Naples","Palermo",
  "Catania","Bari","Bologna","Turin","Pisa","Verona","Nice","Lyon","Bordeaux","Toulouse",
  "Montpellier","Marseille","Nantes","Strasbourg","Frankfurt","Munich","Berlin","Hamburg",
  "Dusseldorf","Cologne","Stuttgart","Dresden","Leipzig","Nuremberg","Hannover","Bremen",
];

// Regions for budget pages
const REGIONS = [
  { slug: "europe",       label: "Europe",        dests: ["BCN","FCO","ATH","AMS","LIS","PRG","VIE","BUD"] },
  { slug: "middle-east",  label: "Middle East",   dests: ["DXB","DOH","CAI","AMM","TLV"]                  },
  { slug: "asia",         label: "Asia",          dests: ["BKK","SIN","KUL","NRT","ICN","HKG","DPS"]      },
  { slug: "americas",     label: "Americas",      dests: ["JFK","MIA","LAX","YYZ","CUN","GRU"]            },
  { slug: "africa",       label: "Africa",        dests: ["CPT","NBO","RAK","CMN","HRG"]                  },
  { slug: "canaries",     label: "Canary Islands", dests: ["TFS","LPA","ACE","FUE"]                       },
  { slug: "caribbean",    label: "Caribbean",     dests: ["BGI","MBJ","STI","NAS","PLS"]                  },
  { slug: "oceania",      label: "Australia & NZ", dests: ["SYD","MEL","BNE","AKL","CHC"]                 },
];

// ── New page template generators ───────────────────────────────────────────────

// 8. CABIN CLASS ROUTE PAGE  /flights/london-to-tokyo/business-class
function cabinPage(o, d, cabin) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}`;
  const base  = avg(d);
  const cp    = Math.round(base * cabin.priceMult * 0.82);
  const title = `${cabin.label} Flights ${o.city} to ${d.city} | From £${cp} | TripHunt`;
  const desc  = `Compare ${cabin.label.toLowerCase()} flights from ${o.city} to ${d.city} from £${cp}. ${cabin.note}. Book with TripHunt — no hidden fees.`;

  const schemas = [
    breadcrumbSchema([
      {n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:cabin.label,u:url}
    ]),
    faqSchema([
      {q:`How much are ${cabin.label} flights from ${o.city} to ${d.city}?`, a:`${cabin.label} flights from ${o.city} to ${d.city} start from £${cp} per person return. Prices vary by airline and how far ahead you book.`},
      {q:`Is ${cabin.label} worth it on ${o.city} to ${d.city}?`, a:`${cabin.note}. ${d.country === 'Japan' || base > 350 ? 'For long-haul routes, upgrading to ' + cabin.label + ' significantly improves comfort on a ' + flightHrs(o,d) + ' flight.' : 'For shorter European routes, economy class is usually the best value.'}`},
    ]),
  ];

  const otherCabins = CABINS.filter(c => c.slug !== cabin.slug);

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:schemas})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:cabin.label,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${cabin.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${cabin.label} Flights<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">${cabin.note} · Compare all airlines · Book with no hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare ${cabin.label} on JetRadar →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">From (${cabin.short})</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
    <div class="stat"><div class="stat-v">${cheapMonth(d)}</div><div class="stat-l">Cheapest month</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">About ${cabin.label} on This Route</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">💺</div><div class="icard-t">${cabin.label} Features</div><div class="icard-b">${cabin.note}. Availability and amenities vary by airline.</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Price Guide</div><div class="icard-b">${cabin.label} from ${o.city} to ${d.city} starts from <strong>£${cp}</strong> return. Book 3–6 months ahead for best availability.</div></div>
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Airlines</div><div class="icard-b">Compare ${cabin.label} on ${airlines(d)} and more. Not all airlines offer every cabin class on this route.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Compare All Cabin Classes: ${o.city} to ${d.city}</h2></div>
    <div class="months">
      ${otherCabins.map(c=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${c.slug}" class="mpill">${c.label} <strong>£${Math.round(base*c.priceMult*0.82)}</strong></a>`).join("\n")}
      <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/" class="mpill cheap">All fares <strong>£${cheap(d)}</strong></a>
    </div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 9. PAX TYPE PAGE  /flights/london-to-barcelona/family-of-4
function paxPage(o, d, pax) {
  const url  = `/flights/${cSlug(o)}-to-${cSlug(d)}/${pax.slug}`;
  const cp   = Math.round(cheap(d) * pax.adults);
  const pp   = cheap(d);
  const title = `${pax.label} Flights ${o.city} to ${d.city} | From £${pp}pp | TripHunt`;
  const desc  = `${pax.label} flights from ${o.city} to ${d.city} from £${pp} per person (£${cp} total). ${pax.note}.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:pax.label,u:url}]),faqSchema([{q:`How much are ${pax.label.toLowerCase()} flights from ${o.city} to ${d.city}?`,a:`${pax.label} flights from ${o.city} to ${d.city} start from £${pp} per person return, totalling around £${cp} for ${pax.adults} passengers. ${pax.note}.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:pax.label,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">👥 ${pax.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${pax.label} Flights<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${pp}</span> <span style="font-size:0.45em;color:var(--txt2)">per person</span></h1>
  <p class="hsub">${pax.note} · Total from £${cp} for ${pax.adults} · No hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,7,pax.adults)}" target="_blank" rel="noopener" class="sbtn">✈️ Search ${pax.label} Flights on JetRadar →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${pp}</div><div class="stat-l">Per person</div></div>
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Total (${pax.adults} people)</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Tips for ${pax.label} Travel to ${d.city}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">💡</div><div class="icard-t">Booking Tip</div><div class="icard-b">${pax.note}. Use TripHunt's flexible search to compare prices across a month of dates.</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Budget Guide</div><div class="icard-b">Total from <strong>£${cp}</strong> for ${pax.adults} passengers return. Set a price alert to catch fare drops.</div></div>
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Airlines</div><div class="icard-b">${airlines(d)}. Compare all carriers for the best group or family fare.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Departure Airports</h2></div>
    <div class="chips">${UK.filter(a=>a.code!==o.code).slice(0,6).map(a=>`<a href="/flights/${cSlug(a)}-to-${cSlug(d)}/${pax.slug}" class="chip">✈️ ${a.city} → ${d.city}</a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 10. STOP TYPE PAGE  /flights/london-to-dubai/direct
function stopPage(o, d, st) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${st.slug}`;
  const cp    = st.stops === 0 ? Math.round(cheap(d) * 1.1) : Math.round(cheap(d) * 0.85);
  const title = `${st.label} ${o.city} to ${d.city} | From £${cp} | TripHunt`;
  const desc  = `Find ${st.label.toLowerCase()} from ${o.city} to ${d.city} from £${cp}. ${st.note}. Compare all airlines on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:st.label,u:url}]),faqSchema([{q:`Are there ${st.label.toLowerCase()} from ${o.city} to ${d.city}?`,a:`Yes. ${st.label} are available on selected dates from ${o.city} to ${d.city} from £${cp}. ${st.note}.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:st.label,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${st.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${st.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">${st.note} · Compare 100+ airlines · No hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search on JetRadar →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">From</div></div>
    <div class="stat"><div class="stat-v">${st.stops === 0 ? "Direct" : "1 Stop"}</div><div class="stat-l">Routing</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Est. flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Compare Routing Options: ${o.city} to ${d.city}</h2></div>
    <div class="months">
      ${STOP_TYPES.map(s=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${s.slug}" class="mpill ${s.slug===st.slug?'cheap':''}">${s.label} <strong>£${s.stops===0?Math.round(cheap(d)*1.1):Math.round(cheap(d)*0.85)}</strong></a>`).join("\n")}
      <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/" class="mpill">All options <strong>£${cheap(d)}</strong></a>
    </div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 11. DURATION PAGE  /flights/london-to-mallorca/two-weeks
function durationPage(o, d, dur) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${dur.slug}`;
  const cp    = cheap(d);
  const title = `${dur.label} in ${d.city} | Flights from £${cp} | TripHunt`;
  const desc  = `Planning a ${dur.label.toLowerCase()} in ${d.city}? Flights from ${o.city} from £${cp} return. ${dur.note}. Compare all airlines on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${dur.label} in ${d.city}`,u:url}]),faqSchema([{q:`How much are flights for a ${dur.label.toLowerCase()} in ${d.city}?`,a:`Flights from ${o.city} to ${d.city} for a ${dur.label.toLowerCase()} start from £${cp} per person return. ${dur.note}.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${dur.label}`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">📅 ${dur.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${dur.label} in <span class="dest">${d.city}</span><br>Flights from <span class="price">£${cp}</span></h1>
  <p class="hsub">${dur.note} · Return flights from ${o.city} · No hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,parseInt(dur.nights)||7,2)}" target="_blank" rel="noopener" class="sbtn">✈️ Search ${dur.nights}-Night Flights →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Flights from</div></div>
    <div class="stat"><div class="stat-v">${dur.nights} nights</div><div class="stat-l">Trip length</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Trip Lengths from ${o.city} to ${d.city}</h2></div>
    <div class="months">
      ${DURATIONS.map(dur2=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${dur2.slug}" class="mpill ${dur2.slug===dur.slug?'cheap':''}">${dur2.label} <strong>from £${cp}</strong></a>`).join("\n")}
    </div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 12. YEAR PAGE  /flights/london-to-new-york/2026
function yearPage(o, d, yr) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${yr.slug}`;
  const cp    = cheap(d);
  const title = `Cheap Flights ${o.city} to ${d.city} ${yr.label} | From £${cp} | TripHunt`;
  const desc  = `Find cheap flights from ${o.city} to ${d.city} in ${yr.label}. From £${cp} return. ${yr.note}. Compare all airlines on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`Flights in ${yr.label}`,u:url}]),faqSchema([{q:`How much are flights from ${o.city} to ${d.city} in ${yr.label}?`,a:`Flights from ${o.city} to ${d.city} in ${yr.label} start from £${cp} return. ${yr.note}.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${yr.label} flights`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">📅 ${yr.label} Flights · ${o.code} → ${d.code}</div>
  <h1 class="h1">Flights ${o.city} to <span class="dest">${d.city}</span><br>in <span class="dest">${yr.label}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">${yr.note} · Compare 100+ airlines · No hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search ${yr.label} Flights on JetRadar →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Flights from</div></div>
    <div class="stat"><div class="stat-v">${yr.label}</div><div class="stat-l">Travel year</div></div>
    <div class="stat"><div class="stat-v">${cheapMonth(d)}</div><div class="stat-l">Cheapest month</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Monthly Prices: ${o.city} to ${d.city} in ${yr.label}</h2></div>
    <div class="months">${MONTHS.map(m=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" class="mpill ${m.peak?'peak':''}">${m.label} ${yr.label} <strong>£${Math.round(avg(d)*m.factor*0.72)}</strong></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Years</h2></div>
    <div class="months">${YEARS.map(y=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${y.slug}" class="mpill ${y.slug===yr.slug?'cheap':''}">${y.label} <strong>from £${cp}</strong></a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 13. AIRLINE ROUTE PAGE  /flights/london-to-barcelona/ryanair
function airlinePage(o, d, al) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}`;
  const cp    = al.type === "budget" ? Math.round(cheap(d) * 0.9) : Math.round(cheap(d) * 1.2);
  const title = `${al.name} Flights ${o.city} to ${d.city} | From £${cp} | TripHunt`;
  const desc  = `Compare ${al.name} flights from ${o.city} to ${d.city} from £${cp}. Check availability, baggage allowance, and book with zero fees on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${al.name}`,u:url}]),faqSchema([{q:`Does ${al.name} fly from ${o.city} to ${d.city}?`,a:`${al.name} operates flights on selected routes between ${o.city} and ${d.city}. Prices start from £${cp} return. Check availability for your dates on TripHunt.`},{q:`How much are ${al.name} flights from ${o.city} to ${d.city}?`,a:`${al.name} fares from ${o.city} to ${d.city} start from £${cp} return. ${al.type==='budget'?'Budget fares may have limited baggage allowance — check before booking.':'Full-service fares include checked baggage.'}`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:al.name,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${al.name} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${al.name}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">${al.type === 'budget' ? 'Budget fares — check baggage allowance before booking.' : 'Full-service fares with included baggage.'} No hidden fees on TripHunt.</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare ${al.name} on JetRadar →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">${al.name} from</div></div>
    <div class="stat"><div class="stat-v">${al.code}</div><div class="stat-l">Airline code</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">About ${al.name}: ${o.city} to ${d.city}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">✈️</div><div class="icard-t">Airline Type</div><div class="icard-b">${al.name} is a ${al.type} carrier. ${al.type==='budget'?'Fares are stripped back — expect to pay extra for bags, meals, and seat selection.':'Full-service fares include checked baggage and meals on longer routes.'}</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Price Guide</div><div class="icard-b">Fares from £${cp} return. Book early for the cheapest ${al.name} tickets — prices rise as the flight fills.</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Best Time to Book</div><div class="icard-b">Book 6–8 weeks ahead for European routes. Set a TripHunt price alert to catch ${al.name} fare drops.</div></div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Airlines on This Route</h2></div>
    <div class="chips">${UK_AIRLINES.filter(a=>a.slug!==al.slug).slice(0,8).map(a=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${a.slug}" class="chip">✈️ ${a.name}</a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 14. BUDGET BRACKET PAGE  /cheap-flights/from/london/under-200
function budgetPage(o, bracket) {
  const url   = `/cheap-flights/from/${cSlug(o)}/${bracket.slug}`;
  const dests = FOREIGN.filter(d => cheap(d) <= bracket.max).sort((a,b)=>cheap(a)-cheap(b));
  const title = `${bracket.label} Flights from ${o.city} | TripHunt`;
  const desc  = `Cheap flights from ${o.city} ${bracket.label} per person return. Compare all airlines. ${dests.length} destinations available.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:"Cheap Flights",u:"/cheap-flights/"},{n:`From ${o.city}`,u:`/cheap-flights/from/${cSlug(o)}/`},{n:bracket.label,u:url}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Cheap Flights",u:"/cheap-flights/"},{n:`From ${o.city}`,u:`/cheap-flights/from/${cSlug(o)}/`},{n:bracket.label,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">💸 Budget Flights · ${o.code}</div>
  <h1 class="h1">${bracket.label} Flights<br>from <span class="dest">${o.city}</span></h1>
  <p class="hsub">${dests.length} destinations · All prices per person return · No hidden fees</p>
  <a href="/" class="sbtn">✈️ Search with Flexible Dates →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">${dests.length}</div><div class="stat-l">Destinations</div></div>
    <div class="stat"><div class="stat-v">£${dests[0] ? cheap(dests[0]) : 'N/A'}</div><div class="stat-l">Cheapest fare</div></div>
    <div class="stat"><div class="stat-v">${bracket.label}</div><div class="stat-l">Budget</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">All Destinations from ${o.city} ${bracket.label}</h2></div>
    <div class="dgrid">${dests.slice(0,24).map(d=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div><div class="dcard-l">from ${o.city}</div></a>`).join("\n")}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Other Budget Brackets from ${o.city}</h2></div>
    <div class="months">${BUDGET_BRACKETS.map(b=>`<a href="/cheap-flights/from/${cSlug(o)}/${b.slug}" class="mpill ${b.slug===bracket.slug?'cheap':''}">${b.label}</a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 15. CITY-TO-CITY PAGE  /flights-from/london/to/paris  (text-based, broader keyword coverage)
function cityToCityPage(originCity, destCity) {
  const oSlug = slug(originCity);
  const dSlug = slug(destCity);
  const url   = `/city-flights/${oSlug}-to-${dSlug}`;
  // Match to nearest airport
  const oAp   = UK.find(a => a.city.toLowerCase() === originCity.toLowerCase()) || UK[0];
  const dAp   = FOREIGN.find(a => a.city.toLowerCase() === destCity.toLowerCase());
  const cp    = dAp ? cheap(dAp) : 99;
  const title = `Flights from ${originCity} to ${destCity} | From £${cp} | TripHunt`;
  const desc  = `Compare cheap flights from ${originCity} to ${destCity}. Prices from £${cp} return. Book with no hidden fees on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`Flights from ${originCity}`,u:`/flights-from/${oSlug}/`},{n:destCity,u:url}]),faqSchema([{q:`Are there flights from ${originCity} to ${destCity}?`,a:`Yes, you can fly from ${originCity} to ${destCity} with connecting flights via nearby airports. Fares start from £${cp} return.`},{q:`How long is the flight from ${originCity} to ${destCity}?`,a:`Flight time from ${originCity} to ${destCity} is typically ${dAp?flightHrs(oAp,dAp):'2–4 hours'} including any transfer time.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`Flights from ${originCity}`,u:`/flights-from/${oSlug}/`},{n:`to ${destCity}`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">✈️ ${originCity} → ${destCity}</div>
  <h1 class="h1">Flights from <span class="dest">${originCity}</span><br>to <span class="dest">${destCity}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">Compare all airlines · Book in GBP · No hidden fees</p>
  <a href="${jrUrl(oAp.code,dAp?dAp.code:'BCN',3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare All Flights →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">Flights from</div></div>
    <div class="stat"><div class="stat-v">${oAp.code}</div><div class="stat-l">Nearest airport</div></div>
    <div class="stat"><div class="stat-v">${dAp?flightHrs(oAp,dAp):'Varies'}</div><div class="stat-l">Flight time</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Getting from ${originCity} to ${destCity}</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">🛫</div><div class="icard-t">Nearest Airport</div><div class="icard-b">The nearest airport to ${originCity} is <strong>${oAp.name} (${oAp.code})</strong>. Check transport links before travelling.</div></div>
      <div class="icard"><div class="icard-ico">💰</div><div class="icard-t">Price Guide</div><div class="icard-b">Flights from £${cp} per person return. Set a TripHunt price alert to catch the cheapest fares.</div></div>
      <div class="icard"><div class="icard-ico">📅</div><div class="icard-t">Best Time to Book</div><div class="icard-b">Book 6–8 weeks ahead for best European fares. Prices are lowest in ${dAp?cheapMonth(dAp):'January or February'}.</div></div>
    </div>
  </section>
</div>
${footer(oAp)}
</body></html>`;
}

// 16. SEASON PAGE  /flights/london-to-barcelona/summer
const SEASONS = [
  { slug:"summer",  label:"Summer",  months:"June, July & August",        note:"Peak season — book 3–4 months ahead",         factor:1.28 },
  { slug:"winter",  label:"Winter",  months:"December, January & February",note:"Off-peak — best value fares available",       factor:0.82 },
  { slug:"spring",  label:"Spring",  months:"March, April & May",          note:"Great weather, moderate prices",              factor:0.92 },
  { slug:"autumn",  label:"Autumn",  months:"September, October & November",note:"Shoulder season — low crowds, good prices",  factor:0.88 },
];

function seasonPage(o, d, season) {
  const url   = `/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}`;
  const cp    = Math.round(cheap(d) * season.factor);
  const title = `${season.label} Flights ${o.city} to ${d.city} ${season.months} | From £${cp} | TripHunt`;
  const desc  = `${season.label} flights from ${o.city} to ${d.city} (${season.months}) from £${cp}. ${season.note}. Compare all airlines on TripHunt.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${season.label} flights`,u:url}]),faqSchema([{q:`How much are ${season.label.toLowerCase()} flights from ${o.city} to ${d.city}?`,a:`${season.label} flights from ${o.city} to ${d.city} (${season.months}) start from £${cp} return. ${season.note}.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${season.label} flights`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">🌤️ ${season.label} · ${o.code} → ${d.code}</div>
  <h1 class="h1">${season.label} Flights<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp}</span></h1>
  <p class="hsub">${season.months} · ${season.note} · Compare all airlines</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search ${season.label} Flights →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp}</div><div class="stat-l">${season.label} from</div></div>
    <div class="stat"><div class="stat-v">${season.months.split(",")[0]}</div><div class="stat-l">Season starts</div></div>
    <div class="stat"><div class="stat-v">${season.note.split("—")[0].trim()}</div><div class="stat-l">Season type</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Compare All Seasons: ${o.city} to ${d.city}</h2></div>
    <div class="months">${SEASONS.map(s=>`<a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${s.slug}" class="mpill ${s.slug===season.slug?'cheap':''}">${s.label} <strong>£${Math.round(cheap(d)*s.factor)}</strong></a>`).join("\n")}</div>
  </section>
</div>
${footer(o)}
</body></html>`;
}

// 17. AIRPORT COMPARISON PAGE  /compare/lhr-vs-lgw-to-barcelona
function compareAirportsPage(o1, o2, d) {
  const url   = `/compare/${o1.code.toLowerCase()}-vs-${o2.code.toLowerCase()}-to-${cSlug(d)}`;
  const cp1   = cheap(d), cp2 = Math.round(cheap(d) * 0.92);
  const cheaper = cp1 <= cp2 ? o1 : o2;
  const title = `${o1.code} vs ${o2.code} to ${d.city} | Which is Cheaper? | TripHunt`;
  const desc  = `Compare flights from ${o1.city} vs ${o2.city} to ${d.city}. ${o1.name} from £${cp1}, ${o2.name} from £${cp2}. Find out which airport is cheaper.`;

  return `${head({title, desc, canonical:`${SITE_URL}${url}`, schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:"Compare Airports",u:"/compare/"},{n:`${o1.code} vs ${o2.code} to ${d.city}`,u:url}]),faqSchema([{q:`Is it cheaper to fly to ${d.city} from ${o1.city} or ${o2.city}?`,a:`Currently, ${cheaper.city} (${cheaper.code}) tends to offer slightly cheaper fares to ${d.city}. However prices change daily — use TripHunt to compare both in real time.`}])]})}
<body>
${header()}
<div class="container">${bcrumb([{n:"Home",u:"/"},{n:"Compare Airports",u:"/compare/"},{n:`${o1.code} vs ${o2.code} to ${d.city}`,u:url}])}</div>
<div class="hero"><div class="container">
  <div class="hero-label">⚖️ Airport Comparison · to ${d.city}</div>
  <h1 class="h1">${o1.code} vs ${o2.code}<br>to <span class="dest">${d.city}</span><br>Which is Cheaper?</h1>
  <p class="hsub">Real-time price comparison · No hidden fees · Find the best deal</p>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp1}</div><div class="stat-l">From ${o1.city}</div></div>
    <div class="stat"><div class="stat-v">£${cp2}</div><div class="stat-l">From ${o2.city}</div></div>
    <div class="stat"><div class="stat-v">${cheaper.city}</div><div class="stat-l">Currently cheaper</div></div>
  </div>
  <section class="sec">
    <div class="sec-h"><h2 class="sec-t">Compare in Detail</h2></div>
    <div class="igrid">
      <div class="icard"><div class="icard-ico">🛫</div><div class="icard-t">${o1.name} (${o1.code})</div><div class="icard-b">Flights to ${d.city} from <strong>£${cp1}</strong>. ${o1.name} offers services to ${d.city} via multiple airlines. <a href="/flights/${cSlug(o1)}-to-${cSlug(d)}">See all ${o1.city} → ${d.city} flights →</a></div></div>
      <div class="icard"><div class="icard-ico">🛫</div><div class="icard-t">${o2.name} (${o2.code})</div><div class="icard-b">Flights to ${d.city} from <strong>£${cp2}</strong>. ${o2.name} may offer more convenient services depending on where you live. <a href="/flights/${cSlug(o2)}-to-${cSlug(d)}">See all ${o2.city} → ${d.city} flights →</a></div></div>
    </div>
  </section>
</div>
${footer(o1)}
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW MAIN() — replaces the old main()
// ═══════════════════════════════════════════════════════════════════════════════
function main(){
  console.log("\n🚀 TripHunt SEO Engine v2 — 1M+ Edition");
  console.log(`📁 Output: ${SEO_OUT}`);
  console.log(`🔧 Mode: ${IS_TEST?"TEST (500 pages)":"FULL BUILD"}`);
  console.log("─".repeat(48));

  const t0=Date.now();
  let total=0;
  const flightUrls=[], destUrls=[], apUrls=[], extraUrls=[];

  function u(loc, priority="0.7", changefreq="weekly"){ return {loc,priority,changefreq}; }

  // Index pages
  write(`${SEO_OUT}/flights/index.html`, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Cheap Flights UK | TripHunt</title><link rel="canonical" href="${SITE_URL}/flights/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1">Cheap Flights from the <span class="dest">UK</span></h1><p class="hsub">Compare 100+ airlines. 1M+ pages. No hidden fees.</p><a href="/" class="sbtn">✈️ Search All Flights</a></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">Top Departure Airports</h2></div><div class="dgrid">${UK.map(h=>`<a href="/flights-from/${cSlug(h)}" class="dcard"><div class="dcard-c">${h.city}</div><div class="dcard-n">${h.name}</div><div class="dcard-p">${h.code}</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);
  write(`${SEO_OUT}/destinations/index.html`, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Travel Destinations | TripHunt</title><link rel="canonical" href="${SITE_URL}/destinations/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1">Travel <span class="dest">Destinations</span></h1><p class="hsub">Explore the world. Compare cheap flights from UK airports.</p></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">Popular Destinations</h2></div><div class="dgrid">${FOREIGN.slice(0,24).map(d=>`<a href="/destinations/${cSlug(d)}" class="dcard"><div class="dcard-c">${d.city}</div><div class="dcard-n">${d.country}</div><div class="dcard-p">£${cheap(d)}</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);
  write(`${SEO_OUT}/airports/index.html`,      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><title>Airport Guides | TripHunt</title><link rel="canonical" href="${SITE_URL}/airports/"/><style>${CSS}</style></head><body>${header()}<div class="hero"><div class="container"><h1 class="h1"><span class="dest">Airport</span> Guides</h1><p class="hsub">Terminal info, airlines and cheap flights from airports worldwide.</p></div></div><div class="container"><section class="sec"><div class="sec-h"><h2 class="sec-t">UK Airports</h2></div><div class="dgrid">${UK.map(a=>`<a href="/airports/${aSlug(a)}" class="dcard"><div class="dcard-c">${a.code}</div><div class="dcard-n">${a.city}</div></a>`).join("")}</div></section></div>${footer()}</body></html>`);

  flightUrls.push(u("/flights/","0.9","daily"));
  destUrls.push(u("/destinations/","0.9","weekly"));
  apUrls.push(u("/airports/","0.8","weekly"));

  if(!ONLY_SITEMAPS){

    // ── 1. BASE ROUTE PAGES (16 UK × 182 foreign = 2,912) ─────────────────────
    console.log("✈️  1. Route pages...");
    let rc=0;
    outer1: for(const o of UK){
      for(const d of FOREIGN){
        if(total>=LIMIT) break outer1;
        write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/index.html`, routePage(o,d));
        flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/`,"0.85","daily"));
        rc++;total++;
        if(rc%250===0) process.stdout.write(`\r   ${rc.toLocaleString()} route pages`);
      }
    }
    console.log(`\r   ✅ ${rc.toLocaleString()} route pages`);

    // ── 2. MONTH PAGES (all UK × all foreign = 34,944) ─────────────────────────
    if(!IS_TEST){
      console.log("📅  2. Month pages (all UK airports)...");
      let mc=0;
      mout2: for(const o of UK){
        for(const d of FOREIGN){
          for(const m of MONTHS){
            if(total>=LIMIT) break mout2;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/index.html`, monthPage(o,d,m));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/`,"0.65","monthly"));
            mc++;total++;
            if(mc%1000===0) process.stdout.write(`\r   ${mc.toLocaleString()} month pages`);
          }
        }
      }
      console.log(`\r   ✅ ${mc.toLocaleString()} month pages`);
    }

    // ── 3. CABIN CLASS PAGES (16 × 182 × 4 = 11,648) ───────────────────────────
    if(!IS_TEST){
      console.log("💺  3. Cabin class pages...");
      let cc=0;
      cout3: for(const o of UK){
        for(const d of FOREIGN){
          for(const cabin of CABINS){
            if(total>=LIMIT) break cout3;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}/index.html`, cabinPage(o,d,cabin));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}/`,"0.70","monthly"));
            cc++;total++;
            if(cc%500===0) process.stdout.write(`\r   ${cc.toLocaleString()} cabin pages`);
          }
        }
      }
      console.log(`\r   ✅ ${cc.toLocaleString()} cabin pages`);
    }

    // ── 4. PASSENGER TYPE PAGES (16 × 182 × 5 = 14,560) ───────────────────────
    if(!IS_TEST){
      console.log("👥  4. Passenger type pages...");
      let pc=0;
      pout4: for(const o of UK){
        for(const d of FOREIGN){
          for(const pax of PAX_TYPES){
            if(total>=LIMIT) break pout4;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${pax.slug}/index.html`, paxPage(o,d,pax));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${pax.slug}/`,"0.68","monthly"));
            pc++;total++;
            if(pc%500===0) process.stdout.write(`\r   ${pc.toLocaleString()} pax pages`);
          }
        }
      }
      console.log(`\r   ✅ ${pc.toLocaleString()} pax pages`);
    }

    // ── 5. STOP TYPE PAGES (16 × 182 × 2 = 5,824) ─────────────────────────────
    if(!IS_TEST){
      console.log("🔀  5. Stop type pages...");
      let sc=0;
      sout5: for(const o of UK){
        for(const d of FOREIGN){
          for(const st of STOP_TYPES){
            if(total>=LIMIT) break sout5;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${st.slug}/index.html`, stopPage(o,d,st));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${st.slug}/`,"0.70","monthly"));
            sc++;total++;
          }
        }
      }
      console.log(`   ✅ ${sc.toLocaleString()} stop-type pages`);
    }

    // ── 6. SEASON PAGES (16 × 182 × 4 = 11,648) ───────────────────────────────
    if(!IS_TEST){
      console.log("🌤️   6. Season pages...");
      let sec=0;
      seout6: for(const o of UK){
        for(const d of FOREIGN){
          for(const season of SEASONS){
            if(total>=LIMIT) break seout6;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}/index.html`, seasonPage(o,d,season));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}/`,"0.68","monthly"));
            sec++;total++;
          }
        }
      }
      console.log(`   ✅ ${sec.toLocaleString()} season pages`);
    }

    // ── 7. DURATION PAGES (16 × 182 × 3 = 8,736) ──────────────────────────────
    if(!IS_TEST){
      console.log("📆  7. Duration pages...");
      let dc=0;
      dout7: for(const o of UK){
        for(const d of FOREIGN){
          for(const dur of DURATIONS){
            if(total>=LIMIT) break dout7;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${dur.slug}/index.html`, durationPage(o,d,dur));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${dur.slug}/`,"0.67","monthly"));
            dc++;total++;
          }
        }
      }
      console.log(`   ✅ ${dc.toLocaleString()} duration pages`);
    }

    // ── 8. YEAR PAGES (16 × 182 × 3 = 8,736) ──────────────────────────────────
    if(!IS_TEST){
      console.log("📅  8. Year pages...");
      let yc=0;
      yout8: for(const o of UK){
        for(const d of FOREIGN){
          for(const yr of YEARS){
            if(total>=LIMIT) break yout8;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${yr.slug}/index.html`, yearPage(o,d,yr));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${yr.slug}/`,"0.70","monthly"));
            yc++;total++;
          }
        }
      }
      console.log(`   ✅ ${yc.toLocaleString()} year pages`);
    }

    // ── 9. AIRLINE ROUTE PAGES (hubs only × 182 × 20 airlines = 80,080) ────────
    if(!IS_TEST){
      console.log("✈️   9. Airline route pages...");
      let alc=0;
      alout9: for(const o of HUBS){
        for(const d of FOREIGN){
          for(const al of UK_AIRLINES){
            if(total>=LIMIT) break alout9;
            write(`${SEO_OUT}/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/index.html`, airlinePage(o,d,al));
            flightUrls.push(u(`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/`,"0.72","weekly"));
            alc++;total++;
            if(alc%2000===0) process.stdout.write(`\r   ${alc.toLocaleString()} airline pages`);
          }
        }
      }
      console.log(`\r   ✅ ${alc.toLocaleString()} airline route pages`);
    }

    // ── 10. MONTH × CABIN COMBO PAGES (hubs × 182 × 12 × 4 = 139,776) ─────────
    if(!IS_TEST){
      console.log("💺  10. Month × cabin combo pages...");
      let mcc=0;
      mcout10: for(const o of HUBS){
        for(const d of FOREIGN){
          for(const m of MONTHS){
            for(const cabin of CABINS){
              if(total>=LIMIT) break mcout10;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/${cabin.slug}`;
              const cp2=Math.round(avg(d)*m.factor*cabin.priceMult*0.72);
              const title2=`${cabin.label} Flights ${o.city} to ${d.city} in ${m.label} | From £${cp2} | TripHunt`;
              const desc2=`${cabin.label} flights from ${o.city} to ${d.city} in ${m.label} from £${cp2}. ${cabin.note}. Compare all airlines.`;
              // Lightweight page
              const html2=`${head({title:title2,desc:desc2,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:m.label,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/`},{n:cabin.label,u:url2}])]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">${cabin.label} · ${m.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1>
  <p class="hsub">${cabin.note} · ${m.peak?'Peak season':'Value month'} · No hidden fees</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare ${cabin.label} Prices →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp2}</div><div class="stat-l">${cabin.short} in ${m.short}</div></div>
    <div class="stat"><div class="stat-v">${m.peak?'Peak':'Value'}</div><div class="stat-l">Season</div></div>
  </div>
  <p style="padding:16px 0;color:var(--txt2)"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}" style="color:var(--acc2)">← All ${cabin.label} fares: ${o.city} to ${d.city}</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" style="color:var(--acc2)">All ${m.label} fares</a></p>
</div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.55","monthly"));
              mcc++;total++;
              if(mcc%5000===0) process.stdout.write(`\r   ${mcc.toLocaleString()} month×cabin pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${mcc.toLocaleString()} month×cabin pages`);
    }

    // ── 11. MONTH × YEAR COMBO PAGES (hubs × 182 × 12 × 3 = 104,832) ──────────
    if(!IS_TEST){
      console.log("📅  11. Month × year combo pages...");
      let myc=0;
      myout11: for(const o of HUBS){
        for(const d of FOREIGN){
          for(const m of MONTHS){
            for(const yr of YEARS){
              if(total>=LIMIT) break myout11;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/${yr.slug}`;
              const cp2=Math.round(avg(d)*m.factor*0.72);
              const title2=`Flights ${o.city} to ${d.city} ${m.label} ${yr.label} | From £${cp2} | TripHunt`;
              const html2=`${head({title:title2,desc:`Flights from ${o.city} to ${d.city} in ${m.label} ${yr.label} from £${cp2}. Compare all airlines. No hidden fees.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${m.label} ${yr.label}`,u:url2}])]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">${o.city} to <span class="dest">${d.city}</span><br>${m.label} <span class="dest">${yr.label}</span><br>from <span class="price">£${cp2}</span></h1>
  <p class="hsub">${m.peak?'Peak season — book early.':'Good value month.'} Compare 100+ airlines.</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ See ${m.label} ${yr.label} Prices →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp2}</div><div class="stat-l">From (${m.short} ${yr.label})</div></div>
    <div class="stat"><div class="stat-v">${m.peak?'Peak':'Off-peak'}</div><div class="stat-l">Season</div></div>
  </div>
  <p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" style="color:var(--acc2)">← All ${m.label} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${yr.slug}" style="color:var(--acc2)">All ${yr.label} fares</a></p>
</div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.52","monthly"));
              myc++;total++;
              if(myc%5000===0) process.stdout.write(`\r   ${myc.toLocaleString()} month×year pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${myc.toLocaleString()} month×year pages`);
    }

    // ── 12. AIRLINE × MONTH COMBO PAGES (hubs × 182 × 20 × 12 = 960,960) ──────
    if(!IS_TEST){
      console.log("✈️   12. Airline × month combo pages (BIG)...");
      let amc=0;
      amout12: for(const o of HUBS){
        for(const d of FOREIGN){
          for(const al of UK_AIRLINES){
            for(const m of MONTHS){
              if(total>=LIMIT) break amout12;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/${m.slug}`;
              const cp2=Math.round(avg(d)*m.factor*(al.type==='budget'?0.9:1.1)*0.72);
              const title2=`${al.name} ${m.label} Flights ${o.city} to ${d.city} | From £${cp2} | TripHunt`;
              const html2=`${head({title:title2,desc:`${al.name} flights from ${o.city} to ${d.city} in ${m.label} from £${cp2}. ${m.peak?'Peak season — book early.':'Good value month.'} Compare on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:al.name,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/`},{n:m.label,u:url2}])]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">${al.name} · ${m.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1>
  <p class="hsub">${m.peak?'Peak season — book early for best ${al.name} fares.':'Good value month for '+al.name+' on this route.'} No hidden fees.</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare ${al.name} in ${m.label} →</a>
</div></div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-v">£${cp2}</div><div class="stat-l">${al.name} in ${m.short}</div></div>
    <div class="stat"><div class="stat-v">${m.peak?'Peak':'Value'}</div><div class="stat-l">Season</div></div>
    <div class="stat"><div class="stat-v">${flightHrs(o,d)}</div><div class="stat-l">Flight time</div></div>
  </div>
  <p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}" style="color:var(--acc2)">← All ${al.name} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" style="color:var(--acc2)">All ${m.label} fares</a></p>
</div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.60","monthly"));
              amc++;total++;
              if(amc%10000===0) process.stdout.write(`\r   ${amc.toLocaleString()} airline×month pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${amc.toLocaleString()} airline×month pages`);
    }

    // ── 13. BUDGET BRACKET PAGES (16 × 6 brackets = 96) ────────────────────────
    console.log("💸  13. Budget bracket pages...");
    for(const o of UK){
      for(const bracket of BUDGET_BRACKETS){
        if(total>=LIMIT) break;
        write(`${SEO_OUT}/cheap-flights/from/${cSlug(o)}/${bracket.slug}/index.html`, budgetPage(o, bracket));
        extraUrls.push(u(`/cheap-flights/from/${cSlug(o)}/${bracket.slug}/`,"0.75","daily"));
        total++;
      }
    }
    console.log(`   ✅ ${UK.length * BUDGET_BRACKETS.length} budget pages`);

    // ── 14. CHEAP-TO PAGES (182) ──────────────────────────────────────────────
    console.log("💰  14. Cheap-to pages...");
    for(const d of FOREIGN){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/cheap-flights-to/${cSlug(d)}/index.html`, cheapToPage(d));
      destUrls.push(u(`/cheap-flights-to/${cSlug(d)}/`,"0.80","weekly"));
      total++;
    }
    write(`${SEO_OUT}/cheap-flights-to/index.html`, cheapToIndexPage());
    destUrls.push(u("/cheap-flights-to/","0.88","daily"));
    console.log(`   ✅ ${FOREIGN.length} cheap-to pages`);

    // ── 15. FLIGHTS-FROM PAGES (16) ───────────────────────────────────────────
    console.log("🛫  15. Flights-from pages...");
    for(const o of UK){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/flights-from/${cSlug(o)}/index.html`, flightsFromPage(o));
      flightUrls.push(u(`/flights-from/${cSlug(o)}/`,"0.80","weekly"));
      total++;
    }
    console.log(`   ✅ ${UK.length} flights-from pages`);

    // ── 16. AIRPORT PAGES (198) ───────────────────────────────────────────────
    console.log("🛫  16. Airport pages...");
    for(const a of AIRPORTS){
      if(total>=LIMIT) break;
      write(`${SEO_OUT}/airports/${aSlug(a)}/index.html`, airportPage(a));
      apUrls.push(u(`/airports/${aSlug(a)}/`,"0.75","monthly"));
      total++;
    }
    console.log(`   ✅ ${AIRPORTS.length} airport pages`);

    // ── 17. DESTINATION + BEST-TIME + WEEKEND PAGES ───────────────────────────
    console.log("🌍  17. Destination / best-time / weekend pages...");
    for(const d of FOREIGN){ if(total>=LIMIT) break; write(`${SEO_OUT}/destinations/${cSlug(d)}/index.html`, destPage(d)); destUrls.push(u(`/destinations/${cSlug(d)}/`,"0.78","weekly")); total++; }
    for(const d of FOREIGN){ if(total>=LIMIT) break; write(`${SEO_OUT}/best-time-to-visit/${cSlug(d)}/index.html`, bestTimePage(d)); destUrls.push(u(`/best-time-to-visit/${cSlug(d)}/`,"0.72","monthly")); total++; }
    const weekendDests=FOREIGN.filter(d=>d.lat&&Math.abs(d.lat-51)<20).slice(0,40);
    for(const o of UK){ if(total>=LIMIT) break; write(`${SEO_OUT}/weekend-trips/${cSlug(o)}/index.html`, weekendPage(o,weekendDests)); flightUrls.push(u(`/weekend-trips/${cSlug(o)}/`,"0.75","weekly")); total++; }
    write(`${SEO_OUT}/weekend-trips/index.html`, weekendIndexPage()); flightUrls.push(u("/weekend-trips/","0.85","weekly"));
    console.log(`   ✅ ${FOREIGN.length*2 + UK.length} destination/best-time/weekend pages`);

    // ── 18. CITY-TO-CITY PAGES (43 UK cities × 300 dest cities = ~12,900) ──────
    if(!IS_TEST){
      console.log("🏙️   18. City-to-city pages...");
      let ctc=0;
      ctcout: for(const oc of UK_CITIES_EXTENDED){
        for(const dc of DEST_CITIES_EXTENDED){
          if(total>=LIMIT) break ctcout;
          write(`${SEO_OUT}/city-flights/${slug(oc)}-to-${slug(dc)}/index.html`, cityToCityPage(oc, dc));
          extraUrls.push(u(`/city-flights/${slug(oc)}-to-${slug(dc)}/`,"0.65","weekly"));
          ctc++;total++;
          if(ctc%1000===0) process.stdout.write(`\r   ${ctc.toLocaleString()} city-to-city pages`);
        }
      }
      console.log(`\r   ✅ ${ctc.toLocaleString()} city-to-city pages`);
    }

    // ── 19. AIRPORT COMPARISON PAGES (key UK pairs × top 60 dests = ~600) ──────
    if(!IS_TEST){
      console.log("⚖️   19. Airport comparison pages...");
      const AP_PAIRS=[[UK[0],UK[1]],[UK[0],UK[2]],[UK[0],UK[3]],[UK[1],UK[2]],[UK[1],UK[3]],[UK[2],UK[3]],[UK[0],UK[4]],[UK[0],UK[6]],[UK[3],UK[4]],[UK[5],UK[6]],[UK[7],UK[8]],[UK[2],UK[5]]];
      const TOP_DESTS=FOREIGN.sort((a,b)=>(ROUTE_AVG[b.code]||0)-(ROUTE_AVG[a.code]||0)).slice(0,60);
      let cpc=0;
      for(const [o1,o2] of AP_PAIRS){
        for(const d of TOP_DESTS){
          if(total>=LIMIT) break;
          if(!o1||!o2) continue;
          write(`${SEO_OUT}/compare/${o1.code.toLowerCase()}-vs-${o2.code.toLowerCase()}-to-${cSlug(d)}/index.html`, compareAirportsPage(o1,o2,d));
          extraUrls.push(u(`/compare/${o1.code.toLowerCase()}-vs-${o2.code.toLowerCase()}-to-${cSlug(d)}/`,"0.70","weekly"));
          cpc++;total++;
        }
      }
      console.log(`   ✅ ${cpc} airport comparison pages`);
    }
  }


    // ── 20. AIRLINE × CABIN PAGES (16 × 182 × 20 × 4 = 232,960) ───────────────
    if(!IS_TEST){
      console.log("✈️   20. Airline×cabin pages...");
      let acc2=0;
      acout20: for(const o of UK){
        for(const d of FOREIGN){
          for(const al of UK_AIRLINES){
            for(const cabin of CABINS){
              if(total>=LIMIT) break acout20;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/${cabin.slug}`;
              const cp2=Math.round(avg(d)*cabin.priceMult*(al.type==='budget'?0.88:1.12)*0.75);
              const title2=`${al.name} ${cabin.label} ${o.city} to ${d.city} | From £${cp2} | TripHunt`;
              const html2=`${head({title:title2,desc:`${al.name} ${cabin.label.toLowerCase()} flights from ${o.city} to ${d.city} from £${cp2}. ${cabin.note}. Book on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:al.name,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/`},{n:cabin.label,u:url2}])]})}
<body>${header()}
<div class="hero"><div class="container">
  <h1 class="h1">${al.name} ${cabin.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1>
  <p class="hsub">${cabin.note} · ${al.type==='budget'?'Budget carrier — check baggage.':'Full-service included baggage.'} No hidden fees.</p>
  <a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare ${al.name} ${cabin.label} →</a>
</div></div>
<div class="container">
  <p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}" style="color:var(--acc2)">← All ${al.name} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}" style="color:var(--acc2)">All ${cabin.label} fares</a></p>
</div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.55","monthly"));
              acc2++;total++;
              if(acc2%10000===0) process.stdout.write(`\r   ${acc2.toLocaleString()} airline×cabin pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${acc2.toLocaleString()} airline×cabin pages`);
    }

    // ── 21. AIRLINE × YEAR PAGES (16 × 182 × 20 × 3 = 174,720) ────────────────
    if(!IS_TEST){
      console.log("📅  21. Airline×year pages...");
      let ayc=0;
      ayout21: for(const o of UK){
        for(const d of FOREIGN){
          for(const al of UK_AIRLINES){
            for(const yr of YEARS){
              if(total>=LIMIT) break ayout21;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/${yr.slug}`;
              const cp2=Math.round(avg(d)*(al.type==='budget'?0.88:1.1)*0.72);
              const html2=`${head({title:`${al.name} Flights ${o.city} to ${d.city} ${yr.label} | From £${cp2} | TripHunt`,desc:`${al.name} flights from ${o.city} to ${d.city} in ${yr.label} from £${cp2}. Compare on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:al.name,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}/`},{n:yr.label,u:url2}])]})}
<body>${header()}<div class="hero"><div class="container"><h1 class="h1">${al.name} ${yr.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1><p class="hsub">${yr.note}. Compare on TripHunt. No hidden fees.</p><a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search ${yr.label} →</a></div></div><div class="container"><p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${al.slug}" style="color:var(--acc2)">← All ${al.name} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${yr.slug}" style="color:var(--acc2)">All ${yr.label} fares</a></p></div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.52","monthly"));
              ayc++;total++;
              if(ayc%10000===0) process.stdout.write(`\r   ${ayc.toLocaleString()} airline×year pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${ayc.toLocaleString()} airline×year pages`);
    }

    // ── 22. MONTH × PAX PAGES (16 × 182 × 12 × 5 = 174,720) ───────────────────
    if(!IS_TEST){
      console.log("👥  22. Month×pax pages...");
      let mpc=0;
      mpout22: for(const o of UK){
        for(const d of FOREIGN){
          for(const m of MONTHS){
            for(const pax of PAX_TYPES){
              if(total>=LIMIT) break mpout22;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/${pax.slug}`;
              const cp2=Math.round(avg(d)*m.factor*0.72);
              const html2=`${head({title:`${pax.label} Flights ${o.city} to ${d.city} ${m.label} | From £${cp2}pp | TripHunt`,desc:`${pax.label} flights from ${o.city} to ${d.city} in ${m.label} from £${cp2} per person. ${pax.note}. Compare on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:m.label,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/`},{n:pax.label,u:url2}])]})}
<body>${header()}<div class="hero"><div class="container"><h1 class="h1">${pax.label} · ${m.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span> <span style="font-size:0.45em;color:var(--txt2)">pp</span></h1><p class="hsub">${pax.note} · ${m.peak?'Peak season — book early.':'Good value month.'}</p><a href="${jrUrl(o.code,d.code,3,7,pax.adults)}" target="_blank" rel="noopener" class="sbtn">✈️ Search for ${pax.adults} on JetRadar →</a></div></div><div class="container"><p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" style="color:var(--acc2)">← All ${m.label} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${pax.slug}" style="color:var(--acc2)">All ${pax.label} fares</a></p></div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.50","monthly"));
              mpc++;total++;
              if(mpc%10000===0) process.stdout.write(`\r   ${mpc.toLocaleString()} month×pax pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${mpc.toLocaleString()} month×pax pages`);
    }

    // ── 23. MONTH × STOP TYPE (16 × 182 × 12 × 2 = 69,888) ────────────────────
    if(!IS_TEST){
      console.log("🔀  23. Month×stop pages...");
      let msc=0;
      msout23: for(const o of UK){
        for(const d of FOREIGN){
          for(const m of MONTHS){
            for(const st of STOP_TYPES){
              if(total>=LIMIT) break msout23;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/${st.slug}`;
              const cp2=Math.round(avg(d)*m.factor*(st.stops===0?1.08:0.88)*0.72);
              const html2=`${head({title:`${st.label} ${o.city} to ${d.city} in ${m.label} | From £${cp2} | TripHunt`,desc:`${st.label} from ${o.city} to ${d.city} in ${m.label} from £${cp2}. ${m.peak?'Peak season.':'Good value month.'} Compare on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:m.label,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}/`},{n:st.label,u:url2}])]})}
<body>${header()}<div class="hero"><div class="container"><h1 class="h1">${st.label} · ${m.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1><p class="hsub">${st.note} · ${m.peak?'Peak season.':'Good value month.'} Compare 100+ airlines.</p><a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Search on JetRadar →</a></div></div><div class="container"><p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${m.slug}" style="color:var(--acc2)">← All ${m.label} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${st.slug}" style="color:var(--acc2)">All ${st.label}</a></p></div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.50","monthly"));
              msc++;total++;
              if(msc%5000===0) process.stdout.write(`\r   ${msc.toLocaleString()} month×stop pages`);
            }
          }
        }
      }
      console.log(`\r   ✅ ${msc.toLocaleString()} month×stop pages`);
    }

    // ── 24. SEASON × CABIN (16 × 182 × 4 × 4 = 46,592) ────────────────────────
    if(!IS_TEST){
      console.log("🌤️   24. Season×cabin pages...");
      let scc=0;
      scout24: for(const o of UK){
        for(const d of FOREIGN){
          for(const season of SEASONS){
            for(const cabin of CABINS){
              if(total>=LIMIT) break scout24;
              const url2=`/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}/${cabin.slug}`;
              const cp2=Math.round(avg(d)*season.factor*cabin.priceMult*0.75);
              const html2=`${head({title:`${season.label} ${cabin.label} Flights ${o.city} to ${d.city} | From £${cp2} | TripHunt`,desc:`${season.label} ${cabin.label.toLowerCase()} flights from ${o.city} to ${d.city} from £${cp2}. ${cabin.note}. Compare on TripHunt.`,canonical:`${SITE_URL}${url2}`,schema:[breadcrumbSchema([{n:"Home",u:"/"},{n:`${o.city} to ${d.city}`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/`},{n:`${season.label} flights`,u:`/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}/`},{n:cabin.label,u:url2}])]})}
<body>${header()}<div class="hero"><div class="container"><h1 class="h1">${season.label} ${cabin.label}<br>${o.city} to <span class="dest">${d.city}</span><br>from <span class="price">£${cp2}</span></h1><p class="hsub">${season.months} · ${cabin.note} · No hidden fees.</p><a href="${jrUrl(o.code,d.code,3,7,1)}" target="_blank" rel="noopener" class="sbtn">✈️ Compare →</a></div></div><div class="container"><p style="padding:16px 0"><a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${season.slug}" style="color:var(--acc2)">← All ${season.label} fares</a> &nbsp;·&nbsp; <a href="/flights/${cSlug(o)}-to-${cSlug(d)}/${cabin.slug}" style="color:var(--acc2)">All ${cabin.label} fares</a></p></div>${footer(o)}</body></html>`;
              write(`${SEO_OUT}${url2}/index.html`, html2);
              flightUrls.push(u(`${url2}/`,"0.48","monthly"));
              scc++;total++;
            }
          }
        }
      }
      console.log(`   ✅ ${scc.toLocaleString()} season×cabin pages`);
    }


  // ── SITEMAPS (split into multiple files — max 50k URLs each) ─────────────────
  console.log("🗺️   Writing sitemaps...");
  const CHUNK=49000;
  const sitemapFiles=[];

  function writeSitemapChunks(name, urls){
    if(!urls.length) return;
    if(urls.length<=CHUNK){
      const fn=`/sitemap-${name}.xml`;
      write(path.resolve(SEO_OUT,"..",fn.slice(1)), xmlSitemap(urls));
      sitemapFiles.push(fn);
    } else {
      let i=0, chunk=0;
      while(i<urls.length){
        const fn=`/sitemap-${name}-${++chunk}.xml`;
        write(path.resolve(SEO_OUT,"..",fn.slice(1)), xmlSitemap(urls.slice(i,i+CHUNK)));
        sitemapFiles.push(fn);
        i+=CHUNK;
      }
    }
  }

  writeSitemapChunks("flights",      flightUrls);
  writeSitemapChunks("destinations", destUrls);
  writeSitemapChunks("airports",     apUrls);
  writeSitemapChunks("extra",        extraUrls);

  write(path.resolve(SEO_OUT,"..","sitemap-index.xml"), sitemapIndex(["/sitemap.xml", ...sitemapFiles]));
  console.log(`   ✅ ${sitemapFiles.length} sitemap files written`);

  const secs=((Date.now()-t0)/1000).toFixed(1);
  const allUrls=flightUrls.length+destUrls.length+apUrls.length+extraUrls.length;
  console.log("─".repeat(48));
  console.log(`\n✅ ${total.toLocaleString()} pages in ${secs}s`);
  console.log(`   Total sitemap URLs: ${allUrls.toLocaleString()}`);
  console.log(`   Sitemaps:           ${sitemapFiles.length} files`);
  console.log(`\n📋 Submit sitemap-index.xml to Google Search Console`);
  console.log(`   Next step: add Edge Function for unlimited dynamic rendering\n`);
}

main();
// NOTE: The main() above is the v2 engine.
// The following additions are patched in to reach 1.8M pages.
// They extend main() via a separate runner that main() does NOT call —
// instead we replace main() with mainV3() below which includes all new combos.
