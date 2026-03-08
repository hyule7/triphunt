// TripHunt — analytics.js
// Unified event tracking: GA4 + Plausible + internal revenue attribution
// Usage: TH.Analytics.track('deal_clicked', { destination: 'BCN', price: 89 })

(function(root) {
  "use strict";

  // ── Session ID ───────────────────────────────────────────────────
  function sessionId() {
    let id = sessionStorage.getItem("th_sid");
    if (!id) {
      id = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
      sessionStorage.setItem("th_sid", id);
    }
    return id;
  }

  // ── Core track function ──────────────────────────────────────────
  function track(event, props) {
    props = props || {};
    const payload = {
      event,
      session_id: sessionId(),
      page:       window.location.pathname,
      referrer:   document.referrer || "",
      ts:         Date.now(),
      ...props
    };

    // GA4
    if (window.gtag) {
      try { window.gtag("event", event, props); } catch(e) {}
    }

    // Plausible (privacy-friendly — no cookie banner needed)
    if (window.plausible) {
      try { window.plausible(event, { props }); } catch(e) {}
    }

    // Internal revenue attribution for booking events
    if (event === "booking_redirect") {
      _trackConversion(payload);
    }

    // Debug mode
    if (window.TH_DEBUG) {
      console.log("[TH Analytics]", event, payload);
    }
  }

  // ── Revenue attribution ──────────────────────────────────────────
  function _trackConversion(payload) {
    if (!navigator.sendBeacon) {
      fetch("/.netlify/functions/trackConversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
      return;
    }
    // sendBeacon works even if page navigates away
    navigator.sendBeacon(
      "/.netlify/functions/trackConversion",
      JSON.stringify(payload)
    );
  }

  // ── Booking URL builder with click tracking ──────────────────────
  function buildBookingUrl(orig, dest, dep, ret, adults, price, airline) {
    adults = adults || 2;
    function ddmm(s) {
      if (!s) return "";
      const p = String(s).slice(0,10).split("-");
      return p.length === 3 ? p[2]+p[1] : "";
    }
    function defaultDep() {
      const d = new Date(); d.setDate(d.getDate()+21);
      while(d.getDay() !== 2) d.setDate(d.getDate()+1);
      return d.toISOString().slice(0,10);
    }
    function defaultRet(dep) {
      const d = new Date(dep); d.setDate(d.getDate()+7);
      return d.toISOString().slice(0,10);
    }
    const d = dep || defaultDep();
    const r = ret || defaultRet(d);
    const url = "https://www.aviasales.com/search/" +
      orig + ddmm(d) + dest + ddmm(r) + adults + "1" +
      "?marker=499405&currency=GBP&locale=en-GB";
    return url;
  }

  // ── Auto-track clicks on booking links ───────────────────────────
  function initAutoTracking() {
    // Track all booking redirect clicks
    document.addEventListener("click", function(e) {
      const link = e.target.closest("a[href*='aviasales.com'], .deal-book-btn, .btn-result-book, [data-track]");
      if (!link) return;

      const dest   = link.dataset.dest    || link.closest("[data-dest]")?.dataset.dest || "";
      const price  = link.dataset.price   || link.closest("[data-price]")?.dataset.price || 0;
      const origin = link.dataset.origin  || link.closest("[data-origin]")?.dataset.origin || "LHR";
      const score  = link.dataset.score   || link.closest("[data-score]")?.dataset.score || 0;
      const trackEvent = link.dataset.track || "booking_redirect";

      track(trackEvent, {
        destination: dest,
        origin:      origin,
        price:       parseInt(price) || 0,
        deal_score:  parseInt(score) || 0,
        href:        link.href || "",
      });
    });

    // Track search form submissions
    document.addEventListener("submit", function(e) {
      const form = e.target.closest("[data-track-search]");
      if (!form) return;
      const origin = form.querySelector("[name='origin'], #origin, #heroOrigin")?.value || "";
      const dest   = form.querySelector("[name='dest'], #destination, #heroDest")?.value || "";
      track("search_performed", { origin, destination: dest });
    });

    // Track page view with metadata
    track("page_view", {
      title: document.title,
      path:  window.location.pathname,
    });
  }

  // ── Wishlist tracking helpers ────────────────────────────────────
  function trackWishlist(action, deal) {
    track(action === "add" ? "wishlist_added" : "wishlist_removed", {
      destination: deal.destination,
      price:       deal.price,
      origin:      deal.origin || "LHR",
    });
  }

  // ── Alert tracking ───────────────────────────────────────────────
  function trackAlert(origin, dest, targetPrice) {
    track("price_alert_created", { origin, destination: dest, target_price: targetPrice });
  }

  // ── Share tracking ───────────────────────────────────────────────
  function trackShare(platform, dest, price) {
    track("share_deal", { platform, destination: dest, price });
  }

  // ── Expose ───────────────────────────────────────────────────────
  root.TH = root.TH || {};
  root.TH.Analytics = { track, trackWishlist, trackAlert, trackShare, buildBookingUrl, sessionId };

  // Auto-init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoTracking);
  } else {
    initAutoTracking();
  }

})(window);
