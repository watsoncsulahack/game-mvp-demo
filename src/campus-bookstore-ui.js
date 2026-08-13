/* Campus Bookstore interaction behavior: selection, quantity controls, filters, and UI synchronization. */

(() => {
  'use strict';

  const selected = new Set();
  const quantities = new Map();
  const prices = new Map();
  let activeEmail = '';
  let syncFrame = 0;
  let batchAdding = false;

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);

  function bookstoreRoot() {
    return document.querySelector('[data-bookstore-ui-v1]');
  }

  function currentEmail() {
    return String(window.CampusUnifiedApps?.getSession?.()?.email || '').trim().toLowerCase();
  }

  function cardId(card) {
    const source = card?.querySelector('[data-cb-add], [data-cb-product-open]');
    return Number(source?.dataset.cbAdd || source?.dataset.cbProductOpen || 0) || 0;
  }

  function refreshCaches(root) {
    root.querySelectorAll('.cb-product-card').forEach(card => {
      const id = cardId(card);
      if (!id) return;
      card.dataset.cbCardId = String(id);
      const output = card.querySelector('.cb-stepper output');
      const price = card.querySelector('.cb-product-meta strong');
      const quantity = Number(output?.textContent || 1);
      const numericPrice = Number(String(price?.textContent || '').replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(quantity) && quantity > 0) quantities.set(id, quantity);
      if (Number.isFinite(numericPrice) && numericPrice >= 0) prices.set(id, numericPrice);
    });
  }

  function selectedSummary() {
    let total = 0;
    selected.forEach(id => {
      total += (prices.get(id) || 0) * (quantities.get(id) || 1);
    });
    return { count:selected.size, total };
  }

  function cartIconMarkup() {
    return '<svg class="cb-selection-cart-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>';
  }

  function decorateCards(root) {
    const summary = selectedSummary();
    root.querySelectorAll('.cb-product-card').forEach(card => {
      const id = Number(card.dataset.cbCardId || cardId(card));
      if (!id) return;
      const isSelected = selected.has(id);
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', String(isSelected));
      card.setAttribute('aria-disabled', String(card.classList.contains('is-out')));
      card.tabIndex = card.classList.contains('is-out') ? -1 : 0;

      let indicator = card.querySelector('.cb-selection-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'cb-selection-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.innerHTML = '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg>';
        card.prepend(indicator);
      }

      const add = card.querySelector(`[data-cb-add="${id}"]`);
      if (!add || add.disabled) return;
      if (isSelected) {
        add.classList.add('cb-selected-add-button');
        add.setAttribute('aria-label', `Add ${summary.count} selected ${summary.count === 1 ? 'product' : 'products'} totaling ${money(summary.total)} to cart`);
        const signature = `${summary.count}:${summary.total.toFixed(2)}`;
        if (add.dataset.cbSelectionSummary !== signature) {
          add.dataset.cbSelectionSummary = signature;
          add.innerHTML = `${cartIconMarkup()}<span class="cb-selected-count">${summary.count}</span><i aria-hidden="true">•</i><strong>${money(summary.total)}</strong>`;
        }
      } else if (add.classList.contains('cb-selected-add-button')) {
        add.classList.remove('cb-selected-add-button');
        delete add.dataset.cbSelectionSummary;
        add.removeAttribute('aria-label');
        add.textContent = 'Add to cart';
      }
    });
  }

  function ensureHeaderCartIcon(root) {
    const button = root.querySelector('.cb-cart-button');
    if (!button) return;
    let icon = button.querySelector('svg');
    if (!icon) {
      button.insertAdjacentHTML('afterbegin', cartIconMarkup());
      icon = button.querySelector('svg');
    }
    icon?.classList.add('cb-header-cart-icon');
    icon?.setAttribute('aria-hidden', 'true');
  }

  function sync() {
    syncFrame = 0;
    const root = bookstoreRoot();
    if (!root) return;
    const email = currentEmail();
    if (email && email !== activeEmail) {
      activeEmail = email;
      selected.clear();
      quantities.clear();
      prices.clear();
    }
    refreshCaches(root);
    ensureHeaderCartIcon(root);
    decorateCards(root);
  }

  function queueSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(sync);
  }

  function toggleSelection(card) {
    const id = Number(card?.dataset.cbCardId || cardId(card));
    if (!id || card?.classList.contains('is-out')) return;
    refreshCaches(bookstoreRoot());
    selected.has(id) ? selected.delete(id) : selected.add(id);
    decorateCards(bookstoreRoot());
  }

  function addSelectedToCart() {
    if (batchAdding || !selected.size) return;
    const root = bookstoreRoot();
    if (!root) return;
    refreshCaches(root);
    const items = [...selected].map(id => ({ id, quantity:quantities.get(id) || 1 }));
    selected.clear();
    batchAdding = true;

    const addNext = index => {
      if (index >= items.length) {
        batchAdding = false;
        queueSync();
        return;
      }
      const item = items[index];
      const currentRoot = bookstoreRoot();
      const button = currentRoot?.querySelector(`[data-cb-add="${item.id}"]`);
      if (!button || button.disabled) {
        addNext(index + 1);
        return;
      }
      button.click();
      requestAnimationFrame(() => addNext(index + 1));
    };

    addNext(0);
  }

  function isCardSelectionSurface(event, card) {
    if (!card) return false;
    if (event.target.closest('button,input,select,label,a,.cb-stepper')) return false;
    return true;
  }

  document.addEventListener('click', event => {
    const root = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!root) return;

    const selectedAdd = event.target.closest('.cb-selected-add-button');
    if (selectedAdd && !batchAdding) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addSelectedToCart();
      return;
    }

    const card = event.target.closest('.cb-product-card');
    if (isCardSelectionSurface(event, card)) {
      toggleSelection(card);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest?.('.cb-product-card');
    if (!card || event.target !== card || !card.closest('[data-bookstore-ui-v1]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleSelection(card);
  }, true);

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

(() => {
  'use strict';

  let raf = 0;
  const root = () => document.querySelector('[data-bookstore-ui-v1]');

  function selectionCartIcon(count) {
    const positions = [[23,32],[31,32],[39,32],[47,32],[19,26],[27,26],[35,26],[43,26],[51,26],[16,20],[23,20],[30,20],[37,20],[44,20],[51,20],[20,13],[28,13],[36,13],[44,13],[52,13]];
    const visible = Math.min(Math.max(0, Number(count) || 0), 20);
    const dots = positions.slice(0, visible).map(([cx,cy], i) => `<circle class="cb-parity-cart-dot" style="--dot-index:${i}" cx="${cx}" cy="${cy}" r="2.15"/>`).join('');
    return `<svg class="cb-parity-selection-cart" aria-hidden="true" viewBox="0 0 64 52"><path class="cb-parity-cart-shell" d="M5 5h6l4.2 29.1a3.1 3.1 0 0 0 3.1 2.7h29.9a3.1 3.1 0 0 0 3-2.4L57 16H14"/>${dots}<circle class="cb-parity-cart-wheel" cx="23" cy="46" r="2.8"/><circle class="cb-parity-cart-wheel" cx="48" cy="46" r="2.8"/></svg>`;
  }

  function decorateSelectedButtons(scope) {
    scope.querySelectorAll('.cb-selected-add-button').forEach(button => {
      const count = Number(button.querySelector('.cb-selected-count')?.textContent || 0);
      if (!count) return;
      const old = button.querySelector('.cb-selection-cart-icon, .cb-parity-selection-cart');
      if (old?.classList.contains('cb-parity-selection-cart') && Number(old.dataset.count) === count) return;
      old?.remove();
      button.insertAdjacentHTML('afterbegin', selectionCartIcon(count));
      const icon = button.querySelector('.cb-parity-selection-cart');
      if (icon) icon.dataset.count = String(count);
    });
  }

  function decorateStepper(stepper) {
    if (stepper.dataset.cbParityStepper === '1') return;
    const minus = stepper.querySelector('[data-cb-qty="-1"]');
    const plus = stepper.querySelector('[data-cb-qty="1"]');
    const output = stepper.querySelector('output');
    if (!minus || !plus || !output) return;
    const context = minus.dataset.cbContext || plus.dataset.cbContext || 'card';
    if (!['card','modal'].includes(context)) return;
    const id = minus.dataset.cbProductId || plus.dataset.cbProductId || '';
    stepper.dataset.cbParityStepper = '1';
    stepper.dataset.cbParityId = id;
    stepper.dataset.cbParityContext = context;
    stepper.classList.add('cb-parity-arrow-stepper');
    stepper.innerHTML = `<button class="cb-parity-step cb-parity-step-down" type="button" data-cb-qty="-1" data-cb-product-id="${id}" data-cb-context="${context}" aria-label="Decrease quantity"><svg viewBox="0 0 36 44" aria-hidden="true"><path class="cb-parity-arrow" d="M15 10 8 22l7 12"/><path class="cb-parity-symbol" d="M19 22h9"/></svg></button><output>${output.textContent}</output><button class="cb-parity-step cb-parity-step-up" type="button" data-cb-qty="1" data-cb-product-id="${id}" data-cb-context="${context}" aria-label="Increase quantity"><svg viewBox="0 0 36 44" aria-hidden="true"><path class="cb-parity-arrow" d="m21 10 7 12-7 12"/><path class="cb-parity-symbol" d="M8 22h9"/><path class="cb-parity-symbol cb-parity-plus-vertical" d="M12.5 17v10"/></svg></button>`;
  }

  function decorateSteppers(scope) {
    scope.querySelectorAll('.cb-stepper').forEach(decorateStepper);
  }

  function flashStepper(id, context, delta) {
    const scope = root();
    if (!scope) return;
    decorateSteppers(scope);
    const stepper = [...scope.querySelectorAll('.cb-parity-arrow-stepper')].find(el => el.dataset.cbParityId === String(id) && el.dataset.cbParityContext === String(context));
    if (!stepper) return;
    stepper.classList.remove('is-increasing','is-decreasing');
    void stepper.offsetWidth;
    stepper.classList.add(delta > 0 ? 'is-increasing' : 'is-decreasing');
    clearTimeout(stepper._parityTimer);
    stepper._parityTimer = setTimeout(() => stepper.classList.remove('is-increasing','is-decreasing'), 180);
  }

  function ensureStockChip(scope) {
    const checkbox = scope.querySelector('[data-cb-filter-stock]');
    const controls = scope.querySelector('.cb-catalog-controls');
    if (!checkbox || !controls) return;
    let holder = scope.querySelector('.cb-active-filters');
    let chip = scope.querySelector('[data-cb-parity-stock-chip]');
    if (!checkbox.checked) {
      chip?.remove();
      if (holder && !holder.children.length) holder.remove();
      return;
    }
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'cb-active-filters';
      controls.insertAdjacentElement('afterend', holder);
    }
    if (!chip) {
      chip = document.createElement('span');
      chip.dataset.cbParityStockChip = '';
      chip.innerHTML = 'In stock only<button type="button" data-cb-parity-disable-stock aria-label="Show out-of-stock products">×</button>';
      holder.prepend(chip);
    }
  }

  function fitFilters(scope) {
    const panel = scope.querySelector('.cb-filters-panel');
    const scroller = scope.querySelector('.cb-main-scroll');
    const shell = scope.querySelector('.cb-catalog-shell');
    if (!panel || !scroller || !shell) return;
    if (window.matchMedia('(max-width:820px)').matches || !shell.classList.contains('filters-open')) {
      panel.style.removeProperty('height');
      panel.style.removeProperty('max-height');
      panel.style.removeProperty('overflow-y');
      return;
    }
    const viewport = scroller.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    const top = Math.max(viewport.top, rect.top);
    const available = Math.max(260, Math.floor(viewport.bottom - top - 12));
    panel.style.height = `${available}px`;
    panel.style.maxHeight = `${available}px`;
    panel.style.overflowY = 'auto';
  }

  function sync() {
    raf = 0;
    const scope = root();
    if (!scope) return;
    decorateSelectedButtons(scope);
    decorateSteppers(scope);
    ensureStockChip(scope);
    fitFilters(scope);
  }

  function queue() {
    if (!raf) raf = requestAnimationFrame(sync);
  }

  document.addEventListener('click', event => {
    const scope = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!scope) return;

    const stockChip = event.target.closest('[data-cb-parity-disable-stock]');
    if (stockChip) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const checkbox = scope.querySelector('[data-cb-filter-stock]');
      if (checkbox) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles:true }));
      }
      return;
    }

    const qty = event.target.closest('[data-cb-qty]');
    if (qty) {
      const context = qty.dataset.cbContext || 'card';
      const id = qty.dataset.cbProductId || '';
      const delta = Number(qty.dataset.cbQty);
      if (['card','modal'].includes(context) && Number.isFinite(delta)) requestAnimationFrame(() => flashStepper(id, context, delta));
      return;
    }

    const visual = event.target.closest('.cb-product-image-button[data-cb-product-open]');
    if (visual) {
      const card = visual.closest('.cb-product-card');
      if (card && !card.classList.contains('is-out')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        card.click();
      }
    }
  }, true);

  window.addEventListener('resize', queue);
  const start = () => {
    const shell = document.querySelector('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(queue).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    queue();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

(() => {
  'use strict';

  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const parseMoney = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;

  function row(page,label) {
    return [...page.querySelectorAll('.cb-summary-lines > div')].find(candidate => candidate.querySelector('span')?.textContent.trim().toLowerCase() === label.toLowerCase()) || null;
  }

  function set(page,label,value,negative=false) {
    const strong = row(page,label)?.querySelector('strong');
    if (!strong) return;
    strong.textContent = negative ? `− ${money(value)}` : money(value);
  }

  function restoreNativeTotals() {
    const helper = window.CampusDemoBookstoreStability;
    const page = document.querySelector('[data-bookstore-ui-v1] .cb-checkout-page');
    if (!helper || !page || helper.courseCount() || !page.dataset.demoBaseSubtotal) return;
    const subtotal = Number(page.dataset.demoBaseSubtotal) || 0;
    const shipping = parseMoney(row(page,'Fulfillment')?.querySelector('strong')?.textContent);
    const discount = subtotal * .10;
    const taxable = Math.max(0,subtotal-discount+shipping);
    const tax = taxable * .0725;
    const fee = Math.max(0,subtotal-discount) * .015;
    const total = taxable + tax + fee;
    set(page,'Subtotal',subtotal);
    set(page,'Student discount',discount,true);
    set(page,'Estimated state tax',tax);
    set(page,'Processing fee',fee);
    set(page,'Grand total',total);
    page.dataset.demoCombinedTotal = String(Math.round(total*100)/100);
    page.querySelector('[data-cb-payment-card]')?.remove();
  }

  document.addEventListener('click',event => {
    if (!event.target.closest?.('[data-store-course-checkout-remove]')) return;
    setTimeout(restoreNativeTotals,0);
  },true);
})();
