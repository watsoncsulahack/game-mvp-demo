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
