(() => {
  'use strict';
  if (!document.querySelector('link[data-campus-currencies-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/campus-currencies.css';
    link.dataset.campusCurrenciesStyle = '';
    document.head.appendChild(link);
  }
  if (document.querySelector('script[data-campus-faucet-v3]')) return;
  const script = document.createElement('script');
  script.src = 'src/campus-faucet-integration-v3.js';
  script.dataset.campusFaucetV3 = '';
  document.head.appendChild(script);
})();
