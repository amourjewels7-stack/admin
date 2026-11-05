/* ============================================================
   AMOUR JEWELS — Core interactions (shared across all pages)
   ============================================================ */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* Every call passes a BASE (INR) amount — fmtMoney (js/currency.js)
   renders it in the visitor's selected currency, with the original
   ₹ formatter as fallback when the currency module isn't present. */
const money = n => (typeof fmtMoney === 'function' ? fmtMoney(n) : '₹' + Math.round(n).toLocaleString('en-IN'));
const productById = id => PRODUCTS.find(p => p.id === id);
const catLabel = p => (p.cat || []).map(c => (CATEGORIES[c] || {}).label || c).join(' · ');

function starHTML(rating, reviews) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return `<span class="p-stars"><span class="stars"><i style="width:${pct}%"></i></span><span class="cnt">${reviews ? reviews.toLocaleString('en-IN') + ' reviews' : ''}</span></span>`;
}

const HEART_SVG = '<svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5c-5.2-3.9-8.5-7-8.5-10.6C3.5 7 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2 4.5 4.9 0 3.6-3.3 6.7-8.5 10.6z"/></svg>';

function cardHTML(p) {
  const off = Math.round((1 - p.price / p.mrp) * 100);
  const tag = p.tag === 'New' ? '<span class="p-tag new">New In</span>'
            : p.tag === 'Bestseller' ? '<span class="p-tag">Bestseller</span>'
            : off >= 20 ? '<span class="p-tag sale">Sale</span>' : '';
  const wished = isWished(p.id) ? ' active' : '';
  return `
  <article class="p-card" data-id="${p.id}">
    <div class="p-media">
      <a href="product.html?id=${p.id}" aria-label="${p.name}">
        <img class="main" src="${p.img}" alt="${p.name}" loading="lazy">
        <img class="alt" src="${p.alt}" alt="" aria-hidden="true" loading="lazy">
      </a>
      ${tag}
      <button class="wish-btn${wished}" data-wish="${p.id}" aria-label="Add ${p.name} to wishlist">${HEART_SVG}</button>
      <div class="p-quick"><button data-quick="${p.id}">Add to Bag</button></div>
    </div>
    <div class="p-info">
      <p class="cat">${catLabel(p)}</p>
      <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
      ${starHTML(p.rating, p.reviews)}
      <p class="p-price">${money(p.price)} ${p.mrp > p.price ? `<s>${money(p.mrp)}</s><span class="off">${off}% off</span>` : ''}</p>
    </div>
  </article>`;
}

/* ---------- toasts ---------- */
let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- wishlist ---------- */
const WL_KEY = 'amour_wishlist_v1';
const getWishlist = () => { try { return JSON.parse(localStorage.getItem(WL_KEY)) || []; } catch { return []; } };
const isWished = id => getWishlist().includes(id);
function toggleWish(id) {
  let w = getWishlist();
  if (w.includes(id)) { w = w.filter(x => x !== id); toast('Removed from wishlist'); }
  else { w.push(id); toast('Saved to wishlist'); }
  localStorage.setItem(WL_KEY, JSON.stringify(w));
  $$(`[data-wish="${id}"]`).forEach(b => b.classList.toggle('active', w.includes(id)));
}


/* ---------- cart store ---------- */
const CART_KEY = 'amour_cart_v1';
const FREE_SHIP = STORE.freeShip;
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = c => { localStorage.setItem(CART_KEY, JSON.stringify(c)); syncBadges(); };
const cartCount = () => getCart().reduce((n, i) => n + i.qty, 0);
const cartSubtotal = () => getCart().reduce((n, i) => {
  const p = productById(i.id); return n + (p ? p.price * i.qty : ((i.amount || 0) * (i.qty || 1)));
}, 0);

function addToCart(id, size, qty = 1, openDrawer = true) {
  const p = productById(id);
  if (!p) return false;
  if (p.sizes && !size) { toast('Please select a size first'); return false; }
  const key = id + '|' + (size || '');
  const cart = getCart();
  const line = cart.find(i => i.key === key);
  if (line) line.qty += qty;
  else cart.push({ key, id, size: size || null, qty });
  saveCart(cart);
  renderDrawer();
  if (openDrawer) openBag();
  toast(p.name + ' — added to your bag');
  return true;
}
function setQty(key, qty) {
  let cart = getCart();
  const line = cart.find(i => i.key === key);
  if (!line) return;
  line.qty = qty;
  if (line.qty <= 0) cart = cart.filter(i => i.key !== key);
  saveCart(cart);
  renderDrawer();
  if (typeof renderCartPage === 'function') renderCartPage();
}
function removeLine(key) {
  saveCart(getCart().filter(i => i.key !== key));
  renderDrawer();
  if (typeof renderCartPage === 'function') renderCartPage();
  toast('Removed from bag');
}
function syncBadges() {
  const n = cartCount();
  $$('#bagCount').forEach(b => { b.textContent = n; b.classList.toggle('show', n > 0); });
}

