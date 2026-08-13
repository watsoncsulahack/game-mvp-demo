(() => {
  'use strict';

  const STORE_PREFIX = 'campus-buddy.bookstore-ui.v1:';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

  function api() {
    return window.CampusDemoBookstoreStability || null;
  }

  function email() {
    return String(window.CampusBuddyState?.email || window.CampusUnifiedApps?.getSession?.()?.email || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  }

  function storeKey() {
    return `${STORE_PREFIX}${email()}`;
  }

  function totalsForCourseOnly(subtotal, shipping = 0) {
    const discount = subtotal * 0.10;
    const taxable = Math.max(0, subtotal - discount + shipping);
    const tax = taxable * 0.0725;
    const fee = Math.max(0, subtotal - discount) * 0.015;
    return { subtotal, discount, shipping, tax, fee, total:taxable + tax + fee };
  }

  function checkoutRows(items, helper) {
    return items.map(item => `<div data-demo-course-checkout-row="${item.id}"><span class="cb-checkout-thumb demo-course-checkout-thumb" aria-hidden="true"><b>IS</b><small>635</small></span><span><b>${esc(item.name)}</b><small>${item.quantity} × ${helper.money(item.price)}</small></span><strong>${helper.money(item.price * item.quantity)}</strong></div>`).join('');
  }

  function renderCourseOnlyCheckout() {
    const helper = api();
    const root = $('[data-bookstore-ui-v1]');
    const main = root?.querySelector('.cb-main-scroll');
    if (!helper || !root || !main) return;
    const cart = helper.readCourseCart();
    const items = helper.courseItems(cart);
    if (!items.length) return;
    const totals = totalsForCourseOnly(helper.courseSubtotal(cart), 0);
    const sessionEmail = email();
    root.querySelector('.cb-cart-drawer')?.classList.remove('open');
    root.querySelector('.cb-overlay')?.classList.remove('open');
    main.innerHTML = `<section class="cb-page cb-checkout-page" data-demo-course-only-checkout data-demo-base-subtotal="0" data-demo-combined-total="${Math.round(totals.total * 100) / 100}">
      <div class="cb-checkout-topbar"><button type="button" data-demo-course-checkout-back>← <span>Back to cart</span></button><div><p>Campus Bookstore</p><h1>Checkout</h1></div><span>Storefront prototype</span></div>
      <div class="cb-checkout-layout">
        <div class="cb-checkout-column">
          <section class="cb-checkout-card"><div class="cb-checkout-card-head"><div><h2>Your items</h2><p>Review the products in this storefront demo.</p></div><span>${items.reduce((sum,item) => sum + item.quantity, 0)} items</span></div><div class="cb-checkout-items">${checkoutRows(items, helper)}</div></section>
          <section class="cb-checkout-card"><div class="cb-checkout-card-head"><div><h2>Order options</h2><p>Account and fulfillment for this demo order.</p></div></div><div class="cb-checkout-options"><div><span><b>Campus account</b><small>Already linked from Campus Buddy</small></span><strong>${esc(sessionEmail)}</strong></div><label><span><b>Fulfillment</b><small>Choose pickup or campus delivery</small></span><select data-demo-course-fulfillment><option value="pickup">Campus pickup · Free</option><option value="shipping">Standard shipping · $8.00</option></select></label></div></section>
        </div>
        <aside class="cb-checkout-card cb-checkout-summary"><div class="cb-checkout-card-head"><div><h2>Order summary</h2><p>Calculated from the current cart.</p></div></div><div class="cb-summary-lines"><div><span>Subtotal</span><strong>${helper.money(totals.subtotal)}</strong></div><div><span>Student discount</span><strong>− ${helper.money(totals.discount)}</strong></div><div><span>Fulfillment</span><strong>Free</strong></div><div><span>Estimated state tax</span><strong>${helper.money(totals.tax)}</strong></div><div><span>Processing fee</span><strong>${helper.money(totals.fee)}</strong></div><div class="total"><span>Grand total</span><strong>${helper.money(totals.total)}</strong></div></div><button class="cb-place-order" type="button">Complete demo purchase</button><p>Demo purchase · funds are deducted from the linked Campus Wallet.</p></aside>
      </div>
    </section>`;
    const title = $('#campusAppsTitle');
    if (title) title.textContent = 'bookstore.campus.local/checkout';
    helper.sync();
  }

  function recalcCourseOnly(select) {
    const helper = api();
    const page = select.closest('[data-demo-course-only-checkout]');
    if (!helper || !page) return;
    const shipping = select.value === 'shipping' ? 8 : 0;
    const totals = totalsForCourseOnly(helper.courseSubtotal(), shipping);
    const set = (label, value, negative = false) => {
      const row = helper.summaryRow(page, label);
      const strong = row?.querySelector('strong');
      if (!strong) return;
      strong.textContent = negative ? `− ${helper.money(value)}` : shipping === 0 && label === 'Fulfillment' ? 'Free' : helper.money(value);
    };
    set('Subtotal', totals.subtotal);
    set('Student discount', totals.discount, true);
    set('Fulfillment', shipping);
    set('Estimated state tax', totals.tax);
    set('Processing fee', totals.fee);
    set('Grand total', totals.total);
    page.dataset.demoCombinedTotal = String(Math.round(totals.total * 100) / 100);
    window.dispatchEvent(new Event('resize'));
  }

  function addCourseItemsToOrder(order, courseItems, total) {
    if (!order || !Array.isArray(order.items)) return;
    const seen = new Set(order.items.map(item => Number(item.id)));
    courseItems.forEach(item => {
      if (!seen.has(item.id)) order.items.push({ id:item.id, name:item.name, price:item.price, quantity:item.quantity });
    });
    order.total = Math.round(Number(total || order.total || 0) * 100) / 100;
  }

  function storeCourseOnlyOrder(items, total) {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey()) || '{}');
      const orders = Array.isArray(saved.orders) ? saved.orders : [];
      orders.unshift({
        id:`CB-${Date.now().toString(36).toUpperCase()}`,
        createdLabel:new Date().toLocaleString(),
        fulfillment:$('[data-demo-course-fulfillment]')?.value === 'shipping' ? 'shipping' : 'pickup',
        email:email(),
        total:Math.round(Number(total || 0) * 100) / 100,
        items:items.map(item => ({ id:item.id, name:item.name, price:item.price, quantity:item.quantity }))
      });
      localStorage.setItem(storeKey(), JSON.stringify({ ...saved, orders }));
    } catch {}
  }

  function patchLatestNativeOrder(items, total) {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey()) || '{}');
      const orders = Array.isArray(saved.orders) ? saved.orders : [];
      if (!orders.length) return;
      addCourseItemsToOrder(orders[0], items, total);
      localStorage.setItem(storeKey(), JSON.stringify({ ...saved, orders }));
    } catch {}
  }

  function renderCourseSuccess(total) {
    const helper = api();
    const root = $('[data-bookstore-ui-v1]');
    const main = root?.querySelector('.cb-main-scroll');
    if (!helper || !main) return;
    main.innerHTML = `<section class="cb-page"><div class="cb-placeholder-heading"><p>Campus Bookstore</p><h1>Purchase complete</h1><span>Your Buddy completed this order with the linked Campus Wallet.</span></div><div class="cb-empty-state account"><h2>Order confirmed</h2><p>${helper.money(total)} was processed through the shared demo wallet.</p><button type="button" data-demo-course-return-shop>Return to Shop</button></div></section>`;
    const title = $('#campusAppsTitle');
    if (title) title.textContent = 'bookstore.campus.local/orders';
  }

  document.addEventListener('click', event => {
    const helper = api();
    if (!helper) return;

    const courseCheckout = event.target.closest?.('[data-demo-course-only-checkout]');
    if (courseCheckout) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderCourseOnlyCheckout();
      return;
    }

    const back = event.target.closest?.('[data-demo-course-checkout-back]');
    if (back) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $('[data-bookstore-ui-v1] [data-cb-section="shop"]')?.click();
      setTimeout(() => $('[data-bookstore-ui-v1] [data-cb-cart-open]')?.click(), 0);
      return;
    }

    const returnShop = event.target.closest?.('[data-demo-course-return-shop]');
    if (returnShop) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $('[data-bookstore-ui-v1] [data-cb-section="shop"]')?.click();
      return;
    }

    const place = event.target.closest?.('[data-bookstore-ui-v1] .cb-place-order');
    if (!place || !helper.courseCount()) return;
    const page = place.closest('.cb-checkout-page');
    const items = helper.courseItems();
    const total = helper.parseMoney(helper.summaryRow(page, 'Grand total')?.querySelector('strong')?.textContent);
    const courseOnly = page?.hasAttribute('data-demo-course-only-checkout');

    setTimeout(() => {
      if (place.dataset.cbWalletCommitted !== '1') return;
      if (courseOnly) {
        storeCourseOnlyOrder(items, total);
        helper.clearCourseCart();
        renderCourseSuccess(total);
      } else {
        patchLatestNativeOrder(items, total);
        helper.clearCourseCart();
      }
    }, 0);

    if (courseOnly) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('change', event => {
    const select = event.target.closest?.('[data-demo-course-fulfillment]');
    if (!select) return;
    recalcCourseOnly(select);
  }, true);
})();
