(() => {
  'use strict';

  const COURSE_CART_PREFIX = 'campus-buddy.course-cart.v1:';
  const COURSE_PRODUCTS = Object.freeze({
    101:{ name:'A Survival Guide for Startups in the Era of Tech Giants', price:18 },
    102:{ name:'Business Model Generation', price:34 },
    103:{ name:'Testing Business Ideas', price:32 },
    104:{ name:'Value Proposition Design', price:31 },
    105:{ name:'An Introduction to Blockchain', price:18 },
    106:{ name:'Using Blockchain to Build Customer Trust in AI', price:18 },
    107:{ name:'AI Wars', price:18 },
    108:{ name:'Why Design Thinking Works', price:15 },
    109:{ name:'IBM: Design Thinking', price:15 },
    110:{ name:"HBR's 10 Must Reads on Design Thinking", price:28 },
    111:{ name:'Busbud: Building a Data Company', price:18 },
    112:{ name:'Blockchain Case Studies', price:18 },
    113:{ name:'3 Ways to Help People Understand What Your Data Means', price:15 },
    114:{ name:'Data Visualization with Big Data', price:18 },
    115:{ name:'Internet Crime Complaint Center (IC3) Report 2024', price:0 }
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const parseMoney = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
  let frame = 0;

  function email() {
    return String(window.CampusBuddyState?.email || window.CampusUnifiedApps?.getSession?.()?.email || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  }

  function courseCartKey() {
    return `${COURSE_CART_PREFIX}${email()}`;
  }

  function readCourseCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(courseCartKey()) || '{}');
      const cart = {};
      Object.keys(COURSE_PRODUCTS).forEach(id => {
        const quantity = Math.max(0, Math.floor(Number(raw[id]) || 0));
        if (quantity) cart[id] = quantity;
      });
      return cart;
    } catch {
      return {};
    }
  }

  function clearCourseCart() {
    try { localStorage.removeItem(courseCartKey()); } catch {}
    queue();
  }

  function courseCount(cart = readCourseCart()) {
    return Object.values(cart).reduce((sum, value) => sum + Number(value || 0), 0);
  }

  function courseSubtotal(cart = readCourseCart()) {
    return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (COURSE_PRODUCTS[id]?.price || 0) * Number(quantity || 0), 0);
  }

  function courseItems(cart = readCourseCart()) {
    return Object.entries(cart).flatMap(([id, quantity]) => {
      const product = COURSE_PRODUCTS[id];
      if (!product) return [];
      return [{ id:Number(id), name:product.name, price:product.price, quantity:Number(quantity) || 1 }];
    });
  }

  function patchCartBadge(root) {
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (!descriptor?.get || !descriptor?.set) return;
    root.querySelectorAll('.cb-cart-button b').forEach(badge => {
      if (badge.dataset.demoIdempotentText === '1') return;
      badge.dataset.demoIdempotentText = '1';
      Object.defineProperty(badge, 'textContent', {
        configurable:true,
        get() { return descriptor.get.call(this); },
        set(value) {
          const next = String(value);
          if (descriptor.get.call(this) === next) return;
          descriptor.set.call(this, next);
        }
      });
    });
  }

  function stopHiddenCourseCatalog(root) {
    const grid = root.querySelector('.cb-product-grid');
    if (!grid) return;
    if (!grid.querySelector('[data-demo-course-sentinel]')) {
      const sentinel = document.createElement('i');
      sentinel.hidden = true;
      sentinel.dataset.demoCourseProduct = 'sentinel';
      sentinel.dataset.demoCourseSentinel = '1';
      grid.append(sentinel);
    }
    root.querySelectorAll('.demo-course-materials').forEach(section => section.remove());
  }

  function normalizeWardrobe() {
    document.querySelectorAll('.wardrobe-options').forEach(container => {
      if (container.querySelector(':scope > .demo-wardrobe-picker')) container.dataset.demoPickerOnly = '1';
    });
  }

  function ensureCartSummary(drawer, subtotal) {
    let summary = drawer.querySelector(':scope > .cb-cart-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'cb-cart-summary';
      summary.dataset.demoCourseOnlySummary = '1';
      summary.innerHTML = `<div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><button type="button" data-demo-course-only-checkout>Checkout</button>`;
      drawer.append(summary);
      return summary;
    }
    const strong = summary.querySelector('strong');
    if (!strong) return summary;
    if (!summary.dataset.demoBaseSubtotal) summary.dataset.demoBaseSubtotal = String(parseMoney(strong.textContent));
    const base = Number(summary.dataset.demoBaseSubtotal) || 0;
    const next = money(base + subtotal);
    if (strong.textContent !== next) strong.textContent = next;
    return summary;
  }

  function mergeCourseCart(root) {
    const cart = readCourseCart();
    const count = courseCount(cart);
    if (!count) return;
    const block = root.querySelector('[data-demo-course-cart-block]');
    if (!block) return;
    block.classList.add('demo-course-cart-native', 'demo-course-cart-unified');
    const drawer = block.closest('.cb-cart-drawer');
    if (!drawer) return;
    let items = drawer.querySelector(':scope > .cb-cart-items');
    if (!items) {
      items = document.createElement('div');
      items.className = 'cb-cart-items demo-course-only-items';
      const header = drawer.querySelector(':scope > .cb-drawer-header');
      header?.insertAdjacentElement('afterend', items);
    }
    if (block.parentElement !== items) items.append(block);
    ensureCartSummary(drawer, courseSubtotal(cart));
  }

  function summaryRow(scope, label) {
    return [...scope.querySelectorAll('.cb-summary-lines > div')].find(row => row.querySelector('span')?.textContent.trim().toLowerCase() === label.toLowerCase()) || null;
  }

  function setSummaryValue(scope, label, value, negative = false) {
    const strong = summaryRow(scope, label)?.querySelector('strong');
    if (!strong) return;
    const next = negative ? `− ${money(value)}` : money(value);
    if (strong.textContent !== next) strong.textContent = next;
  }

  function appendCourseCheckoutRows(page, cart) {
    const holder = page.querySelector('.cb-checkout-items');
    if (!holder) return;
    holder.querySelectorAll('[data-demo-course-checkout-row]').forEach(row => row.remove());
    courseItems(cart).forEach(item => {
      const row = document.createElement('div');
      row.dataset.demoCourseCheckoutRow = String(item.id);
      row.innerHTML = `<span class="cb-checkout-thumb demo-course-checkout-thumb" aria-hidden="true"><b>IS</b><small>635</small></span><span><b>${item.name.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b><small>${item.quantity} × ${money(item.price)}</small></span><strong>${money(item.price * item.quantity)}</strong>`;
      holder.append(row);
    });
    const count = holder.children.length;
    const counter = page.querySelector('.cb-checkout-card-head > span');
    if (counter) counter.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  function augmentCheckout(root) {
    const page = root.querySelector('.cb-checkout-page');
    const cart = readCourseCart();
    if (!page || !courseCount(cart)) return;
    appendCourseCheckoutRows(page, cart);
    const subtotalRow = summaryRow(page, 'Subtotal');
    const subtotalStrong = subtotalRow?.querySelector('strong');
    if (!subtotalStrong) return;
    if (!page.dataset.demoBaseSubtotal) page.dataset.demoBaseSubtotal = String(parseMoney(subtotalStrong.textContent));
    const baseSubtotal = Number(page.dataset.demoBaseSubtotal) || 0;
    const subtotal = baseSubtotal + courseSubtotal(cart);
    const shipping = parseMoney(summaryRow(page, 'Fulfillment')?.querySelector('strong')?.textContent);
    const discount = subtotal * 0.10;
    const taxable = Math.max(0, subtotal - discount + shipping);
    const tax = taxable * 0.0725;
    const fee = Math.max(0, subtotal - discount) * 0.015;
    const total = taxable + tax + fee;
    setSummaryValue(page, 'Subtotal', subtotal);
    setSummaryValue(page, 'Student discount', discount, true);
    setSummaryValue(page, 'Estimated state tax', tax);
    setSummaryValue(page, 'Processing fee', fee);
    setSummaryValue(page, 'Grand total', total);
    page.dataset.demoCombinedTotal = String(Math.round(total * 100) / 100);
  }

  function updateSplitPreview(input) {
    const scope = input.closest('[data-bookstore-ui-v1]');
    if (!scope) return;
    const editor = input.closest('.cb-currency-split-editor');
    if (!editor) return;
    const total = parseMoney(summaryRow(scope, 'Grand total')?.querySelector('strong')?.textContent);
    const currencyA = editor.querySelector('[data-cb-pay-a]')?.value || 'USD';
    const currencyB = editor.querySelector('[data-cb-pay-b]')?.value || 'BEACH';
    const percentA = currencyA === currencyB ? 100 : Math.max(0, Math.min(100, Number(input.value) || 0));
    const percentB = 100 - percentA;
    const labels = editor.querySelectorAll('.cb-split-labels span');
    if (labels[0]) labels[0].textContent = `${currencyA} ${percentA}%`;
    if (labels[1]) labels[1].textContent = `${currencyB} ${percentB}%`;
    const result = editor.querySelectorAll('.cb-split-result > div');
    const format = (code, amount) => code === 'BEACH' ? `${Number(amount || 0).toLocaleString('en-US',{maximumFractionDigits:2})} BEACH` : money(amount);
    if (result[0]) {
      const label = result[0].querySelector('span');
      const value = result[0].querySelector('strong');
      if (label) label.textContent = currencyA;
      if (value) value.textContent = format(currencyA, total * percentA / 100);
    }
    if (result[1]) {
      const label = result[1].querySelector('span');
      const value = result[1].querySelector('strong');
      if (label) label.textContent = currencyB;
      if (value) value.textContent = format(currencyB, total * percentB / 100);
    }
  }

  document.addEventListener('input', event => {
    const input = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-pay-split]');
    if (!input) return;
    const card = input.closest('[data-cb-payment-card]');
    const signature = card?.dataset.cbPaymentSignature;
    if (signature) {
      const parts = signature.split('::');
      if (parts.length >= 11) {
        parts[5] = String(Math.max(0, Math.min(100, Number(input.value) || 0)));
        card.dataset.cbPaymentSignature = parts.join('::');
      }
    }
    requestAnimationFrame(() => updateSplitPreview(input));
  }, true);

  function sync() {
    frame = 0;
    normalizeWardrobe();
    const root = $('[data-bookstore-ui-v1]');
    if (!root) return;
    patchCartBadge(root);
    stopHiddenCourseCatalog(root);
    mergeCourseCart(root);
    augmentCheckout(root);
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  function start() {
    normalizeWardrobe();
    const content = $('#campusAppsContent');
    if (content) new MutationObserver(queue).observe(content, { childList:true, subtree:true });
    const step2 = $('#step2');
    if (step2) new MutationObserver(queue).observe(step2, { childList:true, subtree:true });
    const panel = $('#panelContent');
    if (panel) new MutationObserver(queue).observe(panel, { childList:true, subtree:true });
    window.addEventListener('campus-session-changed', queue);
    queue();
  }

  window.CampusDemoBookstoreStability = Object.freeze({
    COURSE_PRODUCTS,
    readCourseCart,
    clearCourseCart,
    courseCount,
    courseSubtotal,
    courseItems,
    parseMoney,
    money,
    summaryRow,
    augmentCheckout,
    sync:queue
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
