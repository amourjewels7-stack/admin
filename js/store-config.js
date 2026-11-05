/* ============================================================
   AMOUR JEWELS — Store configuration (shared commerce layer)
   Shipping · GST · Coupons · Couriers · Legal
   Frontend demo config — in production this is served/managed
   by the backend & Admin panel.
   ============================================================ */

const STORE = {
  brand: 'Amour Jewels',
  legalName: 'Amour Jewels Retail LLP',
  founded: 2019,          /* single source of truth for "years of craft" */
  karigars: 40,           /* in-house craftspeople — the one figure only the business can assert */
  gstin: '08AAGCA1234K1ZP',
  pan: 'AAGCA1234K',
  address: 'India',
  email: 'amourjewelsretail@gmail.com',
  phone: '+91 9009055502',
  sellerState: 'India',
  hours: 'Mon–Sat · 11 am – 8 pm IST',
  grievance: {
    name: 'Meera Kothari',
    designation: 'Grievance Officer — Customer Experience',
    email: 'amourjewelsretail@gmail.com',
    phone: '+91 9009055502',
    sla: 'Acknowledgement within 48 hrs · resolution within 30 days'
  },
  freeShip: 3500,
  ship: { std: 99, express: 249 },
  couriers: ['Delhivery', 'Blue Dart', 'XpressBees', 'Ecom Express'],
  metroPrefixes: ['11','40','56','60','70','50','38','41','60','64'],
  gst: { rate: 0.03, inclusive: true, hsnDefault: '7117', roundOff: true },
  whatsapp: { number: '919009055502', enabled: true }
};

/* ---------- coupons (defaults + admin-created) ---------- */
const DEFAULT_COUPONS = [
  { code: 'FIRST10',   type: 'pct',      value: 10,  min: 1500, label: '10% off your first order',    active: true },
  { code: 'FESTIVE15', type: 'pct',      value: 15,  min: 5000, label: '15% off above ₹5,000',        active: true },
  { code: 'AMOUR250',  type: 'flat',     value: 250, min: 2000, label: '₹250 off above ₹2,000',       active: true },
  { code: 'FREESHIP',  type: 'ship',     value: 0,   min: 0,    label: 'Free express shipping',       active: true },
  { code: 'AJ-GIFT-1000', type: 'giftcard', value: 1000, min: 0, label: 'Gift card — ₹1,000 balance', active: true },
  { code: 'AJ-GIFT-2500', type: 'giftcard', value: 2500, min: 0, label: 'Gift card — ₹2,500 balance', active: true },
  { code: 'REF-MEERA10',  type: 'referral', value: 10,  min: 1000, label: 'Referral — 10% off (Meera)', active: true }
];
const COUPONS_KEY = 'amour_coupons_v1';
const RETURNS_KEY  = 'amour_returns_v1';   /* return/exchange requests (track.html → admin)       */
const CARTS_KEY    = 'amour_abandoned_carts_v1'; /* abandoned carts, recoverable by marketing      */
const ALERTS_KEY   = 'amour_stock_alerts_v1';    /* low-stock alerts raised by the admin console   */
const BCAST_KEY    = 'amour_broadcasts_v1';      /* admin broadcast log (audience + message)       */

/* ---------- pincode serviceability (deterministic demo) ----------
   In production: courier-serviceability API. Here: realistic rules —
   serviceable unless it starts with 9 (army/foreign POS), ETA by zone.   */
function pincodeInfo(pin) {
  if (!/^\d{6}$/.test(pin)) return null;
  const prefix = pin.slice(0, 2);
  const sum = pin.split('').reduce((a, d) => a + (+d), 0);
  const serviceable = pin[0] !== '9';
  return {
    pin,
    serviceable,
    eta: STORE.metroPrefixes.includes(prefix) ? '2–3 days' : '3–6 days',
    courier: sum % 2 ? 'Delhivery' : 'Blue Dart',
    express: serviceable
  };
}

/* ---------- GST helpers (buyer-state aware) ---------- */
function gstSplit(amountInclTax, rate, buyerState) {
  const taxable = amountInclTax / (1 + rate);
  const tax = amountInclTax - taxable;
  const intra = String(buyerState || '').trim().toLowerCase() === STORE.sellerState.toLowerCase();
  return {
    rate, taxable, tax, intra,
    cgst: intra ? tax / 2 : 0,
    sgst: intra ? tax / 2 : 0,
    igst: intra ? 0 : tax
  };
}
const hsnFor = p => (p && p.hsn) || STORE.gst.hsnDefault;

/* ---------- order store (shared by checkout/track/invoice/admin) ---------- */
const ORDERS_KEY = 'amour_orders_v1';
function getOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
  catch (e) { return []; }
}
/* Called by checkout / orders / track / invoice / admin. Demo-order seeding was removed,
   so this is intentionally a no-op (it just has to exist). */
function seedOrdersIfEmpty() {}

/* ---------- marketing / analytics loader (gated) ----------
   main.js calls loadAnalytics(); checkout.js calls trackEvent(); analytics.js wraps trackEvent. */
