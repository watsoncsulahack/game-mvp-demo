(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const STARTING_USD = 500;
  const DROP_ID = 'welcome-beach-100';
  const DROP_AMOUNT = 100;
  const BEACH_USD_RATE = 1;

  let syncing = false;
  let syncFrame = 0;
  let claimTimer = null;
  let faucetSection = 'available';
  let faucetMenuOpen = false;
  let lastView = 'other';
  let walletSwapOpen = false;
  let swapDirection = 'USD_TO_BEACH';
  let swapSuccess = '';

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const beach = value => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits:2 })} BEACH`;
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);

  function getSession() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function persistSession(session) {
    if (!session?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${session.email}`, JSON.stringify(session)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session } }));
  }

  function ensureCurrencyModel() {
    const session = getSession();
    if (!session) return null;
    let changed = false;

    if (!session.balances || typeof session.balances !== 'object') {
      session.balances = { USD:Number(session.balance) || STARTING_USD, BEACH:0 };
      changed = true;
    }
    if (!Number.isFinite(Number(session.balances.USD))) {
      session.balances.USD = Number(session.balance) || STARTING_USD;
      changed = true;
    }
    if (!Number.isFinite(Number(session.balances.BEACH))) {
      session.balances.BEACH = 0;
      changed = true;
    }
    if (!Array.isArray(session.transactions)) {
      session.transactions = [];
      changed = true;
    }
    if (typeof session.faucetBeachClaimed !== 'boolean') {
      session.faucetBeachClaimed = false;
      changed = true;
    }
    if (!Array.isArray(session.faucetClaims)) {
      session.faucetClaims = [];
      changed = true;
    }

    const mirroredUsd = Math.round((Number(session.balance) || 0) * 100) / 100;
    if (Math.abs(Number(session.balances.USD) - mirroredUsd) > 0.000001) {
      session.balances.USD = mirroredUsd;
      changed = true;
    }

    if (session.faucetBeachClaimed && !session.faucetClaims.some(claim => claim.dropId === DROP_ID)) {
      const transaction = session.transactions.find(item => item?.source === 'Campus Faucet' && item?.currency === 'BEACH');
      session.faucetClaims.unshift({
        dropId:DROP_ID,
        name:'100 Free BEACH',
        amount:DROP_AMOUNT,
        currency:'BEACH',
        claimedAt:transaction?.at || new Date().toLocaleString(),
        transactionId:transaction?.id || 'Previous claim'
      });
      changed = true;
    }

    if (changed) persistSession(session);
    return session;
  }

  function setText(element, value) {
    if (!element) return false;
    const next = String(value);
    if (element.textContent === next) return false;
    element.textContent = next;
    return true;
  }

  function toast(message) {
    const target = $('#toast');
    if (!target) return;
    setText(target, message);
    target.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { target.hidden = true; }, 2500);
  }

  function normalizeLegacyText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, 4);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const current = node.nodeValue;
      if (!current || !current.trim()) return;
      const next = current
        .replace(/\$?(\d[\d,]*\.\d{2})\s*TEST\b/g, '$$$1')
        .replace(/\bTEST\b/g, '')
        .replace(/\bTest network\b/g, 'Demo network')
        .replace(/\btest network\b/g, 'demo network')
        .replace(/\btest-network\b/g, 'demo')
        .replace(/\bTest-network\b/g, 'Demo')
        .replace(/\btest funds\b/g, 'demo funds')
        .replace(/\btest wallet\b/g, 'demo wallet')
        .replace(/\s{2,}/g, ' ');
      if (next !== current) node.nodeValue = next;
    });
  }

  function walletCurrencyCard(session) {
    const usd = Number(session.balances?.USD) || 0;
    const beachBalance = Number(session.balances?.BEACH) || 0;
    return `<section class="cw-currencies-card cw-card" data-wallet-currencies>
      <div class="cw-currencies-heading">
        <div><span class="cw-metric-label">Currencies</span><h2>Wallet balances</h2></div>
        <button class="cw-swap-link" type="button" data-wallet-swap-open>Swap currencies</button>
      </div>
      <div class="cw-currency-list">
        <div class="cw-currency-row">
          <span class="cw-currency-mark usd" aria-hidden="true">$</span>
          <span><b>US Dollar</b><small>USD · Primary balance</small></span>
          <strong data-wallet-usd-balance>${money(usd)}</strong>
        </div>
        <div class="cw-currency-row">
          <span class="cw-currency-mark beach" aria-hidden="true">B</span>
          <span><b>BEACH</b><small>Campus spending balance · ${money(beachBalance)} value</small></span>
          <strong data-wallet-beach-balance>${beach(beachBalance)}</strong>
        </div>
      </div>
      <p class="cw-currency-note">Demo conversion rate: 1 BEACH = $1.00.</p>
    </section>`;
  }

  function injectWalletSwapControls(root) {
    const quickActions = root.querySelector('.cw-quick-actions');
    if (quickActions && !quickActions.querySelector('[data-wallet-swap-open]')) {
      quickActions.insertAdjacentHTML('beforeend', `<button type="button" data-wallet-swap-open><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></span><span><b>Swap</b><small>USD ↔ BEACH</small></span><strong>→</strong></button>`);
    }
    const nav = root.querySelector('.cw-sidebar nav');
    if (nav && !nav.querySelector('[data-wallet-swap-open]')) {
      nav.insertAdjacentHTML('beforeend', `<button class="cw-nav-item" type="button" data-wallet-swap-open><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg><span>Swap</span></button>`);
    }
  }

  function walletSwapMarkup(session) {
    const usd = Number(session.balances?.USD) || 0;
    const beachBalance = Number(session.balances?.BEACH) || 0;
    const fromUsd = swapDirection === 'USD_TO_BEACH';
    const sourceCode = fromUsd ? 'USD' : 'BEACH';
    const destinationCode = fromUsd ? 'BEACH' : 'USD';
    const sourceBalance = fromUsd ? money(usd) : beach(beachBalance);
    return `<section class="cw-content-view narrow cw-swap-view" data-wallet-swap-view>
      <header class="cw-page-heading"><div><span class="cw-eyebrow">Currency exchange</span><h1>Swap</h1><p>Convert between USD and BEACH at the demo 1:1 campus rate.</p></div></header>
      ${swapSuccess ? `<div class="cw-swap-success" role="status">${esc(swapSuccess)}</div>` : ''}
      <form class="cw-swap-card cw-card" id="walletSwapForm" novalidate>
        <div class="cw-swap-balance-strip"><div><span>USD</span><strong>${money(usd)}</strong></div><div><span>BEACH</span><strong>${beach(beachBalance)}</strong></div></div>
        <div class="cw-swap-pair">
          <section><span class="cw-metric-label">You pay</span><div class="cw-swap-currency"><b>${sourceCode}</b><small>${sourceBalance} available</small></div></section>
          <button class="cw-swap-reverse" type="button" data-wallet-swap-reverse aria-label="Reverse swap direction">⇄</button>
          <section><span class="cw-metric-label">You receive</span><div class="cw-swap-currency"><b>${destinationCode}</b><small>1 ${sourceCode} = 1 ${destinationCode}</small></div></section>
        </div>
        <label for="walletSwapAmount">Amount</label>
        <div class="cw-swap-amount"><span>${fromUsd ? '$' : 'B'}</span><input id="walletSwapAmount" name="amount" inputmode="decimal" placeholder="0.00" autocomplete="off"><b>${sourceCode}</b></div>
        <div class="cw-swap-preview"><span>You receive</span><strong id="walletSwapPreview">${fromUsd ? '0 BEACH' : '$0.00'}</strong></div>
        <p class="cw-field-error" id="walletSwapError" role="alert"></p>
        <p class="cw-swap-rate">Fixed demo rate · 1 BEACH = $1.00 · No fees</p>
        <button class="cw-button primary" type="submit">Swap ${sourceCode} for ${destinationCode}</button>
      </form>
    </section>`;
  }

  function renderWalletSwap(session, root) {
    const main = root.querySelector('.cw-main');
    if (!main) return;
    if (!main.querySelector('[data-wallet-swap-view]')) main.innerHTML = walletSwapMarkup(session);
    root.querySelectorAll('.cw-nav-item').forEach(button => button.classList.remove('active'));
    root.querySelector('.cw-sidebar [data-wallet-swap-open]')?.classList.add('active');
    setText($('#campusAppsTitle'), 'wallet.campus.local/#swap');
    updateSwapPreview();
  }

  function syncWalletTransactions(session, root) {
    const rows = [...root.querySelectorAll('.cw-transaction-row')];
    rows.forEach((row, index) => {
      const transaction = session.transactions[index];
      if (!transaction) return;
      const amountTarget = row.querySelector(':scope > strong');
      const subtitle = row.querySelector(':scope > span:nth-child(2) small');
      const value = Number(transaction.amount) || 0;
      const sign = value > 0 ? '+' : value < 0 ? '−' : '';
      if (transaction.currency === 'BEACH') {
        setText(amountTarget, `${sign}${beach(Math.abs(value))}`);
        if (subtitle && transaction.at) setText(subtitle, `${transaction.at} · BEACH`);
      } else if (value !== 0) {
        setText(amountTarget, `${sign}${money(Math.abs(value))}`);
      }
    });
  }

  function syncWalletUi(session, root) {
    injectWalletSwapControls(root);
    if (walletSwapOpen) {
      renderWalletSwap(session, root);
      return;
    }

    const usd = Number(session.balances?.USD) || 0;
    const beachBalance = Number(session.balances?.BEACH) || 0;
    setText(root.querySelector('.cw-balance-card strong'), money(usd));
    setText(root.querySelector('.cw-form-meta strong'), money(usd));
    setText(root.querySelector('.cw-balance-card small'), 'USD');
    setText(root.querySelector('.cw-amount-field b'), 'USD');

    const overview = root.querySelector('[data-wallet-view="overview"]');
    const balanceCard = overview?.querySelector('.cw-balance-card');
    if (overview && balanceCard && !overview.querySelector('[data-wallet-currencies]')) {
      balanceCard.insertAdjacentHTML('afterend', walletCurrencyCard(session));
    }
    setText(root.querySelector('[data-wallet-usd-balance]'), money(usd));
    setText(root.querySelector('[data-wallet-beach-balance]'), beach(beachBalance));
    const beachMeta = root.querySelector('[data-wallet-currencies] .cw-currency-row:nth-child(2) small');
    setText(beachMeta, `Campus spending balance · ${money(beachBalance)} value`);
    syncWalletTransactions(session, root);
    normalizeLegacyText(root);
  }

  function availableDropsMarkup(session) {
    if (session.faucetBeachClaimed) {
      return `<section class="cf-empty-state"><div class="cf-empty-icon">✓</div><h2>No available drops</h2><p>You have claimed every drop currently available for this Buddy account.</p><button class="cf-outline-button" type="button" data-cf-section="claimed">View claimed drops</button></section>`;
    }
    return `<section class="cf-drop-grid" aria-label="Available drops">
      <article class="cf-drop-card">
        <div class="cf-drop-art"><span>B</span><small>BEACH</small></div>
        <div class="cf-drop-copy"><span class="cf-drop-badge available">Available</span><h2>100 Free BEACH</h2><p>A one-time campus demo drop. Add BEACH to your wallet for campus-style spending scenarios.</p></div>
        <dl class="cf-drop-meta"><div><dt>Drop amount</dt><dd>${beach(DROP_AMOUNT)}</dd></div><div><dt>Reference value</dt><dd>${money(DROP_AMOUNT * BEACH_USD_RATE)}</dd></div><div><dt>Rate</dt><dd>1 BEACH = $1.00</dd></div></dl>
        <button class="cf-primary-button" type="button" data-cf-claim>Claim drop</button>
      </article>
    </section>`;
  }

  function claimedDropsMarkup(session) {
    const claims = session.faucetClaims.filter(claim => claim.dropId === DROP_ID);
    if (!claims.length) {
      return `<section class="cf-empty-state"><div class="cf-empty-icon muted">◇</div><h2>No claimed drops</h2><p>Your completed faucet claims will appear here.</p><button class="cf-outline-button" type="button" data-cf-section="available">Browse available drops</button></section>`;
    }
    return `<section class="cf-drop-grid" aria-label="Claimed drops">${claims.map(claim => `<article class="cf-drop-card claimed"><div class="cf-drop-art claimed"><span>✓</span><small>CLAIMED</small></div><div class="cf-drop-copy"><span class="cf-drop-badge claimed">Claimed</span><h2>${esc(claim.name || '100 Free BEACH')}</h2><p>This drop has been added to your Campus Wallet.</p></div><dl class="cf-drop-meta"><div><dt>Amount</dt><dd>${beach(claim.amount || DROP_AMOUNT)}</dd></div><div><dt>Claimed</dt><dd>${esc(claim.claimedAt || 'Previously')}</dd></div><div><dt>Transaction</dt><dd>${esc(claim.transactionId || 'Recorded')}</dd></div></dl></article>`).join('')}</section>`;
  }

  function faucetMarkup(session) {
    const sectionTitle = faucetSection === 'claimed' ? 'Claimed drops' : 'Available drops';
    const sectionCopy = faucetSection === 'claimed' ? 'Review drops you have already redeemed.' : 'Claim campus demo drops that are currently available to your account.';
    return `<section class="cf-shell" data-faucet-ui-v4>
      <header class="cf-topbar">
        <div class="cf-topbar-left"><button class="cf-menu-button" type="button" data-cf-menu aria-label="Open Faucet menu" aria-expanded="${faucetMenuOpen}"><span></span><span></span><span></span></button><button class="cf-brand" type="button" data-cf-home aria-label="Campus Faucet home"><span class="cf-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 5h20v5H6zM9 13h14v4H9zM12 20h8v7h-8z"/></svg></span><span><strong>Campus Faucet</strong><small>Campus drops</small></span></button></div>
        <div class="cf-top-actions"><span class="cf-network-pill"><i></i> Demo network</span><button class="cf-account-button connected" type="button" data-cf-account><span class="cf-account-icon" aria-hidden="true">↗</span><span>${esc(session.email)}</span></button></div>
      </header>
      <div class="cf-body">
        <aside class="cf-drawer${faucetMenuOpen ? ' open' : ''}" aria-label="Faucet navigation"><div class="cf-drawer-heading"><span>Campus Faucet</span><button type="button" data-cf-menu-close aria-label="Close Faucet menu">×</button></div><nav><button class="${faucetSection === 'available' ? 'active' : ''}" type="button" data-cf-section="available"><span>◇</span><b>Available drops</b><small>${session.faucetBeachClaimed ? '0 available' : '1 available'}</small></button><button class="${faucetSection === 'claimed' ? 'active' : ''}" type="button" data-cf-section="claimed"><span>✓</span><b>Claimed drops</b><small>${session.faucetClaims.length} claimed</small></button></nav><div class="cf-drawer-footer"><span>Connected wallet</span><strong>${esc(session.email)}</strong></div></aside>
        <button class="cf-drawer-scrim${faucetMenuOpen ? ' open' : ''}" type="button" data-cf-menu-close aria-label="Close Faucet menu"></button>
        <main class="cf-main"><section class="cf-drops-view"><div class="cf-page-heading"><span class="cf-eyebrow">Campus drops</span><h1>${sectionTitle}</h1><p>${sectionCopy}</p></div>${faucetSection === 'claimed' ? claimedDropsMarkup(session) : availableDropsMarkup(session)}</section></main>
      </div>
      <div class="cf-modal-layer" data-cf-review hidden><section class="cf-modal-card" role="dialog" aria-modal="true" aria-labelledby="cfReviewTitle"><button class="cf-close-button" type="button" data-cf-review-close aria-label="Close">×</button><span class="cf-modal-icon green" aria-hidden="true">✓</span><h2 id="cfReviewTitle">Review your claim</h2><p>Confirm the destination and BEACH allocation details.</p><dl class="cf-review-list"><div><dt>You receive</dt><dd>${beach(DROP_AMOUNT)}</dd></div><div><dt>Reference value</dt><dd>${money(DROP_AMOUNT)}</dd></div><div><dt>To account</dt><dd>${esc(session.email)}</dd></div><div><dt>Rate</dt><dd>1 BEACH = $1.00</dd></div><div><dt>Fee</dt><dd>$0.00</dd></div></dl><p class="cf-notice"><span>!</span> This drop can be claimed once per connected Buddy account.</p><div class="cf-modal-actions"><button class="cf-outline-button" type="button" data-cf-review-close>Cancel</button><button class="cf-primary-button" type="button" data-cf-confirm>Confirm claim</button></div></section></div>
      <div class="cf-modal-layer" data-cf-status hidden><section class="cf-modal-card cf-status-card" role="dialog" aria-modal="true" aria-labelledby="cfStatusTitle"><div class="cf-spinner" data-cf-status-icon aria-hidden="true"></div><h2 id="cfStatusTitle" data-cf-status-title>Submitting claim</h2><p data-cf-status-message>The BEACH allocation is being added to your Campus Wallet.</p><div class="cf-progress" data-cf-progress><span></span></div><small data-cf-status-wait>Typical demo wait: about 1 second.</small><div class="cf-receipt" data-cf-receipt hidden><div><span>Drop</span><code>100 Free BEACH</code></div><div><span>BEACH balance</span><code data-cf-new-balance>${beach(session.balances.BEACH)}</code></div><div><span>USD balance</span><code>${money(session.balances.USD)}</code></div><div><span>Transaction</span><code data-cf-transaction>Pending</code></div></div><div class="cf-modal-actions" data-cf-complete-actions hidden><button class="cf-outline-button" type="button" data-cf-done>Done</button><button class="cf-primary-button" type="button" data-cf-open-wallet>Open wallet</button></div></section></div>
    </section>`;
  }

  function renderFaucet(session) {
    const content = $('#campusAppsContent');
    if (!content) return;
    content.innerHTML = faucetMarkup(session);
  }

  function currentView() {
    const locationText = $('#campusAppsTitle')?.textContent || '';
    if (locationText.includes('faucet')) return 'faucet';
    if (locationText.includes('wallet')) return 'wallet';
    if (locationText.includes('bookstore')) return 'bookstore';
    if (locationText.includes('my.csulb.edu')) return 'dashboard';
    return 'other';
  }

  function syncUi() {
    syncFrame = 0;
    if (syncing) return;
    syncing = true;
    try {
      const shell = $('#campusAppsShell');
      const content = $('#campusAppsContent');
      if (!shell || shell.hidden || !content) return;
      const session = ensureCurrencyModel();
      if (!session) return;
      const view = currentView();
      shell.classList.toggle('faucet-mode', view === 'faucet');

      if (view !== lastView) {
        if (view === 'faucet') { faucetSection = 'available'; faucetMenuOpen = false; }
        if (view !== 'wallet') { walletSwapOpen = false; swapSuccess = ''; }
        lastView = view;
      }

      if (view === 'faucet') {
        if (!content.querySelector('[data-faucet-ui-v4]')) {
          setText($('#campusAppsTitle'), 'faucet.campus.local/drops');
          renderFaucet(session);
        }
      } else if (view === 'wallet') {
        syncWalletUi(session, content);
      } else {
        normalizeLegacyText(content);
      }
    } finally {
      syncing = false;
    }
  }

  function queueSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(syncUi);
  }

  function showReview() {
    const session = ensureCurrencyModel();
    if (!session) return;
    if (session.faucetBeachClaimed) { toast('This drop has already been claimed.'); return; }
    const layer = $('[data-cf-review]');
    if (layer) layer.hidden = false;
  }

  function hideReview() {
    const layer = $('[data-cf-review]');
    if (layer) layer.hidden = true;
  }

  function beginClaim() {
    const session = ensureCurrencyModel();
    if (!session || session.faucetBeachClaimed) return;
    hideReview();
    const status = $('[data-cf-status]');
    if (!status) return;
    status.hidden = false;
    clearTimeout(claimTimer);
    claimTimer = setTimeout(() => completeClaim(session), 1050);
  }

  function completeClaim(session) {
    if (session.faucetBeachClaimed) return;
    session.balances.BEACH = Math.round((Number(session.balances.BEACH || 0) + DROP_AMOUNT) * 100) / 100;
    session.faucetBeachClaimed = true;
    const transactionId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const claimedAt = new Date().toLocaleString();
    session.transactions.unshift({ id:transactionId, amount:DROP_AMOUNT, currency:'BEACH', usdValue:DROP_AMOUNT, label:'Campus Faucet · 100 Free BEACH', at:claimedAt, createdAt:Date.now(), kind:'received', source:'Campus Faucet', dropId:DROP_ID });
    session.faucetClaims.unshift({ dropId:DROP_ID, name:'100 Free BEACH', amount:DROP_AMOUNT, currency:'BEACH', claimedAt, transactionId });
    persistSession(session);

    const icon = $('[data-cf-status-icon]');
    if (icon) { icon.className = 'cf-spinner complete'; setText(icon, '✓'); }
    setText($('[data-cf-status-title]'), 'Claim complete');
    setText($('[data-cf-status-message]'), `${beach(DROP_AMOUNT)} was added to your Campus Wallet.`);
    const progress = $('[data-cf-progress]'); if (progress) progress.hidden = true;
    const wait = $('[data-cf-status-wait]'); if (wait) wait.hidden = true;
    const receipt = $('[data-cf-receipt]'); if (receipt) receipt.hidden = false;
    setText($('[data-cf-new-balance]'), beach(session.balances.BEACH));
    setText($('[data-cf-transaction]'), transactionId);
    const actions = $('[data-cf-complete-actions]'); if (actions) actions.hidden = false;
    toast(`${beach(DROP_AMOUNT)} added to Campus Wallet.`);
  }

  function finishClaim(openWallet) {
    const status = $('[data-cf-status]'); if (status) status.hidden = true;
    if (openWallet) {
      walletSwapOpen = false;
      window.CampusUnifiedApps?.open?.('wallet');
      queueSync();
      return;
    }
    faucetSection = 'available';
    faucetMenuOpen = false;
    const session = ensureCurrencyModel();
    if (session) renderFaucet(session);
  }

  function updateSwapPreview() {
    const input = $('#walletSwapAmount');
    const target = $('#walletSwapPreview');
    if (!target) return;
    const value = Number(input?.value || 0);
    if (!(value > 0)) { setText(target, swapDirection === 'USD_TO_BEACH' ? '0 BEACH' : '$0.00'); return; }
    setText(target, swapDirection === 'USD_TO_BEACH' ? beach(value) : money(value));
  }

  function performSwap(rawAmount) {
    const session = ensureCurrencyModel();
    if (!session) return;
    const normalized = String(rawAmount || '').trim();
    const error = $('#walletSwapError');
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) { setText(error, 'Enter an amount with no more than two decimal places.'); return; }
    const value = Math.round(Number(normalized) * 100) / 100;
    if (!(value > 0)) { setText(error, 'Enter an amount greater than zero.'); return; }

    const fromUsd = swapDirection === 'USD_TO_BEACH';
    const available = Number(fromUsd ? session.balances.USD : session.balances.BEACH) || 0;
    if (value > available + 0.000001) { setText(error, `Amount exceeds your available ${fromUsd ? 'USD' : 'BEACH'} balance.`); return; }

    if (fromUsd) {
      session.balances.USD = Math.round((session.balances.USD - value) * 100) / 100;
      session.balances.BEACH = Math.round((session.balances.BEACH + value) * 100) / 100;
    } else {
      session.balances.BEACH = Math.round((session.balances.BEACH - value) * 100) / 100;
      session.balances.USD = Math.round((session.balances.USD + value) * 100) / 100;
    }
    session.balance = session.balances.USD;

    const from = fromUsd ? 'USD' : 'BEACH';
    const to = fromUsd ? 'BEACH' : 'USD';
    const when = new Date().toLocaleString();
    const group = `SWAP-${Date.now().toString(36).toUpperCase()}`;
    session.transactions.unshift(
      { id:`${group}-IN`, amount:value, currency:to, label:`Swap · Received ${to}`, at:when, createdAt:Date.now(), kind:'received', source:'Campus Wallet Swap', swapGroup:group },
      { id:`${group}-OUT`, amount:-value, currency:from, label:`Swap · Exchanged ${from}`, at:when, createdAt:Date.now(), kind:'sent', source:'Campus Wallet Swap', swapGroup:group }
    );
    persistSession(session);
    swapSuccess = `Swapped ${fromUsd ? money(value) : beach(value)} for ${fromUsd ? beach(value) : money(value)}.`;
    const root = $('#campusAppsContent');
    if (root) {
      const main = root.querySelector('.cw-main');
      if (main) main.innerHTML = walletSwapMarkup(session);
      injectWalletSwapControls(root);
      renderWalletSwap(session, root);
    }
    toast(swapSuccess);
  }

  document.addEventListener('input', event => {
    if (event.target.matches('#walletSwapAmount')) updateSwapPreview();
  });

  document.addEventListener('submit', event => {
    if (!event.target.matches('#walletSwapForm')) return;
    event.preventDefault();
    performSwap($('#walletSwapAmount')?.value || '');
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-cf-menu]')) { faucetMenuOpen = !faucetMenuOpen; const session = ensureCurrencyModel(); if (session) renderFaucet(session); return; }
    if (event.target.closest('[data-cf-menu-close]')) { faucetMenuOpen = false; const session = ensureCurrencyModel(); if (session) renderFaucet(session); return; }
    const sectionButton = event.target.closest('[data-cf-section]');
    if (sectionButton) { faucetSection = sectionButton.dataset.cfSection === 'claimed' ? 'claimed' : 'available'; faucetMenuOpen = false; const session = ensureCurrencyModel(); if (session) renderFaucet(session); return; }
    if (event.target.closest('[data-cf-claim]')) { showReview(); return; }
    if (event.target.closest('[data-cf-review-close]')) { hideReview(); return; }
    if (event.target.closest('[data-cf-confirm]')) { beginClaim(); return; }
    if (event.target.closest('[data-cf-done]')) { finishClaim(false); return; }
    if (event.target.closest('[data-cf-open-wallet]')) { finishClaim(true); return; }
    if (event.target.closest('[data-cf-home]')) { faucetSection = 'available'; faucetMenuOpen = false; const session = ensureCurrencyModel(); if (session) renderFaucet(session); return; }
    if (event.target.closest('[data-cf-account]')) { const session = ensureCurrencyModel(); if (session) toast(`Connected Campus Buddy account: ${session.email}`); return; }
    const reviewLayer = event.target.closest('[data-cf-review]');
    if (reviewLayer && event.target === reviewLayer) { hideReview(); return; }

    if (event.target.closest('[data-wallet-swap-open]')) {
      walletSwapOpen = true;
      swapSuccess = '';
      const session = ensureCurrencyModel();
      const root = $('#campusAppsContent');
      if (session && root) renderWalletSwap(session, root);
      return;
    }
    if (event.target.closest('[data-wallet-swap-reverse]')) {
      swapDirection = swapDirection === 'USD_TO_BEACH' ? 'BEACH_TO_USD' : 'USD_TO_BEACH';
      swapSuccess = '';
      const session = ensureCurrencyModel();
      const root = $('#campusAppsContent');
      if (session && root) {
        const main = root.querySelector('.cw-main');
        if (main) main.innerHTML = walletSwapMarkup(session);
        renderWalletSwap(session, root);
      }
      return;
    }
    if (event.target.closest('[data-wallet-route]')) {
      walletSwapOpen = false;
      swapSuccess = '';
    }
  });

  const observer = new MutationObserver(queueSync);
  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    observer.observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('campus-session-changed', queueSync);
    queueSync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
