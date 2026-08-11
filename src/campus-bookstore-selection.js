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
