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
  let mode = 'docked';
  let restoreMode = 'floating';
  let messages = [];
  let thinkingTimer = 0;
  let drag = null;
  let floatPosition = null;

  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);

  function session() { return window.CampusUnifiedApps?.getSession?.() || null; }
  function buddyName() { return window.CampusBuddyState?.buddy?.name || 'Buddy'; }

  function persistSession(value) {
    if (!value?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${String(value.email).toLowerCase()}`, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed',{detail:{session:value}}));
  }

  function avatarMarkup() {
    const character = window.CampusBuddyCharacter;
    const buddy = window.CampusBuddyState?.buddy;
    if (!character || !buddy) return '<span class="cb-ai-avatar-fallback">B</span>';
    return character.renderCharacter(buddy,{crop:'bust'});
  }

  function defaultMessages() {
    return [{ role:'buddy', html:`Hey — I’m ${esc(buddyName())}. I can help with the bookstore, your linked Campus Wallet, or a few demo shopping tasks.` }];
  }

  function productCards(ids, { buyNow=true, addAll=true } = {}) {
    const products = ids.map(id => PRODUCTS[id]).filter(Boolean);
    if (!products.length) return '';
    const all = addAll && products.length > 1
      ? `<button class="cb-ai-add-all" type="button" data-cb-ai-add-all="${products.map(product=>product.id).join(',')}">Add all to cart</button>`
      : '';
    return `<div class="cb-ai-products">${all}${products.map(product => `<article><div><b>${esc(product.name)}</b><span>${money(product.price)}</span></div><div><button type="button" data-cb-ai-add="${product.id}">Add to cart</button>${buyNow ? `<button class="primary" type="button" data-cb-ai-buy="${product.id}">Buy now</button>` : ''}</div></article>`).join('')}</div>`;
  }

  function messageMarkup(message) {
    const buddy = message.role === 'buddy';
    return `<div class="cb-ai-message ${message.role}">${buddy ? `<div class="cb-ai-avatar" aria-hidden="true">${avatarMarkup()}</div>` : ''}<div class="cb-ai-message-stack"><span>${buddy ? esc(buddyName()) : 'You'}</span><div class="cb-ai-bubble">${message.html}</div></div></div>`;
  }

  function thinkingMarkup() {
    return `<div class="cb-ai-message buddy cb-ai-thinking" data-cb-ai-thinking><div class="cb-ai-avatar" aria-hidden="true">${avatarMarkup()}</div><div class="cb-ai-message-stack"><span>${esc(buddyName())}</span><div class="cb-ai-bubble"><i></i><i></i><i></i><em>Thinking</em></div></div></div>`;
  }

  function shellMarkup() {
    if (mode === 'minimized') return `<button class="cb-ai-bubble-launch" type="button" data-cb-ai-restore aria-label="Restore Bookstore Assistant"><span class="cb-ai-avatar">${avatarMarkup()}</span><i></i></button>`;
    const body = messages.map(messageMarkup).join('');
    return `<aside class="cb-ai-panel ${mode}" aria-label="Bookstore Buddy Assistant">
      <header data-cb-ai-drag>
        <div class="cb-ai-title"><div class="cb-ai-header-avatar">${avatarMarkup()}</div><div><small>Campus Buddy</small><h2>Bookstore Assistant</h2></div></div>
        <div class="cb-ai-window-actions"><button type="button" data-cb-ai-detach aria-label="${mode==='docked'?'Detach assistant':'Dock assistant'}" title="${mode==='docked'?'Detach':'Dock'}">${mode==='docked'?'↗':'↙'}</button><button type="button" data-cb-ai-minimize aria-label="Minimize assistant" title="Minimize">—</button><button type="button" data-cb-ai-close aria-label="Close assistant" title="Close">×</button></div>
      </header>
      <div class="cb-ai-thread">${body}</div>
      <div class="cb-ai-bottom"><div class="cb-ai-prompts"><button type="button" data-cb-ai-prompt="textbooks">What textbooks do I need?</button><button type="button" data-cb-ai-prompt="wallet">How much money is in my wallet?</button><button type="button" data-cb-ai-prompt="recommend">What should I buy?</button></div><form class="cb-ai-composer" data-cb-ai-composer><input data-cb-ai-input type="text" autocomplete="off" placeholder="Message ${esc(buddyName())}…" aria-label="Message Bookstore Assistant"><button class="voice" type="button" data-cb-ai-voice aria-label="Voice input"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg></button><button class="send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m4 12 16-8-5 16-3-6-8-2Z"/><path d="m12 14 8-10"/></svg></button></form></div>
    </aside>`;
  }

  function windowElement() { return $('.campus-apps-window'); }

  function ensureHost() {
    const window = windowElement();
    if (!window) return null;
    let host = $('.cb-ai-host',window);
    if (!host) {
      host = document.createElement('div');
      host.className = 'cb-ai-host';
      window.appendChild(host);
    }
    return host;
  }

  function applyModePosition() {
    const host = ensureHost();
    const panel = $('.cb-ai-panel',host);
    const bubble = $('.cb-ai-bubble-launch',host);
    if (!floatPosition) return;
    const target = panel?.classList.contains('floating') ? panel : bubble;
    if (!target) return;
    target.style.left = `${floatPosition.x}px`;
    target.style.top = `${floatPosition.y}px`;
    target.style.right = 'auto';
    target.style.bottom = 'auto';
  }

  function updateWindowState() {
    const window = windowElement();
    if (!window) return;
    window.classList.toggle('cb-ai-docked-open', open && mode === 'docked');
  }

  function renderShell() {
    const host = ensureHost();
    if (!host) return;
    updateWindowState();
    host.hidden = !open;
    if (!open) { host.innerHTML=''; return; }
    host.innerHTML = shellMarkup();
    applyModePosition();
    const thread = $('.cb-ai-thread',host);
    if (thread) thread.scrollTop = thread.scrollHeight;
    $('[data-cb-ai-input]',host)?.focus({preventScroll:true});
  }

  function appendMessage(message) {
    messages.push(message);
    const thread = $('.cb-ai-thread',ensureHost());
    if (!thread) return;
    thread.insertAdjacentHTML('beforeend',messageMarkup(message));
    thread.scrollTop = thread.scrollHeight;
  }

  function showThinking() {
    const thread = $('.cb-ai-thread',ensureHost());
    if (!thread || thread.querySelector('[data-cb-ai-thinking]')) return;
    thread.insertAdjacentHTML('beforeend',thinkingMarkup());
    thread.scrollTop = thread.scrollHeight;
  }

  function hideThinking() { $('[data-cb-ai-thinking]',ensureHost())?.remove(); }

  function respondAfter(delay, html) {
    clearTimeout(thinkingTimer);
    showThinking();
    thinkingTimer = setTimeout(() => { hideThinking(); appendMessage({role:'buddy',html}); }, delay);
  }

  function answer(kind, displayText) {
    appendMessage({role:'user',html:esc(displayText)});
    if (kind === 'textbooks') {
      respondAfter(520,`I checked the demo course list. These are the two books I’d put first for your classes.${productCards([7,29])}`);
      return;
    }
    if (kind === 'wallet') {
      const value = session();
      const usd = Number(value?.balances?.USD ?? value?.balance ?? 0) || 0;
      const beach = Number(value?.balances?.BEACH ?? 0) || 0;
      respondAfter(320,`Your Campus Wallet has <strong>${money(usd)} USD</strong> and <strong>${beach.toLocaleString('en-US',{maximumFractionDigits:2})} BEACH</strong>. At the demo 1:1 rate, that’s <strong>${money(usd+beach)}</strong> total value.`);
      return;
    }
    respondAfter(460,`I’d start with one planning item, one everyday item, and a writing reference.${productCards([9,3,25])}`);
  }

  function answerFreeText(text) {
    const normalized = text.toLowerCase();
    if (/textbook|book.*class|class.*book|course book/.test(normalized)) return answer('textbooks',text);
    if (/wallet|balance|money|funds|beach/.test(normalized)) return answer('wallet',text);
    return answer('recommend',text);
  }

  function openPanel() {
    if (!messages.length) messages = defaultMessages();
    open = true;
    mode = mode === 'minimized' ? restoreMode : mode;
    renderShell();
  }

  function closePanel() {
    open = false;
    clearTimeout(thinkingTimer);
    hideThinking();
    renderShell();
  }

  function setMode(next) {
    if (next === 'minimized') {
      restoreMode = mode === 'minimized' ? restoreMode : mode;
      mode = 'minimized';
    } else {
      mode = next;
      restoreMode = next;
    }
    renderShell();
  }

  function addToCart(id, done) {
    const finish = () => {
      const button = document.querySelector(`[data-bookstore-ui-v1] [data-cb-add="${id}"]`);
      if (!button) return false;
      button.click();
      done?.();
      return true;
    };
    if (finish()) return;
    const shop = document.querySelector('[data-bookstore-ui-v1] [data-cb-section="shop"]');
    if (shop) shop.click();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (finish()) return;
      const clear = document.querySelector('[data-bookstore-ui-v1] [data-cb-clear-filters]');
      clear?.click();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!finish()) appendMessage({role:'buddy',html:'I could not surface that product in the current storefront view. Try clearing the active filters.'});
      }));
    }));
  }

  function addAll(ids) {
    const queue = [...ids];
    const next = () => {
      const id = queue.shift();
      if (!id) {
        appendMessage({role:'buddy',html:'All of those items are now in your cart.'});
        return;
      }
      addToCart(id,() => requestAnimationFrame(next));
    };
    next();
  }

  function storeAssistantOrder(value, product) {
    const key = `${STORE_KEY_PREFIX}${String(value.email).toLowerCase()}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const orders = Array.isArray(saved.orders) ? saved.orders : [];
      orders.unshift({id:`AI-${Date.now().toString(36).toUpperCase()}`,createdLabel:new Date().toLocaleString(),fulfillment:'pickup',email:value.email,total:product.price,items:[{id:product.id,name:product.name,price:product.price,quantity:1}]});
      localStorage.setItem(key, JSON.stringify({ ...saved, orders }));
    } catch {}
  }

  function buyNow(id) {
    const product = PRODUCTS[id], value = session();
    if (!product || !value) return;
    if (!value.balances || typeof value.balances !== 'object') value.balances={USD:Number(value.balance)||500,BEACH:0};
    const usd=Number(value.balances.USD)||0;
    if (usd < product.price) {
      appendMessage({role:'buddy',html:`You need ${money(product.price)} USD for ${esc(product.name)}, but your USD balance is ${money(usd)}. You can swap BEACH to USD in Campus Wallet first.`});
      return;
    }
    value.balances.USD=Math.round((usd-product.price)*100)/100;value.balance=value.balances.USD;
    if(!Array.isArray(value.transactions))value.transactions=[];
    value.transactions.unshift({id:`TX-${Date.now().toString(36).toUpperCase()}`,amount:-product.price,currency:'USD',label:`Campus Bookstore · ${product.name}`,at:new Date().toLocaleString(),createdAt:Date.now(),kind:'purchase',merchant:'Campus Bookstore',source:'Bookstore Buddy Assistant'});
    storeAssistantOrder(value,product);persistSession(value);
    appendMessage({role:'buddy',html:`Done. I bought <strong>${esc(product.name)}</strong> for <strong>${money(product.price)}</strong> using the linked Campus Wallet. Your new USD balance is <strong>${money(value.balances.USD)}</strong>.`});
  }

  function submitComposer() {
    const input = $('[data-cb-ai-input]',ensureHost());
    const text = input?.value?.trim();
    if (!text) return;
    input.value='';
    answerFreeText(text);
    input.focus({preventScroll:true});
  }

  function simulateVoice(button) {
    if (button.classList.contains('listening')) return;
    button.classList.add('listening');
    button.setAttribute('aria-pressed','true');
    const input=$('[data-cb-ai-input]',ensureHost());
    if(input)input.placeholder='Listening…';
    setTimeout(()=>{
      button.classList.remove('listening');button.setAttribute('aria-pressed','false');
      if(input){input.placeholder=`Message ${buddyName()}…`;input.value='What textbooks do I need?';}
      submitComposer();
    },650);
  }

  document.addEventListener('submit',event=>{
    if(!event.target.matches?.('[data-cb-ai-composer]'))return;
    event.preventDefault();event.stopImmediatePropagation();submitComposer();
  },true);

  document.addEventListener('click', event => {
    const ai = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-ai]');
    if (ai) { event.preventDefault();event.stopImmediatePropagation();openPanel();return; }
    if (!event.target.closest?.('.cb-ai-host')) return;
    if (event.target.closest('[data-cb-ai-close]')) { event.preventDefault();closePanel();return; }
    if (event.target.closest('[data-cb-ai-minimize]')) { event.preventDefault();setMode('minimized');return; }
    if (event.target.closest('[data-cb-ai-restore]')) { event.preventDefault();setMode(restoreMode||'floating');return; }
    if (event.target.closest('[data-cb-ai-detach]')) { event.preventDefault();setMode(mode==='docked'?'floating':'docked');return; }
    const prompt=event.target.closest('[data-cb-ai-prompt]');
    if(prompt){const labels={textbooks:'What textbooks do I need?',wallet:'How much money is in my wallet?',recommend:'What should I buy?'};answer(prompt.dataset.cbAiPrompt,labels[prompt.dataset.cbAiPrompt]||prompt.textContent.trim());return;}
    const add=event.target.closest('[data-cb-ai-add]');if(add){addToCart(Number(add.dataset.cbAiAdd));return;}
    const addAllButton=event.target.closest('[data-cb-ai-add-all]');if(addAllButton){addAll(addAllButton.dataset.cbAiAddAll.split(',').map(Number));return;}
    const buy=event.target.closest('[data-cb-ai-buy]');if(buy){buyNow(Number(buy.dataset.cbAiBuy));return;}
    const voice=event.target.closest('[data-cb-ai-voice]');if(voice){simulateVoice(voice);}
  },true);

  document.addEventListener('pointerdown',event=>{
    const host=event.target.closest?.('.cb-ai-host');if(!host||!open)return;
    const dragHandle=event.target.closest('[data-cb-ai-drag]');const bubble=event.target.closest('[data-cb-ai-restore]');
    if ((!dragHandle || mode!=='floating') && (!bubble || mode!=='minimized')) return;
    if(event.target.closest('button')&&!bubble)return;
    const target=mode==='floating'?$('.cb-ai-panel',host):$('.cb-ai-bubble-launch',host);if(!target)return;
    const hostRect=host.getBoundingClientRect(),rect=target.getBoundingClientRect();
    drag={id:event.pointerId,target,startX:event.clientX,startY:event.clientY,x:rect.left-hostRect.left,y:rect.top-hostRect.top,hostRect};
    target.setPointerCapture?.(event.pointerId);event.preventDefault();
  },true);

  document.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    const width=drag.target.offsetWidth,height=drag.target.offsetHeight;
    const x=Math.max(8,Math.min(drag.hostRect.width-width-8,drag.x+dx));
    const y=Math.max(8,Math.min(drag.hostRect.height-height-8,drag.y+dy));
    floatPosition={x,y};drag.target.style.left=`${x}px`;drag.target.style.top=`${y}px`;drag.target.style.right='auto';drag.target.style.bottom='auto';event.preventDefault();
  },true);
  document.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)drag=null;},true);
  document.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId)drag=null;},true);

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopImmediatePropagation();if(mode==='minimized')setMode(restoreMode||'floating');else closePanel();}},true);

  function start() {
    const shell=$('#campusAppsShell');if(!shell)return;
    new MutationObserver(()=>{
      const title=$('#campusAppsTitle')?.textContent||'';
      if(!title.includes('bookstore')){
        if(open){open=false;renderShell();}
        return;
      }
      if(open&&!ensureHost()?.innerHTML)renderShell();
    }).observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