/* ---------- cart drawer ---------- */
function drawerLineHTML(i) {
  if (i.id === 'giftcard') {
    return `
    <div class="cd-item" data-key="${i.key}">
      <a href="gift-card.html"><span class="ci-gc" aria-hidden="true">🎁</span></a>
      <div class="ci-body">
        <a class="ci-name" href="gift-card.html">Amour Gift Card ${i.size || ''}</a>
        <p class="ci-meta">Digital e-gift · emailed instantly</p>
        <div class="ci-row">
          <span class="qty">
            <button data-dec aria-label="Decrease quantity">−</button>
            <span>${i.qty}</span>
            <button data-inc aria-label="Increase quantity">+</button>
          </span>
          <span class="ci-price">${money((i.amount || 0) * i.qty)}</span>
        </div>
        <button class="ci-remove" data-remove>Remove</button>
      </div>
    </div>`;
  }
  const p = productById(i.id);
  if (!p) return '';
  return `
  <div class="cd-item" data-key="${i.key}">
    <a href="product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}"></a>
    <div class="ci-body">
      <a class="ci-name" href="product.html?id=${p.id}">${p.name}</a>
      <p class="ci-meta">${i.size ? 'Size ' + i.size + ' · ' : ''}${money(p.price)}</p>
      <div class="ci-row">
        <span class="qty">
          <button data-dec aria-label="Decrease quantity">−</button>
          <span>${i.qty}</span>
          <button data-inc aria-label="Increase quantity">+</button>
        </span>
        <span class="ci-price">${money(p.price * i.qty)}</span>
      </div>
      <button class="ci-remove" data-remove>Remove</button>
    </div>
  </div>`;
}

function renderDrawer() {
  const items = getCart();
  const list = $('#cdItems');
  if (!list) return;
  const count = cartCount();
  const sub = cartSubtotal();
  $('#cdCount').textContent = count ? `(${count})` : '';
  $('#cdSubtotal').textContent = money(sub);
  if (!items.length) {
    list.innerHTML = `
      <div class="cd-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.2"><path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>
        <p>Your bag is empty — for now.</p>
        <a class="btn ghost" href="shop.html">Start Shopping</a>
      </div>`;
    $('#cdFoot').style.display = 'none';
    $('#cdShip').style.display = 'none';
    return;
  }
  $('#cdFoot').style.display = '';
  $('#cdShip').style.display = '';
  list.innerHTML = items.map(drawerLineHTML).join('');
  const left = FREE_SHIP - sub;
  $('#cdShip').innerHTML = left > 0
    ? `You’re <b>${money(left)}</b> away from free insured shipping<span class="bar"><i style="width:${Math.min(100, (sub / FREE_SHIP) * 100)}%"></i></span>`
    : `<b>You’ve unlocked free insured shipping.</b> Nicely done.<span class="bar"><i style="width:100%"></i></span>`;
}

