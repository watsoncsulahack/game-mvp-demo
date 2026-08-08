(() => {
  'use strict';

  const { escapeHtml, capitalize } = window.CampusBuddyCore;

  function panelData(state, name) {
    const buddy = escapeHtml(state.buddy.name);
    return ({
      agenda: ['Agenda','Today',`<div class="panel-grid"><article><h3>3:30 PM · Study block</h3><p>Review the project outline with ${buddy}.</p></article><article><h3>6:30 PM · Team demo</h3><p>Show Home, Explorer Mode, and the synchronized Buddy state.</p></article></div>`],
      journal: ['Journal','Local history','<div class="panel-grid"><article><h3>Move-in day</h3><p>Chose a dorm, initialized the Buddy, and tested two views of one room state.</p></article><article><h3>Privacy</h3><p>Entries remain local in this demonstration.</p></article></div>'],
      collection: ['Collection','Owned items',`<div class="panel-grid"><article><h3>Buddy appearance</h3><p>${buddy}'s current appearance is shared across every mode.</p></article><article><h3>Move-in Photo</h3><p>A future collectible for the corkboard.</p></article></div>`],
      customize: ['Customize','Buddy appearance',`<div class="panel-grid"><article><h3>${buddy}</h3><p>${capitalize(state.buddy.disposition)} disposition. Use onboarding to change appearance in this MVP.</p></article></div>`],
      campusweb: ['Campus Web','Embedded applications',`<div class="panel-grid"><article><h3>Campus Wallet</h3><p>Local balance: ${state.wallet} SHARK.</p></article><article><h3>Future integrations</h3><p>Bookstore and campus services remain intentionally deferred.</p></article></div>`]
    })[name] || ['Buddy','Panel',''];
  }

  function consoleToolMarkup(state, tool) {
    const buddy = escapeHtml(state.buddy.name);
    return ({
      talk: `<div class="console-tool-card"><h2>Talk</h2><p>Tap MIC and speak. In this prototype, ${buddy} acknowledges a sample request.</p><button class="button primary" data-console-sample>Ask about today</button></div>`,
      brief: `<div class="console-tool-card"><h2>Daily Brief</h2><p>You have a study block at 3:30 PM and a team demo at 6:30 PM.</p></div>`,
      wallet: `<div class="console-tool-card"><h2>Wallet</h2><div class="console-balance">${state.wallet} SHARK</div><p>${buddy} cannot spend without permission.</p></div>`,
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
