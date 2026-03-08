// TripHunt — photos.js
// Unsplash Source API: free, no API key, high quality destination photos
// Usage: TH.Photos.bg(el, "barcelona spain") — sets background-image
//        TH.Photos.src(imgEl, "tokyo japan") — sets img src

(function(root) {
  "use strict";

  // Pre-mapped keywords per IATA code for best Unsplash results
  const KEYWORDS = {
    BCN:"barcelona spain",   MAD:"madrid spain",        LIS:"lisbon portugal",
    FCO:"rome italy",        AMS:"amsterdam canal",     CDG:"paris france eiffel",
    DXB:"dubai skyline",     AYT:"antalya turkey coast",PMI:"mallorca beach spain",
    TFS:"tenerife canary",   LPA:"gran canaria beach",  FAO:"algarve portugal",
    ATH:"athens greece acropolis",PRG:"prague czech old town",VIE:"vienna austria",
    DBV:"dubrovnik croatia", IST:"istanbul turkey",     ALC:"alicante spain",
    BKK:"bangkok thailand temple",DPS:"bali indonesia rice",NRT:"tokyo japan",
    SIN:"singapore city",    KUL:"kuala lumpur",        HKT:"phuket beach thailand",
    JFK:"new york city manhattan",LAX:"los angeles california",MIA:"miami beach florida",
    SFO:"san francisco golden gate",ORD:"chicago skyline",
    CPT:"cape town south africa",NBO:"nairobi kenya",   CMN:"marrakech morocco",
    SYD:"sydney opera house", MEL:"melbourne australia",AKL:"auckland new zealand",
    GRU:"rio de janeiro brazil",BOG:"colombia andes",
    YYZ:"toronto canada",    YVR:"vancouver canada",
    LHR:"london uk big ben", MAN:"manchester uk",       EDI:"edinburgh scotland",
    DUB:"dublin ireland",    BRU:"brussels belgium",    ZRH:"zurich switzerland",
    GVA:"geneva switzerland",FCO:"rome italy colosseum",NAP:"naples italy amalfi",
    VCE:"venice italy canal",MXP:"milan italy duomo",   BGY:"bergamo italy alps",
    MUC:"munich germany",    BER:"berlin germany",      HAM:"hamburg germany",
    CPH:"copenhagen denmark",OSL:"oslo norway fjord",   ARN:"stockholm sweden",
    HEL:"helsinki finland",  WAW:"warsaw poland",       BUD:"budapest hungary",
    OTP:"bucharest romania", SOF:"sofia bulgaria",      RIX:"riga latvia",
  };

  // Curated photo IDs per destination for best results (fallback to keyword search)
  const PHOTO_IDS = {
    BCN: "1539037714824-72e8f7893b40", CDG: "1549144511-f099e773c147",
    FCO: "1552832230-c0197dd311b5",   AMS: "1534351590666-13e3e96b5902",
    DXB: "1512453979798-5ea266f8880c", NRT: "1540959733332-eab4deabeeaf",
    BKK: "1508009603885-50cf7c579365", DPS: "1537996134470-d6f04c5e1d7e",
    JFK: "1496442226666-8d4d0e62e6e9",  SYD: "1506973035872-a4ec16b8e8d9",
    LIS: "1513735539103-4c8d83b5b4f5", ATH: "1555993539-1732b0258f02",
    PRG: "1541849189-cc2e0b77b267",   IST: "1524231757912-21f4fe3a7200",
  };

  const CACHE = {};

  function photoUrl(iata, width, height) {
    width  = width  || 800;
    height = height || 500;
    // Use specific photo ID if we have it — most reliable
    if (PHOTO_IDS[iata]) {
      return "https://images.unsplash.com/photo-" + PHOTO_IDS[iata] + "?w=" + width + "&h=" + height + "&fit=crop&q=80&auto=format";
    }
    // Fall back to keyword search via Unsplash Source
    const kw = KEYWORDS[iata] || (iata + " travel destination city");
    return "https://source.unsplash.com/" + width + "x" + height + "/?" + encodeURIComponent(kw);
  }

  // Set background-image on an element
  function bg(el, iata, width, height) {
    if (!el) return;
    const url = photoUrl(iata, width, height);
    // Show a placeholder colour while loading
    el.style.backgroundImage = "linear-gradient(135deg, #1a1a2e, #242440)";
    el.style.backgroundSize  = "cover";
    el.style.backgroundPosition = "center";
    const img = new Image();
    img.onload = () => { el.style.backgroundImage = "url('" + url + "')"; };
    img.onerror = () => { /* keep placeholder */ };
    img.src = url;
  }

  // Set src on an <img> element
  function src(imgEl, iata, width, height) {
    if (!imgEl) return;
    imgEl.src = photoUrl(iata, width, height);
    imgEl.onerror = function() {
      // Fallback to a generic travel photo
      this.src = "https://source.unsplash.com/" + (width||800) + "x" + (height||500) + "/?travel,adventure";
    };
  }

  // Inject photos into all deal cards on the page
  // Looks for [data-dest-iata] attribute
  function injectAll() {
    document.querySelectorAll("[data-dest-iata]").forEach(el => {
      const iata = el.dataset.destIata;
      const w    = parseInt(el.dataset.photoW) || 600;
      const h    = parseInt(el.dataset.photoH) || 400;
      if (el.tagName === "IMG") src(el, iata, w, h);
      else bg(el, iata, w, h);
    });
  }

  // Expose globally
  root.TH = root.TH || {};
  root.TH.Photos = { bg, src, url: photoUrl, injectAll };

})(window);