function openBag() {
  renderDrawer();
  const drawer = $('#cartDrawer');
  if (drawer) drawer.classList.add('open');
  $('#pageOverlay') && $('#pageOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeBag() { $('#cartDrawer') && $('#cartDrawer').classList.remove('open'); maybeHideOverlay(); }
function maybeHideOverlay() {
  if (!$('#cartDrawer.open') && !$('#mobileNav.open') && !$('#searchPanel.open') && !$('#acctDrawer.open')) {
    $('#pageOverlay') && $('#pageOverlay').classList.remove('show');
    document.body.style.overflow = '';
  }
}

/* ---------- account drawer (sign-in · orders · buy again · addresses) ---------- */
const ACCT_KEY = 'amour_account_v1';
const ADDRS_KEY = 'amour_addresses_v1';
let acctView = 'home';        /* home · orders · addrs · verify */
let acctType = 'phone';       /* sign-in method: phone | email */
let addrFormOpen = false;

const getProfile = () => { try { return JSON.parse(localStorage.getItem(ACCT_KEY)) || null; } catch (e) { return null; } };
const saveProfile = p => { p ? localStorage.setItem(ACCT_KEY, JSON.stringify(p)) : localStorage.removeItem(ACCT_KEY); };
const getAddresses = () => { try { return JSON.parse(localStorage.getItem(ADDRS_KEY)) || []; } catch (e) { return []; } };
function saveAddresses(list) {
  localStorage.setItem(ADDRS_KEY, JSON.stringify(list));
  if (list[0]) localStorage.setItem('amour_address_v1', JSON.stringify(list[0])); /* default → checkout reads this */
}

function ordersForMe() {
  const me = getProfile();
  const all = (typeof getOrders === 'function') ? getOrders() : [];
  if (!me) return all;
  const mine = all.filter(o => {
    const a = o.addr || {};
    return me.type === 'phone'
      ? (a.phone || '').replace(/\D/g, '') === me.contact
      : (a.email || '').toLowerCase() === me.contact.toLowerCase();
  });
  return mine.length ? mine : all; /* first-time shoppers see the store's orders */
}

function acctEnsure() {
  if ($('#acctDrawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <aside class="acct-drawer" id="acctDrawer" aria-label="Your account">
    <div class="cd-head"><b>Your Account</b>
      <button class="icon-btn" id="acctClose" aria-label="Close account">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="acct-body" id="acctBody"></div>
  </aside>`);
  $('#acctClose').addEventListener('click', closeAccount);
  $('#acctBody').addEventListener('click', acctClicks);
  $('#acctBody').addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'acctVerifyForm') acctVerify();
    else if (e.target.id === 'addrForm') addrSave();
  });
}

function acctIcon(name) {
  const paths = {
    orders: '<path d="M6 4h9l3 3v13H6z"/><path d="M9 10h6M9 14h6"/>',
    buy: '<circle cx="12" cy="12" r="8.2"/><path d="M9 12l2 2 4-4"/>',
    addrs: '<path d="M12 21s-6-5.1-6-9.6A6 6 0 0 1 18 11.4C18 15.9 12 21 12 21z"/><circle cx="12" cy="11" r="2.4"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">${paths[name] || ''}</svg>`;
}

function acctTitleHTML(t) {
  return `<div class="acct-title"><button class="acct-back" type="button" data-acct-back aria-label="Back to account">←</button>${t}</div>`;
}

function renderAccount() {
  const box = $('#acctBody');
  if (!box) return;
  const me = getProfile();
  if (!me || acctView === 'verify') { box.innerHTML = acctVerifyHTML(); return; }
  if (acctView === 'orders') box.innerHTML = acctOrdersHTML();
  else if (acctView === 'addrs') box.innerHTML = acctAddrsHTML();
  else box.innerHTML = acctHomeHTML(me);
}

/* — first-time view: verify mobile or gmail — */
function acctVerifyHTML() {
  const isPhone = acctType === 'phone';
  return `
  <div class="acct-verify">
    <h3 class="acct-welcome">Welcome to Amour</h3>
    <p class="acct-note">Verify your mobile number or Gmail to see your orders, saved addresses and order updates.</p>
    <div class="acct-seg">
      <button type="button" data-acct-type="phone" class="${isPhone ? 'active' : ''}">Mobile number</button>
      <button type="button" data-acct-type="email" class="${isPhone ? '' : 'active'}">Email (Gmail)</button>
    </div>
    <form id="acctVerifyForm" novalidate>
      <label class="acct-lab" for="acctContact">${isPhone ? 'Mobile number' : 'Gmail address'}</label>
      <input class="acct-input" id="acctContact" type="${isPhone ? 'tel' : 'email'}"
        autocomplete="${isPhone ? 'tel' : 'email'}" inputmode="${isPhone ? 'numeric' : 'email'}"
        placeholder="${isPhone ? '98765 43210' : 'you@gmail.com'}" maxlength="${isPhone ? 10 : 60}">
      <p class="acct-msg" id="acctMsg"></p>
      <button class="btn" type="submit" style="width:100%">Continue</button>
    </form>
    <div class="acct-or"><span>or</span></div>
    <p class="acct-note">Quicker with Google? <a href="login.html">Sign in</a> or <a href="register.html">create an account</a> — Google only, no passwords.</p>
    <p class="acct-note">Used only for order updates on WhatsApp &amp; email — never spam.</p>
  </div>`;
}

function acctVerify() {
  const inp = $('#acctContact');
  const msg = $('#acctMsg');
  let v = (inp.value || '').trim();
  inp.classList.remove('err');
  if (acctType === 'phone') {
    v = v.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(v)) { inp.classList.add('err'); msg.textContent = 'Please enter a valid 10-digit Indian mobile number.'; return; }
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { inp.classList.add('err'); msg.textContent = 'Please enter a valid Gmail / email address.'; return; }
  saveProfile({ type: acctType, contact: v, since: new Date().toISOString() });
  acctView = 'home';
  renderAccount();
  toast('Signed in — welcome to Amour Jewels');
}

/* — home view: orders · buy again · addresses — */
function acctHomeHTML(me) {
  const orders = ordersForMe();
  const addrs = getAddresses();
  const isPhone = me.type === 'phone';
  const full = isPhone
    ? '+91 ' + me.contact.replace(/(\d{5})(\d{5})/, '$1 $2')
    : me.contact;
  const label = me.name ? me.name : full;                 /* Google profiles carry a real name */
  const sub = me.name ? full : '';
  const initials = me.name ? me.name.trim().slice(0, 2).toUpperCase()
    : (isPhone ? me.contact.slice(-2) : me.contact.slice(0, 2).toUpperCase());
  return `
  <div class="acct-hello">
    <span class="acct-ava">${me.picture ? `<img src="${me.picture}" alt="${me.name || 'Profile photo'}" referrerpolicy="no-referrer">` : initials}</span>
    <div><b>Signed in${me.provider === 'google' ? ' with Google' : ''}</b><p>${label}${sub ? `<br>${sub}` : ''}</p></div>
  </div>
  <div class="acct-cards">
    <button class="acct-card" type="button" data-acct-nav="orders">${acctIcon('orders')}
      <span class="ac-body"><b>Your Orders</b><span>${orders.length ? orders.length + ' order' + (orders.length > 1 ? 's' : '') + ' · track, invoice &amp; returns' : 'No orders yet — start shopping'}</span></span><i class="go">›</i></button>
    <a class="acct-card" href="shop.html">${acctIcon('buy')}
      <span class="ac-body"><b>Buy Again</b><span>Reorder favourites &amp; shop new arrivals</span></span><i class="go">›</i></a>
    <button class="acct-card" type="button" data-acct-nav="addrs">${acctIcon('addrs')}
      <span class="ac-body"><b>Addresses</b><span>${addrs.length ? addrs.length + ' saved address' + (addrs.length > 1 ? 'es' : '') : 'Add a delivery address'}</span></span><i class="go">›</i></button>
  </div>
  <button class="acct-signout" type="button" data-acct-signout>Sign out</button>`;
}

/* — orders view — */
function acctOrdersHTML() {
  const list = ordersForMe();
  const rows = list.map(o => {
    const d = new Date(o.date);
    const items = o.items || [];
    const total = o.total != null ? o.total : (o.sub || 0) + (o.ship || 0);
    const cls = o.status === 'Delivered' ? 'ok' : (o.status === 'Cancelled' ? 'bad' : (/Transit|Delivery/i.test(o.status) ? 'warn' : 'placed'));
    return `
    <div class="acct-ord">
      <div class="top"><b>${o.id}</b><span class="acct-chip ${cls}">${o.status}</span></div>
      <p class="meta">${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·
        ${items[0] ? items[0].name + (items.length > 1 ? ` +${items.length - 1} more` : '') : ''} ·
        <b>${money(total)}</b></p>
      <div class="acts">
        <a href="track.html?id=${o.id}">Track</a>
        <a href="invoice.html?id=${o.id}">Invoice</a>
        <a href="contact.html">Help</a>
      </div>
    </div>`;
  }).join('');
  return `${acctTitleHTML('Your Orders')}
    <p class="acct-note"><a href="orders.html">Full order status, buy again &amp; addresses →</a></p>
    ${list.length ? `<div class="acct-list">${rows}</div>`
      : `<p class="acct-note">No orders yet. <a href="shop.html">Start shopping →</a></p>`}`;
}

/* — addresses view — */
function acctAddrsHTML() {
  let list = getAddresses();
  if (!list.length) { /* import an address saved during checkout, once */
    try {
      const one = JSON.parse(localStorage.getItem('amour_address_v1'));
      if (one && one.name) { list = [one]; saveAddresses(list); }
    } catch (e) {}
  }
  const cards = list.map((a, i) => `
    <div class="acct-addr">
      <b>${a.name}${i === 0 ? '<span class="def">Default</span>' : ''}</b>
      <p>${a.address}, ${a.city}, ${a.state} — ${a.pincode}<br>Phone: ${a.phone}</p>
      ${i === 0 ? '' : `<button class="del" type="button" data-addr-del="${i}">Remove</button>`}
    </div>`).join('');
  const form = addrFormOpen ? `
    <form class="acct-form" id="addrForm" novalidate>
      <div><label class="acct-lab">Full name</label><input class="acct-input" id="afName" placeholder="Ananya Sharma"></div>
      <div><label class="acct-lab">Mobile number</label><input class="acct-input" id="afPhone" type="tel" maxlength="10" placeholder="98765 43210"></div>
      <div><label class="acct-lab">Address (house, street, area)</label><input class="acct-input" id="afAddr" placeholder="Flat 402, Rose Residency, MG Road"></div>
      <div class="two">
        <div><label class="acct-lab">Pincode</label><input class="acct-input" id="afPin" type="tel" maxlength="6" placeholder="110001"></div>
        <div><label class="acct-lab">City</label><input class="acct-input" id="afCity" placeholder="Your city"></div>
      </div>
      <div><label class="acct-lab">State</label><input class="acct-input" id="afState" placeholder="Your state"></div>
      <p class="acct-msg" id="addrMsg"></p>
      <button class="btn" type="submit">Save address</button>
    </form>` : '';
  return `${acctTitleHTML('Addresses')}
    ${list.length ? `<div class="acct-list">${cards}</div>` : `<p class="acct-note">No saved address yet.</p>`}
    <button class="acct-add" type="button" data-addr-add>${addrFormOpen ? '− Close form' : '+ Add a new address'}</button>
    ${form}`;
}

function addrSave() {
  const val = id => ($(id) && $(id).value || '').trim();
  const a = {
    name: val('#afName'), phone: val('#afPhone').replace(/\D/g, ''), address: val('#afAddr'),
    pincode: val('#afPin'), city: val('#afCity'), state: val('#afState'), at: new Date().toISOString()
  };
  const bad = [];
  if (a.name.length < 2) bad.push('#afName');
  if (!/^[6-9]\d{9}$/.test(a.phone)) bad.push('#afPhone');
  if (a.address.length < 5) bad.push('#afAddr');
  if (!/^\d{6}$/.test(a.pincode)) bad.push('#afPin');
  if (a.city.length < 2) bad.push('#afCity');
  if (a.state.length < 2) bad.push('#afState');
  $$('.acct-input').forEach(i => i.classList.remove('err'));
  if (bad.length) {
    bad.forEach(s => $(s) && $(s).classList.add('err'));
    const m = $('#addrMsg'); if (m) m.textContent = 'Please fix the highlighted fields.';
    return;
  }
  const list = getAddresses().filter(x => !(x.phone === a.phone && x.pincode === a.pincode && x.address === a.address));
  list.unshift(a);
  saveAddresses(list);
  addrFormOpen = false;
  renderAccount();
  toast('Address saved — set as default');
}

/* — clicks inside the drawer (delegated) — */
function acctClicks(e) {
  const typeBtn = e.target.closest('[data-acct-type]');
  if (typeBtn) { acctType = typeBtn.dataset.acctType; renderAccount(); setTimeout(() => { const i = $('#acctContact'); i && i.focus(); }, 40); return; }
  const nav = e.target.closest('[data-acct-nav]');
  if (nav) { acctView = nav.dataset.acctNav; addrFormOpen = false; renderAccount(); return; }
  if (e.target.closest('[data-acct-back]')) { acctView = 'home'; addrFormOpen = false; renderAccount(); return; }
  if (e.target.closest('[data-acct-signout]')) {
    saveProfile(null);
    acctView = 'verify';
    renderAccount();
    toast('Signed out of your account');
    return;
  }
  if (e.target.closest('[data-addr-add]')) {
    addrFormOpen = !addrFormOpen;
    renderAccount();
    if (addrFormOpen) setTimeout(() => { const i = $('#afName'); i && i.focus(); }, 40);
    return;
  }
  const del = e.target.closest('[data-addr-del]');
  if (del) {
    const list = getAddresses();
    list.splice(+del.dataset.addrDel, 1);
    saveAddresses(list);
    renderAccount();
    toast('Address removed');
  }
}

function openAccount() {
  acctEnsure();
  renderAccount();
  const d = $('#acctDrawer');
  d.classList.add('open');
  $('#pageOverlay') && $('#pageOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeAccount() { $('#acctDrawer') && $('#acctDrawer').classList.remove('open'); maybeHideOverlay(); }


/* ---------- global UI wiring ---------- */
function initChrome() {
  const header = $('#siteHeader');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile nav */
  const mnav = $('#mobileNav');
  $('#navToggle') && $('#navToggle').addEventListener('click', () => {
    mnav.classList.add('open'); $('#pageOverlay').classList.add('show'); document.body.style.overflow = 'hidden';
  });
  $('#navClose') && $('#navClose').addEventListener('click', () => {
    mnav.classList.remove('open'); maybeHideOverlay();
  });

  /* bag */
  $('#bagBtn') && $('#bagBtn').addEventListener('click', openBag);
  $('#cdClose') && $('#cdClose').addEventListener('click', closeBag);
  $('#cdContinue') && $('#cdContinue').addEventListener('click', closeBag);
  $('#pageOverlay') && $('#pageOverlay').addEventListener('click', () => {
    closeBag();
    mnav && mnav.classList.remove('open');
    closeSearch();
    closeAccount();
    maybeHideOverlay();
  });

  /* drawer line buttons (delegated) */
  $('#cdItems') && $('#cdItems').addEventListener('click', e => {
    const row = e.target.closest('.cd-item');
    if (!row) return;
    const key = row.dataset.key;
    const cart = getCart();
    const line = cart.find(i => i.key === key);
    if (!line) return;
    if (e.target.closest('[data-inc]')) setQty(key, line.qty + 1);
    else if (e.target.closest('[data-dec]')) setQty(key, line.qty - 1);
    else if (e.target.closest('[data-remove]')) removeLine(key);
  });

  /* card actions (delegated across document) */
  document.addEventListener('click', e => {
    const quick = e.target.closest('[data-quick]');
    if (quick) { e.preventDefault(); addToCart(quick.dataset.quick); return; }
    const wish = e.target.closest('[data-wish]');
    if (wish) { e.preventDefault(); toggleWish(wish.dataset.wish); return; }
    if (e.target.closest('[data-account]')) {
      e.preventDefault();
      /* signed out → the sign-up page IS the account entry point */
      if (getProfile()) { openAccount(); return; }
      if (location.pathname.endsWith('register.html')) {           /* already there — nudge to the Google button */
        const gate = document.getElementById('authGate');
        gate && gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else location.href = 'register.html';
    }
  });

  /* search */
  const panel = $('#searchPanel');
  const input = $('#searchInput');
  function openSearch() { if (!panel) return; panel.classList.add('open'); $('#pageOverlay') && $('#pageOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; setTimeout(() => input && input.focus(), 80); }
  function doCloseSearch() { panel && panel.classList.remove('open'); maybeHideOverlay(); }
  window.closeSearch = doCloseSearch;
  $('#searchToggle') && $('#searchToggle').addEventListener('click', openSearch);
  $('#searchClose') && $('#searchClose').addEventListener('click', doCloseSearch);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { doCloseSearch(); closeBag(); closeAccount(); mnav && mnav.classList.remove('open'); maybeHideOverlay(); }
  });

  function searchRender(q) {
    const box = $('#searchResults');
    if (!q.trim()) { box.innerHTML = ''; return; }
    const t = q.trim().toLowerCase();
    const hits = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(t) ||
      p.desc.toLowerCase().includes(t) ||
      catLabel(p).toLowerCase().includes(t)
    ).slice(0, 6);
    box.innerHTML = hits.length
      ? hits.map(p => `
        <a class="sr-item" href="product.html?id=${p.id}">
          <img src="${p.img}" alt="${p.name}">
          <div><p class="n">${p.name}</p><p class="p">${money(p.price)}</p></div>
        </a>`).join('') + `<a class="sr-item" href="shop.html?q=${encodeURIComponent(q)}"><div><p class="n" style="color:var(--gold-deep)">View all results for “${q}” →</p></div></a>`
      : `<p class="sr-empty">Nothing found for “${q}” — try “hoops”, “pearl” or “kada”.</p>`;
  }
  input && input.addEventListener('input', () => searchRender(input.value));
  input && input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) window.location.href = 'shop.html?q=' + encodeURIComponent(input.value.trim());
  });
  $$('.search-hint button').forEach(b => b.addEventListener('click', () => {
    input.value = b.dataset.q; searchRender(b.dataset.q); input.focus();
  }));

  /* newsletter */
  $$('.nl-form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const email = f.querySelector('input[type="email"]');
    const msg = f.querySelector('.nl-msg');
    if (!email.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
      msg.hidden = false; msg.textContent = 'Please enter a valid email address.'; msg.style.color = 'var(--fail)';
      return;
    }
    msg.hidden = false;
    msg.textContent = 'You’re in. Watch your inbox for something sparkly.';
    msg.style.color = '';
    email.value = '';
    toast('Welcome to the inner circle');
  }));
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = $$('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        const el = en.target;
        const idx = Array.from(el.parentElement.children).indexOf(el);
        el.style.transitionDelay = Math.min(idx * 60, 240) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ---------- hero (auto-rotating crossfade slideshow) ---------- */
function initHeroSlider() {
  const root = $('#heroSlider');
  if (!root) return;
  const slides = $$('.hero-slide', root);
  if (slides.length < 2) return;
  /* idempotent — re-entry (bfcache / pageshow via the Home link) restarts instead of stacking timers */
  if (root._hs) { root._hs.restart(); return; }

  const dotsWrap = $('.hs-dots', root);
  const prevBtn = $('.hs-prev', root);
  const nextBtn = $('.hs-next', root);
  const DURATION = 3000; /* ms per slide — slides every 3 seconds */
  let idx = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));
  let timer = null;

  const dots = slides.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'hs-dot';
    b.type = 'button';
    b.setAttribute('aria-label', 'Show slide ' + (i + 1) + ' of ' + slides.length);
    b.addEventListener('click', () => { go(i); restart(); });
    dotsWrap.appendChild(b);
    return b;
  });

  function go(n) {
    idx = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function restart() {
    stop();
    timer = setInterval(() => go(idx + 1), DURATION);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { go(idx - 1); restart(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { go(idx + 1); restart(); });

  /* touch swipe */
  let touchX = null;
  root.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 44) { go(dx < 0 ? idx + 1 : idx - 1); restart(); }
    touchX = null;
  }, { passive: true });

  /* expose controls so a bfcache restore (Home-link back-nav) can restart without re-binding */
  root._hs = { go, restart, stop };
  if (!window._hsPageShowBound) {
    window._hsPageShowBound = true;
    window.addEventListener('pageshow', () => {
      const r = $('#heroSlider');
      if (r && r._hs) r._hs.restart();
      else if (r && !r._hs) initHeroSlider(); /* bfcache restore of an uninitialized page */
    });
  }
  go(idx);
  restart();
}

