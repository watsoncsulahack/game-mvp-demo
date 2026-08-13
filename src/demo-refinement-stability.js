(() => {
  'use strict';

  const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (!text?.get || !text?.set) return;

  function patchCartBadges() {
    document.querySelectorAll('[data-bookstore-ui-v1] .cb-cart-button b').forEach(badge => {
      if (badge.dataset.demoIdempotentText === '1') return;
      badge.dataset.demoIdempotentText = '1';
      Object.defineProperty(badge, 'textContent', {
        configurable:true,
        get() { return text.get.call(this); },
        set(value) {
          const next = String(value);
          if (text.get.call(this) === next) return;
          text.set.call(this, next);
        }
      });
    });
  }

  function start() {
    const shell = document.querySelector('#campusAppsShell');
    if (shell) new MutationObserver(patchCartBadges).observe(shell, { childList:true, subtree:true });
    patchCartBadges();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();