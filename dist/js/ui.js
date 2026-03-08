// TripHunt — ui.js
// Shared UI utilities: skeleton loaders, error states, formatting helpers

const TH_UI = (() => {

  // ── Formatting ─────────────────────────────────────────────────
  function fmtPrice(p) {
    return "£" + Math.round(p).toLocaleString("en-GB");
  }

  function fmtDate(s, opts) {
    if (!s) return "Flexible";
    return new Date(s).toLocaleDateString("en-GB", opts || { day:"numeric", month:"short", year:"numeric" });
  }

  function fmtDateShort(s) {
    return fmtDate(s, { day:"numeric", month:"short" });
  }

  // ── Skeleton loaders ────────────────────────────────────────────
  function dealSkeleton(count = 4) {
    return Array(count).fill(`
      <div class="th-skeleton th-deal-skel">
        <div class="th-skel-img"></div>
        <div class="th-skel-body">
          <div class="th-skel-line" style="width:60%"></div>
          <div class="th-skel-line" style="width:40%"></div>
          <div class="th-skel-line" style="width:75%"></div>
        </div>
      </div>`).join("");
  }

  function resultSkeleton(count = 3) {
    return Array(count).fill(`
      <div class="th-skeleton th-result-skel">
        <div class="th-skel-left">
          <div class="th-skel-line" style="width:35%"></div>
          <div class="th-skel-line" style="width:55%"></div>
        </div>
        <div class="th-skel-right">
          <div class="th-skel-line" style="width:50%"></div>
          <div class="th-skel-btn"></div>
        </div>
      </div>`).join("");
  }

  function packageSkeleton(count = 3) {
    return Array(count).fill(`
      <div class="th-skeleton th-pkg-skel">
        <div class="th-skel-img"></div>
        <div class="th-skel-body">
          <div class="th-skel-line" style="width:55%"></div>
          <div class="th-skel-line" style="width:40%"></div>
          <div class="th-skel-line" style="width:70%"></div>
          <div class="th-skel-line" style="width:35%"></div>
          <div class="th-skel-btn"></div>
        </div>
      </div>`).join("");
  }

  // ── Error states ────────────────────────────────────────────────
  function errorHtml(message, retryFn) {
    const id = "th-err-" + Math.random().toString(36).slice(2, 7);
    if (retryFn) window[id] = retryFn;
    return `
      <div class="th-error-state">
        <div class="th-error-icon">✈️</div>
        <div class="th-error-msg">${message || "Couldn't load deals right now."}</div>
        ${retryFn ? `<button class="th-error-retry" onclick="window['${id}']()">Try again</button>` : ""}
      </div>`;
  }

  function noResultsHtml(origin, dest) {
    return `
      <div class="th-error-state">
        <div class="th-error-icon">🔍</div>
        <div class="th-error-msg">No flights found for ${origin} → ${dest}.<br>Try different dates or a nearby airport.</div>
      </div>`;
  }

  // ── Deal grade badge ────────────────────────────────────────────
  function gradeBadge(grade, label) {
    const map = {
      exceptional: { bg:"rgba(16,185,129,.15)", color:"#10b981" },
      great:       { bg:"rgba(16,185,129,.12)", color:"#10b981" },
      good:        { bg:"rgba(124,106,247,.15)", color:"#7c6af7" },
      fair:        { bg:"rgba(245,158,11,.12)", color:"#f59e0b" },
      high:        { bg:"rgba(239,68,68,.12)",  color:"#ef4444" },
    };
    const s = map[grade] || map.good;
    return `<span class="th-grade-badge" style="background:${s.bg};color:${s.color}">${label || grade}</span>`;
  }

  // ── Inject shared CSS if not already present ────────────────────
  function injectStyles() {
    if (document.getElementById("th-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "th-ui-styles";
    style.textContent = `
      /* TripHunt shared UI styles */
      .th-skeleton { animation: th-shimmer 1.6s infinite linear; background: linear-gradient(90deg, #0e1528 25%, #1a2442 50%, #0e1528 75%); background-size: 200% 100%; border-radius: 12px; overflow: hidden; }
      @keyframes th-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      .th-deal-skel { height: 280px; min-width: 200px; }
      .th-result-skel { height: 100px; display: flex; align-items: center; justify-content: space-between; padding: 20px; margin-bottom: 10px; border-radius: 12px; }
      .th-pkg-skel { height: 340px; }
      .th-skel-img { height: 55%; background: rgba(255,255,255,.04); }
      .th-skel-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
      .th-skel-left, .th-skel-right { flex: 1; display: flex; flex-direction: column; gap: 8px; }
      .th-skel-line { height: 12px; background: rgba(255,255,255,.06); border-radius: 6px; }
      .th-skel-btn { height: 36px; background: rgba(37,99,235,.2); border-radius: 8px; margin-top: 8px; }

      .th-error-state { text-align: center; padding: 40px 20px; color: #8b9cbf; }
      .th-error-icon { font-size: 36px; margin-bottom: 12px; }
      .th-error-msg { font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
      .th-error-retry { padding: 8px 20px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
      .th-error-retry:hover { background: #1d4ed8; }

      .th-grade-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }

      /* Deal card v3 */
      .th-deal-card { display: flex; flex-direction: column; background: #0e1528; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; transition: transform .2s, box-shadow .2s; text-decoration: none; color: inherit; }
      .th-deal-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,.4); }
      .th-deal-card-img { position: relative; height: 160px; overflow: hidden; }
      .th-deal-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
      .th-deal-card:hover .th-deal-card-img img { transform: scale(1.05); }
      .th-deal-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,15,30,.9) 0%, transparent 60%); }
      .th-deal-card-price { position: absolute; bottom: 10px; right: 10px; background: #2563eb; color: #fff; font-size: 18px; font-weight: 800; padding: 4px 12px; border-radius: 8px; }
      .th-deal-card-grade { position: absolute; top: 10px; left: 10px; }
      .th-deal-card-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
      .th-deal-card-dest { font-size: 16px; font-weight: 700; color: #f0f4ff; }
      .th-deal-card-route { font-size: 11px; color: #8b9cbf; }
      .th-deal-card-date { font-size: 11px; font-weight: 600; color: #f0f4ff; }
      .th-deal-card-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
      .th-deal-tag { padding: 2px 8px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); border-radius: 99px; font-size: 10px; font-weight: 600; color: #8b9cbf; }
      .th-deal-card-btn { margin-top: auto; padding: 10px; background: #2563eb; color: #fff; text-align: center; font-weight: 700; font-size: 13px; border-radius: 8px; transition: background .15s; }
      .th-deal-card:hover .th-deal-card-btn { background: #1d4ed8; }

      /* Result card */
      .th-result-card { display: flex; align-items: center; gap: 16px; background: #0e1528; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 16px 20px; transition: border-color .2s; }
      .th-result-card:hover { border-color: rgba(37,99,235,.4); }
      .th-result-route { flex: 1; }
      .th-result-airports { font-size: 18px; font-weight: 800; color: #f0f4ff; letter-spacing: .5px; }
      .th-result-dates { font-size: 12px; color: #8b9cbf; margin-top: 3px; }
      .th-result-airline { font-size: 12px; color: #8b9cbf; }
      .th-result-stops { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
      .th-result-stops.direct { background: rgba(16,185,129,.15); color: #10b981; }
      .th-result-stops.stop1  { background: rgba(245,158,11,.12);  color: #f59e0b; }
      .th-result-stops.stop2  { background: rgba(239,68,68,.12);   color: #ef4444; }
      .th-result-price-col { text-align: right; flex-shrink: 0; }
      .th-result-price { font-size: 22px; font-weight: 800; color: #f0f4ff; }
      .th-result-price-sub { font-size: 11px; color: #8b9cbf; }
      .th-result-btn { display: inline-block; margin-top: 8px; padding: 8px 18px; background: #2563eb; color: #fff; border-radius: 8px; font-weight: 700; font-size: 13px; text-decoration: none; transition: background .15s; }
      .th-result-btn:hover { background: #1d4ed8; }

      /* Package card */
      .th-pkg-card { background: #0e1528; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
      .th-pkg-card-img { height: 160px; overflow: hidden; position: relative; }
      .th-pkg-card-img img { width: 100%; height: 100%; object-fit: cover; }
      .th-pkg-card-body { padding: 16px; }
      .th-pkg-card-dest { font-size: 18px; font-weight: 800; color: #f0f4ff; margin-bottom: 4px; }
      .th-pkg-card-sub { font-size: 12px; color: #8b9cbf; margin-bottom: 12px; }
      .th-pkg-breakdown { border-top: 1px solid rgba(255,255,255,.06); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .th-pkg-line { display: flex; justify-content: space-between; font-size: 13px; }
      .th-pkg-line-label { color: #8b9cbf; }
      .th-pkg-line-val { font-weight: 700; color: #f0f4ff; }
      .th-pkg-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid rgba(255,255,255,.08); padding-top: 10px; }
      .th-pkg-total-val { color: #10b981; }
      .th-pkg-btns { display: flex; gap: 8px; flex-wrap: wrap; }
      .th-pkg-btn { flex: 1; padding: 9px 10px; border-radius: 8px; font-weight: 700; font-size: 12px; text-align: center; text-decoration: none; transition: opacity .15s; min-width: 80px; }
      .th-pkg-btn:hover { opacity: .85; }
      .th-pkg-btn.flight { background: #2563eb; color: #fff; }
      .th-pkg-btn.hotel  { background: #0ea5e9; color: #fff; }

      /* Cheap route card */
      .th-cheap-card { background: #0e1528; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; transition: border-color .2s; text-decoration: none; color: inherit; }
      .th-cheap-card:hover { border-color: rgba(16,185,129,.4); }
      .th-cheap-drop-badge { display: inline-block; padding: 3px 9px; background: rgba(16,185,129,.15); color: #10b981; border-radius: 99px; font-size: 10px; font-weight: 700; margin-bottom: 6px; }
      .th-cheap-route { font-size: 16px; font-weight: 700; color: #f0f4ff; }
      .th-cheap-saving { font-size: 12px; color: #8b9cbf; margin-top: 3px; }
      .th-cheap-price { text-align: right; }
      .th-cheap-price-val { font-size: 22px; font-weight: 800; color: #f0f4ff; }
      .th-cheap-price-avg { font-size: 11px; color: #8b9cbf; text-decoration: line-through; }
    `;
    document.head.appendChild(style);
  }

  // Public API
  return { fmtPrice, fmtDate, fmtDateShort, dealSkeleton, resultSkeleton, packageSkeleton, errorHtml, noResultsHtml, gradeBadge, injectStyles };

})();

// Auto-inject styles when script loads
document.addEventListener("DOMContentLoaded", TH_UI.injectStyles);
