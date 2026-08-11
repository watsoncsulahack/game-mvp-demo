(() => {
  'use strict';

  const PREFIX = 'campus-buddy.unified-session.v1:';
  const DASHBOARD_PIN_PREFIX = 'campus-buddy.dashboard-pins.v1:';
  const DASHBOARD_ORDER_PREFIX = 'campus-buddy.dashboard-order.v1:';

  const PLACEHOLDER_APPS = [
    { id:'outlook', name:'Outlook', icon:'O', color:'#2563eb' },
    { id:'onedrive', name:'OneDrive', icon:'D', color:'#0ea5e9' },
    { id:'powerpoint', name:'PowerPoint', icon:'P', color:'#f97316' },
    { id:'zoom', name:'Zoom', icon:'Z', color:'#3b82f6' },
    { id:'teams', name:'Teams', icon:'T', color:'#6366f1' },
    { id:'library', name:'University Library', icon:'L', color:'#111827' },
    { id:'chatgpt', name:'ChatGPT Edu', icon:'AI', color:'#10b981' },
    { id:'beachnexus', name:'BeachNexus', icon:'BN', color:'#0f172a' },
    { id:'events', name:'Events & Orgs', icon:'E', color:'#ca8a04' },
    { id:'canvas', name:'Canvas', icon:'C', color:'#f59e0b' },
    { id:'studentcenter', name:'MyCSULB Student Center', icon:'SC', color:'#111827' },
    { id:'careerlink', name:'CareerLink', icon:'CL', color:'#111827' },
    { id:'calendar', name:'Calendar', icon:'Cal', color:'#0284c7' },
    { id:'copilot', name:'Copilot', icon:'Co', color:'#22c55e' }
  ];

  const APPS = [
    ...PLACEHOLDER_APPS,
    { id:'wallet', name:'Campus Wallet', image:'assets/apps/campus-wallet.svg', live:true, copy:'Shared account balance and transaction history.' },
    { id:'faucet', name:'Campus Faucet', image:'assets/apps/campus-faucet.svg', live:true, copy:'Claim demo TEST funds into the connected wallet.' },
    { id:'bookstore', name:'Campus Bookstore', image:'assets/apps/campus-bookstore.svg', live:true, copy:'Spend wallet funds and unlock Buddy items.' }
  ];

  const INTEGRATED_IDS = new Set(['wallet','faucet','bookstore']);
  const PRODUCTS = [
    { id:'campus-hoodie', name:'Campus Hoodie', price:40, unlock:{ value:'hoodie', label:'Soft hoodie' } },
    { id:'light-jacket', name:'Light Jacket', price:55, unlock:{ value:'jacket', label:'Light jacket' } },
    { id:'study-notebook', name:'Study Notebook', price:15, unlock:null }
  ];

  let session = null;
  let active = 'dashboard';
  let dashboardQuery = '';
  let toastTimer = null;
  let dragAppId = null;
  let dragOriginGrid = null;
  let suppressLaunchUntil = 0;

  const touchDrag = {
    timer:null,
    active:false,
    appId:null,
    targetId:null,
    after:false,
    startX:0,
    startY:0,
    originGrid:null,
    ghost:null
  };

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const amount = value => `${Number(value).toFixed(2)} TEST`;
  const email = () => ($('#reviewEmail')?.textContent || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  const key = () => PREFIX + email();
  const pinKey = () => DASHBOARD_PIN_PREFIX + email();
  const orderKey = () => DASHBOARD_ORDER_PREFIX + email();

  function fresh() {
    return { email:email(), balance:0, faucetClaimed:false, transactions:[], orders:[], entitlements:[] };
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || 'null');
      session = value?.email === email() ? value : fresh();
    } catch {
      session = fresh();
    }
    return session;
  }

  function save() {
    try { localStorage.setItem(key(), JSON.stringify(session)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session } }));
  }

  function notify(text) {
    const element = $('#toast');
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 2600);
  }

  function addTx(delta, label) {
    session.transactions.unshift({
      id:`TX-${Date.now().toString(36).toUpperCase()}`,
      amount:delta,
      label,
      at:new Date().toLocaleString()
    });
  }

  function getPins() {
    try {
      const stored = localStorage.getItem(pinKey());
      if (stored === null) return new Set(INTEGRATED_IDS);
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set(INTEGRATED_IDS);
    }
  }

  function savePins(pins) {
    try { localStorage.setItem(pinKey(), JSON.stringify([...pins])); } catch {}
  }

  function getOrder() {
    const fallback = APPS.map(app => app.id);
    try {
      const stored = JSON.parse(localStorage.getItem(orderKey()) || '[]');
      if (!Array.isArray(stored) || !stored.length) return fallback;
      const known = new Set(fallback);
      const seen = new Set();
      const ordered = [];
      stored.forEach(id => {
        if (known.has(id) && !seen.has(id)) {
          seen.add(id);
          ordered.push(id);
        }
      });
      fallback.forEach(id => {
        if (!seen.has(id)) ordered.push(id);
      });
      return ordered;
    } catch {
      return fallback;
    }
  }

  function saveOrder(order) {
    try { localStorage.setItem(orderKey(), JSON.stringify(order)); } catch {}
  }

  function orderedApps() {
    const byId = new Map(APPS.map(app => [app.id, app]));
    return getOrder().map(id => byId.get(id)).filter(Boolean);
  }

  function iconMarkup(app) {
    if (app.image) {
      return `<span class="dashboard-app-icon dashboard-app-icon-image"><img src="${app.image}" alt=""></span>`;
    }
    return `<span class="dashboard-app-icon" style="--app-color:${app.color}">${esc(app.icon)}</span>`;
  }

  function dashboardCard(app, pins) {
    const pinned = pins.has(app.id);
    const launchLabel = app.live ? `Open ${app.name}` : `${app.name} placeholder`;
    const draggable = dashboardQuery.trim() ? 'false' : 'true';
    return `<article class="dashboard-app-card${app.live ? ' is-live' : ''}" data-dashboard-app-card="${app.id}" draggable="${draggable}">
      <div class="dashboard-card-top">
        ${app.live ? '<span class="dashboard-live-dot" title="Integrated app" aria-label="Integrated app"></span>' : '<span></span>'}
        <div class="dashboard-menu-wrap">
          <button class="dashboard-menu-button" type="button" data-dashboard-menu="${app.id}" aria-label="Actions for ${esc(app.name)}" aria-expanded="false">⋮</button>
          <div class="dashboard-menu" data-dashboard-menu-panel="${app.id}" hidden>
            <button type="button" data-dashboard-pin="${app.id}">${pinned ? 'Unpin app' : 'Pin app'}</button>
          </div>
        </div>
      </div>
      <button class="dashboard-app-launch" type="button" data-dashboard-launch="${app.id}" aria-label="${esc(launchLabel)}" draggable="false">
        ${iconMarkup(app)}
        <span class="dashboard-app-name">${esc(app.name)}</span>
        ${app.live ? `<small>${esc(app.copy)}</small>` : ''}
      </button>
    </article>`;
  }

  function dashboard() {
    const pins = getPins();
    const query = dashboardQuery.trim().toLowerCase();
    const apps = orderedApps();
    const filtered = query ? apps.filter(app => app.name.toLowerCase().includes(query)) : apps;
    const pinnedApps = filtered.filter(app => pins.has(app.id));
    const allApps = filtered.filter(app => !pins.has(app.id));

    return `<div class="campus-dashboard-layout">
      <aside class="campus-dashboard-sidebar">
        <div class="campus-dashboard-brand">CSULB</div>
        <nav aria-label="University dashboard sections">
          <button type="button">My Account</button>
          <button class="active" type="button">My Apps</button>
          <button type="button">My Groups</button>
          <button type="button">My Access</button>
        </nav>
        <div class="campus-dashboard-account"><span>Connected Buddy</span><strong>${esc(session.email)}</strong></div>
      </aside>
      <main class="campus-dashboard-main">
        <header class="campus-dashboard-topbar">
          <div><h1>Apps dashboard</h1><p>Campus Buddy computer · connected campus services</p></div>
        </header>
        <section class="campus-dashboard-search-row">
          <label class="dashboard-search-label"><span class="visually-hidden">Search apps</span><input id="campusDashboardSearch" type="search" placeholder="Search apps" value="${esc(dashboardQuery)}" autocomplete="off"></label>
        </section>
        <section class="campus-dashboard-tabs" aria-label="App categories">
          <button class="active" type="button">Apps</button>
          <button type="button">AI Tools</button>
          <button type="button">Health &amp; Wellness Resources</button>
        </section>
        <section class="campus-dashboard-panel">
          <div class="campus-dashboard-panel-head"><h2>Pinned apps</h2><button class="dashboard-link-button" type="button" data-dashboard-clear-pins>Clear pins</button></div>
          <div class="dashboard-apps-grid" data-dashboard-grid="pinned">${pinnedApps.map(app => dashboardCard(app, pins)).join('')}</div>
          ${pinnedApps.length ? '' : '<p class="dashboard-hint">No pinned apps yet. Use the three-dots menu on any app card.</p>'}
        </section>
        <section class="campus-dashboard-panel">
          <div class="campus-dashboard-panel-head"><h2>All apps</h2><span>${filtered.length} available</span></div>
          <p class="dashboard-hint">Drag app cards to rearrange them. The original campus apps remain placeholders; Wallet, Faucet, and Bookstore are connected to this Buddy session.</p>
          <div class="dashboard-apps-grid" data-dashboard-grid="all">${allApps.map(app => dashboardCard(app, pins)).join('')}</div>
          ${allApps.length ? '' : '<p class="dashboard-hint">No apps match this search.</p>'}
        </section>
      </main>
    </div>`;
  }

  function wallet() {
    const rows = session.transactions.length
      ? session.transactions.map(transaction => `<div class="wallet-row"><span><strong>${esc(transaction.label)}</strong><small>${esc(transaction.at)}</small></span><b class="${transaction.amount >= 0 ? 'positive' : 'negative'}">${transaction.amount >= 0 ? '+' : ''}${amount(transaction.amount)}</b></div>`).join('')
      : '<div class="mini-empty">Wallet is empty. Open Campus Faucet to add test funds.</div>';
    return `<section class="mini-app"><div class="wallet-overview"><span>Available balance</span><strong>${amount(session.balance)}</strong><small>${esc(session.email)}</small></div><h3>Recent activity</h3><div class="wallet-list">${rows}</div></section>`;
  }

  function faucet() {
    return `<section class="mini-app"><div class="app-status-pill">Wallet connected</div><h2>Campus Faucet</h2><p>Connected as <strong>${esc(session.email)}</strong></p><div class="faucet-claim"><span>Demo allocation</span><strong>100.00 TEST</strong><button class="mini-primary" type="button" data-faucet-claim ${session.faucetClaimed ? 'disabled' : ''}>${session.faucetClaimed ? 'Already claimed' : 'Claim 100 TEST'}</button></div><p class="mini-note">Simulated test-network value only.</p></section>`;
  }

  function bookstore() {
    return `<section class="mini-app"><div class="store-top"><div><span>Connected wallet</span><strong>${amount(session.balance)}</strong></div><small>${esc(session.email)}</small></div><div class="store-grid">${PRODUCTS.map(product => {
      const owned = product.unlock && session.entitlements.some(entitlement => entitlement.productId === product.id);
      return `<article class="store-card"><div class="store-art">${product.unlock ? '★' : '▤'}</div><span>${product.unlock ? 'Buddy collectible' : 'Campus item'}</span><h3>${product.name}</h3><strong>${amount(product.price)}</strong><button type="button" data-buy-product="${product.id}" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : 'Buy'}</button>${owned ? `<button class="mini-secondary" type="button" data-equip-product="${product.id}">Equip on Buddy</button>` : ''}</article>`;
    }).join('')}</div></section>`;
  }

  function browserLocation(view) {
    if (view === 'dashboard') return 'my.csulb.edu/apps';
    return `campus.local/${view}`;
  }

  function render(view = active) {
    active = view;
    const dashboardMode = view === 'dashboard';
    $('#campusAppsShell').classList.toggle('dashboard-mode', dashboardMode);
    $('#campusAppsTitle').textContent = browserLocation(view);
    $('#campusAppsBack').hidden = dashboardMode;
    $('#campusAppsContent').innerHTML = dashboardMode ? dashboard() : view === 'wallet' ? wallet() : view === 'faucet' ? faucet() : bookstore();
  }

  function open(view = 'dashboard') {
    load();
    dashboardQuery = '';
    render(view);
    $('#campusAppsShell').hidden = false;
    const focusTarget = view === 'dashboard' ? $('#campusDashboardSearch') : $('#campusAppsClose');
    focusTarget?.focus();
  }

  function close() {
    clearTouchDrag();
    dragAppId = null;
    dragOriginGrid = null;
    $('#campusAppsShell').hidden = true;
  }

  function claim() {
    if (session.faucetClaimed) return;
    session.faucetClaimed = true;
    session.balance += 100;
    addTx(100, 'Campus Faucet allocation');
    save();
    render('faucet');
    notify('100 TEST added to Campus Wallet.');
  }

  function buy(id) {
    const product = PRODUCTS.find(candidate => candidate.id === id);
    if (!product) return;
    if (session.balance < product.price) {
      notify('Not enough TEST. Visit Campus Faucet first.');
      return;
    }
    session.balance -= product.price;
    addTx(-product.price, `Campus Bookstore · ${product.name}`);
    session.orders.unshift({ id:`ORDER-${Date.now().toString(36).toUpperCase()}`, productId:product.id, name:product.name, price:product.price });
    if (product.unlock && !session.entitlements.some(entitlement => entitlement.productId === product.id)) {
      session.entitlements.push({ productId:product.id, label:product.unlock.label, outfit:product.unlock.value });
    }
    save();
    render('bookstore');
    notify(`${product.name} purchased${product.unlock ? ' and unlocked for Buddy.' : ''}`);
  }

  function equip(id) {
    const entitlement = session.entitlements.find(candidate => candidate.productId === id);
    if (!entitlement) return;
    document.querySelector(`[data-outfit="${entitlement.outfit}"]`)?.click();
    notify(`${entitlement.label} equipped on Buddy.`);
  }

  function closeDashboardMenus(exceptId = null) {
    document.querySelectorAll('[data-dashboard-menu-panel]').forEach(panel => {
      if (panel.dataset.dashboardMenuPanel !== exceptId) panel.hidden = true;
    });
    document.querySelectorAll('[data-dashboard-menu]').forEach(button => {
      if (button.dataset.dashboardMenu !== exceptId) button.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleDashboardMenu(id) {
    const panel = document.querySelector(`[data-dashboard-menu-panel="${id}"]`);
    const button = document.querySelector(`[data-dashboard-menu="${id}"]`);
    if (!panel || !button) return;
    const opening = panel.hidden;
    closeDashboardMenus(opening ? id : null);
    panel.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  }

  function launchDashboardApp(id) {
    if (Date.now() < suppressLaunchUntil) return;
    if (INTEGRATED_IDS.has(id)) {
      render(id);
      $('#campusAppsClose')?.focus();
      return;
    }
    const app = APPS.find(candidate => candidate.id === id);
    if (app) notify(`${app.name} is a visual placeholder in this integrated demo.`);
  }

  function togglePin(id) {
    const pins = getPins();
    pins.has(id) ? pins.delete(id) : pins.add(id);
    savePins(pins);
    render('dashboard');
  }

  function clearDropIndicators() {
    document.querySelectorAll('.dashboard-app-card').forEach(card => card.classList.remove('dragging','drop-before','drop-after','touch-dragging'));
  }

  function moveApp(draggedId, targetId, after) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const order = getOrder().filter(id => id !== draggedId);
    const targetIndex = order.indexOf(targetId);
    if (targetIndex < 0) return;
    order.splice(targetIndex + (after ? 1 : 0), 0, draggedId);
    saveOrder(order);
    render('dashboard');
  }

  function dropIntent(card, clientX) {
    const rect = card.getBoundingClientRect();
    return clientX >= rect.left + rect.width / 2;
  }

  function markDropTarget(card, after) {
    clearDropIndicators();
    const dragged = document.querySelector(`[data-dashboard-app-card="${dragAppId || touchDrag.appId}"]`);
    dragged?.classList.add(touchDrag.active ? 'touch-dragging' : 'dragging');
    card.classList.add(after ? 'drop-after' : 'drop-before');
  }

  function removeTouchGhost() {
    touchDrag.ghost?.remove();
    touchDrag.ghost = null;
  }

  function clearTouchDrag() {
    if (touchDrag.timer) clearTimeout(touchDrag.timer);
    touchDrag.timer = null;
    removeTouchGhost();
    touchDrag.active = false;
    touchDrag.appId = null;
    touchDrag.targetId = null;
    touchDrag.after = false;
    touchDrag.originGrid = null;
    clearDropIndicators();
  }

  function createTouchGhost(card, x, y) {
    removeTouchGhost();
    const ghost = document.createElement('div');
    ghost.className = 'dashboard-touch-ghost';
    ghost.textContent = card.querySelector('.dashboard-app-name')?.textContent || 'App';
    ghost.style.left = `${Math.round(x)}px`;
    ghost.style.top = `${Math.round(y)}px`;
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;
  }

  function moveTouchGhost(x, y) {
    if (!touchDrag.ghost) return;
    touchDrag.ghost.style.left = `${Math.round(x)}px`;
    touchDrag.ghost.style.top = `${Math.round(y)}px`;
  }

  function setupHost() {
    const computer = document.querySelector('.game-dock [data-panel="campusweb"]');
    if (computer) {
      computer.querySelector('span').textContent = 'Computer';
      computer.firstChild.textContent = '▦';
      computer.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        open('dashboard');
      }, true);
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('#campusAppsShell').hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (active !== 'dashboard') render('dashboard');
        else close();
      }
    });
  }

  document.addEventListener('input', event => {
    if (event.target.matches('#campusDashboardSearch')) {
      dashboardQuery = event.target.value;
      render('dashboard');
      const input = $('#campusDashboardSearch');
      input?.focus();
      input?.setSelectionRange(dashboardQuery.length, dashboardQuery.length);
    }
  });

  document.addEventListener('dragstart', event => {
    const card = event.target.closest?.('[data-dashboard-app-card]');
    if (!card || dashboardQuery.trim() || event.target.closest('.dashboard-menu-wrap')) return;
    dragAppId = card.dataset.dashboardAppCard;
    dragOriginGrid = card.closest('[data-dashboard-grid]');
    card.classList.add('dragging');
    closeDashboardMenus();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragAppId);
    }
  });

  document.addEventListener('dragover', event => {
    if (!dragAppId) return;
    const card = event.target.closest?.('[data-dashboard-app-card]');
    if (!card || card.dataset.dashboardAppCard === dragAppId) return;
    const grid = card.closest('[data-dashboard-grid]');
    if (!grid || grid !== dragOriginGrid) return;
    event.preventDefault();
    const after = dropIntent(card, event.clientX);
    markDropTarget(card, after);
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });

  document.addEventListener('drop', event => {
    if (!dragAppId) return;
    const card = event.target.closest?.('[data-dashboard-app-card]');
    if (!card || card.dataset.dashboardAppCard === dragAppId) return;
    const grid = card.closest('[data-dashboard-grid]');
    if (!grid || grid !== dragOriginGrid) return;
    event.preventDefault();
    const draggedId = dragAppId;
    const targetId = card.dataset.dashboardAppCard;
    const after = dropIntent(card, event.clientX);
    dragAppId = null;
    dragOriginGrid = null;
    suppressLaunchUntil = Date.now() + 350;
    moveApp(draggedId, targetId, after);
  });

  document.addEventListener('dragend', () => {
    dragAppId = null;
    dragOriginGrid = null;
    clearDropIndicators();
  });

  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || dashboardQuery.trim()) return;
    const card = event.target.closest?.('[data-dashboard-app-card]');
    if (!card || event.target.closest('.dashboard-menu-wrap')) return;
    clearTouchDrag();
    touchDrag.appId = card.dataset.dashboardAppCard;
    touchDrag.startX = event.clientX;
    touchDrag.startY = event.clientY;
    touchDrag.originGrid = card.closest('[data-dashboard-grid]');
    touchDrag.timer = setTimeout(() => {
      touchDrag.timer = null;
      touchDrag.active = true;
      card.classList.add('touch-dragging');
      closeDashboardMenus();
      createTouchGhost(card, event.clientX, event.clientY);
    }, 280);
  });

  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || !touchDrag.appId) return;
    if (!touchDrag.active) {
      if (Math.abs(event.clientX - touchDrag.startX) > 10 || Math.abs(event.clientY - touchDrag.startY) > 10) clearTouchDrag();
      return;
    }
    event.preventDefault();
    moveTouchGhost(event.clientX, event.clientY);
    const pointed = document.elementFromPoint(event.clientX, event.clientY);
    const card = pointed?.closest?.('[data-dashboard-app-card]');
    const grid = card?.closest?.('[data-dashboard-grid]');
    if (!card || grid !== touchDrag.originGrid || card.dataset.dashboardAppCard === touchDrag.appId) {
      touchDrag.targetId = null;
      clearDropIndicators();
      document.querySelector(`[data-dashboard-app-card="${touchDrag.appId}"]`)?.classList.add('touch-dragging');
      return;
    }
    touchDrag.targetId = card.dataset.dashboardAppCard;
    touchDrag.after = dropIntent(card, event.clientX);
    markDropTarget(card, touchDrag.after);
  }, { passive:false });

  function finishTouchDrag() {
    if (!touchDrag.appId) return;
    if (!touchDrag.active) {
      clearTouchDrag();
      return;
    }
    const draggedId = touchDrag.appId;
    const targetId = touchDrag.targetId;
    const after = touchDrag.after;
    suppressLaunchUntil = Date.now() + 500;
    clearTouchDrag();
    if (targetId) moveApp(draggedId, targetId, after);
  }

  document.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') finishTouchDrag();
  });
  document.addEventListener('pointercancel', event => {
    if (event.pointerType === 'touch') clearTouchDrag();
  });

  document.addEventListener('click', event => {
    const shell = $('#campusAppsShell');
    if (event.target === shell) {
      close();
      return;
    }

    const menuButton = event.target.closest('[data-dashboard-menu]');
    if (menuButton) {
      event.stopPropagation();
      toggleDashboardMenu(menuButton.dataset.dashboardMenu);
      return;
    }

    const pinButton = event.target.closest('[data-dashboard-pin]');
    if (pinButton) {
      event.stopPropagation();
      togglePin(pinButton.dataset.dashboardPin);
      return;
    }

    const launchButton = event.target.closest('[data-dashboard-launch]');
    if (launchButton) {
      launchDashboardApp(launchButton.dataset.dashboardLaunch);
      return;
    }

    if (event.target.closest('[data-dashboard-clear-pins]')) {
      savePins(new Set());
      render('dashboard');
      return;
    }

    if (event.target.closest('#campusAppsClose')) {
      close();
      return;
    }

    if (event.target.closest('#campusAppsBack')) {
      render('dashboard');
      $('#campusDashboardSearch')?.focus();
      return;
    }

    if (event.target.closest('[data-faucet-claim]')) {
      claim();
      return;
    }

    const buyButton = event.target.closest('[data-buy-product]');
    if (buyButton) {
      buy(buyButton.dataset.buyProduct);
      return;
    }

    const equipButton = event.target.closest('[data-equip-product]');
    if (equipButton) {
      equip(equipButton.dataset.equipProduct);
      return;
    }

    if (!event.target.closest('.dashboard-menu-wrap')) closeDashboardMenus();
  });

  setupHost();
  window.CampusUnifiedApps = Object.freeze({ open, close, getSession:() => session || load() });
})();
