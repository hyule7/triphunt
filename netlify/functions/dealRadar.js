// TripHunt -- dealRadar.js  v1
// Scheduled: runs every 2h, scans 11 UK airports, scores deals, writes Supabase.
// netlify.toml: [functions.dealRadar] schedule = "0 */2 * * *"
// Manual test: GET /.netlify/functions/dealRadar
"use strict";
const https = require("https");

const MARKER   = process.env.TRAVELPAYOUTS_MARKER || "499405";
const TP_TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
const SB_URL   = process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_KEY;
const SITE     = process.env.SITE_URL || "https://www.triphunt.org";
const CORS     = { "Access-Control-Allow-Origin":"*","Content-Type":"application/json" };

const UK_AIRPORTS = [
  {code:"LHR",name:"London Heathrow", city:"London",    demand:10},
  {code:"LGW",name:"London Gatwick",  city:"London",    demand:9 },
  {code:"STN",name:"London Stansted", city:"London",    demand:8 },
  {code:"LTN",name:"London Luton",    city:"London",    demand:7 },
  {code:"MAN",name:"Manchester",      city:"Manchester",demand:8 },
  {code:"BHX",name:"Birmingham",      city:"Birmingham",demand:7 },
  {code:"EDI",name:"Edinburgh",       city:"Edinburgh", demand:7 },
  {code:"GLA",name:"Glasgow",         city:"Glasgow",   demand:6 },
  {code:"BRS",name:"Bristol",         city:"Bristol",   demand:6 },
  {code:"LBA",name:"Leeds Bradford",  city:"Leeds",     demand:5 },
  {code:"NCL",name:"Newcastle",       city:"Newcastle", demand:5 },
];

const ROUTES = {
  BCN:{avg:120, pop:9,rarity:5,name:"Barcelona",  country:"Spain",       region:"Europe",      emoji:"🌊",lh:false},
  MAD:{avg:110, pop:8,rarity:5,name:"Madrid",     country:"Spain",       region:"Europe",      emoji:"🎨",lh:false},
  LIS:{avg:105, pop:9,rarity:6,name:"Lisbon",     country:"Portugal",    region:"Europe",      emoji:"🌞",lh:false},
  FCO:{avg:115, pop:9,rarity:5,name:"Rome",       country:"Italy",       region:"Europe",      emoji:"🍕",lh:false},
  AMS:{avg:95,  pop:8,rarity:4,name:"Amsterdam",  country:"Netherlands", region:"Europe",      emoji:"🚲",lh:false},
  CDG:{avg:90,  pop:9,rarity:4,name:"Paris",      country:"France",      region:"Europe",      emoji:"🗼",lh:false},
  ATH:{avg:145, pop:8,rarity:6,name:"Athens",     country:"Greece",      region:"Europe",      emoji:"🏛️",lh:false},
  PRG:{avg:100, pop:7,rarity:5,name:"Prague",     country:"Czechia",     region:"Europe",      emoji:"🍺",lh:false},
  VIE:{avg:105, pop:7,rarity:5,name:"Vienna",     country:"Austria",     region:"Europe",      emoji:"🎭",lh:false},
  DBV:{avg:155, pop:8,rarity:7,name:"Dubrovnik",  country:"Croatia",     region:"Europe",      emoji:"⛵",lh:false},
  IST:{avg:190, pop:7,rarity:6,name:"Istanbul",   country:"Turkey",      region:"Europe",      emoji:"🕌",lh:false},
  PMI:{avg:130, pop:8,rarity:5,name:"Palma",      country:"Spain",       region:"Europe",      emoji:"🌴",lh:false},
  ALC:{avg:135, pop:6,rarity:5,name:"Alicante",   country:"Spain",       region:"Europe",      emoji:"🍊",lh:false},
  AGP:{avg:125, pop:7,rarity:5,name:"Malaga",     country:"Spain",       region:"Europe",      emoji:"🌅",lh:false},
  FAO:{avg:140, pop:7,rarity:6,name:"Faro",       country:"Portugal",    region:"Europe",      emoji:"🐠",lh:false},
  TFS:{avg:170, pop:7,rarity:6,name:"Tenerife",   country:"Spain",       region:"Europe",      emoji:"☀️",lh:false},
  LPA:{avg:175, pop:7,rarity:6,name:"Gran Canaria",country:"Spain",      region:"Europe",      emoji:"🌋",lh:false},
  AYT:{avg:160, pop:7,rarity:6,name:"Antalya",    country:"Turkey",      region:"Mediterranean",emoji:"🏖️",lh:false},
  DXB:{avg:280, pop:9,rarity:7,name:"Dubai",      country:"UAE",         region:"Middle East", emoji:"🏙️",lh:true },
  DOH:{avg:310, pop:7,rarity:7,name:"Doha",       country:"Qatar",       region:"Middle East", emoji:"🌆",lh:true },
  BKK:{avg:520, pop:9,rarity:8,name:"Bangkok",    country:"Thailand",    region:"Asia",        emoji:"🛺",lh:true },
  DPS:{avg:590, pop:8,rarity:9,name:"Bali",       country:"Indonesia",   region:"Asia",        emoji:"🌺",lh:true },
  NRT:{avg:620, pop:8,rarity:9,name:"Tokyo",      country:"Japan",       region:"Asia",        emoji:"⛩️",lh:true },
  SIN:{avg:480, pop:8,rarity:8,name:"Singapore",  country:"Singapore",   region:"Asia",        emoji:"🦁",lh:true },
  KUL:{avg:450, pop:7,rarity:8,name:"Kuala Lumpur",country:"Malaysia",   region:"Asia",        emoji:"🏙️",lh:true },
  HKT:{avg:540, pop:7,rarity:8,name:"Phuket",     country:"Thailand",    region:"Asia",        emoji:"🤿",lh:true },
  JFK:{avg:380, pop:9,rarity:8,name:"New York",   country:"USA",         region:"Americas",    emoji:"🗽",lh:true },
  LAX:{avg:420, pop:8,rarity:8,name:"Los Angeles",country:"USA",         region:"Americas",    emoji:"🎬",lh:true },
  MIA:{avg:390, pop:7,rarity:8,name:"Miami",      country:"USA",         region:"Americas",    emoji:"🌊",lh:true },
  YYZ:{avg:350, pop:7,rarity:8,name:"Toronto",    country:"Canada",      region:"Americas",    emoji:"🍁",lh:true },
  CPT:{avg:520, pop:7,rarity:8,name:"Cape Town",  country:"S. Africa",   region:"Africa",      emoji:"🦁",lh:true },
  NBO:{avg:490, pop:6,rarity:8,name:"Nairobi",    country:"Kenya",       region:"Africa",      emoji:"🦒",lh:true },
  SYD:{avg:780, pop:8,rarity:9,name:"Sydney",     country:"Australia",   region:"Oceania",     emoji:"🦘",lh:true },
  MEL:{avg:800, pop:7,rarity:9,name:"Melbourne",  country:"Australia",   region:"Oceania",     emoji:"☕",lh:true },
};

