// TripHunt — mobile-nav.js
// Bottom tab bar for mobile (<768px), pull-to-refresh, tap target enforcement

(function() {
  "use strict";

  const TABS = [
    { href:"/",              icon:"🏠", label:"Home"     },
    { href:"/inspire.html",  icon:"✨", label:"Inspire"  },
    { href:"/trending.html", icon:"🔥", label:"Trending" },
    { href:"/search.html",   icon:"🔍", label:"Search"   },
    { href:"/account.html",  icon:"👤", label:"Account"  },
  ];

  function currentPath() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p;
  }

  function isActive(href) {
    const p = currentPath();
    if (href === "/" ) return p === "/" || p === "/index.html";
    return p === href || p === href.replace(".html","");
  }

  function injectBottomNav() {
    // Only on mobile
    const CSS = `
      #th-mobile-nav {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 1000;
        background: rgba(13,13,20,0.97);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255,255,255,0.08);
        padding: 8px 0 max(8px, env(safe-area-inset-bottom));
      }
      #th-mobile-nav ul {
        display: flex;
        list-style: none;
        margin: 0; padding: 0;
      }
      #th-mobile-nav li {
        flex: 1;
      }
      #th-mobile-nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 4px;
        text-decoration: none;
        color: rgba(155,155,192,0.8);
        font-family: 'DM Sans', sans-serif;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.3px;
        min-height: 48px;
        justify-content: center;
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
        border-radius: 12px;
        margin: 0 3px;
      }
      #th-mobile-nav a.active {
        color: #60a5fa;
        background: rgba(59,130,246,0.1);
      }
      #th-mobile-nav a:active {
        background: rgba(255,255,255,0.06);
      }
      #th-mobile-nav .tab-icon {
        font-size: 20px;
        line-height: 1;
      }
      @media (max-width: 767px) {
        #th-mobile-nav { display: block; }
        body { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
        .nav { display: none !important; }
      }
      @media (min-width: 768px) {
        #th-mobile-nav { display: none !important; }
      }
    `;

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const nav = document.createElement("nav");
    nav.id = "th-mobile-nav";
    nav.setAttribute("role","navigation");
    nav.setAttribute("aria-label","Main navigation");

    const ul = document.createElement("ul");
    TABS.forEach(tab => {
      const li = document.createElement("li");
      const a  = document.createElement("a");
      a.href = tab.href;
      if (isActive(tab.href)) a.classList.add("active");
      a.innerHTML = `<span class="tab-icon">${tab.icon}</span><span>${tab.label}</span>`;
      li.appendChild(a);
      ul.appendChild(li);
    });

    nav.appendChild(ul);
    document.body.appendChild(nav);
  }

  // ── Pull to refresh ──────────────────────────────────────────────
  function initPullToRefresh(onRefresh) {
    if (typeof onRefresh !== "function") return;
    if (!window.matchMedia("(max-width:767px)").matches) return;

    let startY = 0, pulling = false, indicator = null;

    function createIndicator() {
      const el = document.createElement("div");
      el.id = "th-ptr";
      el.style.cssText = "position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-60px);z-index:2000;background:rgba(13,13,20,.95);border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:8px 20px;font-size:13px;font-weight:700;color:#60a5fa;transition:transform .2s;pointer-events:none;backdrop-filter:blur(12px);";
      el.textContent = "↓ Pull to refresh";
      document.body.appendChild(el);
      return el;
    }

    document.addEventListener("touchstart", e => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
        if (!indicator) indicator = createIndicator();
      }
    }, { passive: true });

    document.addEventListener("touchmove", e => {
      if (!pulling) return;
      const dist = e.touches[0].clientY - startY;
      if (dist > 0 && dist < 120) {
        const progress = Math.min(dist / 80, 1);
        indicator.style.transform = `translateX(-50%) translateY(${-60 + dist * 0.8}px)`;
        indicator.textContent = progress >= 1 ? "↑ Release to refresh" : "↓ Pull to refresh";
      }
    }, { passive: true });

    document.addEventListener("touchend", e => {
      if (!pulling) return;
      const dist = e.changedTouches[0].clientY - startY;
      pulling = false;
      if (indicator) {
        indicator.style.transform = "translateX(-50%) translateY(-60px)";
        setTimeout(() => {
          if (indicator) { indicator.remove(); indicator = null; }
        }, 300);
      }
      if (dist > 80) {
        onRefresh();
      }
      startY = 0;
    }, { passive: true });
  }

  // ── Tap target enforcement ────────────────────────────────────────
  // Any interactive element smaller than 44×44px gets a larger hit area
  function fixTapTargets() {
    if (!window.matchMedia("(max-width:767px)").matches) return;
    const MIN = 44;
    const selectors = "button, a, [role='button'], input[type='checkbox'], input[type='radio'], select";
    document.querySelectorAll(selectors).forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN || rect.height < MIN) {
        el.style.minHeight = MIN + "px";
        el.style.minWidth  = MIN + "px";
        el.style.display   = el.style.display || "inline-flex";
        el.style.alignItems    = "center";
        el.style.justifyContent = "center";
      }
    });
  }

  // ── Swipe gestures for deal cards ─────────────────────────────────
  // Makes any element with class "th-swipeable" swipeable
  function initSwipeGestures() {
    document.querySelectorAll(".th-swipeable").forEach(el => {
      let startX = 0, startY = 0, moved = false;
      el.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved  = false;
      }, { passive: true });
      el.addEventListener("touchmove", e => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy)) moved = true; // horizontal swipe
      }, { passive: true });
      el.addEventListener("touchend", e => {
        if (!moved) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 60)  el.dispatchEvent(new CustomEvent("swipe-right"));
        if (dx < -60) el.dispatchEvent(new CustomEvent("swipe-left"));
      });
    });
  }

  // ── Viewport meta enforcement ──────────────────────────────────────
  function fixViewport() {
    let meta = document.querySelector("meta[name='viewport']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init(options) {
    options = options || {};
    fixViewport();
    injectBottomNav();
    if (typeof options.onRefresh === "function") initPullToRefresh(options.onRefresh);
    // Fix tap targets after DOM settles
    if (document.readyState === "complete") fixTapTargets();
    else window.addEventListener("load", fixTapTargets);
    // Init swipe gestures after dynamic content loads
    window.addEventListener("th:content-loaded", initSwipeGestures);
    initSwipeGestures();
  }

  // Expose
  window.TH = window.TH || {};
  window.TH.MobileNav = { init, fixTapTargets, initSwipeGestures, initPullToRefresh };

  // Auto-init if data-auto attribute present on script tag
  document.addEventListener("DOMContentLoaded", () => {
    const script = document.querySelector("script[src*='mobile-nav']");
    if (script && script.dataset.auto !== undefined) {
      init({ onRefresh: () => window.location.reload() });
    } else {
      // Always inject the nav
      injectBottomNav();
    }
  });

})();
