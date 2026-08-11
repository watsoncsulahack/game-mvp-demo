(() => {
  'use strict';
  const styles = [
    ['campus-faucet-drops', 'styles/campus-faucet-drops.css'],
    ['campus-faucet-cards', 'styles/campus-faucet-cards.css'],
    ['campus-swap', 'styles/campus-swap.css']
  ];
  styles.forEach(([name, href]) => {
    if (document.querySelector(`link[data-${name}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${name}`, '');
    document.head.appendChild(link);
  });
  if (document.querySelector('script[data-campus-faucet-v4]')) return;
  const script = document.createElement('script');
  script.src = 'src/campus-faucet-integration-v4.js';
  script.dataset.campusFaucetV4 = '';
  document.head.appendChild(script);
})();
