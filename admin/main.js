/* ============================================================
   AMOUR JEWELS — Admin console (live build)
   Every screen reads and writes the real backend through api().
   Nothing is stored in the browser except the sign-in token
   (sessionStorage, cleared when the tab closes).
   ============================================================ */

const CFG = window.AMOUR_ADMIN || { apiBase: 'http://localhost:10000' };
const TOKEN_KEY = 'amour_admin_token_v2';
const PROFILE_KEY = 'amour_admin_profile_v2';

/* ---------- session ---------- */
const session = {
  get token() { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } },
  get profile() { try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY)) || {}; } catch (e) { return {}; } },
  save(token, profile) {
    try { sessionStorage.setItem(TOKEN_KEY, token); sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
  },
  clear() {
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(PROFILE_KEY); } catch (e) {}
  }
};

/* ---------- API ---------- */
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

/* api('/api/admin/orders?page=0')            → GET
   api('/api/admin/products/save', {method:'POST', body:{...}})
   api('/api/admin/products/upload-image', {method:'POST', form: FormData}) */
async function api(path, opts) {
  opts = opts || {};
  const headers = {};
  if (session.token) headers.Authorization = 'Bearer ' + session.token;
  let body;
  if (opts.form) { body = opts.form; }
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
  let res;
  try {
    res = await fetch(CFG.apiBase + path, { method: opts.method || 'GET', headers, body });
  } catch (e) {
    throw new ApiError('Cannot reach the server. Check your internet, or that the backend is running.', 0);
  }
  if (res.status === 401 && !opts.noAuthRedirect) {
    signOut('Your session has ended — please sign in again.');
    throw new ApiError('Session ended', 401);
  }
  if (opts.blob && res.ok) return res.blob();
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || (typeof data === 'string' && data) || ('Request failed (' + res.status + ')');
    throw new ApiError(msg, res.status);
  }
  return data;
}
const pageItems = d => Array.isArray(d) ? d : ((d && (d.content || d.items)) || []);

/* ---------- small helpers ---------- */
const chip = (txt, cls) => `<span class="chip ${cls || ''}">${txt}</span>`;
const money = n => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const moneyK = n => '₹' + (n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n));
const stars = r => `<span class="adm-stars">${'★'.repeat(Math.round(r))}${'☆'.repeat(5 - Math.round(r))}</span>`;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dshort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const dtime = d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const num = v => (v == null || v === '' || isNaN(+v)) ? 0 : +v;
const kpi = (label, value, note, neg) =>
  `<div class="kpi"><span>${label}</span><b>${value}</b>${note ? `<em class="${neg ? 'neg' : ''}">${note}</em>` : ''}</div>`;
function tbl(head, rows) {
  return `<table class="adm-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
function tr(cols) { return `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`; }
const fld = (id, label, val, type, full, extra) =>
  `<div class="field${full ? ' full' : ''}"><label>${label}</label><input id="${id}" type="${type || 'text'}" value="${esc(val)}" ${extra || ''}></div>`;
const sel = (id, label, options, current, full) =>
  `<div class="field${full ? ' full' : ''}"><label>${label}</label><select id="${id}">${options.map(o => {
    const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
    return `<option value="${esc(v)}" ${String(v) === String(current) ? 'selected' : ''}>${esc(t)}</option>`;
  }).join('')}</select></div>`;
const gv = (bg, id) => { const el = bg.querySelector('#' + id); return el ? el.value.trim() : ''; };
const loading = el => { el.innerHTML = '<p class="adm-note" style="padding:24px 4px">Loading…</p>'; };
const failBox = (el, e, retry) => {
  el.innerHTML = `<div class="adm-alert bad"><span>⚠️</span><div><b>Could not load this screen.</b> ${esc(e.message)}</div></div>
    <button class="adm-btn dark" id="retryBtn">Try again</button>`;
  const b = el.querySelector('#retryBtn'); if (b) b.addEventListener('click', retry);
};

let toastTimer = null;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* modal: onSave may return a Promise; the dialog closes only when it resolves to anything but false */
function openModal(title, body, saveLabel, onSave) {
  const bg = document.createElement('div');
  bg.className = 'adm-modal-bg open';
  bg.innerHTML = `<div class="adm-modal"><h3>${title}</h3>${body}
    <p class="adm-err" id="mErr" style="display:none"></p>
    <div class="adm-row-actions" style="justify-content:flex-end;margin-top:18px">
      <button class="adm-btn" id="mCancel">${onSave ? 'Cancel' : 'Close'}</button>
      ${onSave ? `<button class="adm-btn dark" id="mSave">${saveLabel || 'Save'}</button>` : ''}
    </div></div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.querySelector('#mCancel').addEventListener('click', close);
  const save = bg.querySelector('#mSave');
  const err = bg.querySelector('#mErr');
  bg.showError = m => { err.textContent = m; err.style.display = 'block'; };
  if (save) save.addEventListener('click', async () => {
    err.style.display = 'none';
    save.disabled = true;
    const old = save.textContent; save.textContent = 'Saving…';
    try {
      const r = await onSave(bg);
      if (r !== false) close();
    } catch (e) {
      bg.showError(e.message || 'Something went wrong');
    } finally {
      save.disabled = false; save.textContent = old;
    }
  });
  return bg;
}
/* run an action behind a button: disables it, shows toast on success/failure */
async function act(btn, fn, okMsg) {
  if (btn) btn.disabled = true;
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r;
  } catch (e) {
    toast(e.message || 'Action failed');
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}
const confirmBox = msg => window.confirm(msg);

