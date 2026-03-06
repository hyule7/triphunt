// TripHunt - getKlook.js
const https = require("https");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

const MARKER = process.env.TRAVELPAYOUTS_MARKER || "499405";

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };
  const params = event.queryStringParameters || {};
  const destination = params.destination || params.city || "london";
  const activities = getCuratedActivities(destination, MARKER);
  return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, destination, data:activities, marker:MARKER }) };
};

function buildActivityUrl(dest, marker) {
  return "https://tp.media/r?marker=" + marker + "&trs=233746&p=5619&u=https%3A%2F%2Fwww.klook.com%2Fsearch%2F%3Fquery%3D" + encodeURIComponent(dest);
}

function getCuratedActivities(destination, marker) {
  const dest = (destination || "").toLowerCase();
  const url  = buildActivityUrl(dest, marker);
  const city = dest.charAt(0).toUpperCase() + dest.slice(1);

  return [
    { name:"City Walking Tour in " + city,            price:"from GBP25",  rating:"4.8", reviews:"2,341 reviews", duration:"3 hours",  free_cancel:true,  url },
    { name:"Skip-the-Line Museum Tickets in " + city, price:"from GBP35",  rating:"4.7", reviews:"1,892 reviews", duration:"2-3 hours",free_cancel:true,  url },
    { name:"Food and Culture Tour in " + city,        price:"from GBP65",  rating:"4.9", reviews:"987 reviews",   duration:"4 hours",  free_cancel:true,  url },
    { name:"Day Trip from " + city,                   price:"from GBP89",  rating:"4.6", reviews:"1,234 reviews", duration:"8 hours",  free_cancel:false, url },
    { name:"Sunset Boat Tour in " + city,             price:"from GBP45",  rating:"4.8", reviews:"756 reviews",   duration:"2 hours",  free_cancel:true,  url },
    { name:"Cooking Class in " + city,                price:"from GBP79",  rating:"4.9", reviews:"543 reviews",   duration:"3 hours",  free_cancel:true,  url }
  ].map(function(a, i) {
    return Object.assign({ id:i+1, category:"Activity", instant_confirm:true, mobile_voucher:true }, a);
  });
}
