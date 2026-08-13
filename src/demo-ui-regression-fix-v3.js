(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const COLLECTIBLE_NAMES = new Set([
    'Introduction to Design',
    'Everyday Campus Hoodie',
    'Campus Sketch Notebook',
    'Campus Architecture Print',
    'Utility Canvas Tote',
    'Campus Seal Crewneck',
    'Library Bookmark Set',
    'Principles of Economics',
    'Stoneware Campus Mug',
    'Ribbed Campus Beanie',
    'Academic Writing Handbook',
    'Dual-Tip Art Marker Set',
    'Data Structures in Practice',
    'Packable Campus Rain Jacket'
  ]);

  let filterOpen = null;
  let frame = 0;

  function bookstoreRoot() {
    return $('[data-bookstore-ui-v1]');
  }

  function syncWardrobe() {
    $$('.wardrobe-options').forEach(container => {
      container.classList.toggle('demo-picker-authoritative', !!container.querySelector(':scope > .demo-wardrobe-picker'));
    });
  }

  function syncFilterState(root = bookstoreRoot()) {
    const shell = root?.querySelector('.cb-catalog-shell');
    const toggle = root?.querySelector('[data-cb-filter-toggle]');
    if (!shell || !toggle) return;
    if (filterOpen === null) filterOpen = shell.classList.contains('filters-open');
    shell.classList.toggle('filters-open', !!filterOpen);
    toggle.setAttribute('aria-expanded', String(!!filterOpen));
    toggle.classList.toggle('is-pressed', !!filterOpen);
  }

  function mintToggleMarkup() {
    return `<label class="cb-mint-placeholder"><span><b>Mint collectible</b><small>Placeholder for collectible minting at checkout.</small></span><span class="cb-mint-switch"><input type="checkbox" aria-label="Mint collectible"><i aria-hidden="true"></i></span></label>`;
  }

  function syncMintPlaceholders(root = bookstoreRoot()) {
    const checkout = root?.querySelector('.cb-checkout-page');
    if (!checkout) return;
    checkout.querySelectorAll('.cb-checkout-items > div').forEach(row => {
      const name = row.querySelector('b')?.textContent.trim();
      if (!name || !COLLECTIBLE_NAMES.has(name) || row.querySelector('.cb-mint-placeholder')) return;
      row.insertAdjacentHTML('beforeend', mintToggleMarkup());
    });
  }

  function sync() {
    frame = 0;
    syncWardrobe();
    const root = bookstoreRoot();
    if (!root) return;
    syncFilterState(root);
    syncMintPlaceholders(root);
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  document.addEventListener('click', event => {
    const toggle = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-filter-toggle]');
    if (toggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const root = toggle.closest('[data-bookstore-ui-v1]');
      const shell = root?.querySelector('.cb-catalog-shell');
      const current = filterOpen === null ? !!shell?.classList.contains('filters-open') : filterOpen;
      filterOpen = !current;
      syncFilterState(root);
      return;
    }

    const close = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-filter-close]');
    if (close) {
      event.preventDefault();
      event.stopImmediatePropagation();
      filterOpen = false;
      syncFilterState(close.closest('[data-bookstore-ui-v1]'));
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !filterOpen) return;
    const root = bookstoreRoot();
    if (!root?.querySelector('.cb-catalog-shell.filters-open')) return;
    filterOpen = false;
    syncFilterState(root);
  }, true);

  function start() {
    const app = $('#app');
    if (app) new MutationObserver(queue).observe(app, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
    queue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
