(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);

  function normalizeWardrobe() {
    document.querySelectorAll('.wardrobe-options').forEach(container => {
      if (container.querySelector(':scope > .demo-wardrobe-picker')) {
        container.dataset.demoPickerOnly = '1';
      }
    });
  }

  function normalizeBookstore() {
    const root = $('[data-bookstore-ui-v1]');
    if (!root) return;

    // The syllabus products stay assistant-owned. Do not insert a second storefront section.
    root.querySelectorAll('.demo-course-materials').forEach(section => {
      section.hidden = true;
      section.setAttribute('aria-hidden', 'true');
    });

    // If assistant-added course materials are present, keep the cart usable and visually
    // compatible with the original drawer instead of replacing the checkout affordance.
    const courseBlock = root.querySelector('[data-demo-course-cart-block]');
    if (courseBlock) {
      courseBlock.classList.add('demo-course-cart-native');
      const action = courseBlock.querySelector('[data-demo-course-buy-cart]');
      if (action && action.textContent !== 'Checkout') action.textContent = 'Checkout';
    }

    root.querySelectorAll('.cb-product-footer').forEach(footer => footer.removeAttribute('hidden'));
    root.querySelectorAll('.cb-stock,.cb-like-button').forEach(element => element.removeAttribute('hidden'));
  }

  let frame = 0;
  function queue() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      normalizeWardrobe();
      normalizeBookstore();
    });
  }

  function start() {
    const app = $('#app');
    if (app) new MutationObserver(queue).observe(app, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    queue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
