(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const CURRENCY_VERSION = 2;
  const STARTING_BALANCE = 500;
  const FAUCET_AMOUNT = 100;
  let syncing = false;
  let claimTimer = null;

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  function getSession() {
    const api = window.CampusUnifiedApps;
    return api?.getSession?.() || null;
  }

  function persistSession(session) {
    if (!session?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${session.email}`, JSON.stringify(session)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session } }));
  }

  function ensureUsdSession() {
    const session = getSession();
    if (!session) return null;

    let changed = false;
    if (session.currency !== 'USD') {
      session.currency = 'USD';
      changed = true;
    }
    if (session.currencyVersion !== CURRENCY_VERSION) {
      session.balance = Math.max(STARTING_BALANCE, Number(session.balance) || 0);
      session.currencyVersion = CURRENCY_VERSION;
      if (typeof session.faucetUsdClaimed !== 'boolean') session.faucetUsdClaimed = false;
      changed = true;
    }
    if (!Array.isArray(session.transactions)) {
      session.transactions = [];
      changed = true;
    }
    if (changed) persistSession(session);
    return session;
  }

  function toast(message) {
    const target = $('#toast');
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { target.hidden = true; }, 2500);
  }

  function replaceCurrencyText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let value = node.nodeValue;
      if (!value || !value.trim()) return;
      value = value
        .replace(/\$?(\d[\d,]*\.\d{2})\s*TEST\b/g, '$$$1')
        .replace(/\bTEST\b/g, '')
        .replace(/\bTest network\b/g, 'Demo network')
        .replace(/\btest network\b/g, 'demo network')
        .replace(/\btest-network\b/g, 'demo')
        .replace(/\btest funds\b/g, 'demo funds')
        .replace(/\btest wallet\b/g, 'demo wallet')
        .replace(/\s{2,}/g, ' ');
      node.nodeValue = value;
    });
  }

  function syncWalletNumbers(session, root) {
    const balance = root?.querySelector('.cw-balance-card strong');
    if (balance) balance.textContent = money(session.balance);
    const available = root?.querySelector('.cw-form-meta strong');
    if (available) available.textContent = money(session.balance);
  }

  function faucetMarkup(session) {
    const claimed = Boolean(session.faucetUsdClaimed);
    return `<section class="cf-shell" data-faucet-ui-v2>
      <header class="cf-topbar">
        <button class="cf-brand" type="button" data-cf-home aria-label="Campus Faucet home">
          <span class="cf-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 5h20v5H6zM9 13h14v4H9zM12 20h8v7h-8z"/></svg></span>
          <span><strong>Campus Faucet</strong><small>Demo account funding</small></span>
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
          <div class="cf-hero-copy">
            <span class="cf-eyebrow">Campus funds faucet</span>
            <h1 id="cfHeroTitle">Claim demo funds</h1>
            <p>Receive a one-time demo allocation in your connected Campus Wallet.</p>
          </div>

          <article class="cf-claim-card">
            <div class="cf-amount-label">Claim amount</div>
            <div class="cf-amount-row"><strong>${money(FAUCET_AMOUNT)}</strong></div>
            <div class="cf-divider"></div>
            <div class="cf-detail-row"><span>Connected wallet</span><b>${esc(session.email)}</b></div>
            <div class="cf-detail-row"><span>Current balance</span><b>${money(session.balance)}</b></div>
            <div class="cf-detail-row"><span>Eligibility</span><b class="${claimed ? 'claimed' : 'verified'}">${claimed ? 'Already claimed' : 'Account verified'}</b></div>
            <button class="cf-primary-button${claimed ? ' claimed' : ''}" type="button" data-cf-claim ${claimed ? 'disabled' : ''}>${claimed ? 'Allocation claimed' : `Claim ${money(FAUCET_AMOUNT)}`}</button>
          </article>
          <p class="cf-disclaimer"><span aria-hidden="true">◇</span> Demo-only balance for the UI showcase. No real funds are moved.</p>
        </section>
      </main>

      <div class="cf-modal-layer" data-cf-review hidden>
        <section class="cf-modal-card" role="dialog" aria-modal="true" aria-labelledby="cfReviewTitle">
          <button class="cf-close-button" type="button" data-cf-review-close aria-label="Close">×</button>
          <span class="cf-modal-icon green" aria-hidden="true">✓</span>
          <h2 id="cfReviewTitle">Review your claim</h2>
          <p>Confirm the destination and demo funding details.</p>
          <dl class="cf-review-list">
            <div><dt>You receive</dt><dd>${money(FAUCET_AMOUNT)}</dd></div>
            <div><dt>To account</dt><dd>${esc(session.email)}</dd></div>
            <div><dt>Current balance</dt><dd>${money(session.balance)}</dd></div>
            <div><dt>Fee</dt><dd>$0.00</dd></div>
          </dl>
          <p class="cf-notice"><span>!</span> One faucet claim per connected Buddy account in this demo.</p>
          <div class="cf-modal-actions"><button class="cf-outline-button" type="button" data-cf-review-close>Cancel</button><button class="cf-primary-button" type="button" data-cf-confirm>Confirm claim</button></div>
        </section>
      </div>

      <div class="cf-modal-layer" data-cf-status hidden>
        <section class="cf-modal-card cf-status-card" role="dialog" aria-modal="true" aria-labelledby="cfStatusTitle">
          <div class="cf-spinner" data-cf-status-icon aria-hidden="true"></div>
          <h2 id="cfStatusTitle" data-cf-status-title>Submitting claim</h2>
          <p data-cf-status-message>The demo allocation is being sent to your Campus Wallet.</p>
          <div class="cf-progress" data-cf-progress><span></span></div>
          <small data-cf-status-wait>Typical demo wait: about 1 second.</small>
          <div class="cf-receipt" data-cf-receipt hidden>
            <div><span>Account</span><code>${esc(session.email)}</code></div>
            <div><span>New balance</span><code data-cf-new-balance>${money(session.balance)}</code></div>
            <div><span>Transaction</span><code data-cf-transaction>Pending</code></div>
          </div>
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
    if (syncing) return;
    syncing = true;
    try {
      const shell = $('#campusAppsShell');
      const content = $('#campusAppsContent');
      if (!shell || shell.hidden || !content) return;

      const session = ensureUsdSession();
      if (!session) return;
      const view = currentView();
      shell.classList.toggle('faucet-mode', view === 'faucet');

      if (view === 'faucet' && !content.querySelector('[data-faucet-ui-v2]')) {
        $('#campusAppsTitle').textContent = 'faucet.campus.local/';
        renderFaucet(session);
      }
      syncWalletNumbers(session, content);
      replaceCurrencyText(content);
    } finally {
      syncing = false;
    }
  }

  function showReview() {
    const session = ensureUsdSession();
    if (!session) return;
    if (session.faucetUsdClaimed) {
      toast('This account has already received its demo allocation.');
      return;
    }
    const layer = $('[data-cf-review]');
    if (layer) layer.hidden = false;
  }

  function hideReview() {
    const layer = $('[data-cf-review]');
    if (layer) layer.hidden = true;
  }

  function beginClaim() {
    const session = ensureUsdSession();
    if (!session || session.faucetUsdClaimed) return;
    hideReview();
    const status = $('[data-cf-status]');
    if (!status) return;
    status.hidden = false;
    clearTimeout(claimTimer);
    claimTimer = setTimeout(() => completeClaim(session), 1150);
  }

  function completeClaim(session) {
    if (session.faucetUsdClaimed) return;
    session.balance = Math.round((Number(session.balance || 0) + FAUCET_AMOUNT) * 100) / 100;
    session.faucetUsdClaimed = true;
    const transactionId = `TX-${Date.now().toString(36).toUpperCase()}`;
    session.transactions.unshift({
      id:transactionId,
      amount:FAUCET_AMOUNT,
      label:'Campus Faucet claim',
      at:new Date().toLocaleString(),
      createdAt:Date.now(),
      kind:'received',
      source:'Campus Faucet'
    });
    persistSession(session);

    const icon = $('[data-cf-status-icon]');
    if (icon) {
      icon.className = 'cf-spinner complete';
      icon.textContent = '✓';
    }
    const title = $('[data-cf-status-title]');
    if (title) title.textContent = 'Claim complete';
    const message = $('[data-cf-status-message]');
    if (message) message.textContent = `${money(FAUCET_AMOUNT)} was added to your Campus Wallet.`;
    const progress = $('[data-cf-progress]');
    if (progress) progress.hidden = true;
    const wait = $('[data-cf-status-wait]');
    if (wait) wait.hidden = true;
    const receipt = $('[data-cf-receipt]');
    if (receipt) receipt.hidden = false;
    const balance = $('[data-cf-new-balance]');
    if (balance) balance.textContent = money(session.balance);
    const transaction = $('[data-cf-transaction]');
    if (transaction) transaction.textContent = transactionId;
    const actions = $('[data-cf-complete-actions]');
    if (actions) actions.hidden = false;
    toast(`${money(FAUCET_AMOUNT)} added to Campus Wallet.`);
  }

  function finishClaim(openWallet) {
    const status = $('[data-cf-status]');
    if (status) status.hidden = true;
    if (openWallet) {
      window.CampusUnifiedApps?.open?.('wallet');
      queueMicrotask(syncUi);
      return;
    }
    const session = ensureUsdSession();
    if (session) renderFaucet(session);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-cf-claim]')) {
      showReview();
      return;
    }
    if (event.target.closest('[data-cf-review-close]')) {
      hideReview();
      return;
    }
    if (event.target.closest('[data-cf-confirm]')) {
      beginClaim();
      return;
    }
    if (event.target.closest('[data-cf-done]')) {
      finishClaim(false);
      return;
    }
    if (event.target.closest('[data-cf-open-wallet]')) {
      finishClaim(true);
      return;
    }
    if (event.target.closest('[data-cf-home]')) {
      const session = ensureUsdSession();
      if (session) renderFaucet(session);
      return;
    }
    if (event.target.closest('[data-cf-account]')) {
      const session = ensureUsdSession();
      if (session) toast(`Connected Campus Buddy account: ${session.email}`);
      return;
    }
    const reviewLayer = event.target.closest('[data-cf-review]');
    if (reviewLayer && event.target === reviewLayer) hideReview();
  });

  const observer = new MutationObserver(() => queueMicrotask(syncUi));
  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    observer.observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    syncUi();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
