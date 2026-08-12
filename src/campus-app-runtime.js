(() => {
  'use strict';

  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const BALANCE_MODEL_VERSION = 7;
  const STARTING_USD = 500;
  const BEACH_USD_RATE = 1;
  const DROP_AMOUNT = 100;
  const DROP_ID = 'welcome-beach-100';

  const $ = (selector, root=document) => root.querySelector(selector);
  let frame = 0;
  let walletDrawerOpen = false;
  let faucetDrawerOpen = false;
  let lastCampusView = 'other';
  let walletRoute = 'overview';
  let walletPending = null;
  let walletComplete = null;
  let swapDirection = 'USD_TO_BEACH';
  let swapSuccess = '';
  let faucetSection = 'available';
  let instantClaimBusy = false;
  let pendingFilterScroll = null;

  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
  const beach = value => `${Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2})} BEACH`;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);

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

  function totalUsd(value) {
    return (Number(value?.balances?.USD)||0) + (Number(value?.balances?.BEACH)||0)*BEACH_USD_RATE;
  }

  function qrSvg(text) {
    try { return window.CampusEmailQr?.svg?.(text) || '<span class="cw-email-qr-fallback">QR</span>'; }
    catch { return '<span class="cw-email-qr-fallback">QR</span>'; }
  }

  function normalizeDemoNetwork(scope) {
    if (!scope) return;
    const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT); const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const current=node.nodeValue||'';const next=current.replace(/\bDemo network\b/g,'Demo Network').replace(/\bTest network\b/g,'Demo Network').replace(/\btest network\b/g,'Demo Network').replace(/\bTEST\b/g,'USD').replace(/\btest-network\b/g,'demo');if(next!==current)node.nodeValue=next;});
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

  function walletIcon(transaction) {
    const incoming=Number(transaction?.amount)>0;
    if (incoming) return '<path d="M12 4v15m6-6-6 6-6-6"/>';
    if (transaction?.kind==='created') return '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M14 10h7v4h-7a2 2 0 0 1 0-4Z"/>';
    return '<path d="M7 17 17 7M9 7h8v8"/>';
  }

  function transactionAmount(transaction) {
    const amount=Number(transaction?.amount)||0;
    if (!amount) return '';
    const sign=amount>0?'+ ':'− ';
    return transaction.currency==='BEACH' ? `${sign}${beach(Math.abs(amount))}` : `${sign}${money(Math.abs(amount))}`;
  }

  function walletTransactionMarkup(transaction) {
    const incoming=Number(transaction?.amount)>0;
    const title=transaction?.label || (incoming?'Received funds':'Wallet transaction');
    let subtitle=transaction?.at || 'Demo Network';
    if (transaction?.recipientEmail) subtitle=`To ${transaction.recipientEmail}`;
    return `<div class="cw-transaction-row"><span class="cw-transaction-icon${incoming?' incoming':''}"><svg viewBox="0 0 24 24" aria-hidden="true">${walletIcon(transaction)}</svg></span><span><b>${esc(title)}</b><small>${esc(subtitle)}</small></span><strong class="${incoming?'positive':''}">${transactionAmount(transaction)}</strong></div>`;
  }

  function walletActivityRows(transactions) {
    if (!transactions.length) return '<div class="cw-empty-state"><b>No transactions yet</b><p>Wallet activity will appear here after you send, receive, swap, or make a purchase.</p></div>';
    return transactions.map(walletTransactionMarkup).join('');
  }

  function currencyCard(value) {
    return `<section class="cw-currencies-card cw-card" data-wallet-currencies><div class="cw-currencies-heading"><h2>Currencies</h2></div><div class="cw-currency-list"><div class="cw-currency-row"><span class="cw-currency-mark usd">$</span><span><b>US Dollar</b><small>USD</small></span><strong>${money(value.balances.USD)}</strong></div><div class="cw-currency-row"><span class="cw-currency-mark beach">B</span><span><b>BEACH</b><small>1 BEACH = $1.00</small></span><strong>${beach(value.balances.BEACH)}</strong></div></div></section>`;
  }

  function walletOverviewMarkup(value) {
    const recent=value.transactions.slice(0,3);
    return `<section class="cw-content-view" data-wallet-view="overview"><header class="cw-page-heading"><div><span class="cw-eyebrow">Wallet overview</span><h1>Overview</h1><p>Your demo wallet and recent activity.</p></div></header><section class="cw-balance-card cw-card"><div><span class="cw-metric-label">Available balance</span><span class="cw-total-balance">${money(totalUsd(value))}</span><small>Total USD value</small></div><span class="cw-network-badge muted"><i></i> Demo Network</span></section>${currencyCard(value)}<div class="cw-quick-actions"><button type="button" data-wallet-route="send"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span><span><b>Send</b></span></button><button type="button" data-wallet-route="receive"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="m17 7-10 10m8 0H7V9"/></svg></span><span><b>Receive</b></span></button><button type="button" data-wallet-route="activity"><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg></span><span><b>Activity</b></span></button><button type="button" data-wallet-swap-open><span class="cw-quick-icon"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></span><span><b>Swap</b></span></button></div><section class="cw-activity-card cw-card"><div class="cw-section-heading"><div><span class="cw-metric-label">Recent activity</span><p>Latest account updates</p></div><button type="button" data-wallet-route="activity">View all</button></div><div>${walletActivityRows(recent)}</div></section></section>`;
  }

  function walletSendMarkup(value) {
    return `<section class="cw-content-view narrow" data-wallet-view="send"><header class="cw-page-heading"><div><span class="cw-eyebrow">Send</span><h1>Send funds</h1><p>Send USD using a campus email. Campus Wallet resolves the destination internally.</p></div></header><form class="cw-form-card cw-card" id="walletTransferForm" novalidate><label for="walletRecipient">Recipient email</label><input id="walletRecipient" name="recipient" type="email" inputmode="email" placeholder="student@example.edu" autocomplete="email"><label for="walletAmount">Amount</label><div class="cw-amount-field"><span>$</span><input id="walletAmount" name="amount" inputmode="decimal" placeholder="0.00"><b>USD</b></div><label for="walletNote">Note <span>(optional)</span></label><input id="walletNote" name="note" placeholder="Shared project expense" maxlength="80"><div class="cw-form-meta"><span>Available USD</span><strong>${money(value.balances.USD)}</strong></div><p class="cw-field-error" id="walletTransferError" role="alert"></p><button class="cw-button primary" type="submit">Review transfer <span aria-hidden="true">→</span></button></form></section>`;
  }

  function walletReceiveMarkup(value) {
    const email=String(value.email||'student@university.edu').trim().toLowerCase();
    return `<section class="cw-content-view narrow" data-wallet-view="receive"><header class="cw-page-heading"><div><span class="cw-eyebrow">Receive</span><h1>Receive funds</h1><p>Scan the QR code or share your student email.</p></div></header><section class="cw-detail-card cw-card"><div class="cw-receive-layout"><div class="cw-receive-qr-panel">${qrSvg(email)}</div><div class="cw-receive-details"><span class="cw-metric-label">Receive by student email</span><div class="cw-address-box cw-email-box"><code>${esc(email)}</code><button type="button" data-demo-copy-email><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copy</span></button></div><dl class="cw-detail-list"><div><dt>Student email</dt><dd>${esc(email)}</dd></div><div><dt>Network</dt><dd>Demo Network</dd></div></dl></div></div><div class="cw-button-row"><button class="cw-button secondary" type="button" data-wallet-route="overview">Done</button></div></section></section>`;
  }

  function walletActivityMarkup(value) {
    return `<section class="cw-content-view" data-wallet-view="activity"><header class="cw-page-heading"><div><span class="cw-eyebrow">History</span><h1>Activity</h1><p>Demo wallet transactions and account events.</p></div></header><section class="cw-activity-card cw-card"><div>${walletActivityRows(value.transactions)}</div></section></section>`;
  }

  function walletReviewMarkup() {
    const pending=walletPending||{amount:0,recipientEmail:'—',note:''};
    return `<section class="cw-content-view narrow" data-wallet-view="review"><header class="cw-page-heading"><div><span class="cw-eyebrow">Confirmation</span><h1>Review transfer</h1><p>Confirm the details before sending.</p></div></header><section class="cw-detail-card cw-card cw-review-card"><dl class="cw-review-list"><div><dt>You send</dt><dd>${money(pending.amount)} USD</dd></div><div><dt>To</dt><dd>${esc(pending.recipientEmail)}</dd></div><div><dt>Network</dt><dd>Demo Network</dd></div><div><dt>Fee</dt><dd>$0.00</dd></div></dl><p class="cw-safety-note"><svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.3 8 8 9 4.7-1 8-4 8-9V7Z"/><path d="m9 12 2 2 4-4"/></svg> The student email is the visible identity for this demo.</p><div class="cw-button-row split"><button class="cw-button secondary" type="button" data-wallet-route="send">Cancel</button><button class="cw-button primary" type="button" data-demo-wallet-confirm>Confirm and send</button></div></section></section>`;
  }

  function walletCompleteMarkup() {
    const complete=walletComplete||{amount:0,recipientEmail:'—',id:'—'};
    return `<section class="cw-content-view centered" data-wallet-view="complete"><div class="cw-status-card cw-card cw-complete-card"><div class="cw-success-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m9 16 5 5 10-11"/></svg></div><span class="cw-eyebrow">Transaction confirmed</span><h1>Transfer complete</h1><p><strong>${money(complete.amount)}</strong> was sent successfully.</p><dl class="cw-detail-list compact"><div><dt>Recipient</dt><dd>${esc(complete.recipientEmail)}</dd></div><div><dt>Transaction</dt><dd>${esc(complete.id)}</dd></div></dl><div class="cw-button-row split"><button class="cw-button secondary" type="button" data-wallet-route="activity">View activity</button><button class="cw-button primary" type="button" data-wallet-route="overview">Done</button></div></div></section>`;
  }

  function walletSwapMarkup(value) {
    const fromUsd=swapDirection==='USD_TO_BEACH';
    const source=fromUsd?'USD':'BEACH', destination=fromUsd?'BEACH':'USD';
    const available=fromUsd?money(value.balances.USD):beach(value.balances.BEACH);
    return `<section class="cw-content-view narrow cw-swap-view" data-wallet-swap-view><header class="cw-page-heading"><div><span class="cw-eyebrow">Currency exchange</span><h1>Swap</h1><p>Convert between USD and BEACH at the demo 1:1 campus rate.</p></div></header>${swapSuccess?`<div class="cw-swap-success" role="status">${esc(swapSuccess)}</div>`:''}<form class="cw-swap-card cw-card" id="walletSwapForm" novalidate><div class="cw-swap-balance-strip"><div><span>USD</span><strong>${money(value.balances.USD)}</strong></div><div><span>BEACH</span><strong>${beach(value.balances.BEACH)}</strong></div></div><div class="cw-swap-pair"><section><span class="cw-metric-label">You pay</span><div class="cw-swap-currency"><b>${source}</b><small>${available} available</small></div></section><button class="cw-swap-reverse" type="button" data-wallet-swap-reverse aria-label="Reverse swap direction">⇄</button><section><span class="cw-metric-label">You receive</span><div class="cw-swap-currency"><b>${destination}</b><small>1 ${source} = 1 ${destination}</small></div></section></div><label for="walletSwapAmount">Amount</label><div class="cw-swap-amount"><span>${fromUsd?'$':'B'}</span><input id="walletSwapAmount" name="amount" inputmode="decimal" placeholder="0.00" autocomplete="off"><b>${source}</b></div><div class="cw-swap-preview"><span>You receive</span><strong id="walletSwapPreview">${fromUsd?'0 BEACH':'$0.00'}</strong></div><p class="cw-field-error" id="walletSwapError" role="alert"></p><p class="cw-swap-rate">Fixed demo rate · 1 BEACH = $1.00 · No fees</p><button class="cw-button primary" type="submit">Swap ${source} for ${destination}</button></form></section>`;
  }

  function walletMarkupFor(route,value) {
    if (route==='send') return walletSendMarkup(value);
    if (route==='receive') return walletReceiveMarkup(value);
    if (route==='activity') return walletActivityMarkup(value);
    if (route==='review') return walletReviewMarkup();
    if (route==='complete') return walletCompleteMarkup();
    if (route==='swap') return walletSwapMarkup(value);
    return walletOverviewMarkup(value);
  }

  function ensureSwapNav(scope) {
    const nav=scope.querySelector('.cw-sidebar nav');
    if (nav && !nav.querySelector('[data-wallet-swap-open]')) nav.insertAdjacentHTML('beforeend','<button class="cw-nav-item" type="button" data-wallet-swap-open><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg><span>Swap</span></button>');
  }

  function renderWalletRoute(route,value=ensureBalances()) {
    const scope=$('.cw-shell',$('#campusAppsContent'));
    const main=scope?.querySelector('.cw-main');
    if (!scope||!main||!value) return;
    walletRoute=route;
    main.innerHTML=walletMarkupFor(route,value);
    main.dataset.demoWalletRoute=route;
    ensureSwapNav(scope);
    scope.querySelectorAll('.cw-nav-item').forEach(button=>button.classList.remove('active'));
    const activeRoute=['review','complete'].includes(route)?'send':route;
    if (activeRoute==='swap') scope.querySelector('.cw-sidebar [data-wallet-swap-open]')?.classList.add('active');
    else scope.querySelector(`.cw-sidebar [data-wallet-route="${activeRoute}"]`)?.classList.add('active');
    setText($('#campusAppsTitle'),`wallet.campus.local/#${route}`);
    normalizeDemoNetwork(main);
    updateSwapPreview();
  }

  function syncWallet(scope,value) {
    if (!scope||!value) return;
    staticBrand(scope,'.cw-wordmark','.cw-wallet-mark','data-demo-wallet-drawer',walletDrawerOpen);
    $('.cw-mobile-menu',scope)?.remove();
    ensureSwapNav(scope);
    const sidebar=$('.cw-sidebar',scope); if(sidebar)sidebar.classList.toggle('open',walletDrawerOpen);
    $('.cw-shell',scope)?.classList.toggle('demo-drawer-open',walletDrawerOpen);
    $('.cw-scrim',scope)?.setAttribute('hidden','');
    $('.cw-sidebar-footer',scope)?.remove();
    const identity=$('.cw-identity-button',scope); if(identity){identity.querySelector('small')?.remove();identity.setAttribute('title',String(value.email||''));}
    const main=$('.cw-main',scope);
    if (main && main.dataset.demoWalletRoute!==walletRoute) renderWalletRoute(walletRoute,value);
    normalizeDemoNetwork(scope);
  }

  function validateWalletTransfer(recipientEmail, rawAmount, value) {
    const cleanEmail=String(recipientEmail||'').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(cleanEmail)) throw new Error('Enter a valid recipient email address.');
    const normalized=String(rawAmount||'').trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Enter an amount with no more than two decimal places.');
    const amount=Math.round(Number(normalized)*100)/100;
    if (!(amount>0)) throw new Error('Enter an amount greater than zero.');
    if (amount>Number(value.balances.USD)+0.000001) throw new Error('Amount exceeds your available USD balance.');
    return {recipientEmail:cleanEmail,amount};
  }

  function confirmWalletTransfer() {
    const value=ensureBalances();
    if (!value||!walletPending) return;
    value.balances.USD=Math.round((Number(value.balances.USD)-walletPending.amount)*100)/100;
    value.balance=value.balances.USD;
    const id=`TX-${Date.now().toString(36).toUpperCase()}`;
    const at=new Date().toLocaleString();
    value.transactions.unshift({id,amount:-walletPending.amount,currency:'USD',label:walletPending.note||'Campus Wallet transfer',at,createdAt:Date.now(),kind:'sent',recipientEmail:walletPending.recipientEmail,source:'Campus Wallet'});
    walletComplete={...walletPending,id};
    walletPending=null;
    persistSession(value);
    renderWalletRoute('complete',value);
    toast('Transfer complete.');
  }

  function updateSwapPreview() {
    const input=$('#walletSwapAmount'), target=$('#walletSwapPreview');
    if (!target) return;
    const amount=Number(input?.value||0);
    setText(target,amount>0?(swapDirection==='USD_TO_BEACH'?beach(amount):money(amount)):(swapDirection==='USD_TO_BEACH'?'0 BEACH':'$0.00'));
  }

  function performSwap(rawAmount) {
    const value=ensureBalances(); if(!value)return;
    const normalized=String(rawAmount||'').trim(); const error=$('#walletSwapError');
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)){setText(error,'Enter an amount with no more than two decimal places.');return;}
    const amount=Math.round(Number(normalized)*100)/100; if(!(amount>0)){setText(error,'Enter an amount greater than zero.');return;}
    const fromUsd=swapDirection==='USD_TO_BEACH'; const available=Number(fromUsd?value.balances.USD:value.balances.BEACH)||0;
    if(amount>available+.000001){setText(error,`Amount exceeds your available ${fromUsd?'USD':'BEACH'} balance.`);return;}
    const from=fromUsd?'USD':'BEACH', to=fromUsd?'BEACH':'USD';
    if(fromUsd){value.balances.USD-=amount;value.balances.BEACH+=amount;}else{value.balances.BEACH-=amount;value.balances.USD+=amount;}
    value.balances.USD=Math.round(value.balances.USD*100)/100; value.balances.BEACH=Math.round(value.balances.BEACH*100)/100; value.balance=value.balances.USD;
    const at=new Date().toLocaleString(), group=`SWAP-${Date.now().toString(36).toUpperCase()}`;
    value.transactions.unshift({id:`${group}-IN`,amount,currency:to,label:`Swap · Received ${to}`,at,createdAt:Date.now(),kind:'received',source:'Campus Wallet Swap',swapGroup:group},{id:`${group}-OUT`,amount:-amount,currency:from,label:`Swap · Exchanged ${from}`,at,createdAt:Date.now(),kind:'sent',source:'Campus Wallet Swap',swapGroup:group});
    persistSession(value);
    swapSuccess=`Swapped ${fromUsd?money(amount):beach(amount)} for ${fromUsd?beach(amount):money(amount)}.`;
    renderWalletRoute('swap',value);
    toast(swapSuccess);
  }

  function availableDropsMarkup(value) {
    if(value.faucetBeachClaimed)return '<section class="cf-empty-state"><div class="cf-empty-icon">✓</div><h2>No available drops</h2><p>You have claimed every drop currently available for this Buddy account.</p><button class="cf-outline-button" type="button" data-cf-section="claimed">View claimed drops</button></section>';
    return `<section class="cf-drop-grid" aria-label="Available drops"><article class="cf-drop-card"><div class="cf-drop-art"><span>B</span><small>BEACH</small></div><div class="cf-drop-copy"><span class="cf-drop-badge available">Available</span><h2>100 Free BEACH</h2><p>A one-time campus demo drop. Add BEACH to your wallet for campus-style spending scenarios.</p></div><dl class="cf-drop-meta"><div><dt>Drop amount</dt><dd>${beach(DROP_AMOUNT)}</dd></div><div><dt>Reference value</dt><dd>${money(DROP_AMOUNT)}</dd></div><div><dt>Rate</dt><dd>1 BEACH = $1.00</dd></div></dl><button class="cf-primary-button" type="button" data-cf-claim>Claim drop</button></article></section>`;
  }

  function claimedDropsMarkup(value) {
    const claims=value.faucetClaims.filter(claim=>claim.dropId===DROP_ID);
    if(!claims.length)return '<section class="cf-empty-state"><div class="cf-empty-icon muted">◇</div><h2>No claimed drops</h2><p>Your completed faucet claims will appear here.</p><button class="cf-outline-button" type="button" data-cf-section="available">Browse available drops</button></section>';
    return `<section class="cf-drop-grid" aria-label="Claimed drops">${claims.map(claim=>`<article class="cf-drop-card claimed"><div class="cf-drop-art claimed"><span>✓</span><small>CLAIMED</small></div><div class="cf-drop-copy"><span class="cf-drop-badge claimed">Claimed</span><h2>${esc(claim.name||'100 Free BEACH')}</h2><p>This drop has been added to your Campus Wallet.</p></div><dl class="cf-drop-meta"><div><dt>Amount</dt><dd>${beach(claim.amount||DROP_AMOUNT)}</dd></div><div><dt>Claimed</dt><dd>${esc(claim.claimedAt||'Previously')}</dd></div><div><dt>Transaction</dt><dd>${esc(claim.transactionId||'Recorded')}</dd></div></dl></article>`).join('')}</section>`;
  }

  function renderFaucetSection(section,value=ensureBalances()) {
    const scope=$('[data-faucet-ui-v4]',$('#campusAppsContent')); const main=scope?.querySelector('.cf-main'); if(!scope||!main||!value)return;
    faucetSection=section==='claimed'?'claimed':'available';
    const title=faucetSection==='claimed'?'Claimed drops':'Available drops';
    const copy=faucetSection==='claimed'?'Review drops you have already redeemed.':'Claim campus demo drops that are currently available to your account.';
    main.innerHTML=`<section class="cf-drops-view"><div class="cf-page-heading"><span class="cf-eyebrow">Campus drops</span><h1>${title}</h1><p>${copy}</p></div>${faucetSection==='claimed'?claimedDropsMarkup(value):availableDropsMarkup(value)}</section>`;
    main.dataset.demoFaucetSection=faucetSection;
    scope.querySelectorAll('.cf-drawer nav button').forEach(button=>button.classList.toggle('active',button.dataset.cfSection===faucetSection));
    setText(scope.querySelector('[data-cf-section="available"] small'),value.faucetBeachClaimed?'0 available':'1 available');
    setText(scope.querySelector('[data-cf-section="claimed"] small'),`${value.faucetClaims.length} claimed`);
  }

  function syncFaucet(scope,value) {
    if(!scope||!value)return;
    $('.cf-menu-button',scope)?.remove(); $('.cf-drawer-heading',scope)?.remove();
    staticBrand(scope,'.cf-brand','.cf-brand-mark','data-demo-faucet-drawer',faucetDrawerOpen);
    const drawer=$('.cf-drawer',scope); if(drawer)drawer.classList.toggle('open',faucetDrawerOpen);
    $('.cf-shell',scope)?.classList.toggle('demo-drawer-open',faucetDrawerOpen);
    $('.cf-drawer-scrim',scope)?.setAttribute('hidden','');
    const account=$('.cf-account-button',scope);if(account){account.innerHTML=`<span class="cf-account-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18c1.8-2.6 4-3.9 7-3.9s5.2 1.3 7 3.9M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></span><span class="cf-account-email">${esc(value.email||'')}</span>`;}
    const main=$('.cf-main',scope); if(main&&!main.dataset.demoFaucetSection) main.dataset.demoFaucetSection=faucetSection;
    normalizeDemoNetwork(scope);
  }

  function completeFaucetClaim(event) {
    const confirm=event.target.closest?.('[data-cf-confirm]');if(!confirm||instantClaimBusy)return false;
    const scope=confirm.closest('[data-faucet-ui-v4]');if(!scope)return false;
    event.preventDefault();event.stopImmediatePropagation();
    const value=ensureBalances();if(!value||value.faucetBeachClaimed)return true;
    instantClaimBusy=true;
    try{
      value.balances.BEACH=Math.round(((Number(value.balances.BEACH)||0)+DROP_AMOUNT)*100)/100;value.faucetBeachClaimed=true;
      const transactionId=`TX-${Date.now().toString(36).toUpperCase()}`,claimedAt=new Date().toLocaleString();
      value.transactions.unshift({id:transactionId,amount:DROP_AMOUNT,currency:'BEACH',usdValue:DROP_AMOUNT,label:'Campus Faucet · 100 Free BEACH',at:claimedAt,createdAt:Date.now(),kind:'received',source:'Campus Faucet',dropId:DROP_ID});
      value.faucetClaims.unshift({dropId:DROP_ID,name:'100 Free BEACH',amount:DROP_AMOUNT,currency:'BEACH',claimedAt,transactionId});persistSession(value);
      const review=$('[data-cf-review]',scope),status=$('[data-cf-status]',scope);if(review)review.hidden=true;if(status)status.hidden=false;
      const icon=$('[data-cf-status-icon]',scope);if(icon){icon.className='cf-spinner complete';setText(icon,'✓');}
      setText($('[data-cf-status-title]',scope),'Claim complete');setText($('[data-cf-status-message]',scope),'100 BEACH was added to your Campus Wallet.');
      $('[data-cf-progress]',scope)?.setAttribute('hidden',''); $('[data-cf-status-wait]',scope)?.setAttribute('hidden',''); const receipt=$('[data-cf-receipt]',scope);if(receipt)receipt.hidden=false;
      setText($('[data-cf-new-balance]',scope),beach(value.balances.BEACH));setText($('[data-cf-transaction]',scope),transactionId);const actions=$('[data-cf-complete-actions]',scope);if(actions)actions.hidden=false;toast('100 BEACH added to Campus Wallet.');
    }finally{instantClaimBusy=false;}
    return true;
  }

  function currentCampusView(){const title=($('#campusAppsTitle')?.textContent||'').toLowerCase();if(title.includes('wallet'))return'wallet';if(title.includes('faucet'))return'faucet';if(title.includes('bookstore'))return'bookstore';return'other';}

  function restoreFilterScroll(scope) {
    if(pendingFilterScroll===null)return; const panel=$('.cb-filters-panel',scope);if(!panel)return; const target=pendingFilterScroll;pendingFilterScroll=null;panel.scrollTop=target;requestAnimationFrame(()=>{panel.scrollTop=target;});
  }

  function syncCampus() {
    const shell=$('#campusAppsShell'),content=$('#campusAppsContent');if(!shell||shell.hidden||!content)return;
    const view=currentCampusView();
    if(view!==lastCampusView){if(view==='wallet'){walletDrawerOpen=false;walletRoute='overview';swapSuccess='';}if(view==='faucet'){faucetDrawerOpen=false;faucetSection='available';}lastCampusView=view;}
    const value=ensureBalances();
    if(view==='wallet')syncWallet(content,value);
    if(view==='faucet')syncFaucet(content,value);
    if(view==='bookstore')restoreFilterScroll(content);
  }

  function sync(){frame=0;syncCampus();}
  function queue(){if(!frame)frame=requestAnimationFrame(sync);}

  document.addEventListener('change',event=>{const panel=event.target.closest?.('.cb-filters-panel');if(panel)pendingFilterScroll=panel.scrollTop;},true);
  document.addEventListener('input',event=>{if(event.target.matches?.('#walletSwapAmount'))updateSwapPreview();},true);

  document.addEventListener('submit',event=>{
    if(event.target.matches?.('#walletTransferForm')){
      event.preventDefault();event.stopImmediatePropagation();const value=ensureBalances();if(!value)return;
      try{walletPending={...validateWalletTransfer($('#walletRecipient')?.value,$('#walletAmount')?.value,value),note:$('#walletNote')?.value?.trim()||''};renderWalletRoute('review',value);}catch(error){setText($('#walletTransferError'),error.message||'Check the transfer details.');}
      return;
    }
    if(event.target.matches?.('#walletSwapForm')){event.preventDefault();event.stopImmediatePropagation();performSwap($('#walletSwapAmount')?.value);}
  },true);

  document.addEventListener('pointerdown',event=>{if(event.target.closest?.('[data-demo-wallet-drawer],[data-demo-faucet-drawer]'))event.preventDefault();},true);

  document.addEventListener('click',async event=>{
    const walletToggle=event.target.closest?.('[data-demo-wallet-drawer]');
    if(walletToggle){event.preventDefault();event.stopImmediatePropagation();walletDrawerOpen=!walletDrawerOpen;syncCampus();return;}
    const faucetToggle=event.target.closest?.('[data-demo-faucet-drawer]');
    if(faucetToggle){event.preventDefault();event.stopImmediatePropagation();faucetDrawerOpen=!faucetDrawerOpen;syncCampus();return;}

    const walletScope=event.target.closest?.('.cw-shell');
    if(walletScope){
      const route=event.target.closest?.('[data-wallet-route]');
      if(route){event.preventDefault();event.stopImmediatePropagation();swapSuccess='';renderWalletRoute(route.dataset.walletRoute||'overview');return;}
      if(event.target.closest?.('[data-wallet-swap-open]')){event.preventDefault();event.stopImmediatePropagation();swapSuccess='';renderWalletRoute('swap');return;}
      if(event.target.closest?.('[data-wallet-swap-reverse]')){event.preventDefault();event.stopImmediatePropagation();swapDirection=swapDirection==='USD_TO_BEACH'?'BEACH_TO_USD':'USD_TO_BEACH';swapSuccess='';renderWalletRoute('swap');return;}
      if(event.target.closest?.('[data-demo-wallet-confirm]')){event.preventDefault();event.stopImmediatePropagation();confirmWalletTransfer();return;}
      const copy=event.target.closest?.('[data-demo-copy-email]');
      if(copy){event.preventDefault();event.stopImmediatePropagation();try{await navigator.clipboard.writeText(String(session()?.email||''));toast('Student email copied.');}catch{}return;}
    }

    const faucetScope=event.target.closest?.('[data-faucet-ui-v4]');
    if(faucetScope){
      const section=event.target.closest?.('[data-cf-section]');
      if(section){event.preventDefault();event.stopImmediatePropagation();renderFaucetSection(section.dataset.cfSection);return;}
      if(completeFaucetClaim(event))return;
      if(event.target.closest?.('[data-cf-done]')){event.preventDefault();event.stopImmediatePropagation();const status=$('[data-cf-status]',faucetScope);if(status)status.hidden=true;renderFaucetSection('available');return;}
      if(event.target.closest?.('[data-cf-open-wallet]')){event.preventDefault();event.stopImmediatePropagation();window.CampusUnifiedApps?.open?.('wallet');queue();return;}
    }

    const qty=event.target.closest?.('[data-bookstore-ui-v1] [data-cb-qty]');
    if(qty)requestAnimationFrame(()=>setTimeout(()=>qty.closest('.cb-parity-arrow-stepper')?.classList.remove('is-increasing','is-decreasing'),110));
  },true);

  document.addEventListener('keydown',event=>{const trigger=event.target.closest?.('[data-demo-wallet-drawer],[data-demo-faucet-drawer]');if(trigger&&['Enter',' '].includes(event.key)){event.preventDefault();trigger.click();}},true);
  window.addEventListener('campus-session-changed',queue);

  function start(){const shell=$('#campusAppsShell');if(shell)new MutationObserver(queue).observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});queue();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
