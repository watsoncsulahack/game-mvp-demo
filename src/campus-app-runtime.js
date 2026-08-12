(() => {
  'use strict';
  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const BALANCE_MODEL_VERSION = 6;
  const STARTING_USD = 500;
  const BEACH_USD_RATE = 1;
  const DROP_AMOUNT = 100;
  const DROP_ID = 'welcome-beach-100';

  const $ = (selector, root=document) => root.querySelector(selector);
  let frame = 0;
  let walletDrawerOpen = false;
  let faucetDrawerOpen = false;
  let lastCampusView = 'other';
  let instantClaimBusy = false;

  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
  const beach = value => `${Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2})} BEACH`;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);

  function state() { return window.CampusBuddyState || null; }
  function session() { return window.CampusUnifiedApps?.getSession?.() || null; }

  function persistSession(value) {
    if (!value?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${String(value.email).toLowerCase()}`,JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed',{detail:{session:value}}));
  }

  function setText(element,value) {
    if (!element) return;
    const next=String(value);
    if (element.textContent!==next) element.textContent=next;
  }

  function toast(text) {
    const target=$('#toast');
    if (!target) return;
    setText(target,text); target.hidden=false;
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>{target.hidden=true;},2200);
  }

  function ensureBalances() {
    const value=session();
    if (!value) return null;
    let changed=false;
    if (!value.balances || typeof value.balances!=='object') {
      const legacy=Number(value.balance);
      value.balances={USD:Number.isFinite(legacy)&&legacy>0?legacy:STARTING_USD,BEACH:0};
      changed=true;
    }
    let usd=Number(value.balances.USD);
    let beachBalance=Number(value.balances.BEACH);
    const legacy=Number(value.balance);
    if (!Number.isFinite(beachBalance)) { beachBalance=0; value.balances.BEACH=0; changed=true; }
    if (value.walletBalanceModelVersion!==BALANCE_MODEL_VERSION) {
      const hasUsdHistory=Array.isArray(value.transactions)&&value.transactions.some(tx=>tx?.currency==='USD'||tx?.source==='Campus Wallet Swap'||tx?.merchant==='Campus Bookstore');
      if (!Number.isFinite(usd)) usd=Number.isFinite(legacy)&&legacy>0?legacy:STARTING_USD;
      if (usd===0&&legacy===0&&!hasUsdHistory) usd=STARTING_USD;
      value.balances.USD=Math.round(usd*100)/100;
      value.balance=value.balances.USD;
      value.walletBalanceModelVersion=BALANCE_MODEL_VERSION;
      changed=true;
    } else {
      if (!Number.isFinite(usd)) { usd=STARTING_USD; value.balances.USD=usd; changed=true; }
      if (Math.abs((Number(value.balance)||0)-usd)>.000001) { value.balance=usd; changed=true; }
    }
    if (!Array.isArray(value.transactions)) { value.transactions=[]; changed=true; }
    if (!Array.isArray(value.faucetClaims)) { value.faucetClaims=[]; changed=true; }
    if (changed) persistSession(value);
    return value;
  }

  function qrSvg(text) {
    try { return window.CampusEmailQr?.svg?.(text) || '<span class="cw-email-qr-fallback">QR</span>'; }
    catch { return '<span class="cw-email-qr-fallback">QR</span>'; }
  }

  function normalizeDemoNetwork(scope) {
    if (!scope) return;
    const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT); const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const current=node.nodeValue||'';const next=current.replace(/\bDemo network\b/g,'Demo Network').replace(/\bTest network\b/g,'Demo Network').replace(/\btest network\b/g,'Demo Network');if(next!==current)node.nodeValue=next;});
  }

  function staticBrand(scope,brandSelector,markSelector,attribute,open) {
    let brand=$(brandSelector,scope);
    if (!brand) return null;
    if (brand.tagName==='BUTTON') {
      const replacement=document.createElement('div');
      replacement.className=brand.className;
      replacement.innerHTML=brand.innerHTML;
      brand.replaceWith(replacement);
      brand=replacement;
    }
    [...brand.attributes].forEach(attr=>{if(attr.name.startsWith('data-wallet-')||attr.name.startsWith('data-cf-')||attr.name==='aria-label'||attr.name==='aria-expanded')brand.removeAttribute(attr.name);});
    brand.classList.add('campus-static-brand');
    const mark=$(markSelector,brand);
    if (!mark) return null;
    mark.removeAttribute('aria-hidden');
    mark.setAttribute(attribute,''); mark.setAttribute('role','button'); mark.setAttribute('tabindex','0');
    mark.setAttribute('aria-expanded',String(open)); mark.setAttribute('aria-pressed',String(open)); mark.classList.toggle('is-pressed',open);
    return mark;
  }

  function receiveMarkup(value) {
    const email=String(value?.email||'student@university.edu').trim().toLowerCase();
    let qr='';try{qr=qrSvg(email);}catch{qr='<span class="cw-email-qr-fallback">QR</span>';}
    return `<div class="cw-receive-layout"><div class="cw-receive-qr-panel">${qr}</div><div class="cw-receive-details"><span class="cw-metric-label">Receive by student email</span><div class="cw-address-box cw-email-box"><code>${esc(email)}</code><button type="button" data-demo-copy-email><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copy</span></button></div><dl class="cw-detail-list"><div><dt>Student email</dt><dd>${esc(email)}</dd></div><div><dt>Network</dt><dd>Demo Network</dd></div></dl></div></div><div class="cw-button-row"><button class="cw-button secondary" type="button" data-wallet-route="overview">Done</button></div>`;
  }

  function syncWallet(scope,value) {
    if (!scope||!value) return;
    staticBrand(scope,'.cw-wordmark','.cw-wallet-mark','data-demo-wallet-drawer',walletDrawerOpen);
    $('.cw-mobile-menu',scope)?.remove();
    const sidebar=$('.cw-sidebar',scope); if(sidebar)sidebar.classList.toggle('open',walletDrawerOpen);
    $('.cw-shell',scope)?.classList.toggle('demo-drawer-open',walletDrawerOpen);
    $('.cw-scrim',scope)?.setAttribute('hidden','');
    $('.cw-sidebar-footer',scope)?.remove();
    const identity=$('.cw-identity-button',scope); if(identity){identity.querySelector('small')?.remove();identity.setAttribute('title',String(value.email||''));}
    scope.querySelectorAll('.cw-quick-actions button').forEach(button=>{button.querySelector('small')?.remove();button.querySelector(':scope > strong')?.remove();});
    scope.querySelectorAll('.cw-empty-state').forEach(empty=>{empty.querySelector('.cw-fund-button')?.remove();const p=empty.querySelector('p');if(p&&/faucet|test funds/i.test(p.textContent||''))setText(p,'Wallet activity will appear here after you send, receive, swap, or make a purchase.');});

    const receive=$('[data-wallet-view="receive"]',scope); const detail=receive?.querySelector('.cw-detail-card');
    if(detail&&detail.dataset.demoReceive!==String(value.email||'')){detail.dataset.demoReceive=String(value.email||'');detail.innerHTML=receiveMarkup(value);setText(receive.querySelector('.cw-page-heading p'),'Scan the QR code or share your student email.');}

    const card=scope.querySelector('[data-wallet-currencies]');
    if(card){if(!card.dataset.demoSimple){card.dataset.demoSimple='1';card.innerHTML='<div class="cw-currencies-heading"><h2>Currencies</h2></div><div class="cw-currency-list"><div class="cw-currency-row"><span class="cw-currency-mark usd">$</span><span><b>US Dollar</b><small>USD</small></span><strong data-demo-usd></strong></div><div class="cw-currency-row"><span class="cw-currency-mark beach">B</span><span><b>BEACH</b><small>1 BEACH = $1.00</small></span><strong data-demo-beach></strong></div></div>';}
      setText(card.querySelector('[data-demo-usd]'),money(value.balances.USD));setText(card.querySelector('[data-demo-beach]'),beach(value.balances.BEACH));}
    const balanceCard=scope.querySelector('.cw-balance-card');
    if(balanceCard){const original=balanceCard.querySelector('strong');if(original){original.hidden=true;let total=balanceCard.querySelector('[data-demo-total]');if(!total){total=document.createElement('span');total.className='cw-total-balance';total.dataset.demoTotal='';original.insertAdjacentElement('afterend',total);}setText(total,money((Number(value.balances.USD)||0)+(Number(value.balances.BEACH)||0)*BEACH_USD_RATE));}setText(balanceCard.querySelector('.cw-metric-label'),'Available balance');setText(balanceCard.querySelector('small'),'Total USD value');}
    normalizeDemoNetwork(scope);
  }

  function syncFaucet(scope,value) {
    if(!scope||!value)return;
    $('.cf-menu-button',scope)?.remove(); $('.cf-drawer-heading',scope)?.remove();
    staticBrand(scope,'.cf-brand','.cf-brand-mark','data-demo-faucet-drawer',faucetDrawerOpen);
    const drawer=$('.cf-drawer',scope); if(drawer)drawer.classList.toggle('open',faucetDrawerOpen);
    $('.cf-shell',scope)?.classList.toggle('demo-drawer-open',faucetDrawerOpen);
    $('.cf-drawer-scrim',scope)?.setAttribute('hidden','');
    const account=$('.cf-account-button',scope);if(account){account.innerHTML=`<span class="cf-account-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18c1.8-2.6 4-3.9 7-3.9s5.2 1.3 7 3.9M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></span><span class="cf-account-email">${esc(value.email||'')}</span>`;}
    normalizeDemoNetwork(scope);
  }

  function currentCampusView(){const title=($('#campusAppsTitle')?.textContent||'').toLowerCase();if(title.includes('wallet'))return'wallet';if(title.includes('faucet'))return'faucet';if(title.includes('bookstore'))return'bookstore';return'other';}

  function syncCampus() {
    const shell=$('#campusAppsShell'),content=$('#campusAppsContent');if(!shell||shell.hidden||!content)return;
    const view=currentCampusView();
    if(view!==lastCampusView){if(view==='wallet')walletDrawerOpen=false;if(view==='faucet')faucetDrawerOpen=false;lastCampusView=view;}
    const value=ensureBalances();
    if(view==='wallet')syncWallet(content,value);
    if(view==='faucet')syncFaucet(content,value);
    if(view==='bookstore')restoreFilterScroll(content);
  }

  function completeFaucetClaim(event) {
    const confirm=event.target.closest?.('[data-cf-confirm]');if(!confirm||instantClaimBusy)return;
    const scope=confirm.closest('[data-faucet-ui-v4]');if(!scope)return;
    event.preventDefault();event.stopImmediatePropagation();
    const value=ensureBalances();if(!value||value.faucetBeachClaimed)return;
    instantClaimBusy=true;
    try{
      value.balances.BEACH=Math.round(((Number(value.balances.BEACH)||0)+DROP_AMOUNT)*100)/100;value.faucetBeachClaimed=true;
      const transactionId=`TX-${Date.now().toString(36).toUpperCase()}`,claimedAt=new Date().toLocaleString();
      value.transactions.unshift({id:transactionId,amount:DROP_AMOUNT,currency:'BEACH',usdValue:DROP_AMOUNT,label:'Campus Faucet · 100 Free BEACH',at:claimedAt,createdAt:Date.now(),kind:'received',source:'Campus Faucet',dropId:DROP_ID});
      value.faucetClaims.unshift({dropId:DROP_ID,name:'100 Free BEACH',amount:DROP_AMOUNT,currency:'BEACH',claimedAt,transactionId});persistSession(value);
      const review=$('[data-cf-review]',scope),status=$('[data-cf-status]',scope);if(review)review.hidden=true;if(status)status.hidden=false;
      const icon=$('[data-cf-status-icon]',scope);if(icon){icon.className='cf-spinner complete';setText(icon,'✓');}
      setText($('[data-cf-status-title]',scope),'Claim complete');setText($('[data-cf-status-message]',scope),'100 BEACH was added to your Campus Wallet.');
      const progress=$('[data-cf-progress]',scope);if(progress)progress.hidden=true;const wait=$('[data-cf-status-wait]',scope);if(wait)wait.hidden=true;const receipt=$('[data-cf-receipt]',scope);if(receipt)receipt.hidden=false;
      setText($('[data-cf-new-balance]',scope),beach(value.balances.BEACH));setText($('[data-cf-transaction]',scope),transactionId);const actions=$('[data-cf-complete-actions]',scope);if(actions)actions.hidden=false;toast('100 BEACH added to Campus Wallet.');
    }finally{instantClaimBusy=false;}
  }

  let pendingFilterScroll = null;
  function restoreFilterScroll(scope) {
    if (pendingFilterScroll === null) return;
    const panel = $('.cb-filters-panel', scope);
    if (!panel) return;
    const target = pendingFilterScroll;
    pendingFilterScroll = null;
    panel.scrollTop = target;
    requestAnimationFrame(() => { panel.scrollTop = target; });
  }

  function sync() {
    frame = 0;
    syncCampus();
  }
  function queue() { if (!frame) frame = requestAnimationFrame(sync); }

  document.addEventListener('change', event => {
    const panel = event.target.closest?.('.cb-filters-panel');
    if (panel) pendingFilterScroll = panel.scrollTop;
  }, true);

  document.addEventListener('click', async event => {
    const walletToggle = event.target.closest?.('[data-demo-wallet-drawer]');
    if (walletToggle) { event.preventDefault(); event.stopImmediatePropagation(); walletDrawerOpen = !walletDrawerOpen; syncCampus(); return; }
    const faucetToggle = event.target.closest?.('[data-demo-faucet-drawer]');
    if (faucetToggle) { event.preventDefault(); event.stopImmediatePropagation(); faucetDrawerOpen = !faucetDrawerOpen; syncCampus(); return; }
    const copy = event.target.closest?.('[data-demo-copy-email]');
    if (copy) {
      event.preventDefault(); event.stopImmediatePropagation();
      const email = String(session()?.email || '');
      try { await navigator.clipboard.writeText(email); toast('Student email copied.'); } catch {}
      return;
    }
    const qty = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-qty]');
    if (qty) requestAnimationFrame(() => setTimeout(() => qty.closest('.cb-parity-arrow-stepper')?.classList.remove('is-increasing','is-decreasing'), 180));
  }, true);

  document.addEventListener('keydown', event => {
    const trigger = event.target.closest?.('[data-demo-wallet-drawer],[data-demo-faucet-drawer]');
    if (trigger && ['Enter',' '].includes(event.key)) { event.preventDefault(); trigger.click(); }
  }, true);

  document.addEventListener('click', completeFaucetClaim, true);
  window.addEventListener('campus-session-changed', queue);

  function start() {
    const shell = $('#campusAppsShell');
    if (shell) new MutationObserver(queue).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
