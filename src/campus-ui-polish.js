(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const $ = (selector, root = document) => root.querySelector(selector);
  let frame = 0;
  let instantClaimBusy = false;

  function session() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function persist(value) {
    if (!value?.email) return;
    const email = String(value.email).trim().toLowerCase();
    try { localStorage.setItem(`${SESSION_PREFIX}${email}`, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session:value } }));
  }

  function setText(element, text) {
    if (!element) return;
    const next = String(text);
    if (element.textContent !== next) element.textContent = next;
  }

  function toast(text) {
    const target = $('#toast');
    if (!target) return;
    setText(target, text);
    target.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { target.hidden = true; }, 2200);
  }

  function syncHairColorControl() {
    const field = $('#hairColorField');
    const range = $('#hairHue');
    if (!field || !range) return;
    const noneSelected = Boolean(document.querySelector('[data-hair="none"].active'));
    if (field.hidden) field.hidden = false;
    if (range.disabled !== noneSelected) range.disabled = noneSelected;
    field.classList.toggle('is-disabled', noneSelected);
    field.setAttribute('aria-disabled', String(noneSelected));
  }

  function polishOnboarding() {
    const name = $('#buddyName');
    if (name && !name.dataset.campusDefaultConfirmed) {
      if (!name.value.trim() || name.value.trim().toLowerCase() === 'mika') name.value = 'Mika';
      name.dataset.campusDefaultConfirmed = 'true';
    }
    syncHairColorControl();
  }

  const QR_SIZE = 33;
  const QR_DATA_CODEWORDS = 80;
  const QR_ECC_CODEWORDS = 20;

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i -= 1) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsDivisor(degree) {
    const result = Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < result.length; j += 1) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    const result = Array(divisor.length).fill(0);
    data.forEach(byte => {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i += 1) result[i] ^= gfMul(divisor[i], factor);
    });
    return result;
  }

  function qrCodewords(text) {
    const bytes = [...new TextEncoder().encode(String(text))];
    if (bytes.length > 78) throw new Error('Email is too long for the demo QR code.');
    const bits = [];
    const append = (value, length) => {
      for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    };
    append(0x4, 4);
    append(bytes.length, 8);
    bytes.forEach(byte => append(byte, 8));
    const capacity = QR_DATA_CODEWORDS * 8;
    for (let i = 0; i < Math.min(4, capacity - bits.length); i += 1) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let offset = 0; offset < bits.length; offset += 8) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += 1) byte = (byte << 1) | (bits[offset + bit] || 0);
      data.push(byte);
    }
    let pad = 0;
    while (data.length < QR_DATA_CODEWORDS) data.push((pad++ & 1) ? 0x11 : 0xEC);
    return data.concat(rsRemainder(data, rsDivisor(QR_ECC_CODEWORDS)));
  }

  function qrMatrix(text) {
    const size = QR_SIZE;
    const modules = Array.from({ length:size }, () => Array(size).fill(false));
    const functions = Array.from({ length:size }, () => Array(size).fill(false));
    const setFunction = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      modules[y][x] = Boolean(dark);
      functions[y][x] = true;
    };
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(x, y, distance !== 2 && distance !== 4);
        }
      }
    };
    const alignment = (cx, cy) => {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    };
    const drawFormat = mask => {
      const data = (1 << 3) | mask;
      let remainder = data;
      for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
      const format = ((data << 10) | remainder) ^ 0x5412;
      const bit = index => ((format >>> index) & 1) !== 0;
      for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(i));
      setFunction(8, 7, bit(6));
      setFunction(8, 8, bit(7));
      setFunction(7, 8, bit(8));
      for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, bit(i));
      setFunction(8, size - 8, true);
    };

    for (let i = 0; i < size; i += 1) {
      setFunction(6, i, i % 2 === 0);
      setFunction(i, 6, i % 2 === 0);
    }
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    alignment(26, 26);
    drawFormat(0);

    const codewords = qrCodewords(text);
    let bitIndex = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < size; vertical += 1) {
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        for (let column = 0; column < 2; column += 1) {
          const x = right - column;
          if (functions[y][x] || bitIndex >= codewords.length * 8) continue;
          let dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          if ((x + y) % 2 === 0) dark = !dark;
          modules[y][x] = dark;
          bitIndex += 1;
        }
      }
    }
    drawFormat(0);
    return modules;
  }

  function qrSvg(text) {
    const matrix = qrMatrix(text);
    const quiet = 4;
    const size = matrix.length + quiet * 2;
    let path = '';
    matrix.forEach((row, y) => row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
    }));
    return `<svg class="cw-email-qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for ${String(text).replace(/[&<>\"]/g, '')}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#18202c"/></svg>`;
  }

  function normalizeDemoNetwork(scope) {
    if (!scope) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const current = node.nodeValue || '';
      const next = current.replace(/\bDemo network\b/g, 'Demo Network');
      if (next !== current) node.nodeValue = next;
    });
  }

  function receiveQrMarkup(value) {
    const email = String(value?.email || 'student@university.edu').trim().toLowerCase();
    let qr = '';
    try { qr = qrSvg(email); } catch { qr = '<div class="cw-email-qr-fallback" aria-hidden="true">QR</div>'; }
    return `<span class="cw-metric-label">Receive by email</span>
      <div class="cw-qr-wrap">${qr}</div>
      <strong class="cw-qr-email">${email.replace(/[&<>\"]/g, '')}</strong>
      <p class="cw-qr-help">Scan to use this student email as the recipient in Campus Wallet.</p>
      <div class="cw-button-row"><button class="cw-button secondary" type="button" data-wallet-route="overview">Done</button></div>`;
  }

  function polishWallet(scope, value) {
    if (!scope || !value) return;

    const wordmark = $('.cw-wordmark', scope);
    if (wordmark) {
      wordmark.removeAttribute('data-wallet-route');
      wordmark.setAttribute('data-wallet-menu', '');
      wordmark.setAttribute('aria-label', 'Toggle wallet navigation');
      const sidebarOpen = Boolean($('.cw-sidebar.open', scope));
      wordmark.setAttribute('aria-expanded', String(sidebarOpen));
      wordmark.querySelector('small')?.remove();
    }
    $('.cw-mobile-menu', scope)?.setAttribute('hidden', '');

    const identity = $('.cw-identity-button', scope);
    if (identity) {
      identity.querySelector('small')?.remove();
      identity.setAttribute('title', String(value.email || 'Campus account'));
    }

    $('.cw-sidebar-footer', scope)?.remove();

    scope.querySelectorAll('.cw-quick-actions button').forEach(button => {
      button.querySelector('small')?.remove();
      const arrow = button.querySelector(':scope > strong');
      arrow?.remove();
      const label = button.querySelector('b')?.textContent?.trim();
      if (label) button.setAttribute('aria-label', label);
    });

    scope.querySelectorAll('.cw-empty-state').forEach(empty => {
      empty.querySelector('.cw-fund-button')?.remove();
      const paragraph = empty.querySelector('p');
      if (paragraph && /faucet|test funds/i.test(paragraph.textContent || '')) setText(paragraph, 'Wallet activity will appear here after you send, receive, swap, or make a purchase.');
    });

    const receive = $('[data-wallet-view="receive"]', scope);
    const detail = receive?.querySelector('.cw-detail-card');
    if (detail && detail.dataset.walletEmailQr !== String(value.email || '')) {
      detail.dataset.walletEmailQr = String(value.email || '');
      detail.innerHTML = receiveQrMarkup(value);
      const headingCopy = receive.querySelector('.cw-page-heading p');
      setText(headingCopy, 'Share your student email with a scannable QR code.');
    }

    normalizeDemoNetwork(scope);
  }

  function accountAvatarMarkup() {
    return '<span class="cf-account-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18c1.8-2.6 4-3.9 7-3.9s5.2 1.3 7 3.9M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></span>';
  }

  function polishFaucet(scope, value) {
    if (!scope || !value) return;
    const separateMenu = $('.cf-menu-button', scope);
    if (separateMenu) separateMenu.hidden = true;

    const brand = $('.cf-brand', scope);
    if (brand) {
      brand.removeAttribute('data-cf-home');
      brand.setAttribute('data-cf-menu', '');
      brand.setAttribute('aria-label', 'Toggle Faucet navigation');
      brand.setAttribute('aria-expanded', String(Boolean($('.cf-drawer.open', scope))));
    }

    const account = $('.cf-account-button', scope);
    if (account && account.dataset.identityPolished !== 'true') {
      account.dataset.identityPolished = 'true';
      account.innerHTML = `${accountAvatarMarkup()}<span class="cf-account-email">${String(value.email || '').replace(/[&<>\"]/g, '')}</span>`;
    }
    normalizeDemoNetwork(scope);
  }

  function completeFaucetClaimInstantly(event) {
    const confirm = event.target.closest?.('[data-cf-confirm]');
    if (!confirm || instantClaimBusy) return;
    const scope = confirm.closest('[data-faucet-ui-v4]');
    if (!scope) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const value = session();
    if (!value || value.faucetBeachClaimed) return;
    instantClaimBusy = true;
    try {
      if (!value.balances || typeof value.balances !== 'object') value.balances = { USD:Number(value.balance) || 500, BEACH:0 };
      if (!Array.isArray(value.transactions)) value.transactions = [];
      if (!Array.isArray(value.faucetClaims)) value.faucetClaims = [];
      const amount = 100;
      value.balances.BEACH = Math.round((Number(value.balances.BEACH || 0) + amount) * 100) / 100;
      value.faucetBeachClaimed = true;
      const transactionId = `TX-${Date.now().toString(36).toUpperCase()}`;
      const claimedAt = new Date().toLocaleString();
      value.transactions.unshift({
        id:transactionId,
        amount,
        currency:'BEACH',
        usdValue:amount,
        label:'Campus Faucet · 100 Free BEACH',
        at:claimedAt,
        createdAt:Date.now(),
        kind:'received',
        source:'Campus Faucet',
        dropId:'welcome-beach-100'
      });
      value.faucetClaims.unshift({
        dropId:'welcome-beach-100',
        name:'100 Free BEACH',
        amount,
        currency:'BEACH',
        claimedAt,
        transactionId
      });
      persist(value);

      const review = $('[data-cf-review]', scope);
      const status = $('[data-cf-status]', scope);
      if (review) review.hidden = true;
      if (status) status.hidden = false;
      const icon = $('[data-cf-status-icon]', scope);
      if (icon) { icon.className = 'cf-spinner complete'; setText(icon, '✓'); }
      setText($('[data-cf-status-title]', scope), 'Claim complete');
      setText($('[data-cf-status-message]', scope), '100 BEACH was added to your Campus Wallet.');
      const progress = $('[data-cf-progress]', scope); if (progress) progress.hidden = true;
      const wait = $('[data-cf-status-wait]', scope); if (wait) wait.hidden = true;
      const receipt = $('[data-cf-receipt]', scope); if (receipt) receipt.hidden = false;
      setText($('[data-cf-new-balance]', scope), `${Number(value.balances.BEACH).toLocaleString('en-US', { maximumFractionDigits:2 })} BEACH`);
      setText($('[data-cf-transaction]', scope), transactionId);
      const actions = $('[data-cf-complete-actions]', scope); if (actions) actions.hidden = false;
      toast('100 BEACH added to Campus Wallet.');
    } finally {
      instantClaimBusy = false;
    }
  }

  function currentCampusView() {
    const title = $('#campusAppsTitle')?.textContent || '';
    if (title.includes('wallet')) return 'wallet';
    if (title.includes('faucet')) return 'faucet';
    return 'other';
  }

  function syncCampusApps() {
    const shell = $('#campusAppsShell');
    const content = $('#campusAppsContent');
    if (!shell || shell.hidden || !content) return;
    const value = session();
    const view = currentCampusView();
    if (view === 'wallet') polishWallet(content, value);
    if (view === 'faucet') polishFaucet(content, value);
  }

  function sync() {
    frame = 0;
    polishOnboarding();
    syncCampusApps();
  }

  function queueSync() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-hair]')) requestAnimationFrame(syncHairColorControl);
  });
  document.addEventListener('click', completeFaucetClaimInstantly, true);

  function start() {
    const hairField = $('#hairColorField');
    if (hairField) new MutationObserver(queueSync).observe(hairField, { attributes:true, attributeFilter:['hidden'] });
    const shell = $('#campusAppsShell');
    if (shell) new MutationObserver(queueSync).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('campus-session-changed', queueSync);
    queueSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();