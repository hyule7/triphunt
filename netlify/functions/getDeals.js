// TripHunt — getDeals.js  v2
// Source priority: Supabase (dealRadar) → Live API → Curated fallback
"use strict";
const https = require("https");
const MARKER=process.env.TRAVELPAYOUTS_MARKER||"499405";
const TP_TOKEN=process.env.TRAVELPAYOUTS_TOKEN;
const SB_URL=process.env.SUPABASE_URL;
const SB_KEY=process.env.SUPABASE_SERVICE_KEY;
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,OPTIONS","Content-Type":"application/json"};
const _cache=new Map();
const TTL=10*60*1000;
function cacheGet(k){const e=_cache.get(k);if(!e)return null;if(Date.now()-e.ts>TTL){_cache.delete(k);return null;}return e.d;}
function cacheSet(k,d){_cache.set(k,{d,ts:Date.now()});if(_cache.size>200)_cache.delete(_cache.keys().next().value);}

const ROUTES={
  BCN:{avg:120,pop:9,name:"Barcelona",  country:"Spain",      region:"Europe",      emoji:"🌊",lh:false},
  MAD:{avg:110,pop:8,name:"Madrid",     country:"Spain",      region:"Europe",      emoji:"🎨",lh:false},
  LIS:{avg:105,pop:9,name:"Lisbon",     country:"Portugal",   region:"Europe",      emoji:"🌞",lh:false},
  FCO:{avg:115,pop:9,name:"Rome",       country:"Italy",      region:"Europe",      emoji:"🍕",lh:false},
  AMS:{avg:95, pop:8,name:"Amsterdam",  country:"Netherlands",region:"Europe",      emoji:"🚲",lh:false},
  CDG:{avg:90, pop:9,name:"Paris",      country:"France",     region:"Europe",      emoji:"🗼",lh:false},
  ATH:{avg:145,pop:8,name:"Athens",     country:"Greece",     region:"Europe",      emoji:"🏛️",lh:false},
  PRG:{avg:100,pop:7,name:"Prague",     country:"Czechia",    region:"Europe",      emoji:"🍺",lh:false},
  VIE:{avg:105,pop:7,name:"Vienna",     country:"Austria",    region:"Europe",      emoji:"🎭",lh:false},
  DBV:{avg:155,pop:8,name:"Dubrovnik",  country:"Croatia",    region:"Europe",      emoji:"⛵",lh:false},
  IST:{avg:190,pop:7,name:"Istanbul",   country:"Turkey",     region:"Europe",      emoji:"🕌",lh:false},
  PMI:{avg:130,pop:8,name:"Palma",      country:"Spain",      region:"Europe",      emoji:"🌴",lh:false},
  ALC:{avg:135,pop:6,name:"Alicante",   country:"Spain",      region:"Europe",      emoji:"🍊",lh:false},
  AGP:{avg:125,pop:7,name:"Malaga",     country:"Spain",      region:"Europe",      emoji:"🌅",lh:false},
  FAO:{avg:140,pop:7,name:"Faro",       country:"Portugal",   region:"Europe",      emoji:"🐠",lh:false},
  TFS:{avg:170,pop:7,name:"Tenerife",   country:"Spain",      region:"Europe",      emoji:"☀️",lh:false},
  LPA:{avg:175,pop:7,name:"Gran Canaria",country:"Spain",     region:"Europe",      emoji:"🌋",lh:false},
  AYT:{avg:160,pop:7,name:"Antalya",    country:"Turkey",     region:"Mediterranean",emoji:"🏖️",lh:false},
  DXB:{avg:280,pop:9,name:"Dubai",      country:"UAE",        region:"Middle East", emoji:"🏙️",lh:true},
  DOH:{avg:310,pop:7,name:"Doha",       country:"Qatar",      region:"Middle East", emoji:"🌆",lh:true},
  BKK:{avg:520,pop:9,name:"Bangkok",    country:"Thailand",   region:"Asia",        emoji:"🛺",lh:true},
  DPS:{avg:590,pop:8,name:"Bali",       country:"Indonesia",  region:"Asia",        emoji:"🌺",lh:true},
  NRT:{avg:620,pop:8,name:"Tokyo",      country:"Japan",      region:"Asia",        emoji:"⛩️",lh:true},
  SIN:{avg:480,pop:8,name:"Singapore",  country:"Singapore",  region:"Asia",        emoji:"🦁",lh:true},
  KUL:{avg:450,pop:7,name:"Kuala Lumpur",country:"Malaysia",  region:"Asia",        emoji:"🏙️",lh:true},
  HKT:{avg:540,pop:7,name:"Phuket",     country:"Thailand",   region:"Asia",        emoji:"🤿",lh:true},
  JFK:{avg:380,pop:9,name:"New York",   country:"USA",        region:"Americas",    emoji:"🗽",lh:true},
  LAX:{avg:420,pop:8,name:"Los Angeles",country:"USA",        region:"Americas",    emoji:"🎬",lh:true},
  MIA:{avg:390,pop:7,name:"Miami",      country:"USA",        region:"Americas",    emoji:"🌊",lh:true},
  YYZ:{avg:350,pop:7,name:"Toronto",    country:"Canada",     region:"Americas",    emoji:"🍁",lh:true},
  CPT:{avg:520,pop:7,name:"Cape Town",  country:"S. Africa",  region:"Africa",      emoji:"🦁",lh:true},
  NBO:{avg:490,pop:6,name:"Nairobi",    country:"Kenya",      region:"Africa",      emoji:"🦒",lh:true},
  SYD:{avg:780,pop:8,name:"Sydney",     country:"Australia",  region:"Oceania",     emoji:"🦘",lh:true},
  MEL:{avg:800,pop:7,name:"Melbourne",  country:"Australia",  region:"Oceania",     emoji:"☕",lh:true},
};

