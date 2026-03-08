// TripHunt — results.js
// Reads URL search params, calls searchFlights function, renders result cards.

(function() {

  const MARKER = "499405";

  const AIRLINE_NAMES = {
    fr:"Ryanair", u2:"easyJet", ba:"British Airways", vs:"Virgin Atlantic",
    tp:"TAP Portugal", ib:"Iberia", vy:"Vueling", kl:"KLM", af:"Air France",
    lh:"Lufthansa", tk:"Turkish Airlines", ek:"Emirates", fz:"flydubai",
    "2b":"airBaltic", dy:"Norwegian", w6:"Wizz Air", ls:"Jet2", by:"TUI",
    jl:"JAL", nh:"ANA", tg:"Thai Airways",
  };

  const DEST_NAMES = {
    BCN:"Barcelona", MAD:"Madrid", LIS:"Lisbon", FCO:"Rome", AMS:"Amsterdam",
    ATH:"Athens", PRG:"Prague", VIE:"Vienna", DXB:"Dubai", AYT:"Antalya",
    PMI:"Palma", TFS:"Tenerife", LPA:"Gran Canaria", FAO:"Faro", JFK:"New York",
    LAX:"Los Angeles", BKK:"Bangkok", NRT:"Tokyo", SIN:"Singapore", DBV:"Dubrovnik",
    IST:"Istanbul", ALC:"Alicante", AGP:"Malaga", HKT:"Phuket", SYD:"Sydney",
    MAN:"Manchester", LHR:"London Heathrow", LGW:"London Gatwick", EDI:"Edinburgh",
  };

  // ── Parse URL params ──────────────────────────────────────────
  function getParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      origin:      p.get("origin")      || "LHR",
      destination: p.get("destination") || "BCN",
      depart_date: p.get("depart_date") || "",
      return_date: p.get("return_date") || "",
      adults:      p.get("adults")      || "2",
    };
  }

  // ── Build a result card ───────────────────────────────────────
  function buildResultCard(flight, params, isFirst) {
    const price   = Math.round(flight.price || 0);
    const dest    = (flight.destination || params.destination).toUpperCase();
    const orig    = (flight.origin || params.origin).toUpperCase();
    const stops   = flight.number_of_changes ?? 0;
    const airline = flight.airline || "";
    const dep     = flight.depart_date || params.depart_date;
    const ret     = flight.return_date || params.return_date;
    const dur     = flight.duration
      ? Math.floor(flight.duration/60) + "h " + (flight.duration%60) + "m"
      : stops === 0 ? "Direct" : stops + " stop" + (stops > 1 ? "s" : "");
    const grade    = flight.deal_grade || "good";
    const label    = flight.deal_label || "Good Price";
    const adults   = parseInt(params.adults) || 2;
    const total    = price * adults;

    const stopsCls   = stops === 0 ? "direct" : stops === 1 ? "stop1" : "stop2";
    const stopsLabel = stops === 0 ? "✈ Direct" : stops + " stop" + (stops > 1 ? "s" : "");

    // CRITICAL: https://www.aviasales.com + deal.link
    // Route through upsell page for hotel/car cross-sell
    const rawBookUrl = flight.link
      ? "https://www.aviasales.com" + flight.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
      : flight.booking_url || "#";
    const typical  = Math.round((flight.price || 0) * 1.65);
    const bookUrl  = "/upsell.html?" + new URLSearchParams({ origin: orig, dest, price: Math.round(flight.price || 0), typical, book_url: rawBookUrl }).toString();

    const depStr = dep ? new Date(dep).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short", year:"numeric" }) : "Flexible";
    const retStr = ret ? new Date(ret).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "";
    const airlineName = AIRLINE_NAMES[airline.toLowerCase()] || airline || "Multiple airlines";
    const destName    = DEST_NAMES[dest] || dest;
    const origName    = DEST_NAMES[orig] || orig;

    return `
      <div class="th-result-card${isFirst ? " th-result-best" : ""}">
        ${isFirst ? `<div style="font-size:10px;font-weight:800;color:#10b981;margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">⭐ Cheapest fare</div>` : ""}
        <div class="th-result-route">
          <div class="th-result-airports">${orig} → ${dest}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="th-result-stops ${stopsCls}">${stopsLabel}</span>
            <span class="th-result-airline">${airlineName}</span>
            <span style="font-size:11px;color:#8b9cbf">${dur}</span>
          </div>
          <div class="th-result-dates" style="margin-top:6px">
            📅 ${depStr}${retStr ? " → " + retStr : ""}
            ${adults > 1 ? ` · ${adults} passengers` : ""}
          </div>
          <div style="margin-top:6px">${TH_UI.gradeBadge(grade, label)}</div>
        </div>
        <div class="th-result-price-col">
          <div class="th-result-price">£${price}</div>
          <div class="th-result-price-sub">per person</div>
          ${adults > 1 ? `<div style="font-size:11px;color:#8b9cbf;margin-top:2px">£${total} total</div>` : ""}
          <a class="th-result-btn" href="${bookUrl}" target="_blank" rel="noopener"
             onclick="console.log('[TripHunt] booking click', '${orig}→${dest}', £${price})">
            View Deal →
          </a>
        </div>
      </div>`;
  }

  // ── Fetch and render ──────────────────────────────────────────
  async function loadResults() {
    const grid      = document.getElementById("th-results-grid");
    const summary   = document.getElementById("th-results-summary");
    const countEl   = document.getElementById("th-results-count");
    if (!grid) return;

    TH_UI.injectStyles();
    injectResultsStyles();

    const params = getParams();

    // Update summary strip
    if (summary) {
      const origName = DEST_NAMES[params.origin]      || params.origin;
      const destName = DEST_NAMES[params.destination] || params.destination;
      const depStr   = params.depart_date ? new Date(params.depart_date).toLocaleDateString("en-GB", { day:"numeric", month:"long" }) : "";
      summary.textContent = `${origName} → ${destName}${depStr ? " · " + depStr : ""} · ${params.adults} adult${params.adults !== "1" ? "s" : ""}`;
    }

    // Show skeleton
    grid.innerHTML = TH_UI.resultSkeleton(5);

    try {
      const q = new URLSearchParams(params);
      const res = await fetch(`/.netlify/functions/searchFlights?${q}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();

      const flights = (json.data || []).filter(f => f && f.price > 0);

      if (!flights.length) {
        grid.innerHTML = TH_UI.noResultsHtml(params.origin, params.destination);
        if (countEl) countEl.textContent = "0 results";
        return;
      }

      // Sort by price
      flights.sort((a, b) => (a.price || 0) - (b.price || 0));

      if (countEl) countEl.textContent = flights.length + " result" + (flights.length !== 1 ? "s" : "");

      grid.innerHTML = flights.map((f, i) => buildResultCard(f, params, i === 0)).join("");

      // Store flights for client-side filter/sort
      if (typeof window._storeResults === 'function') window._storeResults(flights, params);

      // Best price badge in page title
      const best = flights[0];
      const bestEl = document.getElementById("th-best-price");
      if (bestEl) bestEl.textContent = "£" + Math.round(best.price);

    } catch(err) {
      console.warn("[TripHunt] loadResults error:", err.message);
      grid.innerHTML = TH_UI.errorHtml("Search failed. Please try again.", loadResults);
      if (countEl) countEl.textContent = "";
    }
  }

  function injectResultsStyles() {
    if (document.getElementById("th-results-styles")) return;
    const s = document.createElement("style");
    s.id = "th-results-styles";
    s.textContent = `
      .th-result-best { border-color: rgba(16,185,129,.3) !important; background: linear-gradient(135deg, rgba(16,185,129,.04) 0%, #0e1528 100%); }
    `;
    document.head.appendChild(s);
  }

  // ── Filter/sort controls ──────────────────────────────────────
  function sortResults(mode) {
    const cards = Array.from(document.querySelectorAll(".th-result-card"));
    const grid  = document.getElementById("th-results-grid");
    if (!grid || !cards.length) return;

    // Results are already rendered — just re-order DOM nodes
    // For a proper implementation, store data and re-render
    // This is a lightweight approach for static page sort
    document.querySelectorAll(".th-sort-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-sort="${mode}"]`);
    if (btn) btn.classList.add("active");
  }

  document.addEventListener("DOMContentLoaded", loadResults);
  window.TH_RESULTS = { loadResults, sortResults };

})();
