(() => {
  'use strict';

  const { escapeHtml } = window.CampusBuddyCore;

  function sharedWallet() {
    const session = window.CampusUnifiedApps?.getSession?.() || null;
    const usd = Number(session?.balances?.USD ?? session?.balance ?? 0) || 0;
    const beach = Number(session?.balances?.BEACH ?? 0) || 0;
    return { session, usd, beach, total:usd + beach };
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  }

  function customizePanel(state) {
    const character = window.CampusBuddyCharacter;
    const selected = character.equippedLayers(state.buddy.appearance);
    const categories = { top:'Top', bottom:'Bottom', footwear:'Footwear' };
    const groups = character.LAYER_ORDER.map(category => `<section class="panel-wardrobe-category"><header><strong>${categories[category]}</strong><span>${character.CLOTHING_CATALOG[category][selected[category]].shortLabel}</span></header><div class="wardrobe-options">${Object.entries(character.CLOTHING_CATALOG[category]).map(([id,item]) => `<button class="wardrobe-option${selected[category]===id?' active':''}" type="button" data-panel-layer-category="${category}" data-layer-category="${category}" data-layer-id="${id}" aria-pressed="${selected[category]===id}"><span class="wardrobe-option-art">${character.renderLayerThumbnail(category,id)}</span><span class="wardrobe-option-copy"><strong>${item.shortLabel}</strong><small>${item.description}</small></span></button>`).join('')}</div></section>`).join('');
    return `<div class="panel-customize-layout">
      <section class="panel-turnaround" aria-label="Buddy turnaround">
        <div class="panel-turnaround-stage" data-customize-preview>${character.renderCharacter(state.buddy,{angle:0})}</div>
        <div class="panel-turnaround-controls"><button type="button" data-customize-rotate="-45" aria-label="Rotate Buddy left">‹</button><span data-customize-angle>Front · 1/8</span><button type="button" data-customize-rotate="45" aria-label="Rotate Buddy right">›</button></div>
      </section>
      <div class="panel-wardrobe"><div class="panel-wardrobe-intro"><div><strong>Change ${escapeHtml(state.buddy.name)}'s look</strong><p>Updates apply instantly in Home, dialogue, and the Buddy portrait.</p></div></div>${groups}</div>
    </div>`;
  }

  function panelData(state, name) {
    const buddy = escapeHtml(state.buddy.name);
    const wallet = sharedWallet();
    return ({
      agenda: ['Agenda','Today',`<div class="panel-grid"><article><h3>3:30 PM · Study block</h3><p>Review the project outline with ${buddy}.</p></article><article><h3>6:30 PM · Team demo</h3><p>Show Home, Explorer Mode, and the synchronized Buddy state.</p></article></div>`],
      journal: ['Journal','Local history','<div class="panel-grid"><article><h3>Move-in day</h3><p>Chose a dorm, initialized the Buddy, and tested two views of one room state.</p></article><article><h3>Privacy</h3><p>Entries remain local in this demonstration.</p></article></div>'],
      collection: ['Collection','Owned items',`<div class="panel-grid"><article><h3>Buddy appearance</h3><p>${buddy}'s current appearance is shared across every mode.</p></article><article><h3>Move-in Photo</h3><p>A future collectible for the corkboard.</p></article></div>`],
      customize: ['Customize','Buddy appearance',customizePanel(state)],
      campusweb: ['Campus Web','Embedded applications',`<div class="panel-grid"><article><h3>Campus Wallet</h3><p>${money(wallet.total)} total value · ${money(wallet.usd)} USD · ${wallet.beach.toLocaleString('en-US',{maximumFractionDigits:2})} BEACH.</p></article><article><h3>Connected services</h3><p>Wallet, Faucet, and Campus Bookstore share the same Buddy university email.</p></article></div>`]
    })[name] || ['Buddy','Panel',''];
  }

  function consoleToolMarkup(state, tool) {
    const buddy = escapeHtml(state.buddy.name);
    const wallet = sharedWallet();
    return ({
      talk: `<div class="console-tool-card"><h2>Talk</h2><p>Use the microphone button or a quick prompt to check in with ${buddy}.</p><button class="button primary" data-console-sample>Ask about today</button></div>`,
      brief: `<div class="console-tool-card"><h2>Daily Brief</h2><p>You have a study block at 3:30 PM and a team demo at 6:30 PM.</p></div>`,
      wallet: `<div class="console-tool-card"><h2>Wallet</h2><div class="console-wallet-total">${money(wallet.total)}</div><div class="console-wallet-rows"><span><b>USD</b><strong>${money(wallet.usd)}</strong></span><span><b>BEACH</b><strong>${wallet.beach.toLocaleString('en-US',{maximumFractionDigits:2})}</strong></span></div><p>This is the same balance used by Campus Wallet and Campus Bookstore.</p></div>`,
      calc: '<div class="console-tool-card"><h2>Calculator</h2><input id="consoleCalcInput" inputmode="decimal" placeholder="12 * 4"><button class="button primary" data-calculate>Calculate</button><strong id="consoleCalcResult" class="console-result"></strong></div>',
      focus: '<div class="console-tool-card"><h2>Focus</h2><p id="focusReadout" class="console-balance">25:00</p><button class="button primary" data-focus-start>Start 25-minute timer</button></div>'
    })[tool] || '';
  }

  function focusableElements(root) {
    return [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.offsetParent !== null);
  }

  function createModalManager() {
    const openers = new WeakMap();

    function open(modal, opener = document.activeElement) {
      openers.set(modal, opener);
      modal.hidden = false;
      const first = focusableElements(modal)[0];
      first?.focus();
    }

    function close(modal) {
      if (modal.hidden) return;
      modal.hidden = true;
      const opener = openers.get(modal);
      if (opener && document.contains(opener)) opener.focus();
    }

    function trap(event, modal) {
      if (event.key !== 'Tab' || modal.hidden) return;
      const elements = focusableElements(modal);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    return { open, close, trap };
  }

  window.CampusBuddyUI = Object.freeze({ panelData, consoleToolMarkup, createModalManager });
})();
