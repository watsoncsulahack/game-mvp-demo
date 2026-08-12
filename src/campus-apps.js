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
    { id:'classic-campus-tee', name:'Classic Campus Tee', price:40, unlock:{ category:'top', value:'tee-classic', label:'Classic tee' } },
    { id:'wide-leg-jeans', name:'Wide-Leg Jeans', price:55, unlock:{ category:'bottom', value:'jeans-wide-leg', label:'Wide-leg jeans' } },
    { id:'low-top-sneakers', name:'Low-Top Sneakers', price:35, unlock:{ category:'footwear', value:'sneakers-low-top', label:'Low-top sneakers' } }
  ];

  let session = null;
  let active = 'dashboard';
  let dashboardQuery = '';
  let toastTimer = null;
  let dragAppId = null;
  let dragOriginGrid = null;
  let suppressLaunchUntil = 0;
  let walletRoute = 'overview';
  let walletPending = null;
  let walletComplete = null;
  let walletMenuOpen = false;
  let walletProcessingTimer = null;

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
  const walletMoney = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Math.abs(Number(value) || 0));
  const email = () => ($('#reviewEmail')?.textContent || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  const key = () => PREFIX + email();
  const pinKey = () => DASHBOARD_PIN_PREFIX + email();
  const orderKey = () => DASHBOARD_ORDER_PREFIX + email();

  function fresh() {
    return { email:email(), balance:0, faucetClaimed:false, transactions:[], orders:[], entitlements:[], address:demoAddress(email()) };
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || 'null');
      session = value?.email === email() ? value : fresh();
    } catch {
      session = fresh();
    }
    if (!session.address) session.address = demoAddress(session.email);
    if (!Array.isArray(session.transactions)) session.transactions = [];
    if (!Array.isArray(session.orders)) session.orders = [];
    if (!Array.isArray(session.entitlements)) session.entitlements = [];
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

  function addTx(delta, label, extra = {}) {
    session.transactions.unshift({
      id:`TX-${Date.now().toString(36).toUpperCase()}`,
      amount:delta,
      label,
      at:new Date().toLocaleString(),
      createdAt:Date.now(),
      ...extra
    });
  }

  function demoAddress(value) {
    const text = `campus-wallet-reference:${String(value).trim().toLowerCase()}`;
    const words = [];
    for (let seed = 0; seed < 5; seed += 1) {
      let hash = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
      for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i) + seed * 17;
        hash = Math.imul(hash, 0x01000193) >>> 0;
        hash ^= hash >>> 13;
      }
      words.push(hash.toString(16).padStart(8, '0'));
    }
    return `0x${words.join('')}`;
  }

  function shortenAddress(address) {
    const value = String(address || '');
    return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
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

  function walletIcon(type, incoming = false) {
    if (type === 'received' || incoming) return '<path d="M12 4v15m6-6-6 6-6-6"/>';
    if (type === 'created') return '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M14 10h7v4h-7a2 2 0 0 1 0-4Z"/>';
    return '<path d="M7 17 17 7M9 7h8v8"/>';
  }

  function walletTransactionMarkup(transaction) {
    const delta = Number(transaction.amount || 0);
    const incoming = delta > 0;
    const type = transaction.kind || (incoming ? 'received' : 'sent');
    const title = transaction.label || (incoming ? 'Received test funds' : 'Test-network transfer');
    let subtitle = transaction.at || 'Test network';
    if (transaction.recipientEmail) subtitle = `To ${transaction.recipientEmail}`;
    else if (transaction.recipient) subtitle = `To ${shortenAddress(transaction.recipient)}`;
    const displayAmount = delta === 0 ? '' : `${delta > 0 ? '+ ' : '− '}${walletMoney(delta)} TEST`;
    return `<div class="cw-transaction-row">
      <span class="cw-transaction-icon${incoming ? ' incoming' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${walletIcon(type, incoming)}</svg></span>
      <span><b>${esc(title)}</b><small>${esc(subtitle)}</small></span>
      <strong class="${incoming ? 'positive' : ''}">${displayAmount}</strong>
    </div>`;
  }

  function walletActivityMarkup(transactions, emptyAction = true) {
    if (!transactions.length) {
      return `<div class="cw-empty-state"><b>No transactions yet</b><p>Use Campus Faucet to add test funds to this connected wallet.</p>${emptyAction ? '<button class="cw-fund-button" type="button" data-wallet-open-faucet>Open Campus Faucet</button>' : ''}</div>`;
    }
    return transactions.map(walletTransactionMarkup).join('');
  }

  function walletOverview() {
    const recent = session.transactions.slice(0, 3);
    return `<section class="cw-content-view" data-wallet-view="overview">
      <header class="cw-page-heading"><div><span class="cw-eyebrow">Wallet overview</span><h1>Overview</h1><p>Your test-network wallet and recent activity.</p></div></header>
      <section class="cw-balance-card cw-card">
        <div><span class="cw-metric-label">Available balance</span><strong>${walletMoney(session.balance)}</strong><small>TEST</small></div>
        <span class="cw-network-badge muted"><i></i> Test network</span>
      </section>
      <div class="cw-quick-actions">
        <button type="button" data-wallet-route="send"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span><span><b>Send</b><small>Transfer funds</small></span><strong>→</strong></button>
        <button type="button" data-wallet-route="receive"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="m17 7-10 10m8 0H7V9"/></svg></span><span><b>Receive</b><small>Share wallet details</small></span><strong>→</strong></button>
        <button type="button" data-wallet-route="activity"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg></span><span><b>Activity</b><small>Review transactions</small></span><strong>→</strong></button>
      </div>
      <section class="cw-activity-card cw-card">
        <div class="cw-section-heading"><div><span class="cw-metric-label">Recent activity</span><p>Latest account updates</p></div><button type="button" data-wallet-route="activity">View all</button></div>
        <div>${walletActivityMarkup(recent)}</div>
      </section>
    </section>`;
  }

  function walletReceive() {
    return `<section class="cw-content-view narrow" data-wallet-view="receive">
      <header class="cw-page-heading"><div><span class="cw-eyebrow">Receive</span><h1>Receive funds</h1><p>Other students can send to your campus email. The resolved test-wallet address is available below for reference.</p></div></header>
      <section class="cw-detail-card cw-card">
        <span class="cw-metric-label">Resolved wallet address</span>
        <div class="cw-address-box"><code>${esc(session.address)}</code><button type="button" data-wallet-copy-address><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copy</span></button></div>
        <dl class="cw-detail-list"><div><dt>Receive by email</dt><dd>${esc(session.email)}</dd></div><div><dt>Network</dt><dd>Test network</dd></div></dl>
        <div class="cw-button-row"><button class="cw-button secondary" type="button" data-wallet-route="overview">Done</button></div>
      </section>
    </section>`;
  }

  function walletSend() {
    return `<section class="cw-content-view narrow" data-wallet-view="send">
      <header class="cw-page-heading"><div><span class="cw-eyebrow">Send</span><h1>Send funds</h1><p>Send TEST funds using a campus email. Campus Wallet resolves the recipient's demo wallet address automatically.</p></div></header>
      <form class="cw-form-card cw-card" id="walletTransferForm" novalidate>
        <label for="walletRecipient">Recipient email</label><input id="walletRecipient" name="recipient" type="email" inputmode="email" placeholder="student@example.edu" autocomplete="email">
        <label for="walletAmount">Amount</label><div class="cw-amount-field"><span>$</span><input id="walletAmount" name="amount" inputmode="decimal" placeholder="0.00"><b>TEST</b></div>
        <label for="walletNote">Note <span>(optional)</span></label><input id="walletNote" name="note" placeholder="Shared project expense" maxlength="80">
        <div class="cw-form-meta"><span>Available balance</span><strong>${walletMoney(session.balance)} TEST</strong></div>
        <p class="cw-field-error" id="walletTransferError" role="alert"></p>
        <button class="cw-button primary" type="submit">Review transfer <span aria-hidden="true">→</span></button>
      </form>
    </section>`;
  }

  function walletReview() {
    const pending = walletPending || { amount:0, recipientEmail:'—', recipient:'—' };
    return `<section class="cw-content-view narrow" data-wallet-view="review">
      <header class="cw-page-heading"><div><span class="cw-eyebrow">Confirmation</span><h1>Review transfer</h1><p>Confirm the details before submitting.</p></div></header>
      <section class="cw-detail-card cw-card cw-review-card">
        <dl class="cw-review-list"><div><dt>You send</dt><dd>${walletMoney(pending.amount)} TEST</dd></div><div><dt>To</dt><dd>${esc(pending.recipientEmail)}</dd></div><div><dt>Network</dt><dd>Test network</dd></div><div><dt>Fee</dt><dd>$0.00 TEST</dd></div></dl>
        <p class="cw-safety-note"><svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.3 8 8 9 4.7-1 8-4 8-9V7Z"/><path d="m9 12 2 2 4-4"/></svg> Campus Wallet resolved the recipient's demo wallet from their email. No real funds are moved.</p>
        <div class="cw-button-row split"><button class="cw-button secondary" type="button" data-wallet-route="send">Cancel</button><button class="cw-button primary" type="button" data-wallet-confirm>Confirm and send</button></div>
      </section>
    </section>`;
  }

  function walletProcessing() {
    return `<section class="cw-content-view centered" data-wallet-view="processing"><div class="cw-status-card cw-card"><div class="cw-spinner" aria-hidden="true"></div><span class="cw-eyebrow">Submitting transfer</span><h1>Processing…</h1><p>Your test-network transaction is being processed.</p><small>Keep this wallet open for a moment.</small></div></section>`;
  }

  function walletCompleteView() {
    const complete = walletComplete || { amount:0, recipientEmail:'—', recipient:'—', id:'—' };
    return `<section class="cw-content-view centered" data-wallet-view="complete"><div class="cw-status-card cw-card cw-complete-card"><div class="cw-success-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m9 16 5 5 10-11"/></svg></div><span class="cw-eyebrow">Transaction confirmed</span><h1>Transfer complete</h1><p><strong>${walletMoney(complete.amount)} TEST</strong> was sent successfully.</p><dl class="cw-detail-list compact"><div><dt>Recipient</dt><dd>${esc(complete.recipientEmail)}</dd></div><div><dt>Transaction</dt><dd>${esc(shortenAddress(complete.id))}</dd></div></dl><div class="cw-button-row split"><button class="cw-button secondary" type="button" data-wallet-route="activity">View activity</button><button class="cw-button primary" type="button" data-wallet-route="overview">Done</button></div></div></section>`;
  }

  function walletActivity() {
    return `<section class="cw-content-view" data-wallet-view="activity"><header class="cw-page-heading"><div><span class="cw-eyebrow">History</span><h1>Activity</h1><p>Test-network wallet transactions and account events.</p></div></header><section class="cw-activity-card cw-card"><div>${walletActivityMarkup(session.transactions, false)}</div></section></section>`;
  }

  function walletContent() {
    if (walletRoute === 'receive') return walletReceive();
    if (walletRoute === 'send') return walletSend();
    if (walletRoute === 'review') return walletReview();
    if (walletRoute === 'processing') return walletProcessing();
    if (walletRoute === 'complete') return walletCompleteView();
    if (walletRoute === 'activity') return walletActivity();
    return walletOverview();
  }

  function wallet() {
    const activeRoute = walletRoute === 'review' || walletRoute === 'processing' || walletRoute === 'complete' ? 'send' : walletRoute;
    return `<section class="cw-shell" aria-label="Campus Wallet">
      <header class="cw-topbar">
        <button class="cw-mobile-menu" type="button" data-wallet-menu aria-label="Open wallet navigation" aria-expanded="${walletMenuOpen}"><span></span><span></span></button>
        <button class="cw-wordmark compact" type="button" data-wallet-route="overview" aria-label="Campus Wallet overview">
          <span class="cw-wallet-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="16" rx="5"/><path d="M20 13h7v7h-7a3.5 3.5 0 0 1 0-7Z"/><circle cx="21" cy="16.5" r="1"/></svg></span>
          <span><strong>Campus Wallet</strong><small>Reference interface</small></span>
        </button>
        <div class="cw-account-context">
          <span class="cw-network-badge"><i></i> Test network</span>
          <button class="cw-identity-button" type="button" data-wallet-account title="Linked to Campus Buddy">
            <span class="cw-identity-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18c1.8-2.6 4-3.9 7-3.9s5.2 1.3 7 3.9M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></span>
            <span><b>${esc(session.email)}</b><small>${esc(shortenAddress(session.address))}</small></span>
          </button>
        </div>
      </header>
      <div class="cw-frame">
        <aside class="cw-sidebar${walletMenuOpen ? ' open' : ''}">
          <nav aria-label="Wallet navigation">
            <button class="cw-nav-item${activeRoute === 'overview' ? ' active' : ''}" type="button" data-wallet-route="overview"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="4"/><path d="M15 10h7v5h-7a2.5 2.5 0 0 1 0-5Z"/></svg><span>Overview</span></button>
            <button class="cw-nav-item${activeRoute === 'send' ? ' active' : ''}" type="button" data-wallet-route="send"><svg viewBox="0 0 24 24"><path d="M12 20V5m-6 6 6-6 6 6"/></svg><span>Send</span></button>
            <button class="cw-nav-item${activeRoute === 'receive' ? ' active' : ''}" type="button" data-wallet-route="receive"><svg viewBox="0 0 24 24"><path d="M12 4v15m6-6-6 6-6-6"/></svg><span>Receive</span></button>
            <button class="cw-nav-item${activeRoute === 'activity' ? ' active' : ''}" type="button" data-wallet-route="activity"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg><span>Activity</span></button>
          </nav>
          <div class="cw-sidebar-footer"><span><i></i> Network: Test</span><small>Identity managed by Campus Buddy</small></div>
        </aside>
        <button class="cw-scrim${walletMenuOpen ? ' open' : ''}" type="button" data-wallet-scrim aria-label="Close wallet navigation"></button>
        <main class="cw-main">${walletContent()}</main>
      </div>
    </section>`;
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
    if (view === 'wallet') return `wallet.campus.local/#${walletRoute}`;
    return `campus.local/${view}`;
  }

  function render(view = active) {
    active = view;
    const dashboardMode = view === 'dashboard';
    const walletMode = view === 'wallet';
    $('#campusAppsShell').classList.toggle('dashboard-mode', dashboardMode);
    $('#campusAppsShell').classList.toggle('wallet-mode', walletMode);
    $('#campusAppsTitle').textContent = browserLocation(view);
    const back = $('#campusAppsBack');
    back.hidden = false;
    back.disabled = dashboardMode;
    back.setAttribute('aria-disabled', String(dashboardMode));
    $('#campusAppsContent').innerHTML = dashboardMode ? dashboard() : walletMode ? wallet() : view === 'faucet' ? faucet() : bookstore();
  }

  function open(view = 'dashboard') {
    load();
    dashboardQuery = '';
    if (view === 'wallet') walletRoute = 'overview';
    render(view);
    $('#campusAppsShell').hidden = false;
    const focusTarget = view === 'dashboard' ? $('#campusDashboardSearch') : $('#campusAppsClose');
    focusTarget?.focus();
  }

  function close() {
    clearTimeout(walletProcessingTimer);
    walletProcessingTimer = null;
    clearTouchDrag();
    dragAppId = null;
    dragOriginGrid = null;
    walletMenuOpen = false;
    $('#campusAppsShell').hidden = true;
  }

  function claim() {
    if (session.faucetClaimed) return;
    session.faucetClaimed = true;
    session.balance += 100;
    addTx(100, 'Campus Faucet allocation', { kind:'received', source:'Campus Faucet' });
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
    addTx(-product.price, `Campus Bookstore · ${product.name}`, { kind:'purchase', merchant:'Campus Bookstore' });
    session.orders.unshift({ id:`ORDER-${Date.now().toString(36).toUpperCase()}`, productId:product.id, name:product.name, price:product.price });
    if (product.unlock && !session.entitlements.some(entitlement => entitlement.productId === product.id)) {
      session.entitlements.push({ productId:product.id, label:product.unlock.label, category:product.unlock.category, layer:product.unlock.value });
    }
    save();
    render('bookstore');
    notify(`${product.name} purchased${product.unlock ? ' and unlocked for Buddy.' : ''}`);
  }

  function equip(id) {
    const entitlement = session.entitlements.find(candidate => candidate.productId === id);
    if (!entitlement) return;
    const category=entitlement.category||'top';
    const layer=entitlement.layer||(entitlement.outfit==='tee'?'tee-classic':'none');
    document.querySelector(`[data-layer-category="${category}"][data-layer-id="${layer}"]`)?.click();
    notify(`${entitlement.label} equipped on Buddy.`);
  }

  function setWalletRoute(route) {
    const allowed = new Set(['overview','send','receive','review','processing','complete','activity']);
    walletRoute = allowed.has(route) ? route : 'overview';
    walletMenuOpen = false;
    render('wallet');
  }

  function validateWalletTransfer(recipientEmail, rawAmount) {
    const cleanEmail = String(recipientEmail || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Enter a recipient email address.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(cleanEmail)) throw new Error('Enter a valid recipient email address.');
    const normalized = String(rawAmount || '').trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Enter an amount with no more than two decimal places.');
    const parsed = Number(normalized);
    if (!(parsed > 0)) throw new Error('Enter an amount greater than zero.');
    if (parsed > session.balance + 0.000001) throw new Error('Amount exceeds the available balance.');
    return { recipientEmail:cleanEmail, recipient:demoAddress(cleanEmail), amount:Math.round(parsed * 100) / 100 };
  }

  function confirmWalletTransfer() {
    if (!walletPending || walletRoute === 'processing') return;
    const pending = { ...walletPending };
    walletRoute = 'processing';
    render('wallet');
    clearTimeout(walletProcessingTimer);
    walletProcessingTimer = setTimeout(() => {
      session.balance = Math.max(0, Math.round((session.balance - pending.amount) * 100) / 100);
      const id = `TX-${Date.now().toString(36).toUpperCase()}`;
      session.transactions.unshift({
        id,
        amount:-pending.amount,
        label:pending.note || 'Test-network transfer',
        at:new Date().toLocaleString(),
        createdAt:Date.now(),
        kind:'sent',
        recipientEmail:pending.recipientEmail,
        recipient:pending.recipient,
        note:pending.note || ''
      });
      save();
      walletComplete = { amount:pending.amount, recipientEmail:pending.recipientEmail, recipient:pending.recipient, id };
      walletPending = null;
      walletRoute = 'complete';
      render('wallet');
      notify('Transfer complete.');
    }, 950);
  }

  async function copyWalletAddress() {
    try {
      await navigator.clipboard.writeText(session.address);
      notify('Wallet address copied.');
    } catch {
      notify(`Wallet address: ${session.address}`);
    }
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
      if (id === 'wallet') walletRoute = 'overview';
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

  document.addEventListener('submit', event => {
    if (!event.target.matches('#walletTransferForm')) return;
    event.preventDefault();
    const recipientEmail = $('#walletRecipient')?.value || '';
    const rawAmount = $('#walletAmount')?.value || '';
    const note = $('#walletNote')?.value?.trim() || '';
    try {
      const transfer = validateWalletTransfer(recipientEmail, rawAmount);
      walletPending = { ...transfer, note };
      walletRoute = 'review';
      render('wallet');
    } catch (error) {
      const target = $('#walletTransferError');
      if (target) target.textContent = error.message;
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
      if (active !== 'dashboard') {
        clearTimeout(walletProcessingTimer);
        walletProcessingTimer = null;
        walletMenuOpen = false;
        render('dashboard');
        $('#campusDashboardSearch')?.focus();
      }
      return;
    }

    const walletRouteButton = event.target.closest('[data-wallet-route]');
    if (walletRouteButton) {
      setWalletRoute(walletRouteButton.dataset.walletRoute);
      return;
    }

    if (event.target.closest('[data-wallet-confirm]')) {
      confirmWalletTransfer();
      return;
    }

    if (event.target.closest('[data-wallet-copy-address]')) {
      copyWalletAddress();
      return;
    }

    if (event.target.closest('[data-wallet-open-faucet]')) {
      render('faucet');
      return;
    }

    if (event.target.closest('[data-wallet-account]')) {
      notify('Campus Wallet is linked to your Buddy account.');
      return;
    }

    if (event.target.closest('[data-wallet-menu]')) {
      walletMenuOpen = !walletMenuOpen;
      render('wallet');
      return;
    }

    if (event.target.closest('[data-wallet-scrim]')) {
      walletMenuOpen = false;
      render('wallet');
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
