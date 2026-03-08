// TripHunt — packages.js
// Package Deal Engine: loads flight + hotel packages, renders cards.
// Flight links → Aviasales. Hotel links → Booking.com.

(function() {

  const MARKER = "499405";

  const DEST_PHOTOS = {
    BCN:"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80",
    MAD:"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80",
    LIS:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
    FCO:"https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80",
    AMS:"https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80",
    ATH:"https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80",
    PRG:"https://images.unsplash.com/photo-1541849546-216549ae216d?w=600&q=80",
    VIE:"https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&q=80",
    DXB:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
    AYT:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    PMI:"https://images.unsplash.com/photo-1578997519572-be31de4bc394?w=600&q=80",
    JFK:"https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=600&q=80",
    BKK:"https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80",
    NRT:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  };
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80";

  // ── Build package card HTML ────────────────────────────────────
  function buildPackageCard(pkg) {
    const dest       = (pkg.destination || "").toUpperCase();
    const destName   = pkg.dest_name || dest;
    const country    = pkg.country   || "";
    const nights     = pkg.nights    || 7;
    const adults     = pkg.adults    || 2;
    const flightPP   = Math.round(pkg.flight_price || 0);
    const hotelTotal = Math.round(pkg.hotel_price  || 0);
    const totalPP    = Math.round(pkg.total_per_person || (flightPP + hotelTotal / Math.max(1, Math.ceil(adults/2))));
    const photo      = DEST_PHOTOS[dest] || FALLBACK_IMG;

    const dep = pkg.depart_date || "";
    const ret = pkg.return_date || "";
    const depStr = dep ? new Date(dep).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "Flexible";
    const retStr = ret ? new Date(ret).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "";

    // CRITICAL: flight link = https://www.aviasales.com + pkg.link
    const flightUrl = pkg.link
      ? "https://www.aviasales.com" + pkg.link + "?marker=" + MARKER + "&currency=GBP&locale=en-GB"
      : pkg.flight_url || "#";

    const hotelUrl = pkg.hotel_url || "#";

    const badge = flightPP < 100
      ? `<div class="th-pkg-badge" style="background:rgba(16,185,129,.9);color:#fff">🔥 Hot Deal</div>`
      : flightPP < 200
      ? `<div class="th-pkg-badge" style="background:rgba(124,106,247,.9);color:#fff">✓ Good Value</div>`
      : `<div class="th-pkg-badge" style="background:rgba(245,158,11,.9);color:#fff">✨ Popular</div>`;

    const saving = Math.round(totalPP * adults * 0.1);

    return `
      <div class="th-pkg-card">
        <div class="th-pkg-card-img">
          <img src="${photo}" alt="${destName}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'">
          ${badge}
        </div>
        <div class="th-pkg-card-body">
          <div class="th-pkg-card-dest">${destName}</div>
          <div class="th-pkg-card-sub">${country} · ${nights} nights · ${adults} adult${adults !== 1 ? "s" : ""}</div>

          ${dep ? `<div style="font-size:11px;font-weight:700;color:#2563eb;margin-bottom:10px">📅 ${depStr}${retStr ? " → " + retStr : ""}</div>` : ""}

          <div class="th-pkg-breakdown">
            <div class="th-pkg-line">
              <span class="th-pkg-line-label">✈️ Flights (×${adults})</span>
              <span class="th-pkg-line-val">£${(flightPP * adults).toLocaleString()}</span>
            </div>
            <div class="th-pkg-line">
              <span class="th-pkg-line-label">🏨 Hotel (${nights} nights)</span>
              <span class="th-pkg-line-val">£${hotelTotal.toLocaleString()}</span>
            </div>
            <div class="th-pkg-line" style="font-size:11px;color:#8b9cbf">
              <span>🎉 Bundle saves approx</span>
              <span>~£${saving}</span>
            </div>
          </div>

          <div class="th-pkg-total">
            <span>Total (${adults} person${adults !== 1 ? "s" : ""})</span>
            <span class="th-pkg-total-val">£${(totalPP * adults).toLocaleString()}</span>
          </div>
          <div style="font-size:11px;color:#8b9cbf;margin-bottom:14px;text-align:right">£${totalPP}/person</div>

          <div class="th-pkg-btns">
            <a class="th-pkg-btn flight" href="${flightUrl}" target="_blank" rel="noopener">
              ✈ Flights from £${flightPP}
            </a>
            <a class="th-pkg-btn hotel" href="${hotelUrl}" target="_blank" rel="noopener">
              🏨 Hotels
            </a>
          </div>
        </div>
      </div>`;
  }

  // ── Load packages ─────────────────────────────────────────────
  async function loadPackages(containerId, options) {
    const container = document.getElementById(containerId || "packagesGrid");
    if (!container) return;

    TH_UI.injectStyles();

    const opts   = options || {};
    const origin = opts.origin  || container.dataset.origin  || "LHR";
    const nights = opts.nights  || container.dataset.nights  || "7";
    const adults = opts.adults  || container.dataset.adults  || "2";
    const dep    = opts.depart_date || "";
    const ret    = opts.return_date || "";
    const limit  = parseInt(opts.limit || container.dataset.limit || "6");

    container.innerHTML = `<div class="th-packages-grid">${TH_UI.packageSkeleton(Math.min(limit, 4))}</div>`;

    try {
      const q = new URLSearchParams({ origin, nights, adults, limit });
      if (dep) q.set("depart_date", dep);
      if (ret) q.set("return_date",  ret);

      const res = await fetch(`/.netlify/functions/getPackages?${q}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const pkgs = (json.data || []).filter(p => p && p.total_per_person > 0).slice(0, limit);

      if (!pkgs.length) {
        container.innerHTML = TH_UI.errorHtml("No packages found.", () => loadPackages(containerId, options));
        return;
      }

      const countEl = document.getElementById(containerId + "-count");
      if (countEl) countEl.textContent = pkgs.length + " package" + (pkgs.length !== 1 ? "s" : "");

      container.innerHTML = `<div class="th-packages-grid">${pkgs.map(buildPackageCard).join("")}</div>`;
      injectPackageGridStyles();

    } catch(err) {
      console.warn("[TripHunt] loadPackages error:", err.message);
      container.innerHTML = TH_UI.errorHtml("Couldn't load packages.", () => loadPackages(containerId, options));
    }
  }

  function injectPackageGridStyles() {
    if (document.getElementById("th-pkg-grid-styles")) return;
    const s = document.createElement("style");
    s.id = "th-pkg-grid-styles";
    s.textContent = `
      .th-packages-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
      .th-pkg-badge { position:absolute; top:12px; left:12px; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:800; }
      .th-pkg-card-img { position: relative; }
      @media(max-width:640px) { .th-packages-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(s);
  }

  // ── Auto-init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    TH_UI.injectStyles();
    const el = document.getElementById("packagesGrid");
    if (el) loadPackages("packagesGrid");
  });

  window.TH_PACKAGES = { loadPackages, buildPackageCard };

})();
