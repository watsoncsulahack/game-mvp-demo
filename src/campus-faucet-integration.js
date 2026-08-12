(() => {
  'use strict';

  const styles = [
    ['campus-currencies', 'styles/campus-currencies.css'],
    ['campus-faucet-drops', 'styles/campus-faucet-drops.css'],
    ['campus-faucet-cards', 'styles/campus-faucet-cards.css'],
    ['campus-swap', 'styles/campus-swap.css'],
    ['campus-wallet-balance-fix', 'styles/campus-wallet-balance-fix.css'],
    ['campus-bookstore', 'styles/campus-bookstore.css'],
    ['campus-bookstore-catalog', 'styles/campus-bookstore-catalog.css'],
    ['campus-bookstore-overlays', 'styles/campus-bookstore-overlays.css'],
    ['campus-bookstore-responsive', 'styles/campus-bookstore-responsive.css'],
    ['campus-bookstore-selection', 'styles/campus-bookstore-selection.css'],
    ['campus-bookstore-parity', 'styles/campus-bookstore-parity.css'],
    ['campus-bookstore-wallet-checkout', 'styles/campus-bookstore-wallet-checkout.css'],
    ['campus-ui-polish', 'styles/campus-ui-polish.css'],
    ['campus-ui-polish-v2', 'styles/campus-ui-polish-v2.css'],
    ['campus-drawer-grid-fix', 'styles/campus-drawer-grid-fix.css']
  ];

  styles.forEach(([name, href]) => {
    if (document.querySelector(`link[data-${name}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${name}`, '');
    document.head.appendChild(link);
  });

  function loadUiPolishV2() {
    if (document.querySelector('script[data-campus-ui-polish-v2]')) return;
    const script = document.createElement('script');
    script.src = 'src/campus-ui-polish-v2.js';
    script.async = false;
    script.dataset.campusUiPolishV2 = '';
    document.head.appendChild(script);
  }

  function loadUiPolish() {
    if (document.querySelector('script[data-campus-ui-polish]')) {
      loadUiPolishV2();
      return;
    }
    const script = document.createElement('script');
    script.src = 'src/campus-ui-polish.js';
    script.async = false;
    script.dataset.campusUiPolish = '';
    script.addEventListener('load', loadUiPolishV2, { once:true });
    document.head.appendChild(script);
  }

  function loadBookstoreWalletCheckout() {
    if (document.querySelector('script[data-campus-bookstore-wallet-checkout]')) return;
    const script = document.createElement('script');
    script.src = 'src/campus-bookstore-wallet-checkout.js';
    script.async = false;
    script.dataset.campusBookstoreWalletCheckout = '';
    document.head.appendChild(script);
  }

  function loadBookstoreParity() {
    if (document.querySelector('script[data-campus-bookstore-parity]')) {
      loadBookstoreWalletCheckout();
      return;
    }
    const script = document.createElement('script');
    script.src = 'src/campus-bookstore-parity.js';
    script.async = false;
    script.dataset.campusBookstoreParity = '';
    script.addEventListener('load', loadBookstoreWalletCheckout, { once:true });
    document.head.appendChild(script);
  }

  function loadBookstoreSelection() {
    if (document.querySelector('script[data-campus-bookstore-selection]')) {
      loadBookstoreParity();
      return;
    }
    const script = document.createElement('script');
    script.src = 'src/campus-bookstore-selection.js';
    script.async = false;
    script.dataset.campusBookstoreSelection = '';
    script.addEventListener('load', loadBookstoreParity, { once:true });
    document.head.appendChild(script);
  }

  function loadBookstore() {
    if (document.querySelector('script[data-campus-bookstore-v1]')) {
      loadBookstoreSelection();
      return;
    }
    const script = document.createElement('script');
    script.src = 'src/campus-bookstore-integration.js';
    script.async = false;
    script.dataset.campusBookstoreV1 = '';
    script.addEventListener('load', loadBookstoreSelection, { once:true });
    document.head.appendChild(script);
  }

  function loadBalanceFix() {
    if (document.querySelector('script[data-campus-wallet-balance-fix]')) {
      loadUiPolish();
      return;
    }
    const script = document.createElement('script');
    script.src = 'src/campus-wallet-balance-fix.js';
    script.async = false;
    script.dataset.campusWalletBalanceFix = '';
    script.addEventListener('load', loadUiPolish, { once:true });
    document.head.appendChild(script);
  }

  loadBookstore();

  if (document.querySelector('script[data-campus-faucet-v4]')) {
    loadBalanceFix();
    return;
  }

  const script = document.createElement('script');
  script.src = 'src/campus-faucet-integration-v4.js';
  script.async = false;
  script.dataset.campusFaucetV4 = '';
  script.addEventListener('load', loadBalanceFix, { once:true });
  document.head.appendChild(script);
})();