/* ---------- testimonials slider ---------- */
function initTestiSlider() {
  const root = $('#testiSlider');
  if (!root) return;
  const slides = $$('.testi', root);
  const viewport = $('.testi-viewport', root);
  if (slides.length < 2) return;
  /* idempotent — re-entry (bfcache / pageshow via the Home link) restarts instead of stacking timers */
  if (root._ts) return;

  const navPrev = $('.nav-prev', root);
  const navNext = $('.nav-next', root);
  const dotsWrap = $('.testi-dots', root);

  /* render dots */
  let idx = 0;
  let scrollTimer = null;
  const dots = slides.map((slide, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Show testimonial ' + (i + 1) + ' of ' + slides.length);
    b.className = 'testi-dot' + (i === idx ? ' active' : '');
    b.addEventListener('click', () => go(i));
    dotsWrap.appendChild(b);
    return b;
  });

  function go(n) {
    idx = (n + slides.length) % slides.length;
    viewport.scrollTo({ left: slides[idx].offsetLeft, behavior: 'smooth' });
    slides.forEach(s => s.removeAttribute('aria-hidden'));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function syncActiveDot() {
    idx = slides.reduce((nearest, slide, i) =>
      Math.abs(slide.offsetLeft - viewport.scrollLeft) < Math.abs(slides[nearest].offsetLeft - viewport.scrollLeft) ? i : nearest, 0);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  if (navPrev) navPrev.addEventListener('click', () => go(idx - 1));
  if (navNext) navNext.addEventListener('click', () => go(idx + 1));

  viewport.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(syncActiveDot, 60);
  }, { passive: true });

  viewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
  });

  /* expose controls so a bfcache restore can restart without re-binding */
  root._ts = { go };
}

