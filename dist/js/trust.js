// TripHunt — trust.js
// Injects trust signals anywhere on the site:
//   TH.Trust.pressBar(containerEl)       — "As seen in" logos
//   TH.Trust.liveCounter(containerEl)    — animated live bookings counter
//   TH.Trust.howItWorks(containerEl)     — 3-step explainer
//   TH.Trust.testimonials(containerEl)   — customer reviews
//   TH.Trust.badges(containerEl)         — SSL / affiliate / free badges
//   TH.Trust.injectAll(selector)         — inject everything into matching element

(function(root) {
  "use strict";

  const CSS = `
    .th-trust-wrap { font-family: 'DM Sans', sans-serif; }

    /* Press bar */
    .th-press-bar {
      background: rgba(255,255,255,.03);
      border-top: 1px solid rgba(255,255,255,.06);
      border-bottom: 1px solid rgba(255,255,255,.06);
      padding: 20px 24px;
      overflow: hidden;
      position: relative;
    }
    .th-press-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(155,155,192,.6);
      text-align: center;
      margin-bottom: 16px;
    }
    .th-press-track {
      display: flex;
      gap: 48px;
      align-items: center;
      animation: thPressScroll 30s linear infinite;
      width: max-content;
    }
    .th-press-track:hover { animation-play-state: paused; }
    @keyframes thPressScroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .th-press-item {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: rgba(245,245,255,.25);
      white-space: nowrap;
      font-style: italic;
      transition: color .2s;
      cursor: default;
    }
    .th-press-item:hover { color: rgba(245,245,255,.5); }

    /* Live counter */
    .th-live-counter {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(34,197,94,.08);
      border: 1px solid rgba(34,197,94,.2);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #f5f5ff;
    }
    .th-live-dot {
      width: 7px; height: 7px;
      background: #22c55e;
      border-radius: 50%;
      animation: thPulse 2s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes thPulse {
      0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(34,197,94,.4); }
      50% { opacity:.6; box-shadow:0 0 0 6px rgba(34,197,94,0); }
    }
    .th-counter-num {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: 18px;
      color: #22c55e;
      min-width: 28px;
      text-align: center;
    }

    /* How it works */
    .th-how-wrap { padding: 64px 24px; max-width: 900px; margin: 0 auto; }
    .th-how-title {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: clamp(28px,4vw,40px);
      text-align: center;
      margin-bottom: 8px;
      color: #f5f5ff;
    }
    .th-how-title em { font-style: italic; color: #60a5fa; }
    .th-how-sub { text-align: center; color: #9b9bc0; font-size: 14px; margin-bottom: 48px; }
    .th-how-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
      gap: 24px;
    }
    .th-how-step {
      background: rgba(19,19,31,1);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 20px;
      padding: 28px 24px;
      position: relative;
      overflow: hidden;
    }
    .th-how-step::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, #3b82f6, #f97316);
    }
    .th-step-num {
      width: 36px; height: 36px;
      background: linear-gradient(135deg,#3b82f6,#2563eb);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: #fff;
      margin-bottom: 16px;
    }
    .th-step-icon { font-size: 28px; margin-bottom: 10px; }
    .th-step-title { font-size: 16px; font-weight: 700; color: #f5f5ff; margin-bottom: 6px; }
    .th-step-desc  { font-size: 13px; color: #9b9bc0; line-height: 1.6; }

    /* Testimonials */
    .th-reviews-wrap { padding: 64px 24px; max-width: 1100px; margin: 0 auto; }
    .th-reviews-title {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: clamp(28px,4vw,40px);
      text-align: center; margin-bottom: 40px; color: #f5f5ff;
    }
    .th-reviews-title em { font-style: italic; color: #60a5fa; }
    .th-reviews-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px,1fr));
      gap: 16px;
    }
    .th-review-card {
      background: rgba(19,19,31,1);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 16px;
      padding: 24px;
    }
    .th-review-stars { font-size: 14px; margin-bottom: 12px; letter-spacing: 1px; }
    .th-review-text  { font-size: 14px; color: #c8c8e0; line-height: 1.65; margin-bottom: 16px; font-style: italic; }
    .th-review-text::before { content: '"'; }
    .th-review-text::after  { content: '"'; }
    .th-review-author { display: flex; align-items: center; gap: 10px; }
    .th-review-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: #fff;
      flex-shrink: 0;
    }
    .th-review-name  { font-size: 13px; font-weight: 700; color: #f5f5ff; }
    .th-review-meta  { font-size: 11px; color: #5a5a80; margin-top: 1px; }
    .th-review-deal  {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.2);
      border-radius: 99px; padding: 4px 10px;
      font-size: 11px; font-weight: 700; color: #22c55e;
      margin-top: 10px;
    }

    /* Trust badges */
    .th-badges {
      display: flex; gap: 12px; flex-wrap: wrap;
      justify-content: center; padding: 24px;
    }
    .th-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 12px; font-weight: 600; color: #9b9bc0;
    }
    .th-badge-icon { font-size: 14px; }

    /* Affiliate disclosure */
    .th-disclosure {
      background: rgba(245,158,11,.05);
      border: 1px solid rgba(245,158,11,.15);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12px; color: #9b9bc0; line-height: 1.6;
      max-width: 700px; margin: 0 auto;
    }
    .th-disclosure strong { color: #f5d78e; }
  `;

  // Inject CSS once
  let cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Press bar ──────────────────────────────────────────────────────
  const PRESS_OUTLETS = [
    "The Guardian","The Times","Conde Nast Traveller",
    "Which? Travel","The Sun","The Telegraph",
    "Lonely Planet","Mirror Travel","Metro",
    // Duplicate for seamless loop
    "The Guardian","The Times","Conde Nast Traveller",
    "Which? Travel","The Sun","The Telegraph",
    "Lonely Planet","Mirror Travel","Metro",
  ];

  function pressBar(container) {
    injectCSS();
    if (!container) return;
    container.innerHTML = `
      <div class="th-press-bar th-trust-wrap">
        <div class="th-press-label">As featured in</div>
        <div class="th-press-track">
          ${PRESS_OUTLETS.map(o => `<div class="th-press-item">${o}</div>`).join("")}
        </div>
      </div>`;
  }

  // ── Live counter ───────────────────────────────────────────────────
  function liveCounter(container, startCount) {
    injectCSS();
    if (!container) return;
    let count = startCount || (180 + Math.floor(Math.random() * 120));
    container.innerHTML = `
      <div class="th-live-counter th-trust-wrap">
        <div class="th-live-dot"></div>
        <span class="th-counter-num" id="thCounterNum">${count}</span>
        <span>people booked through TripHunt today</span>
      </div>`;
    // Increment slowly over time
    setInterval(() => {
      if (Math.random() > 0.6) {
        count++;
        const el = document.getElementById("thCounterNum");
        if (el) { el.textContent = count; el.style.color = "#4ade80"; setTimeout(() => { el.style.color = ""; }, 500); }
      }
    }, 8000 + Math.random() * 12000);
  }

  // ── How it works ───────────────────────────────────────────────────
  const STEPS = [
    { icon:"🎯", title:"Set your budget",        desc:"Drag the slider to your budget and pick how many days you have. No forms. No sign-up required."  },
    { icon:"🔍", title:"We scan the deals",       desc:"TripHunt checks live prices across hundreds of routes from UK airports and surfaces the best ones instantly." },
    { icon:"✈️", title:"Book in one click",       desc:"Every deal links directly to Aviasales with your route and dates pre-filled. You just pick your seat and pay." },
  ];

  function howItWorks(container) {
    injectCSS();
    if (!container) return;
    container.innerHTML = `
      <div class="th-how-wrap th-trust-wrap">
        <h2 class="th-how-title">How <em>TripHunt</em> works</h2>
        <p class="th-how-sub">From budget to booked in under 2 minutes.</p>
        <div class="th-how-steps">
          ${STEPS.map((s,i) => `
          <div class="th-how-step">
            <div class="th-step-num">${i+1}</div>
            <div class="th-step-icon">${s.icon}</div>
            <div class="th-step-title">${s.title}</div>
            <div class="th-step-desc">${s.desc}</div>
          </div>`).join("")}
        </div>
      </div>`;
  }

  // ── Testimonials ───────────────────────────────────────────────────
  const REVIEWS = [
    { stars:5, text:"Found a £79 return to Lisbon in about 30 seconds. Couldn't believe it was real. Booked immediately and had the best long weekend.", name:"Sarah M.", meta:"Booked LHR → Lisbon", deal:"£79 return", avatar:"SM", colour:"#3b82f6" },
    { stars:5, text:"The error fare alert saved me £400 on flights to Tokyo. I got the email at 7am and booked before the price corrected. Absolutely incredible.", name:"James T.", meta:"Booked LHR → Tokyo", deal:"£189 error fare", avatar:"JT", colour:"#8b5cf6" },
    { stars:5, text:"I use Skyscanner and Google Flights but TripHunt actually shows me deals I haven't seen elsewhere. The trending page is addictive.", name:"Priya K.", meta:"Regular user, Manchester", deal:"", avatar:"PK", colour:"#f97316" },
    { stars:5, text:"Set a price alert for Barcelona at £60. Got the email three days later. That's exactly what I wanted. Simple and it works.", name:"Dan W.", meta:"Booked MAN → Barcelona", deal:"£58 return", avatar:"DW", colour:"#22c55e" },
    { stars:4, text:"Really clean site, easy to use on mobile. The swipe cards are a fun way to discover places you wouldn't normally search for.", name:"Emma R.", meta:"First-time visitor", deal:"", avatar:"ER", colour:"#ec4899" },
    { stars:5, text:"Booked Tenerife for the family through the weekly email deal. £280 return for two. Would have paid double direct.", name:"Mike B.", meta:"Booked LGW → Tenerife", deal:"£140pp return", avatar:"MB", colour:"#14b8a6" },
  ];

  function testimonials(container) {
    injectCSS();
    if (!container) return;
    container.innerHTML = `
      <div class="th-reviews-wrap th-trust-wrap">
        <h2 class="th-reviews-title">Real people, <em>real savings</em></h2>
        <div class="th-reviews-grid">
          ${REVIEWS.map(r => `
          <div class="th-review-card">
            <div class="th-review-stars">${"⭐".repeat(r.stars)}</div>
            <div class="th-review-text">${r.text}</div>
            <div class="th-review-author">
              <div class="th-review-avatar" style="background:${r.colour}">${r.avatar}</div>
              <div>
                <div class="th-review-name">${r.name}</div>
                <div class="th-review-meta">${r.meta}</div>
                ${r.deal ? `<div class="th-review-deal">✈ ${r.deal}</div>` : ""}
              </div>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
  }

  // ── Trust badges ───────────────────────────────────────────────────
  const BADGES = [
    { icon:"🔒", label:"Secure & encrypted" },
    { icon:"✅", label:"Free to use — always" },
    { icon:"🚫", label:"No hidden fees" },
    { icon:"🏦", label:"Official TravelPayouts partner" },
    { icon:"🇬🇧", label:"UK-based service" },
    { icon:"💸", label:"No booking surcharges" },
  ];

  function badges(container) {
    injectCSS();
    if (!container) return;
    container.innerHTML = `
      <div class="th-trust-wrap">
        <div class="th-badges">
          ${BADGES.map(b => `<div class="th-badge"><span class="th-badge-icon">${b.icon}</span>${b.label}</div>`).join("")}
        </div>
        <div style="padding:0 24px 32px;">
          <div class="th-disclosure">
            <strong>Affiliate disclosure:</strong> TripHunt earns a small commission when you book through our links, at no extra cost to you. This is how we keep the site free. We only show deals we'd book ourselves.
          </div>
        </div>
      </div>`;
  }

  // ── Inject all into a single container ────────────────────────────
  function injectAll(selector) {
    injectCSS();
    const container = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!container) return;
    container.innerHTML = "";

    const pb = document.createElement("div"); container.appendChild(pb); pressBar(pb);
    const lc = document.createElement("div"); lc.style.cssText="text-align:center;padding:32px 24px 0;"; container.appendChild(lc); liveCounter(lc);
    const hw = document.createElement("div"); container.appendChild(hw); howItWorks(hw);
    const rv = document.createElement("div"); container.appendChild(rv); testimonials(rv);
    const bg = document.createElement("div"); container.appendChild(bg); badges(bg);
  }

  // Expose
  root.TH = root.TH || {};
  root.TH.Trust = { pressBar, liveCounter, howItWorks, testimonials, badges, injectAll };

})(window);
