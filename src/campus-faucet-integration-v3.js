(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const CURRENCY_MODEL_VERSION = 3;
  const STARTING_USD = 500;
  const FAUCET_BEACH = 100;
  const BEACH_USD_RATE = 1;

  let syncing = false;
  let syncFrame = 0;
  let claimTimer = null;

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
    if (session.currencyModelVersion !== CURRENCY_MODEL_VERSION) {
      session.balances = { USD:STARTING_USD, BEACH:0 };
      session.balance = STARTING_USD;
      session.currency = 'USD';
      session.faucetBeachClaimed = false;
      session.transactions = Array.isArray(session.transactions)
        ? session.transactions.filter(transaction => transaction?.source !== 'Campus Faucet')
        : [];
      session.currencyModelVersion = CURRENCY_MODEL_VERSION;
      changed = true;
    }

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

    const usdMirror = Math.round((Number(session.balance) || 0) * 100) / 100;
    if (Math.abs(Number(session.balances.USD) - usdMirror) > 0.000001) {
      session.balances.USD = usdMirror;
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
        <small>1 BEACH = $1.00</small>
      </div>
      <div class="cw-currency-list">
        <div class="cw-currency-row">
          <span class="cw-currency-mark usd" aria-hidden="true">$</span>
          <span><b>US Dollar</b><small>USD · Primary balance</small></span>
          <strong data-wallet-usd-balance>${money(usd)}</strong>
        </div>
        <div class="cw-currency-row">
          <span class="cw-currency-mark beach" aria-hidden="true">B</span>
          <span><b>BEACH</b><small>Campus demo token · ${money(beachBalance * BEACH_USD_RATE)} value</small></span>
          <strong data-wallet-beach-balance>${beach(beachBalance)}</strong>
        </div>
      </div>
    </section>`;
  }

  function syncWalletUi(session, root) {
    const usd = Number(session.balances?.USD) || 0;
    const beachBalance = Number(session.balances?.BEACH) || 0;

    setText(root.querySelector('.cw-balance-card strong'), money(usd));
    setText(root.querySelector('.cw-form-meta strong'), money(usd));
    setText(root.querySelector('.cw-balance-card small'), '');
    setText(root.querySelector('.cw-amount-field b'), '');

    const overview = root.querySelector('[data-wallet-view="overview"]');
    const balanceCard = overview?.querySelector('.cw-balance-card');
    if (overview && balanceCard && !overview.querySelector('[data-wallet-currencies]')) {
      balanceCard.insertAdjacentHTML('afterend', walletCurrencyCard(session));
    }
    setText(root.querySelector('[data-wallet-usd-balance]'), money(usd));
    setText(root.querySelector('[data-wallet-beach-balance]'), beach(beachBalance));

    const currencyCard = root.querySelector('[data-wallet-currencies]');
    const beachMeta = currencyCard?.querySelector('.cw-currency-row:nth-child(2) small');
    setText(beachMeta, `Campus demo token · ${money(beachBalance * BEACH_USD_RATE)} value`);

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

    normalizeLegacyText(root);
  }

  function faucetMarkup(session) {
    const claimed = Boolean(session.faucetBeachClaimed);
    const beachBalance = Number(session.balances?.BEACH) || 0;
    return `<section class="cf-shell" data-faucet-ui-v3>
      <header class="cf-topbar">
        <button class="cf-brand" type="button" data-cf-home aria-label="Campus Faucet home">
          <span class="cf-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 5h20v5H6zM9 13h14v4H9zM12 20h8v7h-8z"/></svg></span>
          <span><strong>Campus Faucet</strong><small>BEACH demo token access</small></span>
        </button>
        <div class="cf-top-actions">
          <span class="cf-network-pill"><i></i> Demo network</span>
          <button class="cf-account-button connected" type="button" data-cf-account>
            <span class="cf-account-icon" aria-hidden="true">↗</span>
            <span>${esc(session.email)}</span>
          </button>
        </div>
      </header>
      <main class="cf-main">
        <section class="cf-claim-view" aria-labelledby="cfHeroTitle">
          <div class="cf-hero-copy"><span class="cf-eyebrow">BEACH faucet</span><h1 id="cfHeroTitle">Claim BEACH</h1><p>Receive a one-time BEACH allocation in your connected Campus Wallet.</p></div>
          <article class="cf-claim-card">
            <div class="cf-amount-label">Claim amount</div>
            <div class="cf-amount-row"><strong>${beach(FAUCET_BEACH)}</strong></div>
            <div class="cf-divider"></div>
            <div class="cf-detail-row"><span>Reference value</span><b>${money(FAUCET_BEACH * BEACH_USD_RATE)}</b></div>
            <div class="cf-detail-row"><span>Connected wallet</span><b>${esc(session.email)}</b></div>
            <div class="cf-detail-row"><span>Current BEACH balance</span><b>${beach(beachBalance)}</b></div>
            <div class="cf-detail-row"><span>Eligibility</span><b class="${claimed ? 'claimed' : 'verified'}">${claimed ? 'Already claimed' : 'Account verified'}</b></div>
            <button class="cf-primary-button${claimed ? ' claimed' : ''}" type="button" data-cf-claim ${claimed ? 'disabled' : ''}>${claimed ? 'BEACH claimed' : `Claim ${beach(FAUCET_BEACH)}`}</button>
          </article>
          <p class="cf-disclaimer"><span aria-hidden="true">◇</span> BEACH is a fictitious demo token for this UI showcase. 1 BEACH is displayed as equivalent to $1.00.</p>
        </section>
      </main>
      <div class="cf-modal-layer" data-cf-review hidden>
        <section class="cf-modal-card" role="dialog" aria-modal="true" aria-labelledby="cfReviewTitle">
          <button class="cf-close-button" type="button" data-cf-review-close aria-label="Close">×</button>
          <span class="cf-modal-icon green" aria-hidden="true">✓</span>
          <h2 id="cfReviewTitle">Review your claim</h2><p>Confirm the destination and BEACH allocation details.</p>
          <dl class="cf-review-list"><div><dt>You receive</dt><dd>${beach(FAUCET_BEACH)}</dd></div><div><dt>Reference value</dt><dd>${money(FAUCET_BEACH * BEACH_USD_RATE)}</dd></div><div><dt>To account</dt><dd>${esc(session.email)}</dd></div><div><dt>Rate</dt><dd>1 BEACH = $1.00</dd></div><div><dt>Fee</dt><dd>$0.00</dd></div></dl>
          <p class="cf-notice"><span>!</span> One BEACH faucet claim per connected Buddy account in this demo.</p>
          <div class="cf-modal-actions"><button class="cf-outline-button" type="button" data-cf-review-close>Cancel</button><button class="cf-primary-button" type="button" data-cf-confirm>Confirm claim</button></div>
        </section>
      </div>
      <div class="cf-modal-layer" data-cf-status hidden>
        <section class="cf-modal-card cf-status-card" role="dialog" aria-modal="true" aria-labelledby="cfStatusTitle">
          <div class="cf-spinner" data-cf-status-icon aria-hidden="true"></div>
          <h2 id="cfStatusTitle" data-cf-status-title>Submitting claim</h2><p data-cf-status-message>The BEACH allocation is being added to your Campus Wallet.</p>
          <div class="cf-progress" data-cf-progress><span></span></div><small data-cf-status-wait>Typical demo wait: about 1 second.</small>
          <div class="cf-receipt" data-cf-receipt hidden><div><span>Account</span><code>${esc(session.email)}</code></div><div><span>BEACH balance</span><code data-cf-new-balance>${beach(beachBalance)}</code></div><div><span>USD balance</span><code>${money(Number(session.balances?.USD) || 0)}</code></div><div><span>Transaction</span><code data-cf-transaction>Pending</code></div></div>
          <div class="cf-modal-actions" data-cf-complete-actions hidden><button class="cf-outline-button" type="button" data-cf-done>Done</button><button class="cf-primary-button" type="button" data-cf-open-wallet>Open wallet</button></div>
        </section>
      </div>
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
      if (view === 'faucet') {
        if (!content.querySelector('[data-faucet-ui-v3]')) {
          setText($('#campusAppsTitle'), 'faucet.campus.local/');
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
    if (session.faucetBeachClaimed) { toast('This account has already received its BEACH allocation.'); return; }
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
    claimTimer = setTimeout(() => completeClaim(session), 1150);
  }

  function completeClaim(session) {
    if (session.faucetBeachClaimed) return;
    session.balances.BEACH = Math.round((Number(session.balances.BEACH || 0) + FAUCET_BEACH) * 100) / 100;
    session.faucetBeachClaimed = true;
    const transactionId = `TX-${Date.now().toString(36).toUpperCase()}`;
    session.transactions.unshift({ id:transactionId, amount:FAUCET_BEACH, currency:'BEACH', usdValue:FAUCET_BEACH * BEACH_USD_RATE, label:'Campus Faucet · BEACH claim', at:new Date().toLocaleString(), createdAt:Date.now(), kind:'received', source:'Campus Faucet' });
    persistSession(session);
    const icon = $('[data-cf-status-icon]');
    if (icon) { icon.className = 'cf-spinner complete'; setText(icon, '✓'); }
    setText($('[data-cf-status-title]'), 'Claim complete');
    setText($('[data-cf-status-message]'), `${beach(FAUCET_BEACH)} was added to your Campus Wallet.`);
    const progress = $('[data-cf-progress]'); if (progress) progress.hidden = true;
    const wait = $('[data-cf-status-wait]'); if (wait) wait.hidden = true;
    const receipt = $('[data-cf-receipt]'); if (receipt) receipt.hidden = false;
    setText($('[data-cf-new-balance]'), beach(session.balances.BEACH));
    setText($('[data-cf-transaction]'), transactionId);
    const actions = $('[data-cf-complete-actions]'); if (actions) actions.hidden = false;
    toast(`${beach(FAUCET_BEACH)} added to Campus Wallet.`);
  }

  function finishClaim(openWallet) {
    const status = $('[data-cf-status]'); if (status) status.hidden = true;
    if (openWallet) { window.CampusUnifiedApps?.open?.('wallet'); queueSync(); return; }
    const session = ensureCurrencyModel(); if (session) renderFaucet(session);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-cf-claim]')) { showReview(); return; }
    if (event.target.closest('[data-cf-review-close]')) { hideReview(); return; }
    if (event.target.closest('[data-cf-confirm]')) { beginClaim(); return; }
    if (event.target.closest('[data-cf-done]')) { finishClaim(false); return; }
    if (event.target.closest('[data-cf-open-wallet]')) { finishClaim(true); return; }
    if (event.target.closest('[data-cf-home]')) { const session = ensureCurrencyModel(); if (session) renderFaucet(session); return; }
    if (event.target.closest('[data-cf-account]')) { const session = ensureCurrencyModel(); if (session) toast(`Connected Campus Buddy account: ${session.email}`); return; }
    const reviewLayer = event.target.closest('[data-cf-review]');
    if (reviewLayer && event.target === reviewLayer) hideReview();
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