const ANALYTICS = {
  enabled: false,
  ga4: 'G-XXXXXXXXXX',
  metaPixel: '000000000000000'
};
function loadAnalytics() {
  const A = getSettings().analytics;
  if (!A.enabled) return;
  if (A.ga4) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + A.ga4;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', A.ga4);
  }
  if (A.metaPixel) {
    window.fbq = window.fbq || function () { (window.fbq.queue = window.fbq.queue || []).push(arguments); };
    window.fbq.queue = window.fbq.queue || [];
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    fbq('init', A.metaPixel);
    fbq('track', 'PageView');
  }
}
function trackEvent(name, data) {
  const A = getSettings().analytics;
  if (A.enabled && A.conversion && window.gtag) gtag('event', name, data || {});
  if (A.enabled && A.conversion && window.fbq) fbq('track', name, data || {});
}
function saveOrders(o) { try { localStorage.setItem(ORDERS_KEY, JSON.stringify(o)); } catch (e) {} }

const DEFAULT_SETTINGS = {
  shipping: { freeShip: STORE.freeShip, std: STORE.ship.std, express: STORE.ship.express },
  gst: { rate: STORE.gst.rate, inclusive: STORE.gst.inclusive, hsnDefault: STORE.gst.hsnDefault, roundOff: STORE.gst.roundOff },
  analytics: { enabled: false, ga4: 'G-XXXXXXXXXX', metaPixel: '00000000000000', searchConsole: '', merchantCenter: '', metaCatalogue: '', conversion: true },
  security: { admin2fa: true, customerOtp: true, captcha: true, waf: true, ssl: true, backups: 'Daily 03:00 IST', retention: '30 days', lockout: 5, sessionMins: 60 },
  whatsapp: { enabled: true, number: STORE.whatsapp.number, stages: { placed: true, paid: true, packed: true, shipped: true, ofd: true, delivered: true, review: true } },
  seo: { suffix: STORE.brand, sitemap: true, robots: true, cleanUrls: true, canonical: true, schema: true },
  marketing: { firstOrder: 10, referral: 10, abandoned: { nudge: '60 min', follow: '24 hrs (+5% code)', final: '72 hrs' }, recovered: {}, broadcast: {} }
};
const GIFT_KEY = 'amour_giftcards_v1';

/* deep-merge stored settings over the defaults above */
function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  Object.keys(over || {}).forEach(k => {
    const v = over[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object')
      ? deepMerge(base[k], v) : v;
  });
  return out;
}
function getSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { stored = {}; }
  return deepMerge(DEFAULT_SETTINGS, stored);
}
function saveSettings(patch) {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { stored = {}; }
  const next = deepMerge(stored, patch);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) {}
  applyStoreSettings();
  return getSettings();
}
/* push the saved settings into STORE — runs at load, so anything the
   admin console changes is immediately live on checkout / cart / track */
function applyStoreSettings() {
  const s = getSettings();
  STORE.freeShip = +s.shipping.freeShip;
  STORE.ship = { std: +s.shipping.std, express: +s.shipping.express };
  STORE.gst = { rate: +s.gst.rate, inclusive: !!s.gst.inclusive, hsnDefault: s.gst.hsnDefault, roundOff: !!s.gst.roundOff };
  STORE.whatsapp = { number: s.whatsapp.number, enabled: !!s.whatsapp.enabled };
  ANALYTICS.enabled = !!s.analytics.enabled;
  ANALYTICS.ga4 = s.analytics.ga4;
  ANALYTICS.metaPixel = s.analytics.metaPixel;
  return s;
}
applyStoreSettings();

/* ---------- coupon engine (defaults + admin-created) ---------- */
function getCoupons() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(COUPONS_KEY)) || []; } catch (e) { custom = []; }
  const map = {};
  DEFAULT_COUPONS.forEach(c => map[c.code.toUpperCase()] = c);
  custom.forEach(c => map[c.code.toUpperCase()] = c);
  return Object.values(map);
}

/* ---------- shared readers used by the admin console ---------- */
function readList(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {} }
function getReturns()  { return readList(RETURNS_KEY); }
function saveReturns(l) { writeList(RETURNS_KEY, l); }
function getCarts()    { return readList(CARTS_KEY); }
function saveCarts(l)  { writeList(CARTS_KEY, l); }
function getAlerts()   { return readList(ALERTS_KEY); }
function saveAlerts(l) { writeList(ALERTS_KEY, l); }
function getGiftCards() { return readList(GIFT_KEY); }
function saveGiftCards(l) { writeList(GIFT_KEY, l); }
function getBroadcasts() { return readList(BCAST_KEY); }
function saveBroadcasts(l) { writeList(BCAST_KEY, l); }
function getOverrides() { return readList('amour_product_overrides_v1'); }
function saveOverrides(l) { writeList('amour_product_overrides_v1', l); }

/* catalog = PRODUCTS with the admin overlay applied */
function getCatalog() {
  const ov = getOverrides();
  return PRODUCTS.map(p => {
    const o = ov.find(x => x.id === p.id);
    return o ? Object.assign({}, p, o) : p;
  });
}
