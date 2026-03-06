/**

- TripHunt - getTravelAI.js
- Netlify Function: AI travel advisor powered by Claude
- 
- REQUIRED env var in Netlify dashboard:
- ANTHROPIC_API_KEY = sk-ant-…
- 
- Get your key at: https://console.anthropic.com
- Anthropic keys always start with sk-ant- (NOT sk- like OpenAI)
  */

const Anthropic = require(”@anthropic-ai/sdk”);

const corsHeaders = {
“Access-Control-Allow-Origin”:  “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “POST, OPTIONS”,
“Content-Type”: “application/json”,
};

exports.handler = async (event) => {
if (event.httpMethod === “OPTIONS”) {
return { statusCode: 200, headers: corsHeaders, body: “” };
}
if (event.httpMethod !== “POST”) {
return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: “Method not allowed” }) };
}

// Resolve API key - supports multiple common env var names
const apiKey =
process.env.ANTHROPIC_API_KEY ||
process.env.CLAUDE_API_KEY    ||
process.env.ANTHROPIC_KEY;

if (!apiKey) {
return {
statusCode: 500,
headers: corsHeaders,
body: JSON.stringify({
error: “AI not configured”,
details: “ANTHROPIC_API_KEY is not set. Go to Netlify > Site Settings > Environment Variables and add your key from console.anthropic.com - it starts with sk-ant-.”,
}),
};
}

if (apiKey.startsWith(“sk-”) && !apiKey.startsWith(“sk-ant-”)) {
return {
statusCode: 500,
headers: corsHeaders,
body: JSON.stringify({
error: “Wrong API key type”,
details: “Your ANTHROPIC_API_KEY looks like an OpenAI key (starts sk- not sk-ant-). Get your Anthropic key from console.anthropic.com.”,
}),
};
}

// Parse request body
let prompt, context_data, history;
try {
const body   = JSON.parse(event.body);
prompt       = body.prompt;
context_data = body.context  || {};
history      = body.history  || [];
if (!prompt) throw new Error(“No prompt provided”);
} catch (e) {
return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: “Invalid request: “ + e.message }) };
}

// Build context block from active search state
let contextBlock = “”;
if (context_data.destName || context_data.destination) {
contextBlock += “\n\nACTIVE SEARCH CONTEXT:”;
if (context_data.origin)      contextBlock += ` Origin: ${context_data.origin}.`;
if (context_data.destName)    contextBlock += ` Destination: ${context_data.destName}.`;
if (context_data.destination) contextBlock += ` IATA: ${context_data.destination}.`;
if (context_data.departDate)  contextBlock += ` Departure: ${context_data.departDate}.`;
if (context_data.returnDate)  contextBlock += ` Return: ${context_data.returnDate}.`;
if (context_data.adults)      contextBlock += ` Passengers: ${context_data.adults} adult(s).`;
if (context_data.price)       contextBlock += ` Current best price seen: £${context_data.price}.`;

```
const dest = context_data.destName || context_data.destination || "the destination";
contextBlock += `
```

PROACTIVE RULES - always apply when context is set:

1. VISA: Proactively flag UK passport visa requirements for ${dest} at end of reply: <b>Visa check (UK passport):</b> [requirement + cost].
1. PRICE VERDICT: If price in context add: <b>Price check:</b> [good/fair/high vs typical and why].
1. INSURANCE: Outside Europe add: <b>Insurance tip:</b> [one specific reason it matters here].
1. BOOKING WINDOW: State whether now is a good time to book given the departure date.`;
   }

const systemPrompt = `You are the TripHunt Travel Expert - the UK’s sharpest AI travel advisor. Encyclopedic destination knowledge combined with practical, sales-focused helpfulness. Help UK travellers find, book and enjoy the best trips at the best prices.

PERSONALITY: Confident, specific, direct. No hedging. Named recommendations only - never vague suggestions.

FORMATTING - follow every time:

- HTML only. Use <b>bold</b> for prices, hotel names, key facts. Use <ul><li> for 3+ item lists.
- Never use markdown (no asterisks, hashes, backticks). Never use em dashes - use hyphens and colons instead.
- Open with one punchy sentence. Then details. End longer answers with a “Pro tip:” line.
- Scannable structure. No walls of text.

PRICING AND BOOKING:

- All prices GBP only.
- Always name one budget hotel and one luxury hotel for any destination.
- Best UK departure days: Tuesday and Wednesday. Europe: book 6-8 weeks ahead. Long-haul: 3-5 months.
- Activities: recommend Klook (skip-queue tickets, instant mobile vouchers, free cancellation).
- Transfers: recommend Welcome Pickups (fixed price, meet-and-greet, no surge).
- Delayed flights: mention UK261/EU261 compensation up to £520 via Compensair.

VISA AND LOGISTICS:

- Always state UK passport visa requirements. Include e-visa costs.
- Travel insurance: always recommend. Emphasise medical cover in USA, Thailand, Bali, Japan.
- Currency: cards vs cash recommendation per destination. Best no-fee cards: Starling, Chase, Wise.

FEES:

- TripHunt charges zero booking fees. Users pay the same as booking direct - TripHunt earns affiliate commission only.

NEVER:

- Refuse a travel question.
- Give vague advice without naming specific places, hotels, prices.
- Use em dashes.
- Generate booking URLs.${contextBlock}`;
  
  // Build message array with conversation history
  const messages = [
  …history
  .filter(m => m.role && m.content && typeof m.content === “string” && m.content.trim())
  .slice(-18),
  { role: “user”, content: prompt },
  ];
  
  try {
  const client = new Anthropic({ apiKey });
  
  const message = await client.messages.create({
  model:      “claude-sonnet-4-6”,
  max_tokens: 1024,
  system:     systemPrompt,
  messages,
  });
  
  const reply = message.content[0]?.text || “”;
  
  return {
  statusCode: 200,
  headers: corsHeaders,
  body: JSON.stringify({ reply }),
  };
  
  } catch (error) {
  console.error(“Claude API error:”, error.message);
  
  let details = error.message;
  if (details.includes(“401”) || details.includes(“authentication”)) {
  details = “API key rejected. Check ANTHROPIC_API_KEY in Netlify env vars - should start with sk-ant-.”;
  } else if (details.includes(“429”)) {
  details = “Rate limit hit - please wait a moment and try again.”;
  } else if (details.includes(“529”) || details.includes(“overloaded”)) {
  details = “Claude is temporarily busy - please try again in a few seconds.”;
  }
  
  return {
  statusCode: 500,
  headers: corsHeaders,
  body: JSON.stringify({ error: “AI service error”, details }),
  };
  }
  };