// ── Deal Scoring Algorithm ────────────────────────────────────────
// dealScore = (priceDiscount*50) + (routePop*20) + (rarity*20) + trendingBoost
// Tier: 95+ legendary | 80+ exceptional | 65+ great | 50+ good | <50 skip
function scoreDeal(price, dest, demand) {
  const r = ROUTES[dest];
  if (!r) return null;
  const ratio  = price / r.avg;
  const disc   = Math.max(0, 1 - ratio);
  let boost = 0;
  if (r.lh  && ratio<=0.55) boost=10; else if (r.lh  && ratio<=0.65) boost=6;
  else if (r.lh && ratio<=0.75) boost=3; else if (!r.lh && ratio<=0.45) boost=8;
  else if (!r.lh && ratio<=0.55) boost=4;
  const dmult = 0.85 + ((demand||6)/10)*0.3;
  const score = Math.min(99, Math.round(((disc*50)+(r.pop/10*20)+(r.rarity/10*20)+boost)*dmult));
  let tier,label,badge;
  if      (score>=95){tier="legendary";  label="🚨 Legendary Deal";  badge="LEGENDARY";  }
  else if (score>=80){tier="exceptional";label="🔥 Exceptional Deal";badge="EXCEPTIONAL";}
  else if (score>=65){tier="great";      label="⚡ Great Deal";      badge="GREAT DEAL"; }
  else if (score>=50){tier="good";       label="✓ Good Price";       badge="GOOD";       }
  else return null;
  return {score,tier,label,badge,saving_pct:Math.round(disc*100),saving_amount:Math.round(r.avg-price),typical_price:r.avg,price_vs_avg:Math.round(ratio*100),is_error_fare:ratio<=0.40,is_exceptional:score>=80};
}