/* expose globally for bfcache */
window.initTestiSlider = initTestiSlider;

/* ---------- global commerce chrome (all pages) ---------- */
function initGlobalCommerce() {
  loadAnalytics();
  if (document.body.classList.contains('adm-body')) return;

  /* WhatsApp floating button */
  const waNumber = (typeof STORE !== 'undefined' && STORE.whatsapp) ? STORE.whatsapp.number : '919009055502';
  const fab = document.createElement('a');
  fab.className = 'wa-fab';
  fab.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent('Hi Amour Jewels! I have a question.');
  fab.target = '_blank'; fab.rel = 'noopener';
  fab.setAttribute('aria-label', 'Chat on WhatsApp');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.5 14.1c-.2.7-1.2 1.3-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4z"/></svg>';
  document.body.appendChild(fab);

  /* footer links: Cancellation / Warranty / Grievance / Gift Cards.
     (Track Order intentionally NOT injected into the nav — it lives on
     track.html itself + footer + orders page.) */
  const lists = $$('.site-footer .fm-grid ul');
  const helpUl = lists.find(ul => ul.querySelector('a[href="policies.html#shipping"]'));
  const shopUl = lists.find(ul => ul.querySelector('a[href="shop.html?collection=new"]'));
  /* Track Your Order lives in the footer as a WhatsApp deep link (a.wa-track);
     only inject the track.html fallback when that link is missing. */
  if (helpUl && !helpUl.querySelector('a[href="track.html"], a.wa-track')) {
    const li = document.createElement('li');
    li.innerHTML = '<a href="track.html">Track Your Order</a>';
    helpUl.insertBefore(li, helpUl.firstChild);
    ['cancellation|Cancellation Policy', 'warranty|Warranty', 'grievance|Grievance Officer'].forEach(pair => {
      const [anchor, label] = pair.split('|');
      const li2 = document.createElement('li');
      li2.innerHTML = `<a href="policies.html#${anchor}">${label}</a>`;
      helpUl.appendChild(li2);
    });
  }
  if (shopUl && !shopUl.querySelector('a[href="gift-card.html"]')) {
    const li = document.createElement('li');
    li.innerHTML = '<a href="gift-card.html">Gift Cards</a>';
    shopUl.appendChild(li);
  }
  const fb = $('.fb-links');
  if (fb && !fb.querySelector('a[href="policies.html#cancellation"]')) {
    const a = document.createElement('a');
    a.href = 'policies.html#cancellation'; a.textContent = 'Cancellation';
    fb.appendChild(a);
  }

  /* admin access — footer bottom of every storefront page */
  if (fb && !fb.querySelector('.admin-link')) {
    const adm = document.createElement('a');
    adm.href = 'admin.html';
    adm.className = 'admin-link';
    adm.setAttribute('aria-label', 'Admin console');
    adm.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Admin';
    fb.appendChild(adm);
  }
}

