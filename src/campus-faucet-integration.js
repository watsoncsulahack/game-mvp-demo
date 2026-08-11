(() => {
  'use strict';

  const styles = [
    ['campus-currencies', 'styles/campus-currencies.css'],
    ['campus-faucet-drops', 'styles/campus-faucet-drops.css'],
    ['campus-faucet-cards', 'styles/campus-faucet-cards.css'],
    ['campus-swap', 'styles/campus-swap.css'],
    ['campus-wallet-balance-fix', 'styles/campus-wallet-balance-fix.css']
  ];

  styles.forEach(([name, href]) => {
    if (document.querySelector(`link[data-${name}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${name}`, '');
    document.head.appendChild(link);
  });

  function loadBalanceFix() {
    if (document.querySelector('script[data-campus-wallet-balance-fix]')) return;
    const script = document.createElement('script');
    script.src = 'src/campus-wallet-balance-fix.js';
    script.async = false;
    script.dataset.campusWalletBalanceFix = '';
    document.head.appendChild(script);
  }

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