function ddmm(s){const p=String(s||"").slice(0,10).split("-");return p.length===3?p[2]+p[1]:"";}
function addDays(s,n){const d=new Date(String(s).slice(0,10));d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function nextTue(){const d=new Date();d.setDate(d.getDate()+14);while(d.getDay()!==2)d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
function burl(o,d,dep,ret){const sd=dep||nextTue();const sr=ret||addDays(sd,7);return `https://www.aviasales.com/search/${o}${ddmm(sd)}${d}${ddmm(sr)}21?marker=${MARKER}&currency=GBP&locale=en-GB`;}
function mkSlug(city,dest,price){const c=city.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");const d=(ROUTES[dest]?.name||dest).toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");return `${c}-to-${d}-${price}`;}

function fetchJson(url){
  return new Promise((res,rej)=>{
    const req=https.get(url,{headers:{"X-Access-Token":TP_TOKEN||"","User-Agent":"TripHunt/3.0"}},r=>{
      if(r.statusCode===429)return rej(new Error("rate_limited"));
      if(r.statusCode===401)return rej(new Error("auth_error"));
      let body="";r.on("data",c=>body+=c);r.on("end",()=>{try{res(JSON.parse(body));}catch{rej(new Error("bad_json"));}});
    });
    req.on("error",rej);req.setTimeout(15000,()=>{req.destroy();rej(new Error("timeout"));});
  });
}

function sbReq(method,path,body){
  if(!SB_URL||!SB_KEY)return Promise.resolve({status:503,data:null});
  return new Promise((res,rej)=>{
    const url=new URL(SB_URL+"/rest/v1"+path);
    const data=body?JSON.stringify(body):null;
    const req=https.request({hostname:url.hostname,path:url.pathname+url.search,method,headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":method==="POST"?"return=minimal,resolution=merge-duplicates":"",  ...(data?{"Content-Length":Buffer.byteLength(data)}:{})}},r=>{
      let resp="";r.on("data",c=>resp+=c);r.on("end",()=>{try{res({status:r.statusCode,data:resp?JSON.parse(resp):null});}catch{res({status:r.statusCode,data:resp});}});
    });
    req.on("error",rej);req.setTimeout(8000,()=>{req.destroy();rej(new Error("sb_timeout"));});
    if(data)req.write(data);req.end();
  });
}

async function fetchFares(ap){
  const q=new URLSearchParams({origin:ap.code,currency:"GBP",limit:40,one_way:"false",token:TP_TOKEN||""});
  const items=[];
  try{
    const raw=await fetchJson(`https://api.travelpayouts.com/aviasales/v3/grouped_prices?${q}`);
    if(raw?.data)for(const x of Object.values(raw.data)){
      const dest=(x.destination||x.iata||"").toUpperCase();
      if(dest&&x.price)items.push({origin:ap.code,destination:dest,price:x.price,airline:x.airline||"",depart_date:x.depart_date||null,return_date:x.return_date||null,stops:x.transfers??0,link:x.link||null});
    }
  }catch(e){console.warn(`grouped_prices ${ap.code}:`,e.message);}
  if(!items.length){
    try{
      const q2=new URLSearchParams({origin:ap.code,currency:"GBP",period_type:"year",one_way:"false",sorting:"price",trip_class:"0",limit:30,token:TP_TOKEN||""});
      const raw2=await fetchJson(`https://api.travelpayouts.com/v1/prices/cheap?${q2}`);
      if(raw2?.data)for(const[dest,trips]of Object.entries(raw2.data)){
        const t=trips[0]||trips[Object.keys(trips)[0]];
        if(t)items.push({origin:ap.code,destination:dest.toUpperCase(),price:t.price,airline:t.airline||"",depart_date:t.departure_at?.slice(0,10)||null,return_date:t.return_at?.slice(0,10)||null,stops:t.transfers??0,link:t.link||null});
      }
    }catch(e){console.warn(`v1/cheap ${ap.code}:`,e.message);}
  }
  return items;
}

function buildDeals(fares,airports){
  const apMap=Object.fromEntries(airports.map(a=>[a.code,a]));
  const out=[];
  for(const f of fares){
    const route=ROUTES[f.destination];if(!route)continue;
    const ap=apMap[f.origin];
    const sc=scoreDeal(f.price,f.destination,ap?.demand||6);if(!sc)continue;
    const dep=f.depart_date||nextTue();const ret=f.return_date||addDays(dep,7);
    const bookUrl=f.link?`https://www.aviasales.com${f.link}?marker=${MARKER}&currency=GBP&locale=en-GB`:burl(f.origin,f.destination,dep,ret);
    const s=mkSlug(ap?.city||f.origin,f.destination,f.price);
    out.push({
      slug:s,origin_code:f.origin,origin_city:ap?.city||f.origin,origin_airport:ap?.name||f.origin,
      dest_code:f.destination,dest_name:route.name,dest_country:route.country,dest_region:route.region,dest_emoji:route.emoji,
      price:f.price,typical_price:sc.typical_price,saving_pct:sc.saving_pct,saving_amount:sc.saving_amount,price_vs_avg:sc.price_vs_avg,
      deal_score:sc.score,deal_tier:sc.tier,deal_label:sc.label,deal_badge:sc.badge,is_error_fare:sc.is_error_fare,is_exceptional:sc.is_exceptional,longhaul:route.lh,
      airline:f.airline,stops:f.stops,depart_date:dep,return_date:ret,booking_url:bookUrl,deal_url:`${SITE}/deal/${s}`,
      seo_title:`${ap?.city||f.origin} to ${route.name} from £${f.price} | TripHunt`,
      seo_description:`${sc.saving_pct}% off flights from ${ap?.city||f.origin} to ${route.name}. Usually £${sc.typical_price} -- now £${f.price} return.`,
      discovered_at:new Date().toISOString(),expires_at:addDays(new Date().toISOString().slice(0,10),3),active:true,
    });
  }
  return out.sort((a,b)=>b.deal_score-a.deal_score);
}

async function persist(deals){
  if(!SB_URL||!SB_KEY){console.log("[dealRadar] No Supabase");return;}
  for(let i=0;i<deals.length;i+=20){
    try{await sbReq("POST","/deals?on_conflict=slug",deals.slice(i,i+20));}
    catch(e){console.error("[dealRadar] persist:",e.message);}
  }
  try{const cutoff=addDays(new Date().toISOString().slice(0,10),-3);await sbReq("PATCH",`/deals?active=eq.true&discovered_at=lt.${cutoff}`,{active:false});}
  catch(e){console.warn("[dealRadar] expire:",e.message);}
}

async function notifyElite(deals){
  if(!SB_URL||!SB_KEY)return;
  for(const deal of deals.filter(d=>d.deal_score>=80).slice(0,5)){
    try{
      const r=await sbReq("GET",`/push_subscriptions?active=eq.true&origin_pref=eq.${deal.origin_code}&limit=500`);
      console.log(`[dealRadar] Push ${(r.data||[]).length} subs: ${deal.slug} £${deal.price}`);
      await sbReq("PATCH",`/deals?slug=eq.${deal.slug}`,{notified:true});
    }catch(e){console.warn("[dealRadar] push:",e.message);}
  }
}

exports.handler = async(event)=>{
  const t0=Date.now();
  console.log("[dealRadar] Start",new Date().toISOString());
  if(event.httpMethod==="OPTIONS")return{statusCode:200,headers:CORS,body:""};
  const isHttp=!!event.httpMethod;
  if(!TP_TOKEN){
    const msg="No TP_TOKEN -- demo mode. Seed deals in Supabase are served.";
    console.log("[dealRadar]",msg);
    if(isHttp)return{statusCode:200,headers:CORS,body:JSON.stringify({success:true,_mode:"demo",message:msg})};
    return{statusCode:200};
  }
  try{
    const results=await Promise.allSettled(UK_AIRPORTS.map(ap=>fetchFares(ap)));
    const allFares=[];
    results.forEach((r,i)=>{if(r.status==="fulfilled")allFares.push(...r.value);else console.warn(UK_AIRPORTS[i].code,r.reason?.message);});
    console.log("[dealRadar] Raw fares:",allFares.length);
    const deals=buildDeals(allFares,UK_AIRPORTS);
    console.log("[dealRadar] Deals scored:",deals.length,"elite:",deals.filter(d=>d.deal_score>=80).length);
    await persist(deals.slice(0,100));
    await notifyElite(deals);
    const summary={success:true,scanned:UK_AIRPORTS.length,raw_fares:allFares.length,deals_found:deals.length,elite:deals.filter(d=>d.deal_score>=80).length,top_5:deals.slice(0,5).map(d=>`${d.origin_code}→${d.dest_code} £${d.price}[${d.deal_score}]`),duration_ms:Date.now()-t0};
    console.log("[dealRadar] Done:",JSON.stringify(summary));
    if(isHttp)return{statusCode:200,headers:CORS,body:JSON.stringify(summary)};
    return{statusCode:200};
  }catch(e){
    console.error("[dealRadar] Fatal:",e.message);
    if(isHttp)return{statusCode:500,headers:CORS,body:JSON.stringify({success:false,error:e.message})};
    return{statusCode:500};
  }
};

module.exports.ROUTES=ROUTES;module.exports.UK_AIRPORTS=UK_AIRPORTS;module.exports.scoreDeal=scoreDeal;module.exports.bookingUrl=burl;module.exports.mkSlug=mkSlug;
