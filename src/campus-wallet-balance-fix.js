(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const BALANCE_MODEL_VERSION = 5;
  const STARTING_USD = 500;
  const BEACH_USD_RATE = 1;
  let frame = 0;

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const beach = value => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits:2 })} BEACH`;

  function getSession() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function persist(session) {
    if (!session?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${session.email}`, JSON.stringify(session)); } catch {}
  }

  function ensureBalances() {
    const session = getSession();
    if (!session) return null;

    let changed = false;
    if (!session.balances || typeof session.balances !== 'object') {
      session.balances = { USD:STARTING_USD, BEACH:0 };
      changed = true;
    }

    let usd = Number(session.balances.USD);
    let beachBalance = Number(session.balances.BEACH);
    const legacyUsd = Number(session.balance);

    if (!Number.isFinite(beachBalance)) {
      beachBalance = 0;
      session.balances.BEACH = 0;
      changed = true;
    }

    if (session.walletBalanceModelVersion !== BALANCE_MODEL_VERSION) {
      const hasUsdHistory = Array.isArray(session.transactions) && session.transactions.some(transaction =>
        transaction?.currency === 'USD' ||
        transaction?.source === 'Campus Wallet Swap' ||
        transaction?.merchant === 'Campus Bookstore'
      );

      if (!Number.isFinite(usd)) usd = Number.isFinite(legacyUsd) && legacyUsd > 0 ? legacyUsd : STARTING_USD;

      // The previous adapter could overwrite a newly seeded $500 balance with the
      // legacy zero field. Repair that exact state, while preserving a deliberate
      // zero balance when the account already has USD transaction history.
      if (usd === 0 && legacyUsd === 0 && !hasUsdHistory) usd = STARTING_USD;

      session.balances.USD = Math.round(usd * 100) / 100;
      session.balance = session.balances.USD;
      session.walletBalanceModelVersion = BALANCE_MODEL_VERSION;
      changed = true;
    } else {
      if (!Number.isFinite(usd)) {
        usd = STARTING_USD;
        session.balances.USD = STARTING_USD;
        changed = true;
      }
      if (Math.abs((Number(session.balance) || 0) - usd) > 0.000001) {
        // balances.USD is authoritative. session.balance only remains for older
        // Bookstore/Send code that still reads the compatibility field.
        session.balance = usd;
        changed = true;
      }
    }

    if (changed) persist(session);
    return session;
  }

  function setText(element, value) {
    if (!element) return;
    const next = String(value);
    if (element.textContent !== next) element.textContent = next;
  }

  function simplifyCurrencyList(root, session) {
    const card = root.querySelector('[data-wallet-currencies]');
    if (!card) return;

    if (!card.dataset.simpleCurrencyList) {
      card.dataset.simpleCurrencyList = 'true';
      card.innerHTML = `<div class="cw-currencies-heading"><h2>Currencies</h2></div>
        <div class="cw-currency-list">
          <div class="cw-currency-row">
            <span class="cw-currency-mark usd" aria-hidden="true">$</span>
            <span><b>US Dollar</b><small>USD</small></span>
            <strong data-wallet-usd-balance></strong>
          </div>
          <div class="cw-currency-row">
            <span class="cw-currency-mark beach" aria-hidden="true">B</span>
            <span><b>BEACH</b><small>1 BEACH = $1.00</small></span>
            <strong data-wallet-beach-balance></strong>
          </div>
        </div>`;
    }

    setText(card.querySelector('[data-wallet-usd-balance]'), money(session.balances.USD));
    setText(card.querySelector('[data-wallet-beach-balance]'), beach(session.balances.BEACH));
  }

  function showAggregateBalance(root, session) {
    const card = root.querySelector('.cw-balance-card');
    if (!card) return;

    const originalStrong = card.querySelector('strong');
    if (originalStrong && !originalStrong.dataset.walletUsdCompat) {
      originalStrong.dataset.walletUsdCompat = 'true';
      originalStrong.setAttribute('aria-hidden', 'true');
    }

    let total = card.querySelector('[data-wallet-total-balance]');
    if (!total && originalStrong) {
      total = document.createElement('span');
      total.className = 'cw-total-balance';
      total.dataset.walletTotalBalance = '';
      originalStrong.insertAdjacentElement('afterend', total);
    }

    const usd = Number(session.balances.USD) || 0;
    const beachBalance = Number(session.balances.BEACH) || 0;
    const totalUsdValue = usd + beachBalance * BEACH_USD_RATE;
    setText(total, money(totalUsdValue));

    const label = card.querySelector('.cw-metric-label');
    setText(label, 'Available balance');
    const unit = card.querySelector('small');
    setText(unit, 'Total USD value');
  }

  function syncWallet() {
    frame = 0;
    const shell = $('#campusAppsShell');
    const content = $('#campusAppsContent');
    if (!shell || shell.hidden || !content) return;
    const location = $('#campusAppsTitle')?.textContent || '';
    if (!location.includes('wallet')) return;

    const session = ensureBalances();
    if (!session) return;
    showAggregateBalance(content, session);
    simplifyCurrencyList(content, session);
  }

  function queueSync() {
    if (frame) return;
    frame = requestAnimationFrame(syncWallet);
  }

  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(queueSync).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('campus-session-changed', queueSync);
    queueSync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