/* open a PDF/blob from an authenticated endpoint in a new tab */
async function openBlob(path) {
  const w = window.open('', '_blank');
  try {
    const blob = await api(path, { blob: true });
    const url = URL.createObjectURL(blob);
    if (w) w.location = url; else window.location = url;
  } catch (e) { if (w) w.close(); toast(e.message); }
}
function downloadCsv(name, rows) {
  const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click();
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- order status vocabulary (matches the backend OrderStatus enum) ---------- */
const ORDER_LABEL = {
  PENDING_PAYMENT: 'Awaiting payment', PAYMENT_CONFIRMED: 'Paid', PAID: 'Paid', PLACED: 'Placed',
  PROCESSING: 'Processing', PROCESSING_SHIPMENT: 'Processing', PACKED: 'Packed',
  SHIPPED: 'Shipped', IN_TRANSIT: 'In transit', DELIVERED: 'Delivered', CANCELLED: 'Cancelled'
};
const ORDER_CHIP = {
  PENDING_PAYMENT: 'warn', PAYMENT_CONFIRMED: 'info', PAID: 'info', PLACED: 'info', PROCESSING: 'info',
  PROCESSING_SHIPMENT: 'info', PACKED: 'info', SHIPPED: 'info', IN_TRANSIT: 'info', DELIVERED: 'ok', CANCELLED: 'bad'
};
const ORDER_RANK = {
  PENDING_PAYMENT: 0, PAYMENT_CONFIRMED: 1, PAID: 1, PLACED: 2, PROCESSING: 3, PROCESSING_SHIPMENT: 3,
  PACKED: 4, SHIPPED: 5, IN_TRANSIT: 6, DELIVERED: 7, CANCELLED: -1
};
const statusChip = s => chip(ORDER_LABEL[s] || s || '—', ORDER_CHIP[s] || '');
const isPaidOrder = o => o && o.status && o.status !== 'PENDING_PAYMENT' && o.status !== 'CANCELLED';
/* the stages an admin can move an order to, mirroring the backend rules */
function nextStages(status) {
  if (status === 'DELIVERED' || status === 'CANCELLED') return [];
  if (status === 'PENDING_PAYMENT') return ['CANCELLED'];
  const out = [];
  [['PACKED', 4], ['SHIPPED', 5], ['IN_TRANSIT', 6], ['DELIVERED', 7]].forEach(([s, r]) => {
    if (r > ORDER_RANK[status]) out.push(s);
  });
  if (ORDER_RANK[status] < ORDER_RANK.SHIPPED) out.push('CANCELLED');
  return out;
}
const customerOf = o => o.customerName || (o.shippingAddress && ((o.shippingAddress.firstName || '') + ' ' + (o.shippingAddress.lastName || '')).trim()) || '—';

/* shared in-memory cache so screens don't refetch the same list within a few seconds */
const cache = { orders: null, ordersAt: 0, products: null, productsAt: 0 };
async function recentOrders(force) {
  if (!force && cache.orders && Date.now() - cache.ordersAt < 15000) return cache.orders;
  const d = await api('/api/admin/orders?page=0&size=100');
  cache.orders = pageItems(d); cache.ordersAt = Date.now();
  return cache.orders;
}
async function allProducts(force) {
  if (!force && cache.products && Date.now() - cache.productsAt < 8000) return cache.products;
  let all = [], page = 0, last = false;
  while (!last && page < 20) {
    const d = await api('/api/admin/products?page=' + page + '&size=100');
    all = all.concat(pageItems(d));
    last = !d || d.last === true || pageItems(d).length < 100;
    page++;
  }
  cache.products = all; cache.productsAt = Date.now();
  return all;
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function dayLabelsFrom(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    out.push({ key: d.toLocaleDateString('en-CA'), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', ' ') });
  }
  return out;
}
function revenueByDay(orders) {
  const days = dayLabelsFrom(12);
  const map = {};
  orders.filter(isPaidOrder).forEach(o => {
    const k = new Date(o.createdAt).toLocaleDateString('en-CA'); // local yyyy-mm-dd
    map[k] = (map[k] || 0) + (o.totalAmount || 0);
  });
  return days.map(d => ({ label: d.label, v: Math.round(map[d.key] || 0) }));
}

function dashSales(m, orders) {
  const series = revenueByDay(orders);
  const max = Math.max.apply(null, series.map(s => s.v).concat([1]));
  const prepaid = m.prepaidSharePercentage || 0;
  const deg = Math.round(prepaid * 3.6);
  const recent = orders.slice(0, 8);
  const rate = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
  return `
  <div class="kpis">
    ${kpi('Revenue', money(m.revenue), 'paid orders, all time')}
    ${kpi('Orders', m.ordersCount, 'paid, not cancelled')}
    ${kpi('AOV', money(m.aov), 'average order value')}
    ${kpi('Conversion rate', (m.conversionRate || 0) + '%', 'paid orders ÷ product views')}
    ${kpi('Refunds', (m.refundRate || 0) + '%', 'refunded returns ÷ orders')}
    ${kpi('Prepaid share', prepaid + '%', 'UPI · Cards · NetBanking')}
  </div>
  <div class="adm-cards">
    <div class="adm-card">
      <h3>Revenue — last 12 days</h3>
      <div class="bars">${series.map(s => `<i class="${s.v === max && s.v > 0 ? 'hot' : ''}" style="height:${Math.max(6, s.v / max * 100)}%" title="${money(s.v)}"><span>${s.label}</span></i>`).join('')}</div>
      <p class="adm-note">Built from your latest ${orders.length} orders (paid, not cancelled).</p>
    </div>
    <div class="adm-card">
      <h3>Payment mix</h3>
      <div class="donut" style="background:conic-gradient(var(--espresso) 0 ${deg}deg, var(--linen) ${deg}deg 360deg)"><b>${Math.round(prepaid)}%</b></div>
      <div class="legend"><span><i style="background:var(--espresso)"></i>Prepaid ${Math.round(prepaid)}%</span><span><i style="background:var(--linen)"></i>COD ${Math.round(100 - prepaid)}%</span></div>
    </div>
  </div>
  <div class="adm-grid-2">
    <div class="adm-card"><h3>Latest orders</h3>
      ${recent.length ? tbl(['Order', 'Date', 'Value', 'Status'],
        recent.map(o => tr([esc(o.orderNumber || o.id), dshort(o.createdAt), money(o.totalAmount), statusChip(o.status)]))) :
        '<p class="adm-note">No orders yet.</p>'}
    </div>
    <div class="adm-card"><h3>Funnel — last 30 days</h3>
      ${tbl(['Step', 'Count', 'Rate'], [
        tr(['Product views', m.productViews || 0, '—']),
        tr(['Add to cart', m.addToCart || 0, rate(m.addToCart, m.productViews)]),
        tr(['Checkout started', m.checkoutStarted || 0, rate(m.checkoutStarted, m.addToCart)]),
        tr(['Orders paid (all time)', m.ordersPaid || 0, rate(m.ordersPaid, m.checkoutStarted)])
      ])}
      <p class="adm-note">Counts come from storefront events. They stay at zero until the storefront sends them.</p>
    </div>
  </div>`;
}
function dashCustomers(m, recent) {
  return `
  <div class="kpis">
    ${kpi('Total customers', (m.totalCustomers || 0).toLocaleString('en-IN'), 'registered accounts')}
    ${kpi('New (30d)', m.newCustomers30d || 0, 'joined in the last 30 days')}
  </div>
  <div class="adm-card" style="margin-top:14px"><h3>Newest customers</h3>
    ${recent.length ? tbl(['Customer', 'Email', 'Joined'], recent.map(c => tr([esc(c.name || '—'), esc(c.email || '—'), dshort(c.joinedAt)]))) : '<p class="adm-note">No customers yet.</p>'}
    <p class="adm-note">Acquisition channels, repeat rate and lifetime value need more tracking — parked for a later update.</p>
  </div>`;
}
function dashProducts(m) {
  const best = m.bestSellers || [];
  const top = Math.max.apply(null, best.map(b => b.units).concat([1]));
  return `
  <div class="kpis">
    ${kpi('Products', m.skusLive || 0, 'in the catalogue')}
    ${kpi('Units sold', m.unitsSold || 0, 'paid orders')}
    ${kpi('Revenue / product', money(m.revenuePerSku), 'average')}
    ${kpi('Low stock (≤5)', m.lowStockCount || 0, 'restock soon', (m.lowStockCount || 0) > 0)}
  </div>
  <div class="adm-grid-2">
    <div class="adm-card"><h3>Best sellers</h3>
      ${best.length ? tbl(['Product', 'Units', 'Revenue'], best.map(b => tr([esc(b.product), b.units, esc(b.revenue)]))) : '<p class="adm-note">No sales yet.</p>'}
    </div>
    <div class="adm-card"><h3>Units by product</h3>
      ${best.length ? best.map(b => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${esc(b.product)}</span><b>${b.units}</b></div><div class="progress"><i style="width:${Math.min(100, b.units / top * 100)}%"></i></div></div>`).join('') : '<p class="adm-note">Nothing to show yet.</p>'}
    </div>
  </div>`;
}
async function renderDash(el) {
  const tab = el.dataset.tab || 'sales';
  el.dataset.tab = tab;
  loading(el);
  try {
    const [m, orders, custs] = await Promise.all([
      api('/api/admin/metrics'), recentOrders(true),
      tab === 'customers' ? api('/api/admin/customers?page=0&size=8') : Promise.resolve(null)
    ]);
    el.innerHTML = `
    <div class="adm-tabbar">
      <button data-dtab="sales" class="${tab === 'sales' ? 'active' : ''}">Sales</button>
      <button data-dtab="customers" class="${tab === 'customers' ? 'active' : ''}">Customers</button>
      <button data-dtab="products" class="${tab === 'products' ? 'active' : ''}">Products</button>
    </div>
    ${tab === 'sales' ? dashSales(m, orders) : tab === 'customers' ? dashCustomers(m, custs ? custs.items || [] : []) : dashProducts(m)}`;
    el.querySelectorAll('[data-dtab]').forEach(b => b.addEventListener('click', () => { el.dataset.tab = b.dataset.dtab; renderDash(el); }));
  } catch (e) { if (e.status !== 401) failBox(el, e, () => renderDash(el)); }
}

/* ============================================================
   ORDERS
   ============================================================ */
const ORDER_FILTERS = [['', 'All'], ['PENDING_PAYMENT', 'Awaiting payment'], ['PAID', 'Paid'], ['PROCESSING_SHIPMENT', 'Processing'],
  ['PACKED', 'Packed'], ['SHIPPED', 'Shipped'], ['IN_TRANSIT', 'In transit'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled']];

async function renderOrders(el) {
  const f = el.dataset.f || '';
  const page = +(el.dataset.page || 0);
  const q = (el.dataset.q || '').toLowerCase();
  if (!el.dataset.ready) loading(el);
  let data;
  try {
    data = await api('/api/admin/orders?page=' + page + '&size=25' + (f ? '&status=' + f : ''));
  } catch (e) { if (e.status !== 401) failBox(el, e, () => renderOrders(el)); return; }
  el.dataset.ready = '1';
  const orders = pageItems(data);
  const total = data.totalElements != null ? data.totalElements : orders.length;
  const pages = data.totalPages || 1;
  const list = orders.filter(o => !q || (o.orderNumber || '').toLowerCase().includes(q) ||
    customerOf(o).toLowerCase().includes(q) || (o.customerEmail || '').toLowerCase().includes(q));
  el.innerHTML = `
  <div class="adm-alert"><span>💬</span><div><b>Every stage change e-mails the customer</b> and adds a line to the tracking timeline they see. Orders waiting for payment can only be cancelled — only the Razorpay payment confirmation can mark an order paid.</div></div>
  <div class="adm-toolbar">
    <div class="adm-searchbar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="oQ" placeholder="Search this page by order no., name or e-mail…" value="${esc(el.dataset.q || '')}"></div>
    <select id="oF">${ORDER_FILTERS.map(([v, t]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <span class="pill">${total} order${total === 1 ? '' : 's'}${f ? ' in this filter' : ''}</span>
    <button class="adm-btn" id="oRefresh">Refresh</button>
    <button class="adm-btn" id="oExport">Export page CSV</button>
  </div>
  ${list.length ? tbl(['Order', 'Customer', 'Items', 'Value', 'Payment', 'Courier / AWB', 'Status', 'Actions'], list.map(o => {
    const idx = orders.indexOf(o);
    const next = nextStages(o.status).filter(s => s !== 'CANCELLED')[0];
    return `<tr>
      <td><b>${esc(o.orderNumber || o.id)}</b><br><span class="pill">${dtime(o.createdAt)}</span></td>
      <td>${esc(customerOf(o))}<br><span class="pill">${esc(o.customerEmail || '')}</span></td>
      <td>${(o.items || []).reduce((a, i) => a + (i.quantity || 0), 0)}<br><span class="pill">${esc((o.items && o.items[0] && o.items[0].title) || '')}</span></td>
      <td>${money(o.totalAmount)}</td>
      <td>${esc(o.paymentMethod || 'Razorpay')}</td>
      <td>${esc(o.courierName || '—')}<br><span class="pill">${esc(o.awbNumber || o.trackingNumber || '—')}</span></td>
      <td>${statusChip(o.status)}</td>
      <td><div class="adm-row-actions">
        ${next ? `<button class="adm-btn dark" data-next="${idx}">Mark ${ORDER_LABEL[next]}</button>` : ''}
        <button class="adm-btn" data-view="${idx}">Manage</button>
      </div></td></tr>`;
  })) : '<p class="adm-note">No orders match this view.</p>'}
  <div class="adm-toolbar" style="margin-top:12px">
    <button class="adm-btn" id="oPrev" ${page <= 0 ? 'disabled' : ''}>← Newer</button>
    <span class="pill">Page ${page + 1} of ${Math.max(pages, 1)}</span>
    <button class="adm-btn" id="oNext" ${page + 1 >= pages ? 'disabled' : ''}>Older →</button>
  </div>`;
  const qi = el.querySelector('#oQ');
  qi.addEventListener('input', debounce(() => { el.dataset.q = qi.value; renderOrders(el).then(() => { const n = el.querySelector('#oQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 300));
  el.querySelector('#oF').addEventListener('change', e => { el.dataset.f = e.target.value; el.dataset.page = 0; renderOrders(el); });
  el.querySelector('#oRefresh').addEventListener('click', () => renderOrders(el));
  el.querySelector('#oPrev').addEventListener('click', () => { el.dataset.page = page - 1; renderOrders(el); });
  el.querySelector('#oNext').addEventListener('click', () => { el.dataset.page = page + 1; renderOrders(el); });
  el.querySelector('#oExport').addEventListener('click', () => {
    downloadCsv('amour-orders.csv', [['Order', 'Date', 'Customer', 'Email', 'Phone', 'City', 'PIN', 'Total', 'Status', 'Courier', 'AWB']]
      .concat(orders.map(o => [o.orderNumber, o.createdAt, customerOf(o), o.customerEmail, o.customerPhone,
        (o.shippingAddress || {}).city, (o.shippingAddress || {}).zipCode, o.totalAmount, o.status, o.courierName, o.awbNumber || o.trackingNumber])));
  });
  el.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', async () => {
    const o = orders[+b.dataset.next];
    const next = nextStages(o.status).filter(s => s !== 'CANCELLED')[0];
    const needsTracking = (next === 'SHIPPED' || next === 'IN_TRANSIT') && !(o.trackingNumber || o.awbNumber);
    if (needsTracking) { orderModal(o, el, next); return; }
    const done = await act(b, () => api('/api/admin/orders/' + encodeURIComponent(o.id) + '/stage', { method: 'PATCH', body: { status: next } }),
      (o.orderNumber || 'Order') + ' marked ' + ORDER_LABEL[next] + ' — customer e-mailed');
    if (done) renderOrders(el);
  }));
  el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => orderModal(orders[+b.dataset.view], el)));
}

function orderModal(o, el, preselect) {
  const a = o.shippingAddress || {};
  const stages = nextStages(o.status);
  const timeline = (o.trackingTimeline || []).slice().reverse().map(t =>
    `<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line-soft)">
      <span style="min-width:110px">${statusChip(t.status)}</span>
      <span style="flex:1">${esc(t.description || '')}<br><span class="pill">${dtime(t.timestamp)}</span></span></div>`).join('');
  const body = `
  <div class="adm-mini" style="margin-bottom:16px">
    <div><span>Order</span><b>${esc(o.orderNumber || o.id)}</b></div>
    <div><span>Total</span><b>${money(o.totalAmount)}</b></div>
    <div><span>Payment</span><b>${esc(o.paymentMethod || 'Razorpay')}</b></div>
    <div><span>Status</span><b>${esc(ORDER_LABEL[o.status] || o.status)}</b></div>
  </div>
  <div class="adm-grid-2">
    <div>
      <h3 style="font-size:13px;margin-bottom:10px">Timeline</h3>${timeline || '<p class="adm-note">No events yet.</p>'}
      <h3 style="font-size:13px;margin:16px 0 10px">Customer &amp; delivery address</h3>
      <table class="adm-kv"><tbody>
        <tr><td>Name</td><td>${esc(customerOf(o))}</td></tr>
        <tr><td>E-mail</td><td>${esc(o.customerEmail || '—')}</td></tr>
        <tr><td>Phone</td><td>${esc(o.customerPhone || a.phone || '—')}</td></tr>
        <tr><td>Address</td><td>${esc([a.addressLine1, a.addressLine2, a.city, a.state, a.zipCode].filter(Boolean).join(', ') || '—')}</td></tr>
      </tbody></table>
    </div>
    <div>
      <h3 style="font-size:13px;margin-bottom:10px">Items</h3>
      <table class="adm-kv"><tbody>
        ${(o.items || []).map(i => `<tr><td>${esc(i.title)} × ${i.quantity}<br><span class="pill">${esc(i.sku || '')}</span></td><td>${money(i.price * i.quantity)}</td></tr>`).join('') || '<tr><td>—</td><td>—</td></tr>'}
        <tr><td>Subtotal</td><td>${money(o.subtotal)}</td></tr>
        ${o.discountAmount ? `<tr><td>Discount ${o.discountCode ? '(' + esc(o.discountCode) + ')' : ''}</td><td>− ${money(o.discountAmount)}</td></tr>` : ''}
        <tr><td>Shipping</td><td>${o.shippingCost ? money(o.shippingCost) : 'Free'}</td></tr>
        <tr><td><b>Total paid</b></td><td><b>${money(o.totalAmount)}</b></td></tr>
        <tr><td>Razorpay order</td><td><span class="adm-url">${esc(o.razorpayOrderId || '—')}</span></td></tr>
      </tbody></table>
      ${stages.length ? `
      <h3 style="font-size:13px;margin:16px 0 10px">Update this order</h3>
      <div class="f-grid">
        ${sel('omStatus', 'Move to', stages.map(s => [s, ORDER_LABEL[s]]), preselect || stages[0], true)}
        ${fld('omCourier', 'Courier', o.courierName || '', 'text')}
        ${fld('omAwb', 'AWB / tracking number', o.awbNumber || o.trackingNumber || '', 'text')}
        ${fld('omUrl', 'Tracking link (https://…)', o.trackingUrl || '', 'text', true)}
        ${fld('omNote', 'Message shown to the customer (optional)', '', 'text', true)}
      </div>
      <p class="adm-note">Shipped / In transit need an AWB number. Saving e-mails the customer.</p>` : `<p class="adm-note" style="margin-top:14px">This order is ${esc(ORDER_LABEL[o.status] || o.status)} and can no longer be changed.</p>`}
    </div>
  </div>
  <div class="adm-row-actions" style="margin-top:14px">
    ${isPaidOrder(o) ? '<button class="adm-btn" id="omInv">Download invoice</button>' : ''}
    ${o.customerEmail ? `<a class="adm-btn" href="mailto:${esc(o.customerEmail)}?subject=${encodeURIComponent('Your Amour Jewels order ' + (o.orderNumber || ''))}">E-mail customer</a>` : ''}
  </div>`;
  const bg = openModal('Manage order ' + esc(o.orderNumber || o.id), body, stages.length ? 'Save &amp; notify customer' : null,
    stages.length ? async box => {
      const status = gv(box, 'omStatus');
      if (status === 'CANCELLED' && !confirmBox('Cancel this order? Stock goes back on the shelf and the customer is e-mailed.' +
        (isPaidOrder(o) ? '\n\nThis order is PAID — remember to refund the customer in Razorpay.' : ''))) return false;
      await api('/api/admin/orders/' + encodeURIComponent(o.id) + '/stage', { method: 'PATCH', body: {
        status, courier: gv(box, 'omCourier'), trackingNumber: gv(box, 'omAwb'), trackingUrl: gv(box, 'omUrl'), note: gv(box, 'omNote') } });
      toast((o.orderNumber || 'Order') + ' → ' + ORDER_LABEL[status] + ' — customer e-mailed');
      renderOrders(el);
      return true;
    } : null);
  const inv = bg.querySelector('#omInv');
  if (inv) inv.addEventListener('click', () => openBlob('/api/orders/' + encodeURIComponent(o.id) + '/invoice'));
}

/* ============================================================
   PRODUCTS
   ============================================================ */
const productImg = p => (p.imageUrls && p.imageUrls[0]) || '';
const thumb = p => productImg(p)
  ? `<img class="adm-thumb" src="${esc(productImg(p))}" alt="${esc(p.title)}" loading="lazy">`
  : '<span class="adm-thumb" style="display:inline-block;background:var(--linen)"></span>';

async function renderProducts(el, fromCache) {
  if (!fromCache) loading(el);
  let catalog;
  try { catalog = await allProducts(!fromCache); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderProducts(el)); return; }
  const q = (el.dataset.q || '').toLowerCase();
  const rows = catalog.filter(p => !q || (p.title || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
  el.innerHTML = `
  <div class="adm-alert">Products marked <b>Live</b> appear on the storefront straight away. The storefront reads them from Redis, and every save here updates Redis at the same moment. <b>Hide</b> keeps the product (and old orders) but removes it from the shop.</div>
  <div class="adm-toolbar">
    <div class="adm-searchbar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="pQ" placeholder="Search name, SKU or category…" value="${esc(el.dataset.q || '')}"></div>
    <span class="pill">${rows.length} of ${catalog.length} products</span>
    <button class="adm-btn dark" id="pAdd">+ Add product</button>
  </div>
  ${tbl(['Product', 'SKU', 'Price', 'Stock', 'Category', 'Featured', 'Status', 'Actions'], rows.length ? rows.map(p => `<tr>
    <td><div class="adm-prod">${thumb(p)}<div><b>${esc(p.title)}</b></div></div></td>
    <td>${esc(p.sku || '—')}</td>
    <td>${money(p.price)}${p.compareAtPrice > p.price ? `<br><span class="pill">MRP ${money(p.compareAtPrice)}</span>` : ''}</td>
    <td>${chip(p.stockQuantity + ' pcs', p.stockQuantity <= 0 ? 'bad' : p.stockQuantity < 10 ? 'warn' : 'ok')}</td>
    <td>${esc(p.category || '—')}</td>
    <td>${p.featured ? chip('Yes', 'ok') : '—'}</td>
    <td>${p.active ? chip('Live', 'ok') : chip('Hidden', 'warn')}</td>
    <td><div class="adm-row-actions">
      <button class="adm-btn" data-edit="${esc(p.id)}">Edit</button>
      <button class="adm-btn" data-tog="${esc(p.id)}">${p.active ? 'Hide' : 'Show'}</button>
    </div></td></tr>`) : ['<tr><td colspan="8"><p class="adm-note">No products match that search.</p></td></tr>'])}
  <p class="adm-note">Stock shown is what customers can actually buy. A product with 0 stock stays visible but cannot be added to a cart.</p>`;
  const qi = el.querySelector('#pQ');
  qi.addEventListener('input', debounce(() => { el.dataset.q = qi.value; renderProducts(el, true).then(() => { const n = el.querySelector('#pQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 250));
  el.querySelector('#pAdd').addEventListener('click', () => productModal(null, el));
  bindProductRows(el, catalog);
}
function bindProductRows(el, catalog) {
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => productModal(catalog.find(p => p.id === b.dataset.edit), el)));
  el.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', async () => {
    const p = catalog.find(x => x.id === b.dataset.tog);
    const done = await act(b, () => api('/api/admin/products/' + encodeURIComponent(p.id) + '/active', { method: 'PATCH', body: { active: !p.active } }),
      p.title + (p.active ? ' hidden from the shop' : ' is live on the shop'));
    if (done) renderProducts(el);
  }));
}

function productModal(p, el) {
  const known = Array.from(new Set((cache.products || []).map(x => x.category).filter(Boolean).concat(['Diamonds']))).sort();
  const cat = p ? p.category : '';
  const catOptions = known.map(c => [c, c]).concat([['__new', '+ New category…']]);
  let images = (p && p.imageUrls ? p.imageUrls : []).slice();
  const body = `
  <div class="f-grid">
    ${fld('pmName', 'Product name', p ? p.title : '', 'text', true)}
    ${fld('pmSku', 'SKU (unique)', p ? p.sku : '', 'text', false, p ? 'readonly style="background:var(--linen)"' : '')}
    ${fld('pmPrice', 'Selling price (₹)', p ? p.price : '', 'number', false, 'min="0" step="0.01"')}
    ${fld('pmMrp', 'MRP / compare-at price (₹)', p ? p.compareAtPrice : '', 'number', false, 'min="0" step="0.01"')}
    ${fld('pmStock', 'Stock (pcs)', p ? p.stockQuantity : 0, 'number', false, 'min="0" step="1"')}
    ${sel('pmCat', 'Category', catOptions, known.includes(cat) ? cat : (cat ? '__new' : known[0]))}
    <div class="field" id="pmNewCatWrap" style="display:none"><label>New category name</label><input id="pmNewCat" value="${esc(known.includes(cat) ? '' : cat || '')}" placeholder="e.g. Diamonds"></div>
    ${sel('pmFeat', 'Featured on home page', [['false', 'No'], ['true', 'Yes']], p && p.featured ? 'true' : 'false')}
    ${sel('pmActive', 'Visibility', [['true', 'Live on the shop'], ['false', 'Hidden']], !p || p.active ? 'true' : 'false')}
    <div class="field full"><label>Description</label><input id="pmDesc" value="${esc(p ? p.description : '')}" maxlength="2000"></div>
    <div class="field full"><label>Images (the first one is the main photo)</label>
      <div id="pmImgs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
      <div class="adm-row-actions"><button type="button" class="adm-btn" id="pmUpload">Upload photo</button>
        <input type="file" id="pmFile" accept="image/jpeg,image/png,image/webp" hidden>
        <input id="pmImgUrl" placeholder="…or paste an image link and press Add" style="flex:1;min-width:160px">
        <button type="button" class="adm-btn" id="pmAddUrl">Add</button></div>
    </div>
  </div>
  <p class="adm-note">${p ? 'Saving updates the product in the database and in Redis immediately.' : 'A new product goes live on the shop as soon as you save (unless you hide it).'}</p>`;
  const bg = openModal(p ? 'Edit product' : 'Add product', body, p ? 'Save changes' : 'Create product', async box => {
    const title = gv(box, 'pmName'), sku = gv(box, 'pmSku');
    if (!title) throw new Error('Product name is required');
    if (!sku) throw new Error('SKU is required');
    const price = num(gv(box, 'pmPrice'));
    if (!(price > 0)) throw new Error('Enter a selling price above zero');
    const category = gv(box, 'pmCat') === '__new' ? gv(box, 'pmNewCat') : gv(box, 'pmCat');
    if (!category) throw new Error('Choose or type a category');
    const mrp = num(gv(box, 'pmMrp'));
    await api('/api/admin/products/save', { method: 'POST', body: {
      sku, title, description: gv(box, 'pmDesc'), price, compareAtPrice: mrp > 0 ? mrp : price,
      stockQuantity: Math.max(0, Math.floor(num(gv(box, 'pmStock')))), category, imageUrls: images,
      attributes: p ? p.attributes : null, featured: gv(box, 'pmFeat') === 'true', active: gv(box, 'pmActive') === 'true' } });
    toast(title + ' saved — live on the shop' + (gv(box, 'pmActive') === 'true' ? '' : ' (hidden)'));
    cache.products = null;
    renderProducts(el);
    return true;
  });
  const catSel = bg.querySelector('#pmCat'), wrap = bg.querySelector('#pmNewCatWrap');
  const syncCat = () => { wrap.style.display = catSel.value === '__new' ? '' : 'none'; };
  catSel.addEventListener('change', syncCat); syncCat();
  const drawImgs = () => {
    bg.querySelector('#pmImgs').innerHTML = images.length ? images.map((u, i) =>
      `<span style="position:relative"><img class="adm-thumb" style="width:64px;height:64px" src="${esc(u)}" alt=""><button type="button" data-rm="${i}" title="Remove" style="position:absolute;top:-6px;right:-6px;background:var(--espresso);color:#fff;border-radius:50%;width:18px;height:18px;line-height:16px;font-size:12px">×</button></span>`).join('')
      : '<span class="adm-note">No photos yet.</span>';
    bg.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { images.splice(+b.dataset.rm, 1); drawImgs(); }));
  };
  drawImgs();
  const file = bg.querySelector('#pmFile');
  bg.querySelector('#pmUpload').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    const fd = new FormData(); fd.append('file', file.files[0]);
    const btn = bg.querySelector('#pmUpload'); btn.disabled = true; btn.textContent = 'Uploading…';
    try { const r = await api('/api/admin/products/upload-image', { method: 'POST', form: fd }); images.push(r.imageUrl); drawImgs(); }
    catch (e) { bg.showError(e.message); }
    finally { btn.disabled = false; btn.textContent = 'Upload photo'; file.value = ''; }
  });
  bg.querySelector('#pmAddUrl').addEventListener('click', () => {
    const u = gv(bg, 'pmImgUrl');
    if (!/^https:\/\//i.test(u)) { bg.showError('Image links must start with https://'); return; }
    images.push(u); bg.querySelector('#pmImgUrl').value = ''; drawImgs();
  });
}

/* ============================================================
   CATEGORIES (derived from products)
   ============================================================ */
async function renderCategories(el) {
  loading(el);
  let catalog;
  try { catalog = await allProducts(true); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderCategories(el)); return; }
  const map = {};
  catalog.forEach(p => {
    const c = p.category || 'Uncategorised';
    map[c] = map[c] || { name: c, total: 0, live: 0, stock: 0 };
    map[c].total++; if (p.active) map[c].live++; map[c].stock += p.stockQuantity || 0;
  });
  const cats = Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  el.innerHTML = `
  <div class="adm-alert">Categories come from the products themselves — there is nothing separate to maintain. To create a new one (for example <b>Diamonds</b>), add or edit a product and choose <b>+ New category…</b>. It appears in the shop filters as soon as one live product uses it.</div>
  <div class="adm-toolbar"><span class="pill">${cats.length} categories</span></div>
  ${cats.length ? tbl(['Category', 'Products', 'Live on shop', 'Units in stock', 'Shop filter'], cats.map(c => tr([
    '<b>' + esc(c.name) + '</b>', c.total, c.live ? chip(c.live + ' live', 'ok') : chip('none live', 'warn'), c.stock,
    '<span class="adm-url">?category=' + esc(c.name) + '</span>']))) : '<p class="adm-note">No products yet.</p>'}`;
}

/* ============================================================
   INVENTORY
   ============================================================ */
async function renderInventory(el) {
  loading(el);
  let catalog;
  try { catalog = await allProducts(true); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderInventory(el)); return; }
  const rows = catalog.slice().sort((a, b) => a.stockQuantity - b.stockQuantity);
  const low = rows.filter(r => r.stockQuantity > 0 && r.stockQuantity < 10);
  const out = rows.filter(r => r.stockQuantity <= 0);
  const value = rows.reduce((a, r) => a + Math.max(0, r.stockQuantity) * r.price, 0);
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr))">
    ${kpi('Products tracked', rows.length, 'all categories')}
    ${kpi('Low stock (&lt;10)', low.length, low.length ? 'restock soon' : 'all healthy', low.length > 0)}
    ${kpi('Out of stock', out.length, out.length ? 'cannot be bought' : 'none', out.length > 0)}
    ${kpi('Stock value', moneyK(value), 'at selling price')}
  </div>
  ${low.length || out.length ? `<div class="adm-alert warn"><span>⚠️</span><div><b>${low.length + out.length} product${low.length + out.length === 1 ? '' : 's'} need attention.</b> They are sorted to the top.</div></div>` : ''}
  ${rows.length ? tbl(['Product', 'SKU', 'On hand', 'Unit price', 'Stock value', 'Status', 'Actions'], rows.map(r => `<tr>
    <td><div class="adm-prod">${thumb(r)}<div><b>${esc(r.title)}</b><br><span class="pill">${esc(r.category || '')}</span></div></div></td>
    <td>${esc(r.sku || '—')}</td>
    <td><b>${r.stockQuantity}</b> pcs</td>
    <td>${money(r.price)}</td>
    <td>${moneyK(Math.max(0, r.stockQuantity) * r.price)}</td>
    <td>${r.stockQuantity <= 0 ? chip('Out of stock', 'bad') : r.stockQuantity < 10 ? chip('Low', 'warn') : chip('In stock', 'ok')}</td>
    <td><div class="adm-row-actions"><button class="adm-btn dark" data-restock="${esc(r.id)}">Add stock</button></div></td></tr>`)) : '<p class="adm-note">No products yet.</p>'}
  <p class="adm-note">"Add stock" adds to the current number safely, even while customers are buying. To correct a wrong count, edit the product.</p>`;
  el.querySelectorAll('[data-restock]').forEach(b => b.addEventListener('click', () => {
    const p = catalog.find(x => x.id === b.dataset.restock);
    openModal('Add stock — ' + esc(p.title), `<div class="f-grid">${fld('rsQty', 'Units received', 10, 'number', false, 'min="1" step="1"')}</div>
      <p class="adm-note">Currently ${p.stockQuantity} pcs on hand.</p>`, 'Add to stock', async bg => {
      const qty = Math.floor(num(gv(bg, 'rsQty')));
      if (qty < 1) throw new Error('Enter at least 1 unit');
      await api('/api/admin/products/' + encodeURIComponent(p.id) + '/restock', { method: 'POST', body: { quantity: qty } });
      toast('+' + qty + ' pcs added to ' + p.title);
      cache.products = null;
      renderInventory(el);
      return true;
    });
  }));
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
async function renderCustomers(el) {
  const page = +(el.dataset.page || 0);
  const q = el.dataset.q || '';
  if (!el.dataset.ready) loading(el);
  let data;
  try { data = await api('/api/admin/customers?page=' + page + '&size=25' + (q ? '&q=' + encodeURIComponent(q) : '')); }
  catch (e) { if (e.status !== 401) failBox(el, e, () => renderCustomers(el)); return; }
  el.dataset.ready = '1';
  const rows = data.items || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  el.innerHTML = `
  <div class="adm-toolbar">
    <div class="adm-searchbar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="cuQ" placeholder="Search name, e-mail or phone…" value="${esc(q)}"></div>
    <span class="pill">${total} customer${total === 1 ? '' : 's'}</span>
  </div>
  ${rows.length ? tbl(['Customer', 'Phone', 'Verified', 'Sign-in', 'Marketing', 'Status', 'Joined', 'Actions'], rows.map((c, i) => `<tr>
    <td><b>${esc(c.name || '—')}</b><br><span class="pill">${esc(c.email || '')}</span></td>
    <td>${esc(c.phone || '—')}</td>
    <td>${c.emailVerified ? chip('E-mail', 'ok') : chip('E-mail', 'warn')} ${c.phoneVerified ? chip('Phone', 'ok') : ''}</td>
    <td>${esc((c.signInMethods || []).join(', ') || '—')}</td>
    <td>${c.marketingConsent ? chip('Opted in', 'ok') : '—'}</td>
    <td>${c.active ? chip('Active', 'ok') : chip('Disabled', 'bad')}</td>
    <td>${dshort(c.joinedAt)}</td>
    <td><div class="adm-row-actions"><button class="adm-btn dark" data-cview="${i}">View</button></div></td></tr>`)) : '<p class="adm-note">No customers match.</p>'}
  <div class="adm-toolbar" style="margin-top:12px">
    <button class="adm-btn" id="cuPrev" ${page <= 0 ? 'disabled' : ''}>← Newer</button>
    <span class="pill">Page ${page + 1} of ${pages}</span>
    <button class="adm-btn" id="cuNext" ${page + 1 >= pages ? 'disabled' : ''}>Older →</button>
  </div>`;
  const qi = el.querySelector('#cuQ');
  qi.addEventListener('input', debounce(() => { el.dataset.q = qi.value; el.dataset.page = 0; renderCustomers(el).then(() => { const n = el.querySelector('#cuQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350));
  el.querySelector('#cuPrev').addEventListener('click', () => { el.dataset.page = page - 1; renderCustomers(el); });
  el.querySelector('#cuNext').addEventListener('click', () => { el.dataset.page = page + 1; renderCustomers(el); });
  el.querySelectorAll('[data-cview]').forEach(b => b.addEventListener('click', () => customerModal(rows[+b.dataset.cview])));
}
async function customerModal(c) {
  let hist = [];
  try { hist = (await recentOrders()).filter(o => (o.customerEmail || '').toLowerCase() === (c.email || '').toLowerCase()); } catch (e) {}
  const spent = hist.filter(isPaidOrder).reduce((a, o) => a + (o.totalAmount || 0), 0);
  openModal('Customer — ' + esc(c.name || c.email), `
  <div class="adm-mini" style="margin-bottom:16px">
    <div><span>Orders</span><b>${hist.length}</b></div>
    <div><span>Spent</span><b>${money(spent)}</b></div>
    <div><span>Since</span><b>${dshort(c.joinedAt)}</b></div>
  </div>
  <table class="adm-kv"><tbody>
    <tr><td>E-mail</td><td>${esc(c.email || '—')} ${c.emailVerified ? chip('verified', 'ok') : chip('not verified', 'warn')}</td></tr>
    <tr><td>Phone</td><td>${esc(c.phone || '—')} ${c.phoneVerified ? chip('verified', 'ok') : ''}</td></tr>
    <tr><td>Sign-in methods</td><td>${esc((c.signInMethods || []).join(', ') || '—')}</td></tr>
    <tr><td>Marketing e-mails</td><td>${c.marketingConsent ? 'Opted in' : 'No'}</td></tr>
  </tbody></table>
  <h3 style="font-size:13px;margin:18px 0 10px">Orders <span class="pill">from the latest 100 orders</span></h3>
  ${hist.length ? tbl(['Order', 'Date', 'Value', 'Status'], hist.map(o => tr([esc(o.orderNumber || o.id), dshort(o.createdAt), money(o.totalAmount), statusChip(o.status)]))) : '<p class="adm-note">No recent orders for this customer.</p>'}
  ${c.email ? `<div class="adm-row-actions" style="margin-top:14px"><a class="adm-btn" href="mailto:${esc(c.email)}">E-mail customer</a></div>` : ''}`, null);
}

/* ============================================================
   REVIEWS
   ============================================================ */
async function renderReviews(el) {
  loading(el);
  let revs, names = {};
  try {
    revs = await api('/api/feedback/admin/store/all');
    try { (await allProducts()).forEach(p => { names[p.id] = p.title; }); } catch (e) {}
  } catch (e) { if (e.status !== 401) failBox(el, e, () => renderReviews(el)); return; }
  revs = (Array.isArray(revs) ? revs : []).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const f = el.dataset.f || 'All';
  const list = revs.filter(r => f === 'All' || (f === 'Low' ? r.rating <= 2 : f === 'Store' ? !r.productId : !!r.productId));
  const avg = revs.reduce((a, r) => a + (r.rating || 0), 0) / (revs.length || 1);
  const buckets = [5, 4, 3, 2, 1].map(n => ({ n, c: revs.filter(r => r.rating === n).length }));
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${kpi('Total reviews', revs.length, 'products + store')}
    ${kpi('Average rating', revs.length ? avg.toFixed(1) + ' ★' : '—', avg >= 4.5 ? 'excellent' : '')}
    ${kpi('Low (1–2★)', revs.filter(r => r.rating <= 2).length, 'worth a look', revs.filter(r => r.rating <= 2).length > 0)}
    ${kpi('Store feedback', revs.filter(r => !r.productId).length, 'not tied to a product')}
  </div>
  <div class="adm-alert"><span>⭐</span><div>Reviews go live on the product page as soon as a signed-in customer posts them. Use <b>Delete</b> to remove spam or abuse.</div></div>
  <div class="adm-grid-2" style="margin-bottom:14px">
    <div class="adm-card"><h3>Rating distribution</h3>
      ${buckets.map(b => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="pill" style="min-width:34px">${b.n} ★</span><div class="progress" style="flex:1"><i style="width:${pct(b.c, revs.length)}%"></i></div><span class="pill">${b.c}</span></div>`).join('')}
    </div>
  </div>
  <div class="adm-toolbar">
    <select id="rF">${['All', 'Low', 'Store'].map(s => `<option value="${s}" ${f === s ? 'selected' : ''}>${s === 'All' ? 'All reviews' : s === 'Low' ? 'Low ratings (1–2★)' : 'Store feedback'}</option>`).join('')}</select>
    <span class="pill">${list.length} shown</span>
  </div>
  ${list.length ? tbl(['Product', 'Customer', 'Rating', 'Review', 'Date', 'Actions'], list.map(r => tr([
    esc(r.productId ? (names[r.productId] || r.productId) : 'Store feedback'), esc(r.userName || 'Customer'), stars(r.rating || 0),
    '<span style="display:block;max-width:320px">' + esc(r.comment || '') + '</span>', dshort(r.createdAt),
    `<div class="adm-row-actions"><button class="adm-btn" data-delr="${esc(r.id)}">Delete</button></div>`]))) : '<p class="adm-note">No reviews yet.</p>'}`;
  el.querySelector('#rF').addEventListener('change', e => { el.dataset.f = e.target.value; renderReviews(el); });
  el.querySelectorAll('[data-delr]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmBox('Delete this review permanently?')) return;
    const done = await act(b, () => api('/api/feedback/admin/reviews/' + encodeURIComponent(b.dataset.delr), { method: 'DELETE' }), 'Review deleted');
    if (done) renderReviews(el);
  }));
}

/* ============================================================
   RETURNS
   ============================================================ */
const RET_LABEL = { REQUESTED: 'Needs decision', APPROVED_PENDING_PICKUP: 'Approved — awaiting parcel', REJECTED: 'Rejected', ITEM_RECEIVED: 'Received — ready to refund', REFUNDED: 'Refunded' };
const RET_CHIP = { REQUESTED: 'warn', APPROVED_PENDING_PICKUP: 'info', REJECTED: 'bad', ITEM_RECEIVED: 'info', REFUNDED: 'ok' };

async function renderReturns(el) {
  loading(el);
  let data;
  try { data = await api('/api/admin/returns?page=0&size=100'); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderReturns(el)); return; }
  const reqs = pageItems(data);
  const by = s => reqs.filter(r => r.status === s);
  const refunded = by('REFUNDED');
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr))">
    ${kpi('Need a decision', by('REQUESTED').length, 'reply within 24 hrs', by('REQUESTED').length > 0)}
    ${kpi('Awaiting parcel', by('APPROVED_PENDING_PICKUP').length, 'approved, not received')}
    ${kpi('Ready to refund', by('ITEM_RECEIVED').length, 'parcel checked', by('ITEM_RECEIVED').length > 0)}
    ${kpi('Refunded', refunded.length, moneyK(refunded.reduce((a, r) => a + (r.refundAmount || 0), 0)) + ' returned')}
  </div>
  <div class="adm-alert"><span>↩️</span><div><b>How it works:</b> approve or reject → when the parcel arrives and passes your check, press <b>Mark received</b> → press <b>Refund</b>. The refund goes back to the customer's original payment through Razorpay for real. Reverse pickup is booked manually in Shiprocket for now.</div></div>
  ${reqs.length ? tbl(['Return', 'Order', 'Customer', 'Item', 'Reason', 'Refund', 'Raised', 'Status', 'Actions'], reqs.map(r => {
    let actions = '—';
    if (r.status === 'REQUESTED') actions = `<div class="adm-row-actions"><button class="adm-btn dark" data-rev="${esc(r.returnNumber)}" data-ok="1">Approve</button><button class="adm-btn" data-rev="${esc(r.returnNumber)}" data-ok="0">Reject</button></div>`;
    else if (r.status === 'APPROVED_PENDING_PICKUP') actions = `<div class="adm-row-actions"><button class="adm-btn dark" data-recv="${esc(r.returnNumber)}">Mark received</button></div>`;
    else if (r.status === 'ITEM_RECEIVED') actions = `<div class="adm-row-actions"><button class="adm-btn dark" data-refund="${esc(r.returnNumber)}" data-amt="${r.refundAmount}">Refund ${money(r.refundAmount)}</button></div>`;
    else if (r.status === 'REFUNDED') actions = `<span class="pill">${esc(r.refundTransactionId || '')}</span>`;
    return `<tr>
      <td><b>${esc(r.returnNumber)}</b></td>
      <td>${esc(r.orderNumber)}</td>
      <td>${esc(r.customerEmail || '—')}</td>
      <td>${esc(r.sku || r.productId || '—')}</td>
      <td style="max-width:260px">${esc(r.reason || '')}${r.description ? '<br><span class="pill">' + esc(r.description) + '</span>' : ''}${r.adminNotes ? '<br><span class="pill">Note: ' + esc(r.adminNotes) + '</span>' : ''}</td>
      <td>${money(r.refundAmount)}</td>
      <td>${dshort(r.createdAt)}</td>
      <td>${chip(RET_LABEL[r.status] || r.status, RET_CHIP[r.status] || '')}</td>
      <td>${actions}</td></tr>`;
  })) : '<p class="adm-note">No return requests yet. Customers raise them from their order page within 7 days of delivery.</p>'}`;
  el.querySelectorAll('[data-rev]').forEach(b => b.addEventListener('click', () => {
    const ok = b.dataset.ok === '1';
    openModal((ok ? 'Approve' : 'Reject') + ' return ' + esc(b.dataset.rev),
      `<div class="f-grid">${fld('rtNote', ok ? 'Note for the record (optional)' : 'Reason for rejecting', '', 'text', true)}</div>`,
      ok ? 'Approve return' : 'Reject return', async bg => {
        if (!ok && !gv(bg, 'rtNote')) throw new Error('Please give a reason');
        await api('/api/admin/returns/' + encodeURIComponent(b.dataset.rev) + '/review', { method: 'PATCH', body: { approved: ok, adminNotes: gv(bg, 'rtNote') } });
        toast(ok ? 'Return approved' : 'Return rejected');
        renderReturns(el);
        return true;
      });
  }));
  el.querySelectorAll('[data-recv]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmBox('Confirm the parcel was received and passed your quality check?')) return;
    const done = await act(b, () => api('/api/admin/returns/' + encodeURIComponent(b.dataset.recv) + '/received', { method: 'POST' }), 'Marked as received');
    if (done) renderReturns(el);
  }));
  el.querySelectorAll('[data-refund]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmBox('Refund ' + money(b.dataset.amt) + ' to the customer through Razorpay?\n\nThis moves real money and cannot be undone.')) return;
    const done = await act(b, () => api('/api/admin/returns/' + encodeURIComponent(b.dataset.refund) + '/refund', { method: 'POST' }), 'Refund sent to the customer via Razorpay');
    if (done) renderReturns(el);
  }));
}

/* ============================================================
   COUPONS
   ============================================================ */
const COUPON_TYPES = [['PERCENTAGE', 'Percent off'], ['FLAT', 'Flat ₹ off']];
async function renderCoupons(el) {
  loading(el);
  let coupons;
  try { coupons = await api('/api/coupons/admin/all'); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderCoupons(el)); return; }
  coupons = Array.isArray(coupons) ? coupons : [];
  const expired = c => c.expiryDate && new Date(c.expiryDate) < new Date();
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${kpi('Active codes', coupons.filter(c => c.active && !expired(c)).length, coupons.length + ' total')}
    ${kpi('Times used', coupons.reduce((a, c) => a + (c.timesUsed || 0), 0), 'all codes')}
  </div>
  <div class="adm-toolbar">
    <span class="pill">Percent or flat ₹ · one code per order · checked on the server</span>
    <button class="adm-btn dark" id="cpAdd">+ New coupon</button>
  </div>
  ${coupons.length ? tbl(['Code', 'Type', 'Value', 'Min order', 'Expires', 'Used', 'Status', 'Actions'], coupons.map((c, i) => `<tr>
    <td><b>${esc(c.code)}</b></td>
    <td>${chip(c.discountType === 'FLAT' ? 'Flat off' : 'Percent off', 'info')}</td>
    <td>${c.discountType === 'FLAT' ? money(c.discountValue) : c.discountValue + '%' + (c.maxDiscountAmount ? '<br><span class="pill">max ' + money(c.maxDiscountAmount) + '</span>' : '')}</td>
    <td>${c.minOrderValue ? money(c.minOrderValue) : '—'}</td>
    <td>${c.expiryDate ? dshort(c.expiryDate) + (expired(c) ? ' ' + chip('expired', 'bad') : '') : 'No expiry'}</td>
    <td>${c.timesUsed || 0}${c.usageLimit > 0 ? ' / ' + c.usageLimit : ' <span class="pill">no cap</span>'}</td>
    <td>${chip(c.active ? 'Active' : 'Paused', c.active ? 'ok' : 'warn')}</td>
    <td><div class="adm-row-actions">
      <button class="adm-btn" data-ctog="${i}">${c.active ? 'Pause' : 'Activate'}</button>
      <button class="adm-btn" data-cedit="${i}">Edit</button>
    </div></td></tr>`)) : '<p class="adm-note">No coupons yet. Create one with "+ New coupon".</p>'}
  <p class="adm-note">Gift cards work at checkout by code, but they are created directly in the database for now — an issue screen is parked for a later update.</p>`;
  el.querySelector('#cpAdd').addEventListener('click', () => couponModal(null, el));
  el.querySelectorAll('[data-cedit]').forEach(b => b.addEventListener('click', () => couponModal(coupons[+b.dataset.cedit], el)));
  el.querySelectorAll('[data-ctog]').forEach(b => b.addEventListener('click', async () => {
    const c = coupons[+b.dataset.ctog];
    const done = await act(b, () => c.active
      ? api('/api/coupons/admin/' + encodeURIComponent(c.id), { method: 'DELETE' })
      : api('/api/coupons/admin/create', { method: 'POST', body: Object.assign({}, c, { active: true }) }),
      c.code + (c.active ? ' paused' : ' activated'));
    if (done) renderCoupons(el);
  }));
}
function couponModal(c, el) {
  const body = `<div class="f-grid">
    ${fld('cpCode', 'Coupon code', c ? c.code : '', 'text', false, c ? 'readonly style="background:var(--linen)"' : 'placeholder="DIWALI20"')}
    ${sel('cpType', 'Type', COUPON_TYPES, c ? c.discountType : 'PERCENTAGE')}
    ${fld('cpVal', 'Value (percent, or ₹ for flat)', c ? c.discountValue : 10, 'number', false, 'min="0" step="0.01"')}
    ${fld('cpMax', 'Max discount ₹ (percent codes, optional)', c && c.maxDiscountAmount ? c.maxDiscountAmount : '', 'number', false, 'min="0"')}
    ${fld('cpMin', 'Minimum order (₹)', c ? c.minOrderValue : 0, 'number', false, 'min="0"')}
    ${fld('cpUse', 'Total uses allowed (0 = unlimited)', c ? c.usageLimit : 0, 'number', false, 'min="0" step="1"')}
    ${fld('cpExp', 'Expires on (leave empty for none)', c && c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-CA') : '', 'date')}
    ${sel('cpAct', 'Status', [['true', 'Active'], ['false', 'Paused']], !c || c.active ? 'true' : 'false')}
  </div><p class="adm-note">Customers enter the code at checkout. The server re-checks everything, so editing here is safe.</p>`;
  openModal(c ? 'Edit coupon ' + esc(c.code) : 'New coupon', body, 'Save coupon', async bg => {
    const code = gv(bg, 'cpCode').toUpperCase().replace(/\s+/g, '');
    if (!code) throw new Error('A coupon code is required');
    const value = num(gv(bg, 'cpVal'));
    if (!(value > 0)) throw new Error('Enter a value above zero');
    const type = gv(bg, 'cpType');
    if (type === 'PERCENTAGE' && value > 100) throw new Error('A percent coupon cannot exceed 100');
    const exp = gv(bg, 'cpExp');
    const payload = {
      id: c ? c.id : undefined, code, discountType: type, discountValue: value,
      maxDiscountAmount: gv(bg, 'cpMax') ? num(gv(bg, 'cpMax')) : null,
      minOrderValue: num(gv(bg, 'cpMin')), usageLimit: Math.floor(num(gv(bg, 'cpUse'))),
      timesUsed: c ? c.timesUsed : 0,
      expiryDate: exp ? new Date(exp + 'T23:59:59').toISOString() : null,
      active: gv(bg, 'cpAct') === 'true'
    };
    await api('/api/coupons/admin/create', { method: 'POST', body: payload });
    toast(code + ' saved — valid at checkout');
    renderCoupons(el);
    return true;
  });
}

/* ============================================================
   MESSAGES (contact form)
   ============================================================ */
const MSG_LABEL = { NEW: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };
async function renderMessages(el) {
  const f = el.dataset.f || '';
  loading(el);
  let data;
  try { data = await api('/api/admin/messages?page=0&size=100' + (f ? '&status=' + f : '')); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderMessages(el)); return; }
  const msgs = pageItems(data);
  const cnt = s => msgs.filter(m => m.status === s).length;
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${kpi('New', f ? '—' : cnt('NEW'), 'waiting for a reply', cnt('NEW') > 0 && !f)}
    ${kpi('In progress', f ? '—' : cnt('IN_PROGRESS'), 'being handled')}
    ${kpi('Resolved', f ? '—' : cnt('RESOLVED'), 'closed')}
  </div>
  <div class="adm-toolbar">
    <select id="msF">${[['', 'All messages'], ['NEW', 'New'], ['IN_PROGRESS', 'In progress'], ['RESOLVED', 'Resolved']].map(([v, t]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <span class="pill">${msgs.length} shown</span>
  </div>
  ${msgs.length ? tbl(['From', 'Topic', 'Message', 'Received', 'Status', 'Actions'], msgs.map((m, i) => `<tr>
    <td><b>${esc(m.name)}</b><br><span class="pill">${esc(m.email || '')}${m.phone ? ' · ' + esc(m.phone) : ''}</span></td>
    <td>${esc(m.topic || '—')}</td>
    <td style="max-width:340px">${esc(m.message)}</td>
    <td>${dtime(m.createdAt)}</td>
    <td>${chip(MSG_LABEL[m.status] || m.status, m.status === 'NEW' ? 'warn' : m.status === 'RESOLVED' ? 'ok' : 'info')}</td>
    <td><div class="adm-row-actions">
      ${m.email ? `<a class="adm-btn dark" data-mreply="${i}" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.topic || 'Your message to Amour Jewels'))}">Reply</a>` : ''}
      ${m.status === 'NEW' ? `<button class="adm-btn" data-mst="${i}" data-s="IN_PROGRESS">Start</button>` : ''}
      ${m.status !== 'RESOLVED' ? `<button class="adm-btn" data-mst="${i}" data-s="RESOLVED">Resolve</button>` : ''}
    </div></td></tr>`)) : '<p class="adm-note">No messages in this view.</p>'}
  <p class="adm-note">"Reply" opens your e-mail app. Mark a message In progress or Resolved here so the team can see where it stands.</p>`;
  el.querySelector('#msF').addEventListener('change', e => { el.dataset.f = e.target.value; renderMessages(el); });
  el.querySelectorAll('[data-mst]').forEach(b => b.addEventListener('click', async () => {
    const m = msgs[+b.dataset.mst];
    const done = await act(b, () => api('/api/admin/messages/' + encodeURIComponent(m.id) + '/status', { method: 'PATCH', body: { status: b.dataset.s } }), 'Message marked ' + MSG_LABEL[b.dataset.s]);
    if (done) renderMessages(el);
  }));
}

/* ============================================================
   SHIPPING
   ============================================================ */
async function renderShipping(el) {
  loading(el);
  let orders;
  try { orders = await recentOrders(true); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderShipping(el)); return; }
  const toShip = orders.filter(o => ['PAID', 'PAYMENT_CONFIRMED', 'PLACED', 'PROCESSING', 'PROCESSING_SHIPMENT', 'PACKED'].includes(o.status));
  const moving = orders.filter(o => o.status === 'SHIPPED' || o.status === 'IN_TRANSIT');
  el.innerHTML = `
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr))">
    ${kpi('Free shipping from', money(2000), 'set in the backend')}
    ${kpi('Shipping fee below that', money(100), 'flat rate')}
    ${kpi('Waiting to dispatch', toShip.length, 'paid, not yet shipped', toShip.length > 0)}
    ${kpi('On the way', moving.length, 'shipped / in transit')}
  </div>
  <div class="adm-alert"><span>📦</span><div><b>Dispatch flow:</b> a paid order is pushed to Shiprocket automatically. Book the courier and get the AWB in the Shiprocket dashboard, then open the order here, enter the AWB and press <b>Shipped</b> — the customer is e-mailed with the tracking link.</div></div>
  <div class="adm-grid-2">
    <div class="adm-card"><h3>Waiting to dispatch</h3>
      ${toShip.length ? tbl(['Order', 'Customer', 'PIN', 'Status'], toShip.map(o => tr([esc(o.orderNumber || o.id), esc(customerOf(o)), esc((o.shippingAddress || {}).zipCode || '—'), statusChip(o.status)]))) : '<p class="adm-note">Nothing waiting — all paid orders have shipped.</p>'}
    </div>
    <div class="adm-card"><h3>On the way</h3>
      ${moving.length ? tbl(['Order', 'Courier', 'AWB', 'Status'], moving.map(o => tr([esc(o.orderNumber || o.id), esc(o.courierName || '—'), '<span class="adm-url">' + esc(o.awbNumber || o.trackingNumber || '—') + '</span>', statusChip(o.status)]))) : '<p class="adm-note">No shipments in transit right now.</p>'}
    </div>
  </div>
  <div class="adm-grid-2" style="margin-top:14px">
    <div class="adm-card"><h3>Serviceability checker</h3>
      <div class="f-grid">${fld('pinCheck', 'PIN code', '110001', 'text', false, 'maxlength="6" inputmode="numeric"')}</div>
      <button class="adm-btn dark" id="pinRun">Check PIN code</button>
      <div id="pinOut" style="margin-top:14px"></div>
      <p class="adm-note">Uses the same check as the product page widget.</p>
    </div>
    <div class="adm-card"><h3>Packaging &amp; policy</h3>
      <table class="adm-kv"><tbody>
        <tr><td>Free shipping</td><td>Orders of ${money(2000)} and above</td></tr>
        <tr><td>Returns</td><td>7 days from delivery</td></tr>
        <tr><td>Dispatch SLA</td><td>Within 24 hrs of payment</td></tr>
      </tbody></table>
      <p class="adm-note">The shipping fee and free-shipping limit live in the backend order code. Tell me if you want them editable from this screen.</p>
    </div>
  </div>`;
  el.querySelector('#pinRun').addEventListener('click', async () => {
    const pin = gv(el, 'pinCheck'), out = el.querySelector('#pinOut');
    try {
      const r = await api('/api/pincode/' + encodeURIComponent(pin));
      out.innerHTML = `<table class="adm-kv"><tbody>
        <tr><td>Serviceable</td><td>${r.serviceable ? 'Yes' : 'No'}</td></tr>
        ${r.serviceable ? `<tr><td>Courier</td><td>${esc(r.courier)}</td></tr><tr><td>ETA</td><td>${esc(r.eta)}</td></tr>` : ''}
      </tbody></table>`;
    } catch (e) { out.innerHTML = '<div class="adm-alert bad"><span>⚠️</span><div>' + esc(e.message) + '</div></div>'; }
  });
}

/* ============================================================
   GST & INVOICES (estimate — your CA owns the final numbers)
   ============================================================ */
function gstPrefs() {
  try { return Object.assign({ rate: 3, state: '' }, JSON.parse(localStorage.getItem('amour_gst_prefs_v1')) || {}); } catch (e) { return { rate: 3, state: '' }; }
}
async function renderGST(el) {
  loading(el);
  let orders;
  try { orders = (await recentOrders(true)).filter(isPaidOrder); } catch (e) { if (e.status !== 401) failBox(el, e, () => renderGST(el)); return; }
  const P = gstPrefs();
  const rate = (num(P.rate) || 0) / 100;
  const rows = orders.map(o => {
    const taxable = o.totalAmount / (1 + rate), tax = o.totalAmount - taxable;
    const buyer = ((o.shippingAddress || {}).state || '').trim().toLowerCase();
    const intra = P.state && buyer === P.state.trim().toLowerCase();
    return { o, taxable, tax, intra, cgst: intra ? tax / 2 : 0, sgst: intra ? tax / 2 : 0, igst: intra ? 0 : tax };
  });
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  el.innerHTML = `
  <div class="adm-alert warn"><span>🧾</span><div><b>This is an estimate, not your tax return.</b> Prices are treated as tax-inclusive. Confirm the GST rate and HSN code with your accountant before filing. Based on your latest ${orders.length} paid orders.</div></div>
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr))">
    ${kpi('GST rate used', (rate * 100).toFixed(1) + '%', 'edit below')}
    ${kpi('Taxable value', money(sum('taxable')), 'on ' + orders.length + ' invoices')}
    ${kpi('CGST + SGST', money(sum('cgst') + sum('sgst')), P.state ? 'same-state buyers' : 'set your state below')}
    ${kpi('IGST', money(sum('igst')), 'other-state buyers')}
  </div>
  <div class="adm-card" style="margin-bottom:14px"><h3>Estimate settings</h3>
    <div class="f-grid">${fld('gRate', 'GST rate (%)', P.rate, 'number', false, 'min="0" step="0.1"')}${fld('gState', 'Your business state (for CGST/SGST vs IGST)', P.state, 'text')}</div>
    <button class="adm-btn dark" id="gSave">Apply</button>
    <p class="adm-note">Saved in this browser only. The invoice PDF itself is generated by the backend.</p>
  </div>
  <div class="adm-card"><h3>Invoice register</h3>
    ${rows.length ? tbl(['Order', 'Date', 'Buyer', 'State', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', ''], rows.map(r => tr([
      esc(r.o.orderNumber || r.o.id), dshort(r.o.createdAt), esc(customerOf(r.o)), esc((r.o.shippingAddress || {}).state || '—'),
      money(r.taxable), money(r.cgst), money(r.sgst), money(r.igst), money(r.o.totalAmount),
      `<button class="adm-btn" data-inv="${esc(r.o.id)}">Invoice PDF</button>`]))) : '<p class="adm-note">No paid orders yet.</p>'}
  </div>`;
  el.querySelector('#gSave').addEventListener('click', () => {
    try { localStorage.setItem('amour_gst_prefs_v1', JSON.stringify({ rate: num(gv(el, 'gRate')), state: gv(el, 'gState') })); } catch (e) {}
    renderGST(el);
  });
  el.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => openBlob('/api/orders/' + encodeURIComponent(b.dataset.inv) + '/invoice')));
}

/* ============================================================
   EMAIL QUEUE (outgoing e-mails the backend is sending or retrying)
   ============================================================ */
async function renderEmails(el) {
  const f = el.dataset.f || 'FAILED';
  loading(el);
  let data;
  try { data = await api('/api/admin/emails?status=' + f + '&size=50'); }
  catch (e) {
    if (e.status === 404 || e.status === 405) { el.innerHTML = '<div class="adm-alert"><span>ℹ️</span><div>The e-mail queue is not switched on in this backend version yet.</div></div>'; return; }
    if (e.status !== 401) failBox(el, e, () => renderEmails(el)); return;
  }
  const items = pageItems(data);
  el.innerHTML = `
  <div class="adm-alert"><span>✉️</span><div>Every e-mail the shop sends (order updates, welcome, sign-in alerts) waits in a queue and is sent in the background. If the e-mail provider is down it retries automatically — 6 attempts over about 9 hours. <b>Failed</b> ones can be retried here.</div></div>
  <div class="adm-toolbar">
    <select id="emF">${[['FAILED', 'Failed'], ['PENDING', 'Waiting / retrying'], ['SENT', 'Sent (last 14 days)']].map(([v, t]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <span class="pill">${items.length} shown</span>
  </div>
  ${items.length ? tbl(['To', 'Subject', 'Attempts', 'Created', 'Last problem', 'Status', 'Actions'], items.map(m => tr([
    esc(m.to), esc(m.subject), m.attempts, dtime(m.createdAt), '<span style="display:block;max-width:260px">' + esc(m.lastError || '—') + '</span>',
    chip(m.status, m.status === 'SENT' ? 'ok' : m.status === 'FAILED' ? 'bad' : 'warn'),
    m.status === 'FAILED' ? `<button class="adm-btn dark" data-retry="${esc(m.id)}">Retry</button>` : '—']))) : '<p class="adm-note">Nothing here.</p>'}`;
  el.querySelector('#emF').addEventListener('change', e => { el.dataset.f = e.target.value; renderEmails(el); });
  el.querySelectorAll('[data-retry]').forEach(b => b.addEventListener('click', async () => {
    const done = await act(b, () => api('/api/admin/emails/' + encodeURIComponent(b.dataset.retry) + '/retry', { method: 'POST' }), 'Queued for another attempt');
    if (done) renderEmails(el);
  }));
}

/* ============================================================
   SECTION ROUTER
   ============================================================ */
const SEC_TITLES = {
  dash: 'Dashboard', orders: 'Orders', products: 'Products', categories: 'Categories', inventory: 'Inventory',
  customers: 'Customers', reviews: 'Reviews', returns: 'Returns & Refunds', coupons: 'Coupons',
  messages: 'Customer Messages', shipping: 'Shipping', gst: 'GST & Invoicing', emails: 'Email Queue'
};
const RENDERERS = {
  dash: renderDash, orders: renderOrders, products: renderProducts, categories: renderCategories, inventory: renderInventory,
  customers: renderCustomers, reviews: renderReviews, returns: renderReturns, coupons: renderCoupons,
  messages: renderMessages, shipping: renderShipping, gst: renderGST, emails: renderEmails
};
function renderSection(key) {
  const sec = document.querySelector('.adm-sec[data-sec="' + key + '"]');
  if (!sec || !RENDERERS[key]) return;
  document.querySelectorAll('.adm-sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#admNav button').forEach(b => b.classList.toggle('active', b.dataset.sec === key));
  sec.classList.add('active');
  document.getElementById('admTitle').textContent = SEC_TITLES[key] || key;
  RENDERERS[key](sec);
}

/* ============================================================
   SIGN-IN  (real backend login: e-mail + password, 5 wrong tries lock the account)
   ============================================================ */
let expiryTimer = null;
function tokenExpiry(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; }
}
function showLoginError(msg) {
  const err = document.getElementById('admErr');
  err.textContent = msg || '';
  err.style.display = msg ? 'block' : 'none';
  err.classList.toggle('show', !!msg);
}
function signOut(message) {
  clearTimeout(expiryTimer);
  session.clear();
  cache.orders = cache.products = null;
  document.getElementById('admShell').hidden = true;
  document.getElementById('admLogin').hidden = false;
  document.getElementById('admPass').value = '';
  document.querySelectorAll('.adm-sec').forEach(s => { s.innerHTML = ''; s.removeAttribute('data-ready'); delete s.dataset.q; delete s.dataset.f; delete s.dataset.page; });
  showLoginError(message || '');
}
let loginBound = false;
function initLogin() {
  if (loginBound) return;
  loginBound = true;
  const user = document.getElementById('admUser'), pass = document.getElementById('admPass'), btn = document.getElementById('admLoginBtn');
  document.getElementById('admPassEye').addEventListener('click', () => { pass.type = pass.type === 'password' ? 'text' : 'password'; });
  const submit = async () => {
    const email = (user.value || '').trim(), password = pass.value;
    if (!email || !password) { showLoginError('Enter your e-mail and password.'); return; }
    btn.disabled = true; btn.textContent = 'Signing in…'; showLoginError('');
    try {
      const r = await api('/api/admin/auth/login', { method: 'POST', body: { email, password }, noAuthRedirect: true });
      if (!r || !r.token) throw new ApiError('Sign-in failed. Please try again.', 0);
      session.save(r.token, { email: r.email, name: r.name, roles: r.roles || [] });
      openPanel();
    } catch (e) {
      showLoginError(e.status === 401 || e.status === 400 ? 'Wrong e-mail or password.' : e.message);
    } finally { btn.disabled = false; btn.textContent = 'Sign In'; }
  };
  btn.addEventListener('click', submit);
  [user, pass].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
}
let panelBound = false;
function openPanel() {
  const p = session.profile;
  document.getElementById('admLogin').hidden = true;
  document.getElementById('admShell').hidden = false;
  const roles = (p.roles || []).join(' ');
  document.getElementById('admWho').textContent = (p.name || p.email || 'Admin') + (roles.indexOf('SUPER_ADMIN') > -1 ? ' · Super admin' : ' · Admin');
  document.getElementById('admAva').textContent = ((p.name || p.email || 'A')[0] || 'A').toUpperCase();
  document.getElementById('admSession').textContent = 'Signed in ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (!panelBound) {
    panelBound = true;
    document.querySelectorAll('#admNav button').forEach(b => b.addEventListener('click', () => renderSection(b.dataset.sec)));
    document.getElementById('admLogout').addEventListener('click', () => signOut(''));
  }
  const exp = tokenExpiry(session.token);
  clearTimeout(expiryTimer);
  if (exp) expiryTimer = setTimeout(() => signOut('Your session has ended — please sign in again.'), Math.max(1000, exp - Date.now()));
  renderSection('dash');
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  const t = session.token;
  if (t && (!tokenExpiry(t) || tokenExpiry(t) > Date.now())) openPanel();
  else if (t) { session.clear(); showLoginError('Your session has ended — please sign in again.'); }
});
