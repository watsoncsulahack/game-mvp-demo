(() => {
  'use strict';
  if (document.querySelector('script[data-campus-faucet-v3]')) return;
  const script = document.createElement('script');
  script.src = 'src/campus-faucet-integration-v3.js';
  script.dataset.campusFaucetV3 = '';
  document.head.appendChild(script);
})();
