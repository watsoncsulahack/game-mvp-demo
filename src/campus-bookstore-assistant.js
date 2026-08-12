(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const STORE_KEY_PREFIX = 'campus-buddy.bookstore-ui.v1:';
  const PRODUCTS = Object.freeze({
    1:{ id:1, name:'Introduction to Design', price:38 },
    3:{ id:3, name:'Reusable Study Tumbler', price:24 },
    7:{ id:7, name:'Foundations of Computing', price:54 },
    9:{ id:9, name:'Semester Student Planner', price:14 },
    25:{ id:25, name:'Academic Writing Handbook', price:31 },
    29:{ id:29, name:'Data Structures in Practice', price:59 }
  });

  let open = false;
  let messages = [];

  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);

  function session() { return window.CampusUnifiedApps?.getSession?.() || null; }

  function persistSession(value) {
    if (!value?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${String(value.email).toLowerCase()}`, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed',{detail:{session:value}}));
  }

  function productCards(ids, { buyNow=true } = {}) {
    return `<div class="cb-ai-products">${ids.map(id => PRODUCTS[id]).filter(Boolean).map(product => `<article><div><b>${esc(product.name)}</b><span>${money(product.price)}</span></div><div><button type="button" data-cb-ai-add="${product.id}">Add to cart</button>${buyNow ? `<button class="primary" type="button" data-cb-ai-buy="${product.id}">Buy now</button>` : ''}</div></article>`).join('')}</div>`;
  }

  function defaultMessages() {
    const buddy = window.CampusBuddyState?.buddy?.name || 'Buddy';
    return [{ role:'buddy', html:`Hey — I’m ${esc(buddy)}. I can help with the bookstore, your linked Campus Wallet, or a few demo shopping tasks.` }];
  }

  function push(role, html) {
    messages.push({role, html});
    renderPanel();
  }

  function answer(prompt) {
    push('user', esc(prompt));
    if (prompt === 'textbooks') {
      push('buddy', `For the demo schedule, I found two course books that make sense to pick up now.${productCards([7,29])}`);
      return;
    }
    if (prompt === 'wallet') {
      const value = session();
      const usd = Number(value?.balances?.USD ?? value?.balance ?? 0) || 0;
      const beach = Number(value?.balances?.BEACH ?? 0) || 0;
      push('buddy', `Your Campus Wallet currently has <strong>${money(usd)} USD</strong> and <strong>${beach.toLocaleString('en-US',{maximumFractionDigits:2})} BEACH</strong>. At the demo 1:1 rate, that is <strong>${money(usd+beach)}</strong> total value.`);
      return;
    }
    push('buddy', `I’d prioritize something useful for class plus one everyday item.${productCards([9,3,25])}`);
  }

  function panelMarkup() {
    const body = messages.map(message => `<div class="cb-ai-message ${message.role}"><span>${message.role === 'buddy' ? (window.CampusBuddyState?.buddy?.name || 'Buddy') : 'You'}</span><div>${message.html}</div></div>`).join('');
    return `<button class="cb-ai-scrim" type="button" data-cb-ai-close aria-label="Close AI Assistant"></button><aside class="cb-ai-panel" aria-label="Bookstore Buddy Assistant"><header><div><small>Campus Buddy</small><h2>Bookstore Assistant</h2></div><button type="button" data-cb-ai-close aria-label="Close assistant">×</button></header><div class="cb-ai-thread">${body}</div><div class="cb-ai-prompts"><button type="button" data-cb-ai-prompt="textbooks">What textbooks do I need?</button><button type="button" data-cb-ai-prompt="wallet">How much money is in my wallet?</button><button type="button" data-cb-ai-prompt="recommend">What should I buy?</button></div></aside>`;
  }

  function renderPanel() {
    const root = $('[data-bookstore-ui-v1]');
    if (!root) return;
    root.querySelectorAll('.cb-ai-panel,.cb-ai-scrim').forEach(node => node.remove());
    if (!open) return;
    root.insertAdjacentHTML('beforeend', panelMarkup());
    const thread = $('.cb-ai-thread',root);
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  function openPanel() {
    if (!messages.length) messages = defaultMessages();
    open = true;
    renderPanel();
  }

  function closePanel() {
    open = false;
    renderPanel();
  }

  function addToCart(id) {
    const root = $('[data-bookstore-ui-v1]');
    if (!root) return;

    const findButton = () => document.querySelector(`[data-bookstore-ui-v1] [data-cb-add="${id}"]`);
    const finish = () => {
      const button = findButton();
      if (button) {
        button.click();
        open = false;
        return true;
      }
      return false;
    };
    const clearAndRetry = () => {
      if (finish()) return;
      const clear = document.querySelector('[data-bookstore-ui-v1] [data-cb-clear-filters]');
      if (clear) {
        clear.click();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!finish()) push('buddy', 'I could not surface that product in the current storefront view. Try opening Shop and clearing the active filters.');
        }));
      } else {
        push('buddy', 'I could not surface that product in the current storefront view. Try opening Shop first.');
      }
    };

    if (finish()) return;
    const shop = root.querySelector('[data-cb-section="shop"]');
    if (shop) {
      shop.click();
      requestAnimationFrame(() => requestAnimationFrame(clearAndRetry));
    } else clearAndRetry();
  }

  function storeAssistantOrder(value, product) {
    const key = `${STORE_KEY_PREFIX}${String(value.email).toLowerCase()}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const orders = Array.isArray(saved.orders) ? saved.orders : [];
      orders.unshift({
        id:`AI-${Date.now().toString(36).toUpperCase()}`,
        createdLabel:new Date().toLocaleString(),
        fulfillment:'pickup',
        email:value.email,
        total:product.price,
        items:[{id:product.id,name:product.name,price:product.price,quantity:1}]
      });
      localStorage.setItem(key, JSON.stringify({ ...saved, orders }));
    } catch {}
  }

  function buyNow(id) {
    const product = PRODUCTS[id];
    const value = session();
    if (!product || !value) return;
    if (!value.balances || typeof value.balances !== 'object') value.balances = { USD:Number(value.balance)||500, BEACH:0 };
    const usd = Number(value.balances.USD) || 0;
    if (usd < product.price) {
      push('buddy', `You need ${money(product.price)} USD for ${esc(product.name)}, but your USD balance is ${money(usd)}. You can swap BEACH to USD in Campus Wallet first.`);
      return;
    }
    value.balances.USD = Math.round((usd - product.price) * 100) / 100;
    value.balance = value.balances.USD;
    if (!Array.isArray(value.transactions)) value.transactions = [];
    value.transactions.unshift({
      id:`TX-${Date.now().toString(36).toUpperCase()}`,
      amount:-product.price,
      currency:'USD',
      label:`Campus Bookstore · ${product.name}`,
      at:new Date().toLocaleString(),
      createdAt:Date.now(),
      kind:'purchase',
      merchant:'Campus Bookstore',
      source:'Bookstore Buddy Assistant'
    });
    storeAssistantOrder(value, product);
    persistSession(value);
    push('buddy', `Done. I bought <strong>${esc(product.name)}</strong> for <strong>${money(product.price)}</strong> using the linked Campus Wallet. Your new USD balance is <strong>${money(value.balances.USD)}</strong>.`);
  }

  document.addEventListener('click', event => {
    const ai = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-ai]');
    if (ai) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPanel();
      return;
    }
    const close = event.target.closest?.('[data-cb-ai-close]');
    if (close) { event.preventDefault(); closePanel(); return; }
    const prompt = event.target.closest?.('[data-cb-ai-prompt]');
    if (prompt) { answer(prompt.dataset.cbAiPrompt); return; }
    const add = event.target.closest?.('[data-cb-ai-add]');
    if (add) { addToCart(Number(add.dataset.cbAiAdd)); return; }
    const buy = event.target.closest?.('[data-cb-ai-buy]');
    if (buy) { buyNow(Number(buy.dataset.cbAiBuy)); }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePanel();
    }
  }, true);

  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(() => {
      if (!open) return;
      const title = $('#campusAppsTitle')?.textContent || '';
      if (!title.includes('bookstore')) { open = false; return; }
      if (!$('.cb-ai-panel')) renderPanel();
    }).observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