/* ---------- live proof numbers ----------
   No "proof" figure on the site is typed by hand. Everything is
   derived from real data at runtime:
     founded → STORE.founded                (js/store-config.js)
     years   → this year − founded
     karigars→ STORE.karigars               (owner-declared business fact)
     pieces  → PRODUCTS.length              (js/products.js)
     reviews → Σ PRODUCTS[].reviews
     rating  → review-weighted mean of PRODUCTS[].rating
   Change the catalogue or the founding year and every page follows.
   Markup contract:  [data-proof="founded|years|karigars|pieces|reviews|rating"]
                     [data-proof-suffix="+"]  → renders as a small gold <sup>
                     [data-proof-claim]       → "4.8 / 5 — 2,056 reviews"            */
function proofNumbers() {
  const rated = PRODUCTS.filter(p => +p.rating > 0 && +p.reviews > 0);
  const reviews = rated.reduce((n, p) => n + +p.reviews, 0);
  const weighted = rated.reduce((n, p) => n + (+p.rating * +p.reviews), 0);
  const founded = +STORE.founded || new Date().getFullYear();
  return {
    founded,
    years: Math.max(1, new Date().getFullYear() - founded),
    karigars: +STORE.karigars || 0,
    pieces: PRODUCTS.length,
    reviews,
    rating: reviews ? weighted / reviews : 0
  };
}

