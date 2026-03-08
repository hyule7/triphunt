// TripHunt — deal-score.js
// Client-side deal score calculation and badge rendering
// Server-side version is in getDeals.js

(function(root) {
  "use strict";

  // Airline quality tiers (0–100)
  const AIRLINE_TIERS = {
    "Emirates":80, "Singapore Airlines":85, "Qatar Airways":85, "Cathay Pacific":80,
    "British Airways":75, "Lufthansa":75, "KLM":72, "Air France":70, "Swiss":75,
    "Virgin Atlantic":72, "Turkish Airlines":68, "TAP":65, "Iberia":65,
    "easyJet":58, "Ryanair":52, "Vueling":55, "Wizz Air":50, "Jet2":58,
    "Norwegian":55, "TUI":60, "Flybe":52,
    "ANA":82, "JAL":80, "Qantas":78, "Air New Zealand":80,
    "Thai Airways":65, "Malaysia Airlines":65, "Philippine Airlines":60,
  };

  const GRADES = [
    { min:80, grade:"exceptional", label:"Exceptional", bg:"#dcfce7", text:"#15803d", border:"#86efac" },
    { min:65, grade:"great",       label:"Great Deal",  bg:"#dbeafe", text:"#1d4ed8", border:"#93c5fd" },
    { min:50, grade:"good",        label:"Good Deal",   bg:"#ccfbf1", text:"#0f766e", border:"#5eead4" },
    { min:35, grade:"fair",        label:"Fair",        bg:"#fef9c3", text:"#92400e", border:"#fde047" },
    { min:0,  grade:"poor",        label:"Average",     bg:"#f1f5f9", text:"#64748b", border:"#cbd5e1" },
  ];

  function getGrade(score) {
    return GRADES.find(g => score >= g.min) || GRADES[GRADES.length-1];
  }

  // ── Main scoring function ─────────────────────────────────────────
  function calculateScore(flight, routeStats) {
    routeStats = routeStats || {};

    // Factor 1: Price vs historical average (40%)
    const avgPrice = routeStats.avg_price || flight.price * 1.25;
    const priceRatio = avgPrice / flight.price;
    const priceScore = Math.min(100, Math.max(0, (priceRatio - 0.5) / 1.5 * 100));

    // Factor 2: Stops (25%)
    const stopsMap = { 0:100, 1:60, 2:25 };
    const stopsScore = stopsMap[flight.number_of_changes || flight.stops || 0] || 10;

    // Factor 3: Duration vs route minimum (15%)
    const durationMins = flight.duration_minutes || flight.duration || null;
    const minDuration  = routeStats.min_duration_mins || durationMins;
    const durationScore = durationMins && minDuration
      ? Math.min(100, (minDuration / durationMins) * 100)
      : 70; // Default if no duration data

    // Factor 4: Airline quality (10%)
    const airlineScore = AIRLINE_TIERS[flight.airline] || 55;

    // Factor 5: Seasonality (10%)
    const month = flight.depart_date
      ? new Date(flight.depart_date).getMonth() + 1
      : new Date().getMonth() + 1;
    const monthAvg = routeStats.monthly_prices?.[month] || avgPrice;
    const seasonRatio = monthAvg / flight.price;
    const seasonScore = Math.min(100, Math.max(0, (seasonRatio - 0.7) / 0.6 * 100));

    const score = Math.round(
      priceScore    * 0.40 +
      stopsScore    * 0.25 +
      durationScore * 0.15 +
      airlineScore  * 0.10 +
      seasonScore   * 0.10
    );

    return {
      score,
      ...getGrade(score),
      breakdown: { priceScore, stopsScore, durationScore, airlineScore, seasonScore },
      saving: avgPrice > flight.price ? Math.round(avgPrice - flight.price) : 0,
    };
  }

  // ── Badge HTML ─────────────────────────────────────────────────────
  function badge(score, grade, compact) {
    const g = typeof grade === "string" ? getGrade(score) : (grade || getGrade(score));
    if (compact) {
      return `<span class="deal-score-compact" style="background:${g.bg};color:${g.text};border:1.5px solid ${g.border};display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:99px;font-size:11px;font-weight:800;font-family:'DM Sans',sans-serif;">${score}</span>`;
    }
    return `<div class="deal-score-badge" style="background:${g.bg};color:${g.text};border:1.5px solid ${g.border};display:inline-flex;flex-direction:column;align-items:center;padding:6px 12px;border-radius:12px;font-family:'DM Sans',sans-serif;" title="Deal Score: ${score}/100 — ${g.label}">
      <span style="font-size:20px;font-weight:900;line-height:1;">${score}</span>
      <span style="font-size:10px;font-weight:700;letter-spacing:.3px;opacity:.8;">${g.label.toUpperCase()}</span>
    </div>`;
  }

  // ── Enrich deal array with scores ─────────────────────────────────
  function enrichDeals(deals, routeStatsMap) {
    routeStatsMap = routeStatsMap || {};
    return deals.map(deal => {
      if (deal.deal_score) return deal; // Already scored server-side
      const key = (deal.origin || "LHR") + "-" + deal.destination;
      const stats = routeStatsMap[key] || {};
      const scored = calculateScore(deal, stats);
      return { ...deal, deal_score: scored.score, deal_grade: scored.grade, saving: scored.saving };
    });
  }

  // ── Price trend indicator ─────────────────────────────────────────
  function priceTrend(current, yesterday) {
    if (!yesterday) return "";
    const diff = current - yesterday;
    const pct  = Math.abs(diff / yesterday * 100).toFixed(0);
    if (diff < -5) return `<span style="color:#16a34a;font-size:11px;font-weight:700;">↓ £${Math.abs(diff)} cheaper</span>`;
    if (diff > 5)  return `<span style="color:#dc2626;font-size:11px;font-weight:700;">↑ £${diff} more expensive</span>`;
    return `<span style="color:#64748b;font-size:11px;">Stable price</span>`;
  }

  // ── Urgency chip ──────────────────────────────────────────────────
  function urgencyChip(deal) {
    const chips = [];
    if (deal.seats_remaining && deal.seats_remaining <= 5)
      chips.push(`<span style="background:rgba(220,38,38,.1);color:#dc2626;font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;border:1px solid rgba(220,38,38,.2);">⚡ ${deal.seats_remaining} seats left</span>`);
    if (deal.is_error_fare || deal.is_mistake_fare)
      chips.push(`<span style="background:rgba(220,38,38,.1);color:#dc2626;font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;border:1px solid rgba(220,38,38,.2);animation:pulse 2s infinite;">🚨 Error Fare</span>`);
    if (deal.deal_score >= 80)
      chips.push(`<span style="background:rgba(21,128,61,.1);color:#15803d;font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;border:1px solid rgba(21,128,61,.2);">🔥 Hot Deal</span>`);
    return chips.join(" ");
  }

  // Expose
  root.TH = root.TH || {};
  root.TH.DealScore = { calculateScore, badge, enrichDeals, priceTrend, urgencyChip, getGrade, AIRLINE_TIERS };

})(window);
