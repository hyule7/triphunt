// TripHunt — auth.js
// User authentication via Supabase Auth
// POST { action, email, password, name? } → { success, user?, token?, error? }

const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type":                 "application/json",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // anon key works for auth
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const SITE_URL     = process.env.SITE_URL || "https://triphunt.org";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch(e) { return err("Invalid JSON"); }

  const { action, email, password, name, token } = body;

  switch(action) {
    case "signup":   return signup(email, password, name);
    case "login":    return login(email, password);
    case "logout":   return logout(token);
    case "me":       return getUser(token);
    case "reset":    return resetPassword(email);
    default:         return err("Unknown action");
  }
};

async function signup(email, password, name) {
  if (!email || !password) return err("Email and password required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Invalid email");
  if (password.length < 6) return err("Password must be at least 6 characters");

  try {
    const res = await supabaseAuth("POST", "/auth/v1/signup", {
      email, password,
      data: { name: name || email.split("@")[0] },
    });

    if (res.error) return err(res.error.message || "Signup failed");

    // Also create subscriber record
    if (res.user?.id) {
      await supabaseRest("POST", "/rest/v1/users", {
        id:         res.user.id,
        email,
        name:       name || email.split("@")[0],
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return ok({ user: sanitiseUser(res.user), token: res.access_token, message: "Account created! Check your email to confirm." });
  } catch(e) { return err(e.message); }
}

async function login(email, password) {
  if (!email || !password) return err("Email and password required");
  try {
    const res = await supabaseAuth("POST", "/auth/v1/token?grant_type=password", { email, password });
    if (res.error) return err(res.error.message || "Login failed");
    return ok({ user: sanitiseUser(res.user), token: res.access_token, refresh_token: res.refresh_token });
  } catch(e) { return err(e.message); }
}

async function logout(token) {
  if (!token) return ok({ message: "Logged out" });
  try {
    await supabaseAuth("POST", "/auth/v1/logout", {}, token);
    return ok({ message: "Logged out" });
  } catch(e) { return ok({ message: "Logged out" }); }
}

async function getUser(token) {
  if (!token) return err("No token", 401);
  try {
    const res = await supabaseAuth("GET", "/auth/v1/user", null, token);
    if (res.error) return err(res.error.message, 401);

    // Get saved wishlist from DB
    let wishlist = [];
    try {
      const wl = await supabaseRest("GET", "/rest/v1/wishlists?user_id=eq." + res.id + "&select=*", null, token);
      wishlist = Array.isArray(wl) ? wl : [];
    } catch(e) {}

    return ok({ user: sanitiseUser(res), wishlist });
  } catch(e) { return err(e.message, 401); }
}

async function resetPassword(email) {
  if (!email) return err("Email required");
  try {
    await supabaseAuth("POST", "/auth/v1/recover", { email, redirect_to: SITE_URL + "/reset-password" });
    return ok({ message: "Password reset email sent" });
  } catch(e) { return err(e.message); }
}

function sanitiseUser(user) {
  if (!user) return null;
  return {
    id:    user.id,
    email: user.email,
    name:  user.user_metadata?.name || user.email?.split("@")[0],
    confirmed: !!user.email_confirmed_at,
  };
}

// ── Supabase Auth HTTP ─────────────────────────────────────────────
function supabaseAuth(method, path, body, token) {
  return supabaseReq(method, path, body, {
    "apikey":        SUPABASE_ANON,
    "Authorization": token ? "Bearer " + token : "Bearer " + SUPABASE_ANON,
    "Content-Type":  "application/json",
  });
}

function supabaseRest(method, path, body, token) {
  return supabaseReq(method, path, body, {
    "apikey":        SUPABASE_KEY,
    "Authorization": "Bearer " + (token || SUPABASE_KEY),
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
  });
}

function supabaseReq(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url     = new URL(SUPABASE_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request({ hostname:url.hostname, path:url.pathname+url.search, method, headers }, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch(e) { resolve({}); } });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Wishlist sync ──────────────────────────────────────────────────
// POST { action: "wishlist_save", token, deal } → saved
// POST { action: "wishlist_remove", token, destination } → removed
// (handled in a separate wishlist.js function for clarity)

function ok(data) { return { statusCode:200, headers:CORS, body:JSON.stringify({ success:true, ...data }) }; }
function err(msg, code=400) { return { statusCode:code, headers:CORS, body:JSON.stringify({ success:false, error:msg }) }; }