function renderProof() {
  const n = proofNumbers();
  const fmt = {
    founded: String(n.founded),
    years: n.years,
    karigars: n.karigars,
    pieces: n.pieces,
    reviews: n.reviews.toLocaleString('en-IN'),
    rating: n.rating.toFixed(1)
  };
  $$('[data-proof]').forEach(el => {
    const key = el.dataset.proof;
    if (fmt[key] === undefined) return;
    /* optional suffix keeps the typographic treatment ("40"+"+") while
       the figure itself stays live */
    const suffix = el.dataset.proofSuffix;
    if (suffix) el.innerHTML = fmt[key] + '<sup>' + suffix + '</sup>';
    else el.textContent = fmt[key];
  });
  /* hero trust card — real star average, real review count */
  const claim = $('[data-proof-claim]');
  if (claim) claim.textContent = `${fmt.rating} / 5 — ${fmt.reviews} reviews`;
  /* section note above the review grid */
  const note = $('[data-proof-note]');
  if (note) note.innerHTML = `Rated <b>${fmt.rating} / 5</b> across ${fmt.reviews} verified reviews`;
  /* store-config-driven prices in chrome copy (free-shipping threshold) */
  $$('[data-store-money]').forEach(el => {
    const key = el.dataset.storeMoney;
    if (typeof STORE[key] === 'number') el.textContent = money(STORE[key]);
  });
  /* aggregateRating — Google shows the same stars the page does */
  if (n.reviews) {
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: STORE.brand,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: +fmt.rating,
        reviewCount: n.reviews,
        bestRating: 5
      }
    });
    document.head.appendChild(ld);
  }
}

/* ---------- page boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* hero first + isolated — a failure anywhere else must never leave the slider stuck */
  try { initHeroSlider(); } catch (e) {}
  try { initTestiSlider(); } catch (e) {}
  try { initChrome(); } catch (e) {}
  try { syncBadges(); } catch (e) {}
  try { renderDrawer(); } catch (e) {}
  try { initReveal(); } catch (e) {}
  try { renderProof(); } catch (e) {}
  try { initGlobalCommerce(); } catch (e) {}

  const grid = $('#arrivalsGrid');
  try {
  if (grid) grid.innerHTML = PRODUCTS.filter(p => p.collection === 'new').slice(0, 4).map(cardHTML).join('');
  const best = $('#bestGrid');
  if (best) best.innerHTML = PRODUCTS.filter(p => p.tag === 'Bestseller').slice(0, 4).map(cardHTML).join('');
  } catch (e) { console.error(e); }
});
