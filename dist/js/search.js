// TripHunt — search.js
// Flight search form: autocomplete, validation, and form submission.
// Submits to results.html with URL params.

(function() {

  // ── State ──────────────────────────────────────────────────────
  let _originIata = "LHR";
  let _destIata   = "";
  let _acTimeout  = null;

  // Built-in airports for instant local search
  const AIRPORTS = [
    { iata:"LHR", name:"London Heathrow",       city:"London",      country:"UK" },
    { iata:"LGW", name:"London Gatwick",         city:"London",      country:"UK" },
    { iata:"STN", name:"London Stansted",        city:"London",      country:"UK" },
    { iata:"LTN", name:"London Luton",           city:"London",      country:"UK" },
    { iata:"LCY", name:"London City",            city:"London",      country:"UK" },
    { iata:"MAN", name:"Manchester Airport",     city:"Manchester",  country:"UK" },
    { iata:"EDI", name:"Edinburgh Airport",      city:"Edinburgh",   country:"UK" },
    { iata:"BHX", name:"Birmingham Airport",     city:"Birmingham",  country:"UK" },
    { iata:"BRS", name:"Bristol Airport",        city:"Bristol",     country:"UK" },
    { iata:"GLA", name:"Glasgow Airport",        city:"Glasgow",     country:"UK" },
    { iata:"NCL", name:"Newcastle Airport",      city:"Newcastle",   country:"UK" },
    { iata:"LBA", name:"Leeds Bradford Airport", city:"Leeds",       country:"UK" },
    { iata:"BCN", name:"Barcelona–El Prat",      city:"Barcelona",   country:"Spain" },
    { iata:"MAD", name:"Adolfo Suárez Madrid",   city:"Madrid",      country:"Spain" },
    { iata:"PMI", name:"Palma de Mallorca",      city:"Palma",       country:"Spain" },
    { iata:"AGP", name:"Málaga-Costa del Sol",   city:"Malaga",      country:"Spain" },
    { iata:"ALC", name:"Alicante–Elche",         city:"Alicante",    country:"Spain" },
    { iata:"LIS", name:"Lisbon Humberto Delgado",city:"Lisbon",      country:"Portugal" },
    { iata:"FAO", name:"Faro Airport",           city:"Faro",        country:"Portugal" },
    { iata:"FCO", name:"Rome Fiumicino",         city:"Rome",        country:"Italy" },
    { iata:"MXP", name:"Milan Malpensa",         city:"Milan",       country:"Italy" },
    { iata:"VCE", name:"Venice Marco Polo",      city:"Venice",      country:"Italy" },
    { iata:"AMS", name:"Amsterdam Schiphol",     city:"Amsterdam",   country:"Netherlands" },
    { iata:"CDG", name:"Paris Charles de Gaulle",city:"Paris",       country:"France" },
    { iata:"ORY", name:"Paris Orly",             city:"Paris",       country:"France" },
    { iata:"NCE", name:"Nice Côte d'Azur",       city:"Nice",        country:"France" },
    { iata:"ATH", name:"Athens Eleftherios Venizelos", city:"Athens",country:"Greece" },
    { iata:"HER", name:"Heraklion Airport",      city:"Crete",       country:"Greece" },
    { iata:"RHO", name:"Rhodes Diagoras",        city:"Rhodes",      country:"Greece" },
    { iata:"PRG", name:"Václav Havel Airport",   city:"Prague",      country:"Czech Republic" },
    { iata:"VIE", name:"Vienna International",   city:"Vienna",      country:"Austria" },
    { iata:"BUD", name:"Budapest Ferenc Liszt",  city:"Budapest",    country:"Hungary" },
    { iata:"WAW", name:"Warsaw Chopin",          city:"Warsaw",      country:"Poland" },
    { iata:"DXB", name:"Dubai International",    city:"Dubai",       country:"UAE" },
    { iata:"AUH", name:"Abu Dhabi International",city:"Abu Dhabi",   country:"UAE" },
    { iata:"IST", name:"Istanbul Airport",       city:"Istanbul",    country:"Turkey" },
    { iata:"AYT", name:"Antalya Airport",        city:"Antalya",     country:"Turkey" },
    { iata:"JFK", name:"New York JFK",           city:"New York",    country:"USA" },
    { iata:"LAX", name:"Los Angeles International", city:"Los Angeles",country:"USA" },
    { iata:"MIA", name:"Miami International",    city:"Miami",       country:"USA" },
    { iata:"ORD", name:"Chicago O'Hare",         city:"Chicago",     country:"USA" },
    { iata:"BKK", name:"Suvarnabhumi Airport",   city:"Bangkok",     country:"Thailand" },
    { iata:"HKT", name:"Phuket International",   city:"Phuket",      country:"Thailand" },
    { iata:"CNX", name:"Chiang Mai International",city:"Chiang Mai", country:"Thailand" },
    { iata:"NRT", name:"Tokyo Narita",           city:"Tokyo",       country:"Japan" },
    { iata:"HND", name:"Tokyo Haneda",           city:"Tokyo",       country:"Japan" },
    { iata:"SIN", name:"Singapore Changi",       city:"Singapore",   country:"Singapore" },
    { iata:"DPS", name:"Ngurah Rai/Bali",        city:"Bali",        country:"Indonesia" },
    { iata:"SYD", name:"Sydney Kingsford Smith", city:"Sydney",      country:"Australia" },
    { iata:"MEL", name:"Melbourne Airport",      city:"Melbourne",   country:"Australia" },
    { iata:"CPT", name:"Cape Town International",city:"Cape Town",   country:"South Africa" },
    { iata:"DBV", name:"Dubrovnik Airport",      city:"Dubrovnik",   country:"Croatia" },
    { iata:"SPU", name:"Split Airport",          city:"Split",       country:"Croatia" },
    { iata:"TFS", name:"Tenerife South",         city:"Tenerife",    country:"Spain" },
    { iata:"LPA", name:"Gran Canaria Airport",   city:"Gran Canaria",country:"Spain" },
  ];

  function searchAirports(q) {
    const t = q.toLowerCase().trim();
    if (!t) return [];
    return AIRPORTS.filter(a =>
      a.iata.toLowerCase().startsWith(t) ||
      a.city.toLowerCase().includes(t)   ||
      a.name.toLowerCase().includes(t)   ||
      a.country.toLowerCase().includes(t)
    ).slice(0, 8);
  }

  // ── Autocomplete dropdown ──────────────────────────────────────
  function showDropdown(inputEl, dropEl, results, onSelect) {
    if (!results.length) { dropEl.style.display = "none"; return; }
    dropEl.innerHTML = results.map((a, i) =>
      `<div class="th-ac-item" data-idx="${i}">
        <span class="th-ac-iata">${a.iata}</span>
        <span class="th-ac-name">${a.name} — <span class="th-ac-country">${a.country}</span></span>
      </div>`
    ).join("");
    dropEl.style.display = "block";
    dropEl.querySelectorAll(".th-ac-item").forEach((el, i) => {
      el.addEventListener("mousedown", e => {
        e.preventDefault();
        onSelect(results[i]);
        dropEl.style.display = "none";
      });
    });
  }

  function injectACStyles() {
    if (document.getElementById("th-ac-styles")) return;
    const s = document.createElement("style");
    s.id = "th-ac-styles";
    s.textContent = `
      .th-ac-list { position:absolute; top:100%; left:0; right:0; z-index:999; background:#0e1528; border:1px solid rgba(255,255,255,.12); border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,.5); margin-top:4px; overflow:hidden; }
      .th-ac-item { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; transition:background .1s; }
      .th-ac-item:hover { background:rgba(255,255,255,.06); }
      .th-ac-iata { font-size:13px; font-weight:800; color:#2563eb; width:38px; flex-shrink:0; }
      .th-ac-name { font-size:13px; color:#f0f4ff; }
      .th-ac-country { color:#8b9cbf; }
    `;
    document.head.appendChild(s);
  }

  // ── Set up a search input pair ─────────────────────────────────
  function initInput(inputId, dropId, hiddenId, onSelect) {
    const input  = document.getElementById(inputId);
    const drop   = document.getElementById(dropId);
    const hidden = document.getElementById(hiddenId);
    if (!input || !drop) return;

    injectACStyles();

    input.addEventListener("input", () => {
      clearTimeout(_acTimeout);
      const q = input.value.trim();
      if (q.length < 1) { drop.style.display = "none"; return; }

      // Instant local search
      const local = searchAirports(q);
      if (local.length) {
        showDropdown(input, drop, local, a => {
          input.value  = `${a.city} (${a.iata})`;
          if (hidden) hidden.value = a.iata;
          if (onSelect) onSelect(a);
        });
      }

      // Async proxy search after 150ms
      _acTimeout = setTimeout(async () => {
        try {
          const r = await fetch(`/.netlify/functions/getAutocomplete?term=${encodeURIComponent(q)}`);
          if (!r.ok) return;
          const data = await r.json();
          const results = (data.results || []).slice(0, 8).map(x => ({
            iata:    x.code || x.iata,
            name:    x.name,
            city:    x.city || x.name,
            country: x.country_name || x.country,
          }));
          if (results.length) {
            showDropdown(input, drop, results, a => {
              input.value  = `${a.city} (${a.iata})`;
              if (hidden) hidden.value = a.iata;
              if (onSelect) onSelect(a);
            });
          }
        } catch(e) { /* keep local results */ }
      }, 150);
    });

    input.addEventListener("focus", () => {
      const q = input.value.trim();
      if (q.length >= 1) {
        const local = searchAirports(q);
        if (local.length) showDropdown(input, drop, local, a => {
          input.value  = `${a.city} (${a.iata})`;
          if (hidden) hidden.value = a.iata;
          if (onSelect) onSelect(a);
        });
      }
    });

    document.addEventListener("click", e => {
      if (!input.contains(e.target) && !drop.contains(e.target)) {
        drop.style.display = "none";
      }
    });
  }

  // ── Date helpers ───────────────────────────────────────────────
  function setDefaultDates() {
    const dep = document.getElementById("th-depart");
    const ret = document.getElementById("th-return");
    if (!dep) return;
    const d = new Date(); d.setDate(d.getDate() + 21);
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    dep.min = new Date().toISOString().slice(0,10);
    dep.value = d.toISOString().slice(0,10);
    if (ret) {
      const r = new Date(d); r.setDate(r.getDate() + 7);
      ret.min   = dep.value;
      ret.value = r.toISOString().slice(0,10);
      dep.addEventListener("change", () => {
        if (ret.value < dep.value) ret.value = dep.value;
        ret.min = dep.value;
      });
    }
  }

  // ── Form submission → results.html ────────────────────────────
  function submitSearch() {
    const originInput = document.getElementById("th-origin");
    const destInput   = document.getElementById("th-dest");
    const originIata  = (document.getElementById("th-origin-iata") || {}).value || _originIata;
    const destIata    = (document.getElementById("th-dest-iata")   || {}).value || _destIata;
    const dep         = (document.getElementById("th-depart")      || {}).value;
    const ret         = (document.getElementById("th-return")       || {}).value;
    const adults      = (document.getElementById("th-adults")       || {}).value || "2";

    // Validate
    let valid = true;
    if (!originIata && originInput) {
      originInput.style.borderColor = "#ef4444";
      originInput.placeholder = "⚠ Select an airport";
      valid = false;
    }
    if (!destIata && destInput) {
      destInput.style.borderColor = "#ef4444";
      destInput.placeholder = "⚠ Select a destination";
      valid = false;
    }
    if (!valid) return;

    // Build results URL
    const params = new URLSearchParams({ origin:originIata, destination:destIata, adults });
    if (dep) params.set("depart_date", dep);
    if (ret) params.set("return_date",  ret);

    // Navigate to results page
    window.location.href = "/results.html?" + params;
  }

  // ── Init ───────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    injectACStyles();
    setDefaultDates();

    initInput("th-origin", "th-origin-ac", "th-origin-iata", a => { _originIata = a.iata; });
    initInput("th-dest",   "th-dest-ac",   "th-dest-iata",   a => { _destIata   = a.iata; });

    const btn = document.getElementById("th-search-btn");
    if (btn) btn.addEventListener("click", submitSearch);

    // Also allow Enter key in date fields
    ["th-depart","th-return"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") submitSearch(); });
    });
  });

  window.TH_SEARCH = { submitSearch, initInput };

})();
