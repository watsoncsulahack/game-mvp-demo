(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const RATE = 1;
  const payment = {
    advanced:false,
    basicCurrency:'USD',
    allocationMode:'split',
    currencyA:'USD',
    currencyB:'BEACH',
    splitPercent:50,
    itemCurrencies:new Map()
  };

  let frame = 0;
  let scrollSnapshot = null;
  let committing = false;

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const beach = value => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits:2 })} BEACH`;
  const parseMoney = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);

  function root() {
    return document.querySelector('[data-bookstore-ui-v1]');
  }

  function session() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function ensureBalances(value = session()) {
    if (!value) return null;
    if (!value.balances || typeof value.balances !== 'object') value.balances = { USD:Number(value.balance) || 500, BEACH:0 };
    if (!Number.isFinite(Number(value.balances.USD))) value.balances.USD = Number(value.balance) || 500;
    if (!Number.isFinite(Number(value.balances.BEACH))) value.balances.BEACH = 0;
    if (!Array.isArray(value.transactions)) value.transactions = [];
    value.balance = Math.round(Number(value.balances.USD) * 100) / 100;
    return value;
  }

  function persistSession(value) {
    if (!value?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${String(value.email).trim().toLowerCase()}`, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session:value } }));
  }

  function toast(message) {
    const target = $('#toast');
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { target.hidden = true; }, 2800);
  }

  function captureScroll() {
    const scope = root();
    if (!scope) return;
    const main = scope.querySelector('.cb-main-scroll');
    const cart = scope.querySelector('.cb-cart-items');
    const content = $('#campusAppsContent');
    scrollSnapshot = {
      mainTop:main?.scrollTop || 0,
      mainLeft:main?.scrollLeft || 0,
      cartTop:cart?.scrollTop || 0,
      cartLeft:cart?.scrollLeft || 0,
      contentTop:content?.scrollTop || 0,
      contentLeft:content?.scrollLeft || 0
    };
  }

  function restoreScroll() {
    if (!scrollSnapshot) return;
    const snapshot = scrollSnapshot;
    scrollSnapshot = null;
    const apply = () => {
      const scope = root();
      const main = scope?.querySelector('.cb-main-scroll');
      const cart = scope?.querySelector('.cb-cart-items');
      const content = $('#campusAppsContent');
      if (main) { main.scrollTop = snapshot.mainTop; main.scrollLeft = snapshot.mainLeft; }
      if (cart) { cart.scrollTop = snapshot.cartTop; cart.scrollLeft = snapshot.cartLeft; }
      if (content) { content.scrollTop = snapshot.contentTop; content.scrollLeft = snapshot.contentLeft; }
    };
    apply();
    requestAnimationFrame(apply);
  }

  function cardId(card) {
    const source = card?.querySelector('[data-cb-add], [data-cb-product-open]');
    return Number(source?.dataset.cbAdd || source?.dataset.cbProductOpen || 0) || 0;
  }

  function addLearnMore(scope) {
    scope.querySelectorAll('.cb-product-card').forEach(card => {
      const id = cardId(card);
      const description = card.querySelector('.cb-product-description');
      if (!id || !description || description.querySelector('.cb-learn-more')) return;
      const text = description.textContent.trim();
      description.classList.add('cb-product-description-with-more');
      description.innerHTML = `<span>${esc(text)}</span><button class="cb-learn-more" type="button" data-cb-product-open="${id}">Learn more</button>`;
    });
  }

  function summaryValues(scope) {
    const rows = [...scope.querySelectorAll('.cb-summary-lines > div')];
    const read = label => {
      const row = rows.find(candidate => candidate.querySelector('span')?.textContent.trim().toLowerCase() === label.toLowerCase());
      return parseMoney(row?.querySelector('strong')?.textContent);
    };
    return {
      subtotal:read('Subtotal'),
      discount:Math.abs(read('Student discount')),
      shipping:read('Fulfillment'),
      tax:read('Estimated state tax'),
      fee:read('Processing fee'),
      total:read('Grand total')
    };
  }

  function checkoutItems(scope) {
    return [...scope.querySelectorAll('.cb-checkout-items > div')].map((row, index) => {
      const name = row.querySelector('b')?.textContent.trim() || `Item ${index + 1}`;
      const small = row.querySelector('small')?.textContent || '';
      const quantity = Number((small.match(/^(\d+)\s*[×x]/) || [])[1]) || 1;
      const lineTotal = parseMoney(row.querySelector(':scope > strong')?.textContent);
      return { key:`${index}:${name}`, name, quantity, lineTotal };
    });
  }

  function currencyLabel(code, amount) {
    return code === 'BEACH' ? beach(amount) : money(amount);
  }

  function walletBalanceMarkup(value) {
    return `<div class="cb-wallet-balance-card"><span>USD balance</span><strong>${money(value.balances.USD)}</strong><small>US Dollar</small></div>
      <div class="cb-wallet-balance-card"><span>BEACH balance</span><strong>${beach(value.balances.BEACH)}</strong><small>1 BEACH = $1.00</small></div>`;
  }

  function paymentBreakdown(scope) {
    const totals = summaryValues(scope);
    const allocations = { USD:0, BEACH:0 };
    const add = (code, usd) => { allocations[code] = Math.max(0, allocations[code] + Number(usd || 0)); };

    if (!payment.advanced) {
      add(payment.basicCurrency, totals.total);
    } else if (payment.allocationMode === 'split') {
      const same = payment.currencyA === payment.currencyB;
      const percentA = same ? 100 : Math.max(0, Math.min(100, Number(payment.splitPercent) || 0));
      add(payment.currencyA, totals.total * percentA / 100);
      add(payment.currencyB, totals.total * (100 - percentA) / 100);
    } else {
      const items = checkoutItems(scope);
      const discountedMerchandise = Math.max(0, totals.subtotal - totals.discount);
      const discountFactor = totals.subtotal > 0 ? discountedMerchandise / totals.subtotal : 0;
      items.forEach(item => add(payment.itemCurrencies.get(item.key) || payment.basicCurrency, item.lineTotal * discountFactor));
      add(payment.basicCurrency, totals.shipping + totals.tax + totals.fee);
    }

    return Object.entries(allocations)
      .filter(([,usd]) => usd > 0.000001)
      .map(([code,usd]) => ({ code, usd:Math.round(usd * 100) / 100, units:Math.round((usd / RATE) * 100) / 100 }));
  }

  function allocationSummary(scope) {
    const parts = paymentBreakdown(scope).map(item => `${currencyLabel(item.code, item.units)} from ${item.code}`);
    return parts.join(' + ') || 'No payment allocation';
  }

  function splitPanelMarkup(total) {
    const percentA = payment.currencyA === payment.currencyB ? 100 : payment.splitPercent;
    const percentB = 100 - percentA;
    const amountA = total * percentA / 100;
    const amountB = total * percentB / 100;
    const options = selected => `<option value="USD" ${selected === 'USD' ? 'selected' : ''}>US Dollar (USD)</option><option value="BEACH" ${selected === 'BEACH' ? 'selected' : ''}>BEACH</option>`;
    return `<div class="cb-currency-split-editor">
      <div class="cb-currency-pair"><select data-cb-pay-a>${options(payment.currencyA)}</select><span>+</span><select data-cb-pay-b>${options(payment.currencyB)}</select></div>
      <div class="cb-split-labels"><span>${payment.currencyA} ${percentA}%</span><span>${payment.currencyB} ${percentB}%</span></div>
      <input type="range" min="0" max="100" step="5" value="${percentA}" data-cb-pay-split ${payment.currencyA === payment.currencyB ? 'disabled' : ''}>
      <div class="cb-split-result"><div><span>${payment.currencyA}</span><strong>${currencyLabel(payment.currencyA, amountA)}</strong></div><div><span>${payment.currencyB}</span><strong>${currencyLabel(payment.currencyB, amountB)}</strong></div></div>
    </div>`;
  }

  function perItemMarkup(scope) {
    const options = selected => `<option value="USD" ${selected === 'USD' ? 'selected' : ''}>USD</option><option value="BEACH" ${selected === 'BEACH' ? 'selected' : ''}>BEACH</option>`;
    const items = checkoutItems(scope);
    return `<div class="cb-per-item-allocation">${items.map(item => {
      const selected = payment.itemCurrencies.get(item.key) || payment.basicCurrency;
      payment.itemCurrencies.set(item.key, selected);
      return `<div class="cb-per-item-currency-row"><span><strong>${esc(item.name)}</strong><small>${item.quantity} item${item.quantity === 1 ? '' : 's'} · ${money(item.lineTotal)}</small></span><select data-cb-pay-item="${esc(item.key)}">${options(selected)}</select></div>`;
    }).join('')}</div>`;
  }

  function paymentSignature(scope, value) {
    const totals = summaryValues(scope);
    const items = checkoutItems(scope).map(item => `${item.key}:${item.quantity}:${item.lineTotal}`).join('|');
    const itemCurrencies = [...payment.itemCurrencies.entries()].sort().map(([key,code]) => `${key}:${code}`).join('|');
    return [payment.advanced, payment.basicCurrency, payment.allocationMode, payment.currencyA, payment.currencyB, payment.splitPercent, itemCurrencies, Number(value.balances.USD).toFixed(2), Number(value.balances.BEACH).toFixed(2), totals.total.toFixed(2), items].join('::');
  }

  function paymentCardMarkup(scope, value, signature) {
    const totals = summaryValues(scope);
    const options = selected => `<option value="USD" ${selected === 'USD' ? 'selected' : ''}>US Dollar (USD)</option><option value="BEACH" ${selected === 'BEACH' ? 'selected' : ''}>BEACH</option>`;
    return `<section class="cb-checkout-card cb-payment-card" data-cb-payment-card data-cb-payment-signature="${esc(signature)}">
      <div class="cb-checkout-card-head"><div><h2>Payment</h2><p>Use the Campus Wallet linked to this Buddy account.</p></div><span>1 BEACH = $1.00</span></div>
      <div class="cb-checkout-option-list">
        <label class="cb-checkout-option"><span><b>Payment currency</b><small>Choose a single currency for the order.</small></span><select data-cb-pay-basic>${options(payment.basicCurrency)}</select></label>
        <div class="cb-wallet-balances">${walletBalanceMarkup(value)}</div>
        <label class="cb-checkout-option cb-advanced-toggle-row"><span><b>Advanced payment <em>Optional</em></b><small>Split the order or choose a currency per item.</small></span><span class="cb-checkout-switch"><input type="checkbox" data-cb-pay-advanced ${payment.advanced ? 'checked' : ''}><i aria-hidden="true"></i></span></label>
      </div>
      ${payment.advanced ? `<div class="cb-checkout-advanced-panel">
        <div class="cb-allocation-mode"><label><input type="radio" name="cbAllocation" value="split" data-cb-pay-mode ${payment.allocationMode === 'split' ? 'checked' : ''}><span>Split order</span></label><label><input type="radio" name="cbAllocation" value="item" data-cb-pay-mode ${payment.allocationMode === 'item' ? 'checked' : ''}><span>Per item</span></label></div>
        ${payment.allocationMode === 'split' ? splitPanelMarkup(totals.total) : perItemMarkup(scope)}
      </div>` : ''}
    </section>`;
  }

  function enhanceCheckout(scope) {
    const checkout = scope.querySelector('.cb-checkout-page');
    if (!checkout) return;
    const value = ensureBalances();
    if (!value) return;

    const column = checkout.querySelector('.cb-checkout-column');
    if (!column) return;
    const existing = column.querySelector('[data-cb-payment-card]');
    const signature = paymentSignature(scope, value);
    if (!existing) column.insertAdjacentHTML('beforeend', paymentCardMarkup(scope, value, signature));
    else if (existing.dataset.cbPaymentSignature !== signature) existing.outerHTML = paymentCardMarkup(scope, value, signature);

    const summary = checkout.querySelector('.cb-checkout-summary');
    if (summary) {
      let composition = summary.querySelector('[data-cb-payment-composition]');
      if (!composition) {
        composition = document.createElement('div');
        composition.className = 'cb-payment-composition';
        composition.dataset.cbPaymentComposition = '';
        const button = summary.querySelector('.cb-place-order');
        button?.insertAdjacentElement('beforebegin', composition);
      }
      if (composition) {
        const nextComposition = `<strong>Campus Wallet payment</strong><span>${esc(allocationSummary(scope))}</span>`;
        if (composition.innerHTML !== nextComposition) composition.innerHTML = nextComposition;
      }
      const button = summary.querySelector('.cb-place-order');
      const total = summaryValues(scope).total;
      if (button) {
        const label = `Pay ${money(total)} · Complete purchase`;
        if (button.textContent !== label) button.textContent = label;
        const aria = `Pay ${money(total)} and complete purchase`;
        if (button.getAttribute('aria-label') !== aria) button.setAttribute('aria-label', aria);
      }
      const note = summary.querySelector(':scope > p');
      const noteText = 'Demo purchase · funds are deducted from the linked Campus Wallet.';
      if (note && note.textContent !== noteText) note.textContent = noteText;
    }
  }

  function updatePaymentOnly() {
    const scope = root();
    if (!scope?.querySelector('.cb-checkout-page')) return;
    captureScroll();
    enhanceCheckout(scope);
    restoreScroll();
  }

  function commitWalletPayment(scope) {
    if (committing) return false;
    const value = ensureBalances();
    if (!value) return false;
    const breakdown = paymentBreakdown(scope);
    const unavailable = breakdown.find(item => item.units > Number(value.balances[item.code] || 0) + 0.000001);
    if (unavailable) {
      toast(`Insufficient ${unavailable.code} balance. Choose another payment allocation or swap funds in Campus Wallet.`);
      return false;
    }

    committing = true;
    const total = summaryValues(scope).total;
    const now = Date.now();
    const at = new Date(now).toLocaleString();
    breakdown.forEach((item, index) => {
      value.balances[item.code] = Math.max(0, Math.round((Number(value.balances[item.code]) - item.units) * 100) / 100);
      value.transactions.unshift({
        id:`BOOK-${now.toString(36).toUpperCase()}-${index + 1}`,
        amount:-item.units,
        currency:item.code,
        label:'Campus Bookstore purchase',
        at,
        createdAt:now + index,
        kind:'purchase',
        merchant:'Campus Bookstore',
        orderTotalUsd:Math.round(total * 100) / 100,
        paymentComposition:breakdown.map(part => ({ currency:part.code, amount:part.units }))
      });
    });
    value.balance = Math.round(Number(value.balances.USD) * 100) / 100;
    persistSession(value);
    payment.itemCurrencies.clear();
    committing = false;
    return true;
  }

  function sync() {
    frame = 0;
    const scope = root();
    if (!scope) return;
    addLearnMore(scope);
    enhanceCheckout(scope);
    restoreScroll();
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('[data-bookstore-ui-v1] [data-cb-qty]')) return;
    captureScroll();
  }, true);

  document.addEventListener('click', event => {
    const scope = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!scope) return;

    const quantity = event.target.closest('[data-cb-qty]');
    if (quantity) {
      captureScroll();
      requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
      return;
    }

    const place = event.target.closest('.cb-place-order');
    if (place) {
      if (place.dataset.cbWalletCommitted === '1') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (!commitWalletPayment(scope)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      place.dataset.cbWalletCommitted = '1';
    }
  }, true);

  document.addEventListener('change', event => {
    const scope = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!scope) return;
    if (event.target.matches('[data-cb-pay-basic]')) payment.basicCurrency = event.target.value === 'BEACH' ? 'BEACH' : 'USD';
    else if (event.target.matches('[data-cb-pay-advanced]')) payment.advanced = event.target.checked;
    else if (event.target.matches('[data-cb-pay-mode]')) payment.allocationMode = event.target.value === 'item' ? 'item' : 'split';
    else if (event.target.matches('[data-cb-pay-a]')) payment.currencyA = event.target.value === 'BEACH' ? 'BEACH' : 'USD';
    else if (event.target.matches('[data-cb-pay-b]')) payment.currencyB = event.target.value === 'BEACH' ? 'BEACH' : 'USD';
    else if (event.target.matches('[data-cb-pay-item]')) payment.itemCurrencies.set(event.target.dataset.cbPayItem, event.target.value === 'BEACH' ? 'BEACH' : 'USD');
    else return;
    updatePaymentOnly();
  });

  document.addEventListener('input', event => {
    if (!event.target.matches?.('[data-cb-pay-split]')) return;
    payment.splitPercent = Math.max(0, Math.min(100, Number(event.target.value) || 0));
    updatePaymentOnly();
  });

  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(queue).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('campus-session-changed', queue);
    queue();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();