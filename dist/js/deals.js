// TripHunt — deals.js
// Flight Deals Engine: loads hot deals and cheap flight discoveries.
// Usage: include on any page with a #topDeals or #cheapFlights container.

(function() {

  const MARKER   = "499405";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80";

  // Destination images
  const DEST_PHOTOS = {
    BCN:"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&q=80",
    MAD:"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&q=80",
    LIS:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80",
    FCO:"https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80",
    AMS:"https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&q=80",
    ATH:"https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80",
    PRG:"https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&q=80",
    VIE:"https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&q=80",
    DXB:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
    AYT:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    PMI:"https://images.unsplash.com/photo-1578997519572-be31de4bc394?w=400&q=80",
    JFK:"https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400&q=80",
    BKK:"https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=80",
    NRT:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80",
    TFS:"https://images.unsplash.com/photo-1582721478779-0ae163c05a60?w=400&q=80",
  };

  const DEST_NAMES = {
    BCN:"Barcelona", MAD:"Madrid", LIS:"Lisbon", FCO:"Rome", AMS:"Amsterdam",
    ATH:"Athens", PRG:"Prague", VIE:"Vienna", DXB:"Dubai", AYT:"Antalya",
    PMI:"Palma", TFS:"Tenerife", LPA:"Gran Canaria", FAO:"Faro", JFK:"New York",
    LAX:"Los Angeles", BKK:"Bangkok", NRT:"Tokyo", SIN:"Singapore", DBV:"Dubrovnik",
    IST:"Istanbul", ALC:"Alicante", AGP:"Malaga", HKT:"Phuket", SYD:"Sydney",
  };

  // ── Build deal card HTML ───────────────────────────────────────
  function buildDealCard(deal) {
    const dest     = (deal.destination || "").toUpperCase();
    const origin   = (deal.origin || "LHR").toUpperCase();
    const price    = Math.round(deal.price || 0);
    const destName = DEST_NAMES[dest] || dest;
    const photo    = DEST_PHOTOS[dest] || FALLBACK_IMG;
    const dep      = deal.depart_date || "";
    const ret      = deal.return_date || "";
    const grade    = deal.deal_grade || "good";
    const label    = deal.deal_label || "✓ Good Price";
    const stops    = deal.number_of_changes ?? 0;

    // Route through upsell for cross-sell opportunity
    const rawLink  = deal.link
      ? "https://www.aviasales.com" + deal.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
      : deal.booking_url || "#";
    const typical  = Math.round((deal.price || 0) * 1.65);
    const link = "/upsell.html?" + new URLSearchParams({ origin, dest, price: Math.round(deal.price||0), typical, book_url: rawLink }).toString();

    const depStr = dep ? new Date(dep).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "Flexible";
    const retStr = ret ? new Date(ret).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "";
    const stopsLabel = stops === 0 ? "✈ Direct" : stops === 1 ? "1 stop" : stops + " stops";
    const stopsCls   = stops === 0 ? "direct" : stops === 1 ? "stop1" : "stop2";

    return `
      <a class="th-deal-card" href="${link}" target="_blank" rel="noopener">
        <div class="th-deal-card-img">
          <img src="${photo}" alt="${destName}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'">
          <div class="th-deal-card-overlay"></div>
          <div class="th-deal-card-price">£${price}</div>
          <div class="th-deal-card-grade">${TH_UI.gradeBadge(grade, label)}</div>
        </div>
        <div class="th-deal-card-body">
          <div class="th-deal-card-dest">${destName}</div>
          <div class="th-deal-card-route">${origin} → ${dest}</div>
          <div class="th-deal-card-date">📅 ${depStr}${retStr ? " → " + retStr : ""}</div>
          <div class="th-deal-card-tags">
            <span class="th-deal-tag th-result-stops ${stopsCls}">${stopsLabel}</span>
            ${deal.airline ? `<span class="th-deal-tag">${deal.airline}</span>` : ""}
            <span class="th-deal-tag">GBP</span>
          </div>
          <div class="th-deal-card-btn">View Deal →</div>
        </div>
      </a>`;
  }

  // ── Load top deals ─────────────────────────────────────────────
  async function loadDeals(containerId, origin, limit) {
    const container = document.getElementById(containerId || "topDeals");
    if (!container) return;

    TH_UI.injectStyles();
    container.innerHTML = `<div style="display:flex;gap:14px;flex-wrap:wrap">${TH_UI.dealSkeleton(limit || 6)}</div>`;

    try {
      const o   = origin || container.dataset.origin || "LHR";
      const lim = limit  || parseInt(container.dataset.limit) || 8;
      const res = await fetch(`/.netlify/functions/getDeals?origin=${o}&limit=${lim}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const deals = (json.data || []).filter(d => d && d.price > 0).slice(0, lim);

      if (!deals.length) {
        container.innerHTML = TH_UI.errorHtml("No deals available right now.", () => loadDeals(containerId, origin, limit));
        return;
      }

      container.innerHTML = `<div class="th-deals-grid">${deals.map(buildDealCard).join("")}</div>`;

    } catch(err) {
      console.warn("[TripHunt] loadDeals error:", err.message);
      container.innerHTML = TH_UI.errorHtml("Couldn't load deals right now.", () => loadDeals(containerId, origin, limit));
    }
  }

  // ── Load cheap flights (price drop discovery) ──────────────────
  function buildCheapCard(deal) {
    const dest     = (deal.destination || "").toUpperCase();
    const origin   = (deal.origin || "LHR").toUpperCase();
    const destName = DEST_NAMES[dest] || dest;
    const price    = Math.round(deal.price || 0);
    const typical  = deal.typical_price || 0;
    const saving   = deal.saving || 0;
    const pct      = deal.saving_pct || 0;
    const isDrop   = deal.is_price_drop;

    const link = deal.link
      ? "https://www.aviasales.com" + deal.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
      : deal.booking_url || "#";

    return `
      <a class="th-cheap-card" href="${link}" target="_blank" rel="noopener">
        <div>
          ${isDrop ? `<div class="th-cheap-drop-badge">🔥 Price Drop</div>` : `<div class="th-cheap-drop-badge" style="background:rgba(124,106,247,.15);color:#7c6af7">${deal.deal_label || "Good Price"}</div>`}
          <div class="th-cheap-route">${origin} → ${destName}</div>
          ${saving > 0 ? `<div class="th-cheap-saving">Typical price £${typical} · save £${saving} (${pct}%)</div>` : `<div class="th-cheap-saving">Return flights from ${origin}</div>`}
        </div>
        <div class="th-cheap-price">
          <div class="th-cheap-price-val">£${price}</div>
          ${typical > 0 ? `<div class="th-cheap-price-avg">£${typical}</div>` : ""}
        </div>
      </a>`;
  }

  async function loadCheapFlights(containerId, origin, limit) {
    const container = document.getElementById(containerId || "cheapFlights");
    if (!container) return;

    TH_UI.injectStyles();
    container.innerHTML = TH_UI.resultSkeleton(limit || 6);

    try {
      const o   = origin || container.dataset.origin || "LHR";
      const lim = limit  || parseInt(container.dataset.limit) || 8;
      const res = await fetch(`/.netlify/functions/getCheapFlights?origin=${o}&limit=${lim}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const deals = (json.data || []).filter(d => d && d.price > 0).slice(0, lim);

      if (!deals.length) {
        container.innerHTML = TH_UI.errorHtml("No cheap routes found.", () => loadCheapFlights(containerId, origin, limit));
        return;
      }

      container.innerHTML = `<div class="th-cheap-grid" style="display:flex;flex-direction:column;gap:10px">${deals.map(buildCheapCard).join("")}</div>`;

    } catch(err) {
      console.warn("[TripHunt] loadCheapFlights error:", err.message);
      container.innerHTML = TH_UI.errorHtml("Couldn't load deals.", () => loadCheapFlights(containerId, origin, limit));
    }
  }

  // ── Auto-init on DOM ready ─────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    TH_UI.injectStyles();

    // Auto-load if containers present
    const dealsEl  = document.getElementById("topDeals");
    const cheapEl  = document.getElementById("cheapFlights");

    if (dealsEl)  loadDeals("topDeals",  dealsEl.dataset.origin  || "LHR", parseInt(dealsEl.dataset.limit)  || 8);
    if (cheapEl)  loadCheapFlights("cheapFlights", cheapEl.dataset.origin || "LHR", parseInt(cheapEl.dataset.limit) || 8);
  });

  // Public API
  window.TH_DEALS = { loadDeals, loadCheapFlights, buildDealCard, buildCheapCard };

})();
