(() => {
  'use strict';

  const version = '20260812-13';
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
    ['campus-app-runtime', 'styles/campus-app-runtime.css'],
    ['buddy-demo-runtime', 'styles/buddy-demo-runtime.css'],
    ['demo-refinement', 'styles/demo-refinement.css'],
    ['demo-regression-fix', 'styles/demo-regression-fix.css'],
    ['demo-regression-fix-v2', 'styles/demo-regression-fix-v2.css'],
    ['demo-storefront-cleanup', 'styles/demo-storefront-cleanup.css']
  ];

  styles.forEach(([name, href]) => {
    if (document.querySelector(`link[data-${name}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=${version}`;
    link.setAttribute(`data-${name}`, '');
    document.head.appendChild(link);
  });

  function loadScript(marker, src) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=${version}`;
    script.async = false;
    script.setAttribute(marker, '');
    document.head.appendChild(script);
  }

  loadScript('data-campus-email-qr', 'src/campus-email-qr.js');
  loadScript('data-campus-bookstore-v1', 'src/campus-bookstore-integration.js');
  loadScript('data-campus-bookstore-selection', 'src/campus-bookstore-selection.js');
  loadScript('data-campus-bookstore-parity', 'src/campus-bookstore-parity.js');
  loadScript('data-demo-checkout-edge-fix', 'src/demo-checkout-edge-fix.js');
  loadScript('data-demo-storefront-cleanup', 'src/demo-storefront-cleanup.js');
  loadScript('data-campus-bookstore-wallet-checkout', 'src/campus-bookstore-wallet-checkout-v2.js');
  loadScript('data-campus-faucet-v4', 'src/campus-faucet-integration-v4.js');
  loadScript('data-campus-app-runtime', 'src/campus-app-runtime.js');
  loadScript('data-buddy-demo-runtime', 'src/buddy-demo-runtime.js');
  loadScript('data-demo-refinement', 'src/demo-refinement.js');
  loadScript('data-demo-bookstore-postflight', 'src/demo-bookstore-postflight.js');
})();