function ddmm(s){const p=String(s||"").slice(0,10).split("-");return p.length===3?p[2]+p[1]:"";}
function addDays(s,n){const d=new Date(String(s).slice(0,10));d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function nextTue(){const d=new Date();d.setDate(d.getDate()+14);while(d.getDay()!==2)d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
function bookUrl(o,d,dep,ret){const sd=dep||nextTue();const sr=ret||addDays(sd,7);return `https://www.aviasales.com/search/${o}${ddmm(sd)}${d}${ddmm(sr)}21?marker=${MARKER}&currency=GBP&locale=en-GB`;}
function upsellUrl(d){return `/upsell.html?${new URLSearchParams({origin:d.origin_code,dest:d.dest_code,price:d.price,typical:d.typical_price,book_url:d.booking_url})}`;}

function sbGet(path){
  if(!SB_URL||!SB_KEY)return Promise.resolve(null);
  return new Promise(res=>{
    const url=new URL(SB_URL+"/rest/v1"+path);
    const req=https.get({hostname:url.hostname,path:url.pathname+url.search,headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Accept":"application/json"}},r=>{
      let body="";r.on("data",c=>body+=c);r.on("end",()=>{try{res(JSON.parse(body));}catch{res(null);}});
    });
    req.on("error",()=>res(null));req.setTimeout(5000,()=>{req.destroy();res(null);});
  });
}

function fetchJson(url){
  return new Promise((res,rej)=>{
    const req=https.get(url,{headers:{"X-Access-Token":TP_TOKEN||"","User-Agent":"TripHunt/3.0"}},r=>{
      let body="";r.on("data",c=>body+=c);r.on("end",()=>{try{res(JSON.parse(body));}catch{rej(new Error("bad_json"));}});
    });
    req.on("error",rej);req.setTimeout(12000,()=>{req.destroy();rej(new Error("timeout"));});
  });
}

function getCurated(origin,limit){
  const C={
    LHR:[{d:"NRT",p:349,a:"JAL",c:1},{d:"JFK",p:289,a:"Virgin Atlantic",c:0},{d:"DPS",p:390,a:"Singapore Airlines",c:1},{d:"BKK",p:299,a:"Thai Airways",c:1},{d:"BCN",p:79,a:"Vueling",c:0},{d:"LIS",p:72,a:"TAP",c:0},{d:"DXB",p:249,a:"Emirates",c:0},{d:"CPT",p:349,a:"British Airways",c:1},{d:"AMS",p:59,a:"KLM",c:0},{d:"ATH",p:109,a:"easyJet",c:0},{d:"FCO",p:89,a:"Ryanair",c:0},{d:"PRG",p:64,a:"Ryanair",c:0}],
    LGW:[{d:"BCN",p:54,a:"Vueling",c:0},{d:"PMI",p:62,a:"easyJet",c:0},{d:"DXB",p:229,a:"flydubai",c:0},{d:"TFS",p:139,a:"TUI",c:0},{d:"LIS",p:69,a:"TAP",c:0},{d:"AGP",p:69,a:"easyJet",c:0},{d:"JFK",p:309,a:"Norwegian",c:0}],
    MAN:[{d:"JFK",p:210,a:"American Airlines",c:0},{d:"DXB",p:149,a:"Emirates",c:0},{d:"BCN",p:44,a:"Ryanair",c:0},{d:"PMI",p:58,a:"Jet2",c:0},{d:"AYT",p:84,a:"Jet2",c:0},{d:"ATH",p:105,a:"Ryanair",c:1},{d:"DPS",p:430,a:"Singapore Airlines",c:1}],
    BHX:[{d:"DXB",p:199,a:"Emirates",c:0},{d:"BCN",p:49,a:"Ryanair",c:0},{d:"MAD",p:59,a:"Ryanair",c:0},{d:"PMI",p:64,a:"Jet2",c:0},{d:"TFS",p:129,a:"Jet2",c:0}],
    EDI:[{d:"JFK",p:249,a:"Norwegian",c:0},{d:"BCN",p:49,a:"Ryanair",c:0},{d:"DXB",p:269,a:"Emirates",c:1},{d:"AMS",p:64,a:"KLM",c:0},{d:"FCO",p:89,a:"Ryanair",c:1}],
    BRS:[{d:"LIS",p:44,a:"easyJet",c:0},{d:"BCN",p:49,a:"easyJet",c:0},{d:"PMI",p:58,a:"easyJet",c:0},{d:"DXB",p:259,a:"Emirates",c:1},{d:"AMS",p:74,a:"KLM",c:0}],
    GLA:[{d:"BCN",p:59,a:"Ryanair",c:0},{d:"MAD",p:69,a:"Ryanair",c:1},{d:"DXB",p:279,a:"Emirates",c:1},{d:"LIS",p:79,a:"easyJet",c:1}],
    LBA:[{d:"BCN",p:64,a:"Jet2",c:0},{d:"PMI",p:69,a:"Jet2",c:0},{d:"AYT",p:94,a:"Jet2",c:0}],
    NCL:[{d:"BCN",p:59,a:"easyJet",c:0},{d:"AMS",p:79,a:"KLM",c:0},{d:"DXB",p:289,a:"Emirates",c:1}],
  };
  const rows=(C[origin]||C.LHR).slice(0,limit);
  return rows.map(r=>{
    const rt=ROUTES[r.d];if(!rt)return null;
    const dep=nextTue();const ret=addDays(dep,7);
    const ratio=r.p/rt.avg;const disc=Math.max(0,1-ratio);
    const score=Math.min(99,Math.round((disc*50+rt.pop/10*30+10)*0.9));
    const tier=score>=80?"exceptional":score>=65?"great":"good";
    const d={slug:`${origin.toLowerCase()}-to-${rt.name.toLowerCase().replace(/\s+/g,"-")}-${r.p}`,origin_code:origin,origin_city:origin,dest_code:r.d,dest_name:rt.name,dest_country:rt.country,dest_region:rt.region,dest_emoji:rt.emoji,price:r.p,typical_price:rt.avg,saving_pct:Math.round(disc*100),saving_amount:Math.round(rt.avg-r.p),price_vs_avg:Math.round(ratio*100),deal_score:score,deal_tier:tier,deal_label:score>=80?"🔥 Exceptional Deal":score>=65?"⚡ Great Deal":"✓ Good Price",deal_badge:score>=80?"EXCEPTIONAL":score>=65?"GREAT DEAL":"GOOD",is_error_fare:ratio<=0.40,is_exceptional:score>=80,longhaul:rt.lh,airline:r.a,stops:r.c,depart_date:dep,return_date:ret,booking_url:bookUrl(origin,r.d,dep,ret),deal_url:`https://www.triphunt.org/deal/${origin.toLowerCase()}-to-${rt.name.toLowerCase().replace(/\s+/g,"-")}-${r.p}`,_source:"fallback"};
    d.upsell_url=upsellUrl(d);return d;
  }).filter(Boolean);
}

async function getLiveDeals(origin,limit){
  if(!TP_TOKEN)return null;
  try{
    const q=new URLSearchParams({origin,currency:"GBP",limit:limit*2,one_way:"false",token:TP_TOKEN});
    const raw=await fetchJson(`https://api.travelpayouts.com/aviasales/v3/grouped_prices?${q}`);
    if(!raw?.data)return null;
    const items=[];
    for(const x of Object.values(raw.data)){
      const dest=(x.destination||x.iata||"").toUpperCase();
      const rt=ROUTES[dest];if(!dest||!x.price||!rt)continue;
      const ratio=x.price/rt.avg;const disc=Math.max(0,1-ratio);
      const score=Math.min(99,Math.round((disc*50+rt.pop/10*30+8)*0.9));
      if(score<50)continue;
      const dep=x.depart_date||nextTue();const ret=x.return_date||addDays(dep,7);
      const bu=x.link?`https://www.aviasales.com${x.link}?marker=${MARKER}&currency=GBP&locale=en-GB`:bookUrl(origin,dest,dep,ret);
      const tier=score>=80?"exceptional":score>=65?"great":"good";
      const d={slug:`${origin.toLowerCase()}-to-${rt.name.toLowerCase().replace(/\s+/g,"-")}-${x.price}`,origin_code:origin,origin_city:origin,dest_code:dest,dest_name:rt.name,dest_country:rt.country,dest_region:rt.region,dest_emoji:rt.emoji,price:x.price,typical_price:rt.avg,saving_pct:Math.round(disc*100),saving_amount:Math.round(rt.avg-x.price),price_vs_avg:Math.round(ratio*100),deal_score:score,deal_tier:tier,deal_label:score>=80?"🔥 Exceptional Deal":score>=65?"⚡ Great Deal":"✓ Good Price",deal_badge:score>=80?"EXCEPTIONAL":score>=65?"GREAT DEAL":"GOOD",is_error_fare:ratio<=0.40,is_exceptional:score>=80,longhaul:rt.lh,airline:x.airline||"",stops:x.transfers??0,depart_date:dep,return_date:ret,booking_url:bu,deal_url:`https://www.triphunt.org/deal/${origin.toLowerCase()}-to-${rt.name.toLowerCase().replace(/\s+/g,"-")}-${x.price}`,_source:"live_api"};
      d.upsell_url=upsellUrl(d);items.push(d);
    }
    return items.sort((a,b)=>b.deal_score-a.deal_score).slice(0,limit);
  }catch{return null;}
}

exports.handler=async(event)=>{
  if(event.httpMethod==="OPTIONS")return{statusCode:200,headers:CORS,body:""};
  const p=event.queryStringParameters||{};
  const type=(p.type||"all");
  const origin=(p.origin||"LHR").toUpperCase();
  const region=p.region||null;
  const limit=Math.min(50,parseInt(p.limit)||12);
  const ck=`${type}:${origin}:${region||"all"}:${limit}`;
  const cached=cacheGet(ck);
  if(cached)return{statusCode:200,headers:{...CORS,"X-Cache":"HIT"},body:JSON.stringify(cached)};

  let deals=[],source="fallback";

  // 1. Supabase (pre-scored by dealRadar)
  if(SB_URL&&SB_KEY){
    try{
      let q=`/deals?active=eq.true&order=deal_score.desc&limit=${limit*2}`;
      if(type==="error")q+="&is_error_fare=eq.true";
      else if(type==="exceptional")q+="&is_exceptional=eq.true";
      if(p.origin||type==="from_airport")q+=`&origin_code=eq.${origin}`;
      if(region)q+=`&dest_region=eq.${encodeURIComponent(region)}`;
      const rows=await sbGet(q);
      if(Array.isArray(rows)&&rows.length>0){
        deals=rows.map(d=>({...d,upsell_url:upsellUrl(d)}));
        source="supabase";
      }
    }catch(e){console.warn("Supabase:",e.message);}
  }

  // 2. Live API
  if(!deals.length){const live=await getLiveDeals(origin,limit);if(live?.length){deals=live;source="live_api";}}

  // 3. Curated
  if(!deals.length){deals=getCurated(origin,limit);source="fallback";}

  // Post-filter by type
  if(type==="error")        deals=deals.filter(d=>d.is_error_fare);
  else if(type==="exceptional") deals=deals.filter(d=>d.is_exceptional);
  else if(type==="drops")   deals=deals.filter(d=>d.saving_pct>=20).sort((a,b)=>b.saving_pct-a.saving_pct);
  else if(type==="top")     deals=deals.sort((a,b)=>b.deal_score-a.deal_score);
  else if(type==="longhaul") deals=deals.filter(d=>d.longhaul);

  const result={success:true,data:deals.slice(0,limit),_source:source,_total:deals.length,origin,type};
  cacheSet(ck,result);
  return{statusCode:200,headers:{...CORS,"X-Cache":"MISS"},body:JSON.stringify(result)};
};
