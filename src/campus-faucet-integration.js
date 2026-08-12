(() => {
  'use strict';

  const styles = [
    ['campus-currencies', 'styles/campus-currencies.css'],
    ['campus-faucet-drops', 'styles/campus-faucet-drops.css'],
    ['campus-faucet-cards', 'styles/campus-faucet-cards.css'],
    ['campus-swap', 'styles/campus-swap.css'],
    ['campus-bookstore', 'styles/campus-bookstore.css'],
    ['campus-bookstore-catalog', 'styles/campus-bookstore-catalog.css'],
    ['campus-bookstore-overlays', 'styles/campus-bookstore-overlays.css'],
    ['campus-bookstore-responsive', 'styles/campus-bookstore-responsive.css'],
    ['campus-bookstore-selection', 'styles/campus-bookstore-selection.css'],
    ['campus-bookstore-parity', 'styles/campus-bookstore-parity.css'],
    ['campus-bookstore-wallet-checkout', 'styles/campus-bookstore-wallet-checkout.css'],
    ['campus-bookstore-assistant', 'styles/campus-bookstore-assistant.css'],
    ['campus-app-runtime', 'styles/campus-app-runtime.css'],
    ['buddy-demo-runtime', 'styles/buddy-demo-runtime.css']
  ];

  styles.forEach(([name, href]) => {
    if (document.querySelector(`link[data-${name}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${name}`, '');
    document.head.appendChild(link);
  });

  function loadScript({ marker, src, next }) {
    const existing = document.querySelector(`script[${marker}]`);
    if (existing) {
      if (typeof next === 'function') next();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute(marker, '');
    if (typeof next === 'function') script.addEventListener('load', next, { once:true });
    document.head.appendChild(script);
  }

  function loadRuntime() {
    loadScript({ marker:'data-campus-email-qr', src:'src/campus-email-qr.js', next:() =>
      loadScript({ marker:'data-campus-app-runtime', src:'src/campus-app-runtime.js', next:() =>
        loadScript({ marker:'data-buddy-demo-runtime', src:'src/buddy-demo-runtime.js' })
      })
    });
  }

  function loadAssistant() {
    loadScript({ marker:'data-campus-bookstore-assistant', src:'src/campus-bookstore-assistant.js' });
  }

  function loadBookstoreCheckout() {
    loadScript({ marker:'data-campus-bookstore-wallet-checkout', src:'src/campus-bookstore-wallet-checkout.js', next:loadAssistant });
  }

  function loadBookstoreParity() {
    loadScript({ marker:'data-campus-bookstore-parity', src:'src/campus-bookstore-parity.js', next:loadBookstoreCheckout });
  }

  function loadBookstoreSelection() {
    loadScript({ marker:'data-campus-bookstore-selection', src:'src/campus-bookstore-selection.js', next:loadBookstoreParity });
  }

  function loadBookstore() {
    loadScript({ marker:'data-campus-bookstore-v1', src:'src/campus-bookstore-integration.js', next:loadBookstoreSelection });
  }

  loadBookstore();
  loadScript({ marker:'data-campus-faucet-v4', src:'src/campus-faucet-integration-v4.js', next:loadRuntime });
})();
