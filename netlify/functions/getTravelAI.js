// TripHunt - getTravelAI.js
const https = require("https");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:cors, body:"" };
  if (event.httpMethod !== "POST") return { statusCode:405, headers:cors, body:JSON.stringify({ error:"Method not allowed" }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode:500, headers:cors, body:JSON.stringify({ error:"ANTHROPIC_API_KEY not set" }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode:400, headers:cors, body:JSON.stringify({ error:"Invalid JSON" }) }; }

  const userMessage = body.message || body.query || "";
  const destination = body.destination || "";
  const origin      = body.origin || "London";

  if (!userMessage) return { statusCode:400, headers:cors, body:JSON.stringify({ error:"No message provided" }) };

  const systemPrompt = "You are TripHunt's AI travel advisor. Help users find cheap flights, plan trips, and discover travel deals from UK airports. Be concise, friendly and practical. Focus on UK travellers. Mention specific prices in GBP where relevant. Current context: user is travelling from " + origin + (destination ? " to " + destination : "") + ".";

  try {
    const response = await callClaude(apiKey, systemPrompt, userMessage);
    return { statusCode:200, headers:cors, body:JSON.stringify({ success:true, response }) };
  } catch(err) {
    return { statusCode:500, headers:cors, body:JSON.stringify({ error:err.message }) };
  }
};

function callClaude(apiKey, system, userMsg) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: [{ role:"user", content:userMsg }]
    });
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, function(res) {
      let b = "";
      res.on("data", function(c) { b += c; });
      res.on("end", function() {
        try {
          const data = JSON.parse(b);
          if (data.content && data.content[0]) resolve(data.content[0].text);
          else reject(new Error("Unexpected response: " + b.slice(0,200)));
        } catch(e) { reject(new Error("Invalid JSON from Claude API")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, function() { req.destroy(); reject(new Error("Claude API timeout")); });
    req.write(payload);
    req.end();
  });
}
