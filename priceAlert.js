// TripHunt - checkPriceAlerts.js
// Netlify Scheduled Function - runs daily at 7am UTC
// netlify.toml: [functions.checkPriceAlerts] schedule = "0 7 * * *"

const { handler: alertHandler } = require("./priceAlert");

exports.handler = async function() {
  console.log("Running scheduled price alert check:", new Date().toISOString());
  const result = await alertHandler({
    httpMethod: "GET",
    queryStringParameters: { action: "check" }
  });
  console.log("Check complete:", result.body);
  return { statusCode: 200 };
};
