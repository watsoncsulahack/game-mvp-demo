(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const state = () => window.CampusBuddyState;
  const session = () => window.CampusUnifiedApps?.getSession?.() || null;
  const buddy = () => state()?.buddy?.name || 'Buddy';
  const SESSION_PREFIX = 'campus-buddy.unified-session.v1:';
  const STORE_PREFIX = 'campus-buddy.bookstore-ui.v1:';
  const COURSE_PREFIX = 'campus-buddy.course-demo.v2:';
  const COURSE_CART_PREFIX = 'campus-buddy.course-cart.v1:';

  const PRODUCTS = Object.freeze({
    3:{ name:'Reusable Study Tumbler', price:24 },
    9:{ name:'Semester Student Planner', price:14 },
    25:{ name:'Academic Writing Handbook', price:31 },
    101:{ name:'A Survival Guide for Startups in the Era of Tech Giants', price:18, course:true },
    102:{ name:'Business Model Generation', price:34, course:true },
    103:{ name:'Testing Business Ideas', price:32, course:true },
    104:{ name:'Value Proposition Design', price:31, course:true },
    105:{ name:'An Introduction to Blockchain', price:18, course:true },
    106:{ name:'Using Blockchain to Build Customer Trust in AI', price:18, course:true },
    107:{ name:'AI Wars', price:18, course:true },
    108:{ name:'Why Design Thinking Works', price:15, course:true },
    109:{ name:'IBM: Design Thinking', price:15, course:true },
    110:{ name:"HBR's 10 Must Reads on Design Thinking", price:28, course:true },
    111:{ name:'Busbud: Building a Data Company', price:18, course:true },
    112:{ name:'Blockchain Case Studies', price:18, course:true },
    113:{ name:'3 Ways to Help People Understand What Your Data Means', price:15, course:true },
    114:{ name:'Data Visualization with Big Data', price:18, course:true },
    115:{ name:'Internet Crime Complaint Center (IC3) Report 2024', price:0, course:true }
  });
  const COURSE_IDS = Object.freeze([111,101,102,103,104,105,106,112,107,108,109,110,113,114,115]);
  const REQUIRED_MATERIAL_IDS = COURSE_IDS;

  const TODOS = Object.freeze([
    { id:'rehearse', label:'Run the final 15-minute demo rehearsal', detail:'Practice the Campus Buddy walkthrough and keep the prototype story inside the presentation limit.' },
    { id:'upload', label:'Upload presentation + prototype files', detail:'Submit the final presentation and prototype files before midnight.' },
    { id:'peer', label:'Submit peer review', detail:'Complete the course peer-review requirement before midnight.' },
    { id:'smoke', label:'Run one final prototype smoke test', detail:'Check onboarding, Console, Explorer, Wallet, Faucet, Bookstore, Agenda, and Journal.' }
  ]);

  const BASE_JOURNAL = Object.freeze([
    { id:'aug12', date:'Aug 12', title:'Presentation day', summary:'Final team prototype presentation and end-of-course submissions.', full:'We prepared the final Campus Buddy demonstration around the startup story, rehearsed the prototype flow, and reviewed the remaining presentation, prototype-upload, and peer-review requirements. The plan is to keep the live demo focused on the integrated Wallet, Faucet, Bookstore, Buddy state, and course-aware assistant.' },
    { id:'aug10', date:'Aug 10', title:'HW3 + rehearsal', summary:'Final build checkpoint, homework submission, presentation rehearsal, and prototype QA.', full:'We treated this as the final pre-presentation checkpoint. We reviewed the remaining homework requirement, rehearsed the product story, tested the major prototype paths, and made a short list of interaction and visual polish issues to resolve before presentation day.' },
    { id:'aug5', date:'Aug 5', title:'AI certificate + presentation', summary:'Finished the Google AI Certificate deadline and shifted into final presentation preparation.', full:'We closed out the Google AI Certificate requirement, then reorganized the remaining work around the prototype presentation. We outlined which features demonstrate AI, blockchain-inspired wallet rails, student identity, and the unified campus experience.' },
    { id:'aug3', date:'Aug 3', title:'Cybersecurity + project ideas', summary:'Connected security, privacy, and legal topics back to the startup concept.', full:'We reviewed the cybersecurity and techno-legal topics from class, including privacy and security concerns, and used them to refine the Campus Buddy story. We noted that the demo should expose student email as the visible identity while keeping any blockchain-style wallet rails behind the interface.' },
    { id:'jul29', date:'Jul 29', title:'HW2 + prototype videos', summary:'Tracked the prototyping videos, assignment work, and second homework deadline.', full:'We used the no-meeting class time to continue the prototyping material, complete assigned work, and make the product prototype more coherent. We also started collecting UI issues that would matter in a live presentation.' },
    { id:'jul27', date:'Jul 27', title:'Blockchain prototype', summary:'Outlined the blockchain-app prototype and compared it against design-thinking material.', full:'We translated the course prompt about proposing, designing, and prototyping a blockchain application into the Campus Buddy concept. The important product decision was to make wallet behavior understandable to a student without forcing blockchain terminology into every screen.' },
    { id:'jul22', date:'Jul 22', title:'HW1 checkpoint', summary:'Reviewed Tableau Prep steps and completed the first homework checkpoint.', full:'We reviewed the Tableau Prep workflow - data sources, clean, aggregate, pivot, and output - and used the class-time block to finish the homework checklist before the midnight deadline. We also kept notes on how a Buddy could remember assignment progress over time.' },
    { id:'jul13', date:'Jul 13', title:'Testing the idea + Tableau', summary:'Turned the value proposition into testable assumptions and worked through visualization material.', full:'We broke the startup idea into assumptions that could be tested, then connected the Business Model Canvas and Value Proposition Design material to the Campus Buddy concept. We also kept notes from the Tableau and data-storytelling work as examples of the Buddy tracking class activities.' },
    { id:'jul6', date:'Jul 6', title:'Kickoff + startup model', summary:'Established the disruptive-tech startup idea and the first Business Model Canvas.', full:'We started with the syllabus, course introduction, disruptive technologies, blockchain, Business Model Canvas, and responsible AI. Campus Buddy emerged as the working startup idea: one student-centered companion that can connect campus services, remember context, and make complex systems easier to use.' }
  ]);

  let journalExpanded = 'aug12';
  let aiOpen = false;
  let aiMode = 'attached';
  let aiMessages = [];
  let aiThinkingTimer = 0;
  let pendingPurchase = null;
  let dragState = null;
  let resizeState = null;
  let floatingRect = { x:28, y:72, width:380, height:500 };
  let suppressBubbleClickUntil = 0;
  let consoleActionsArmed = false;
  let drawerInteractionUntil = 0;
  const drawerPreference = { wallet:false, faucet:false };
  let observerFrame = 0;

  function profileEmail() {
    return String(state()?.email || $('#reviewEmail')?.textContent || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  }

  function localKey(prefix) {
    return `${prefix}${profileEmail()}`;
  }

  function loadCourseState() {
    try {
      const saved = JSON.parse(localStorage.getItem(localKey(COURSE_PREFIX)) || '{}');
      return {
        todos:saved.todos && typeof saved.todos === 'object' ? saved.todos : {},
        journalExtras:Array.isArray(saved.journalExtras) ? saved.journalExtras : []
      };
    } catch {
      return { todos:{}, journalExtras:[] };
    }
  }

  function saveCourseState(value) {
    try { localStorage.setItem(localKey(COURSE_PREFIX), JSON.stringify(value)); } catch {}
  }

  function loadCourseCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(localKey(COURSE_CART_PREFIX)) || '{}');
      const cart = {};
      COURSE_IDS.forEach(id => {
        const quantity = Math.max(0, Math.floor(Number(parsed[id]) || 0));
        if (quantity) cart[id] = quantity;
      });
      return cart;
    } catch {
      return {};
    }
  }

  function saveCourseCart(cart) {
    try { localStorage.setItem(localKey(COURSE_CART_PREFIX), JSON.stringify(cart)); } catch {}
    $('[data-demo-course-cart-block]')?.remove();
    decorateBookstore();
  }

  function courseCartCount(cart = loadCourseCart()) {
    return Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
  }

  function courseCartSubtotal(cart = loadCourseCart()) {
    return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (PRODUCTS[id]?.price || 0) * Number(quantity || 0), 0);
  }

  function persistSession(value) {
    if (!value?.email) return;
    try { localStorage.setItem(`${SESSION_PREFIX}${String(value.email).toLowerCase()}`, JSON.stringify(value)); } catch {}
    window.dispatchEvent(new CustomEvent('campus-session-changed', { detail:{ session:value } }));
  }

  function primeWallet() {
    const value = session();
    if (!value) return null;
    if (!value.balances || typeof value.balances !== 'object') {
      const legacy = Number(value.balance);
      value.balances = { USD:Number.isFinite(legacy) && legacy > 0 ? legacy : 500, BEACH:0 };
    }
    const hasUsdHistory = Array.isArray(value.transactions) && value.transactions.some(tx => tx?.currency === 'USD' || tx?.source === 'Campus Wallet Swap' || tx?.merchant === 'Campus Bookstore');
    let usd = Number(value.balances.USD);
    if (!Number.isFinite(usd)) usd = 500;
    if (usd === 0 && Number(value.balance || 0) === 0 && !hasUsdHistory) usd = 500;
    value.balances.USD = Math.round(usd * 100) / 100;
    if (!Number.isFinite(Number(value.balances.BEACH))) value.balances.BEACH = 0;
    value.balance = value.balances.USD;
    if (!Array.isArray(value.transactions)) value.transactions = [];
    persistSession(value);
    return value;
  }

  function agendaMarkup() {
    const course = loadCourseState();
    return `<div class="demo-agenda">
      <section class="demo-agenda-hero"><span>Wednesday · August 12</span><h3>Final presentation day</h3><p>IS 635 · Technology and Start-ups: Application of AI and Blockchain</p></section>
      <div class="demo-agenda-list">
        <article><time>6:00-9:45 PM</time><div><strong>Team tech-startup ideas & prototype presentations</strong><p>Online class meeting. Presentation: 15 minutes maximum.</p></div><span>Today</span></article>
        <article><time>By midnight</time><div><strong>Presentation + prototype files</strong><p>Final presentation deliverables are due.</p></div><span>Due</span></article>
        <article><time>By midnight</time><div><strong>Peer review</strong><p>Complete the course peer-review requirement.</p></div><span>Due</span></article>
      </div>
      <section class="demo-todos"><header><div><span>Buddy checklist</span><h3>Today's to-dos</h3></div><small>Completing an item adds an entry to Journal.</small></header>
        ${TODOS.map(todo => `<label class="demo-todo${course.todos[todo.id] ? ' complete' : ''}"><input type="checkbox" data-demo-todo="${todo.id}" ${course.todos[todo.id] ? 'checked' : ''}><span><b>${esc(todo.label)}</b><small>${esc(todo.detail)}</small></span></label>`).join('')}
      </section>
    </div>`;
  }

  function journalEntries() {
    const course = loadCourseState();
    const extras = course.journalExtras.map(entry => ({ ...entry, dynamic:true }));
    return [...extras, ...BASE_JOURNAL];
  }

  function journalMarkup() {
    const entries = journalEntries();
    if (!entries.some(entry => entry.id === journalExpanded)) journalExpanded = entries[0]?.id || '';
    return `<div class="demo-journal"><header><span>IS 635 · Summer 2026</span><h3>Project journal with ${esc(buddy())}</h3><p>Newest entries first. Select an entry to open the full note.</p></header><div class="demo-journal-list">${entries.map(entry => {
      const expanded = entry.id === journalExpanded;
      return `<article class="${expanded ? 'expanded current' : ''}${entry.dynamic ? ' dynamic' : ''}">
        <button type="button" data-demo-journal-entry="${esc(entry.id)}" aria-expanded="${expanded}"><time>${esc(entry.date)}</time><span><strong>${esc(entry.title)}</strong><small>${esc(entry.summary)}</small></span><i>${expanded ? '−' : '+'}</i></button>
        ${expanded ? `<div class="demo-journal-full"><p>${esc(entry.full)}</p></div>` : ''}
      </article>`;
    }).join('')}</div></div>`;
  }

  function recordTodo(todoId, checked) {
    const todo = TODOS.find(item => item.id === todoId);
    if (!todo) return;
    const course = loadCourseState();
    course.todos[todoId] = checked;
    const now = new Date();
    const event = {
      id:`todo-${todoId}-${Date.now()}`,
      date:'Aug 12',
      title:`${checked ? 'Completed' : 'Reopened'} · ${todo.label}`,
      summary:checked ? 'Marked complete from Agenda.' : 'Moved back to the active Agenda checklist.',
      full:checked
        ? `At ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}, ${buddy()} recorded that we completed “${todo.label}.” This update came directly from the Agenda checklist and is now part of the project history.`
        : `At ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}, we reopened “${todo.label}” from the Agenda checklist so it remains visible as unfinished work.`
    };
    course.journalExtras.unshift(event);
    course.journalExtras = course.journalExtras.slice(0, 30);
    saveCourseState(course);
    journalExpanded = event.id;
  }

  function visualWardrobePicker(category, context) {
    const Character = window.CampusBuddyCharacter;
    const value = state();
    if (!Character || !value) return '';
    const selected = Character.equippedLayers(value.buddy.appearance)[category];
    const item = Character.CLOTHING_CATALOG[category][selected];
    const options = Object.entries(Character.CLOTHING_CATALOG[category]).map(([id, option]) => `<button type="button" data-demo-wardrobe-pick="${category}" data-demo-wardrobe-id="${id}" data-demo-wardrobe-context="${context}"><span class="demo-wardrobe-thumb">${Character.renderLayerThumbnail(category, id)}</span><span><b>${esc(option.shortLabel)}</b><small>${esc(option.description)}</small></span></button>`).join('');
    return `<div class="demo-wardrobe-picker" data-demo-wardrobe-picker="${category}" data-demo-wardrobe-context="${context}">
      <button class="demo-wardrobe-picker-button" type="button" data-demo-wardrobe-toggle="${category}" data-demo-wardrobe-context="${context}" aria-expanded="false"><span class="demo-wardrobe-thumb">${Character.renderLayerThumbnail(category, selected)}</span><span><b>${esc(item.shortLabel)}</b><small>${esc(item.description)}</small></span><i>⌄</i></button>
      <div class="demo-wardrobe-menu" hidden>${options}</div>
    </div>`;
  }

  function decorateWardrobeContainer(container, category, context) {
    if (!container || container.querySelector(`.demo-wardrobe-picker[data-demo-wardrobe-context="${context}"]`)) return;
    container.insertAdjacentHTML('afterbegin', visualWardrobePicker(category, context));
  }

  function decorateWardrobes() {
    ['top','bottom','footwear'].forEach(category => {
      decorateWardrobeContainer($(`#${category}Choices`), category, 'onboarding');
      const panelCategory = $(`.panel-wardrobe-category [data-panel-layer-category="${category}"]`)?.closest('.wardrobe-options');
      decorateWardrobeContainer(panelCategory, category, 'panel');
    });
  }

  function refreshWardrobePicker(category, context) {
    const picker = $(`.demo-wardrobe-picker[data-demo-wardrobe-picker="${category}"][data-demo-wardrobe-context="${context}"]`);
    if (!picker) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = visualWardrobePicker(category, context);
    picker.replaceWith(wrapper.firstElementChild);
  }

  function chooseWardrobe(category, id, context) {
    const value = state();
    if (!value) return;
    value.buddy.appearance[category] = id;
    if (context === 'panel') {
      const card = $(`[data-panel-layer-category="${category}"][data-layer-id="${CSS.escape(id)}"]`);
      if (card) card.click();
    } else {
      const card = $(`#${category}Choices [data-layer-id="${CSS.escape(id)}"]`);
      if (card) card.click();
    }
    refreshWardrobePicker(category, context);
    requestAnimationFrame(decorateWardrobes);
  }

  function customizeMarkup() {
    const value = state();
    const ui = window.CampusBuddyUI;
    if (!value || !ui) return '<p>Appearance unavailable.</p>';
    return ui.panelData(value, 'customize')[2];
  }

  function openPanel(kind) {
    const panel = $('#appPanel');
    if (!panel) return;
    const map = {
      agenda:['Agenda','TODAY',agendaMarkup()],
      journal:['Journal','COURSE HISTORY',journalMarkup()],
      customize:['Customize','BUDDY APPEARANCE',customizeMarkup()]
    };
    const data = map[kind];
    if (!data) return;
    $('#panelTitle').textContent = data[0];
    $('#panelKicker').textContent = data[1];
    $('#panelContent').innerHTML = data[2];
    panel.hidden = false;
    requestAnimationFrame(decorateWardrobes);
  }

  function courseProductArt(id) {
    const index = COURSE_IDS.indexOf(id);
    const hues = [205,32,142,276,190,18,342,54,166,224,118,258,12,198,348];
    const hue = hues[Math.max(0,index)] || 205;
    return `<svg viewBox="0 0 240 220" aria-hidden="true"><rect x="48" y="25" width="144" height="170" rx="10" fill="hsl(${hue} 32% 34%)"/><rect x="61" y="39" width="118" height="142" rx="5" fill="hsl(${hue} 48% 94%)"/><path d="M82 72h76M82 94h52M82 133h76" stroke="hsl(${hue} 32% 34%)" stroke-width="7" stroke-linecap="round"/><rect x="48" y="25" width="12" height="170" rx="5" fill="hsl(${hue} 45% 23%)"/></svg>`;
  }

  function courseProductCard(id) {
    const product = PRODUCTS[id];
    if (!product) return '';
    const descriptions = {
      101:'HBS course-pack reading on startup strategy in markets shaped by large technology platforms.',
      102:'Business-model framework listed in the IS 635 required HBS course pack.',
      103:'Course-pack guide to testing assumptions and technology business ideas.',
      104:'Required course-pack material for designing and evaluating customer value propositions.',
      105:'Required introductory blockchain reading from the IS 635 course pack.',
      106:'Course-pack reading connecting blockchain mechanisms with trust in AI systems.',
      107:'AI-focused course-pack reading assigned during the summer schedule.',
      108:'Design-thinking reading listed in the required HBS course pack.',
      109:'IBM design-thinking material listed in the required course pack.',
      110:'HBR design-thinking collection listed in the required course pack.',
      111:'Busbud case study listed in the required HBS course pack.',
      112:'Blockchain case-study material listed in the required HBS course pack.',
      113:'Data-storytelling reading listed in the required HBS course pack.',
      114:'Big-data visualization reading listed in the required HBS course pack.',
      115:'Cybersecurity reading listed in the syllabus. This public report is represented as a free digital demo item.'
    };
    return `<article class="cb-product-card demo-course-card" data-demo-course-product="${id}">
      <div class="cb-product-image-button demo-course-art"><div class="cb-product-visual">${courseProductArt(id)}</div></div>
      <div class="cb-product-card-body"><div class="cb-product-meta"><span>IS 635 COURSE PACK</span><strong>${money(product.price)}</strong></div><div class="cb-product-name">${esc(product.name)}</div><p class="cb-product-description">${esc(descriptions[id] || 'IS 635 course material.')}</p><div class="cb-product-purchase-row"><span class="demo-course-required">Syllabus material</span><button class="cb-add-button" type="button" data-demo-course-add="${id}">Add to cart</button></div><div class="cb-product-footer"><span class="cb-stock">Digital demo copy</span></div></div>
    </article>`;
  }

  function decorateCourseProducts() {
    const root = $('[data-bookstore-ui-v1]');
    const grid = root?.querySelector('.cb-product-grid');
    if (!grid || grid.querySelector('[data-demo-course-product]')) return;
    const section = document.createElement('section');
    section.className = 'demo-course-materials';
    section.innerHTML = `<div class="demo-course-heading"><span>Linked class</span><h2>IS 635 course materials</h2><p>Required-material titles from the supplied Summer 2026 syllabus. Prices are demo-store prices.</p></div><div class="demo-course-grid">${COURSE_IDS.map(courseProductCard).join('')}</div>`;
    grid.insertAdjacentElement('beforebegin', section);
  }

  function addCourseToCart(id, quantity = 1) {
    if (!PRODUCTS[id]?.course) return;
    const cart = loadCourseCart();
    cart[id] = Math.max(0, Number(cart[id] || 0) + quantity);
    saveCourseCart(cart);
    showToast(`${PRODUCTS[id].name} added to cart.`);
  }

  function removeCourseFromCart(id) {
    const cart = loadCourseCart();
    delete cart[id];
    saveCourseCart(cart);
  }

  function decorateCourseCart() {
    const root = $('[data-bookstore-ui-v1]');
    if (!root) return;
    const cart = loadCourseCart();
    const count = courseCartCount(cart);
    const cartButton = root.querySelector('.cb-cart-button b');
    if (cartButton) {
      if (!cartButton.dataset.demoBaseCount) cartButton.dataset.demoBaseCount = cartButton.textContent.trim() || '0';
      const base = Number(cartButton.dataset.demoBaseCount) || 0;
      cartButton.textContent = String(base + count);
    }
    const drawer = root.querySelector('.cb-cart-drawer.open');
    if (!drawer) return;
    if (!count) {
      if (!drawer.querySelector('.cb-cart-items') && !drawer.querySelector('.cb-cart-empty')) drawer.insertAdjacentHTML('beforeend','<div class="cb-cart-empty"><p>Your cart is empty.</p><span>Add an item from the shop to begin.</span></div>');
      return;
    }
    if (drawer.querySelector('[data-demo-course-cart-block]')) return;
    const block = document.createElement('div');
    block.dataset.demoCourseCartBlock = '';
    block.className = 'demo-course-cart-block';
    block.innerHTML = `<div class="demo-course-cart-head"><b>IS 635 course materials</b><span>${count} item${count === 1 ? '' : 's'}</span></div>${Object.entries(cart).map(([id,quantity]) => {
      const product = PRODUCTS[id];
      return `<article><span class="demo-course-cart-art">${courseProductArt(Number(id))}</span><span><b>${esc(product.name)}</b><small>${quantity} × ${money(product.price)}</small></span><strong>${money(product.price * quantity)}</strong><button type="button" data-demo-course-remove="${id}">Remove</button></article>`;
    }).join('')}<div class="demo-course-cart-summary"><span>Course-material subtotal</span><strong>${money(courseCartSubtotal(cart))}</strong><button type="button" data-demo-course-buy-cart>Buy course materials</button></div>`;
    const items = drawer.querySelector('.cb-cart-items');
    if (items) items.append(block);
    else drawer.querySelector('.cb-cart-empty')?.replaceWith(block);
  }

  function decorateBookstore() {
    decorateCourseProducts();
    decorateCourseCart();
    markAiButton();
  }

  function avatarMarkup() {
    const Character = window.CampusBuddyCharacter;
    const value = state();
    return Character && value ? Character.renderCharacter(value.buddy, { crop:'bust' }) : '<span>B</span>';
  }

  function aiHost() { return $('.demo-ai-host'); }
  function appWindow() { return $('.campus-apps-window'); }

  function ensureAiHost() {
    let host = aiHost();
    const windowElement = appWindow();
    if (!windowElement) return null;
    if (!host) {
      host = document.createElement('div');
      host.className = 'demo-ai-host';
      windowElement.append(host);
    }
    return host;
  }

  function aiButton() { return $('[data-bookstore-ui-v1] [data-cb-ai]'); }
  function markAiButton() { aiButton()?.classList.toggle('demo-ai-active', aiOpen); }

  function aiProductCards(ids) {
    const products = ids.map(id => [id, PRODUCTS[id]]).filter(([,product]) => product);
    const bulk = products.length > 1 ? `<div class="demo-ai-bulk-actions"><button type="button" data-demo-ai-add-all="${products.map(([id]) => id).join(',')}">Add all to cart</button><button class="primary" type="button" data-demo-ai-buy-all="${products.map(([id]) => id).join(',')}">Buy all</button></div>` : '';
    return `<div class="demo-ai-products">${bulk}${products.map(([id,product]) => `<article><div><b>${esc(product.name)}</b><span>${money(product.price)}</span></div><div><button type="button" data-demo-ai-add="${id}">Add to cart</button><button class="primary" type="button" data-demo-ai-buy="${id}">Buy now</button></div></article>`).join('')}</div>`;
  }

  function aiMessageMarkup(message) {
    return `<div class="demo-ai-message ${message.role}">${message.role === 'buddy' ? `<div class="demo-ai-avatar">${avatarMarkup()}</div>` : ''}<div><span>${message.role === 'buddy' ? esc(buddy()) : 'You'}</span><div class="demo-ai-text">${message.html}</div></div></div>`;
  }

  function aiThinkingMarkup() {
    return `<div class="demo-ai-message buddy demo-ai-thinking" data-demo-ai-thinking><div class="demo-ai-avatar">${avatarMarkup()}</div><div><span>${esc(buddy())}</span><div class="demo-ai-text"><i></i><i></i><i></i><em>Thinking</em></div></div></div>`;
  }

  function aiResizeHandles() {
    if (aiMode !== 'floating') return '';
    return ['n','s','e','w','ne','nw','se','sw'].map(edge => `<i class="demo-ai-resize demo-ai-resize-${edge}" data-demo-ai-resize="${edge}" aria-hidden="true"></i>`).join('');
  }

  function aiShellMarkup() {
    if (aiMode === 'minimized') return `<button class="demo-ai-bubble" type="button" data-demo-ai-restore aria-label="Restore Bookstore Assistant"><span>${avatarMarkup()}</span><i></i></button>`;
    const floatingActions = aiMode === 'floating' ? '<button type="button" data-demo-ai-minimize title="Minimize" aria-label="Minimize assistant">−</button>' : '';
    return `<aside class="demo-ai-panel ${aiMode}">${aiResizeHandles()}<header data-demo-ai-drag><div class="demo-ai-title"><div class="demo-ai-avatar">${avatarMarkup()}</div><div><small>Campus Buddy</small><h2>Bookstore Assistant</h2></div></div><div><button type="button" data-demo-ai-detach title="${aiMode === 'attached' ? 'Detach' : 'Attach'}" aria-label="${aiMode === 'attached' ? 'Detach assistant' : 'Attach assistant'}">${aiMode === 'attached' ? '↗' : '↙'}</button>${floatingActions}<button type="button" data-demo-ai-close aria-label="Close assistant">×</button></div></header><div class="demo-ai-thread">${aiMessages.map(aiMessageMarkup).join('')}</div><footer><div class="demo-ai-prompts"><button type="button" data-demo-ai-prompt="textbooks">What textbooks do I need?</button><button type="button" data-demo-ai-prompt="wallet">How much money is in my wallet?</button><button type="button" data-demo-ai-prompt="recommend">What should I buy?</button></div><form data-demo-ai-composer><input data-demo-ai-input autocomplete="off" placeholder="Message ${esc(buddy())}…"><button type="button" data-demo-ai-voice aria-label="Voice input"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg></button><button class="send" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m4 12 16-8-5 16-3-6-8-2Z"/></svg></button></form></footer></aside>`;
  }

  function positionAttached() {
    const host = aiHost();
    const panel = $('.demo-ai-panel.attached', host);
    const button = aiButton();
    if (!host || !panel || !button) return;
    const hostRect = host.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const left = Math.max(8, Math.min(hostRect.width - panel.offsetWidth - 8, buttonRect.left - hostRect.left + buttonRect.width / 2 - panel.offsetWidth / 2));
    const top = Math.max(4, buttonRect.bottom - hostRect.top + 5);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function clampFloatingRect(rect = floatingRect) {
    const host = aiHost();
    if (!host) return rect;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(280, Math.min(bounds.width - 16, Number(rect.width) || 380));
    const height = Math.max(300, Math.min(bounds.height - 16, Number(rect.height) || 500));
    const x = Math.max(8, Math.min(bounds.width - width - 8, Number(rect.x) || 8));
    const y = Math.max(8, Math.min(bounds.height - height - 8, Number(rect.y) || 8));
    return { x, y, width, height };
  }

  function applyFloatingRect() {
    const panel = $('.demo-ai-panel.floating', aiHost());
    if (!panel) return;
    floatingRect = clampFloatingRect(floatingRect);
    panel.style.left = `${floatingRect.x}px`;
    panel.style.top = `${floatingRect.y}px`;
    panel.style.width = `${floatingRect.width}px`;
    panel.style.height = `${floatingRect.height}px`;
  }

  function renderAi(focus = true) {
    const host = ensureAiHost();
    if (!host) return;
    host.hidden = !aiOpen;
    markAiButton();
    if (!aiOpen) { host.innerHTML = ''; return; }
    host.innerHTML = aiShellMarkup();
    if (aiMode === 'attached') requestAnimationFrame(positionAttached);
    else if (aiMode === 'floating') requestAnimationFrame(applyFloatingRect);
    else {
      const bubble = $('.demo-ai-bubble', host);
      if (bubble) {
        const bounds = host.getBoundingClientRect();
        bubble.style.left = `${Math.max(8, Math.min(bounds.width - 66, floatingRect.x))}px`;
        bubble.style.top = `${Math.max(8, Math.min(bounds.height - 66, floatingRect.y))}px`;
      }
    }
    const thread = $('.demo-ai-thread', host);
    if (thread) thread.scrollTop = thread.scrollHeight;
    if (focus && aiMode !== 'minimized') $('[data-demo-ai-input]', host)?.focus({ preventScroll:true });
  }

  function openAi() {
    if (!aiMessages.length) aiMessages = [{ role:'buddy', html:`Hey - I’m ${esc(buddy())}. Ask me about today, the IS 635 course materials, your Campus Wallet, or bookstore recommendations.` }];
    aiOpen = true;
    if (aiMode === 'minimized') aiMode = 'floating';
    renderAi();
  }

  function closeAi() {
    aiOpen = false;
    clearTimeout(aiThinkingTimer);
    pendingPurchase = null;
    renderAi(false);
  }

  function appendAiMessage(message) {
    aiMessages.push(message);
    const thread = $('.demo-ai-thread', aiHost());
    if (!thread) return;
    thread.insertAdjacentHTML('beforeend', aiMessageMarkup(message));
    thread.scrollTop = thread.scrollHeight;
  }

  function respondAfter(delay, html) {
    const thread = $('.demo-ai-thread', aiHost());
    if (!thread) return;
    clearTimeout(aiThinkingTimer);
    thread.querySelector('[data-demo-ai-thinking]')?.remove();
    thread.insertAdjacentHTML('beforeend', aiThinkingMarkup());
    thread.scrollTop = thread.scrollHeight;
    aiThinkingTimer = setTimeout(() => {
      thread.querySelector('[data-demo-ai-thinking]')?.remove();
      appendAiMessage({ role:'buddy', html });
    }, delay);
  }

  function answerAi(kind, displayText) {
    appendAiMessage({ role:'user', html:esc(displayText) });
    if (kind === 'hello') return respondAfter(220, 'Hi! I’m here. Want to check today’s deadlines, your IS 635 materials, your wallet, or the bookstore?');
    if (kind === 'thanks') return respondAfter(180, 'Anytime. I’ll keep this conversation here while you browse.');
    if (kind === 'today') return respondAfter(330, 'Today is IS 635 presentation day: the team tech-startup ideas and prototype presentation, with presentation/prototype files and peer review due by midnight.');
    if (kind === 'textbooks') return respondAfter(520, `The syllabus uses an HBS course pack plus additional Canvas readings. I found the required course-pack titles in the bookstore, so these suggestions now match the supplied syllabus.${aiProductCards(REQUIRED_MATERIAL_IDS)}`);
    if (kind === 'wallet') {
      const value = primeWallet();
      const usd = Number(value?.balances?.USD) || 0;
      const beach = Number(value?.balances?.BEACH) || 0;
      return respondAfter(250, `Your linked Campus Wallet has <strong>${money(usd)} USD</strong> and <strong>${beach.toLocaleString('en-US',{maximumFractionDigits:2})} BEACH</strong> - ${money(usd + beach)} total demo value.`);
    }
    if (kind === 'recommend') return respondAfter(400, `For presentation week I’d keep it practical: a planner, writing reference, and study tumbler.${aiProductCards([9,25,3])}`);
    return respondAfter(250, 'I can help with today’s agenda, the IS 635 course materials, your Campus Wallet, or bookstore recommendations.');
  }

  function answerFreeText(text) {
    const normalized = text.toLowerCase().trim();
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(normalized)) return answerAi('hello', text);
    if (/^(thanks|thank you|thx)\b/.test(normalized)) return answerAi('thanks', text);
    if (/today|due|deadline|agenda|presentation/.test(normalized)) return answerAi('today', text);
    if (/textbook|course pack|reading|course material|book.*class/.test(normalized)) return answerAi('textbooks', text);
    if (/wallet|balance|money|funds|beach/.test(normalized)) return answerAi('wallet', text);
    if (/recommend|what should i buy|suggest|shopping/.test(normalized)) return answerAi('recommend', text);
    return answerAi('fallback', text);
  }

  function addProductToCart(id) {
    if (PRODUCTS[id]?.course) { addCourseToCart(id); return; }
    const finish = () => {
      const button = document.querySelector(`[data-bookstore-ui-v1] [data-cb-add="${id}"]`);
      if (!button) return false;
      button.click();
      return true;
    };
    if (finish()) return;
    document.querySelector('[data-bookstore-ui-v1] [data-cb-section="shop"]')?.click();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (finish()) return;
      document.querySelector('[data-bookstore-ui-v1] [data-cb-clear-filters]')?.click();
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }));
  }

  function addAllProducts(ids) {
    ids.forEach(id => addProductToCart(id));
    appendAiMessage({ role:'buddy', html:`I added ${ids.length} item${ids.length === 1 ? '' : 's'} to the bookstore cart.` });
  }

  function requestPurchase(ids) {
    const valid = ids.map(Number).filter(id => PRODUCTS[id]);
    if (!valid.length) return;
    pendingPurchase = valid;
    const total = valid.reduce((sum,id) => sum + PRODUCTS[id].price, 0);
    const label = valid.length === 1 ? PRODUCTS[valid[0]].name : `${valid.length} items`;
    appendAiMessage({ role:'buddy', html:`<div class="demo-ai-confirm"><strong>Confirm purchase?</strong><p>${esc(label)} · ${money(total)} USD</p><div><button type="button" data-demo-ai-cancel-purchase>Cancel</button><button class="primary" type="button" data-demo-ai-confirm-purchase>Confirm purchase</button></div></div>` });
  }

  function storeOrder(value, ids, total) {
    const items = ids.map(id => ({ id, name:PRODUCTS[id].name, price:PRODUCTS[id].price, quantity:1 }));
    try {
      const key = `${STORE_PREFIX}${String(value.email).toLowerCase()}`;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const orders = Array.isArray(saved.orders) ? saved.orders : [];
      orders.unshift({ id:`AI-${Date.now().toString(36).toUpperCase()}`, createdLabel:new Date().toLocaleString(), fulfillment:'pickup', email:value.email, total, items });
      localStorage.setItem(key, JSON.stringify({ ...saved, orders }));
    } catch {}
  }

  function executePendingPurchase() {
    const ids = pendingPurchase;
    pendingPurchase = null;
    if (!ids?.length) return;
    const value = primeWallet();
    if (!value) return;
    const total = Math.round(ids.reduce((sum,id) => sum + PRODUCTS[id].price, 0) * 100) / 100;
    const usd = Number(value.balances.USD) || 0;
    if (usd + 0.000001 < total) {
      appendAiMessage({ role:'buddy', html:`You need ${money(total)} USD, but your USD balance is ${money(usd)}. You can swap BEACH to USD in Campus Wallet first.` });
      return;
    }
    value.balances.USD = Math.round((usd - total) * 100) / 100;
    value.balance = value.balances.USD;
    const label = ids.length === 1 ? PRODUCTS[ids[0]].name : `${ids.length} course/store items`;
    value.transactions.unshift({ id:`TX-${Date.now().toString(36).toUpperCase()}`, amount:-total, currency:'USD', label:`Campus Bookstore · ${label}`, at:new Date().toLocaleString(), createdAt:Date.now(), kind:'purchase', merchant:'Campus Bookstore', source:'Bookstore Buddy Assistant' });
    storeOrder(value, ids, total);
    persistSession(value);
    const courseIds = ids.filter(id => PRODUCTS[id].course);
    if (courseIds.length) {
      const cart = loadCourseCart();
      courseIds.forEach(id => delete cart[id]);
      saveCourseCart(cart);
    }
    appendAiMessage({ role:'buddy', html:`Purchase complete. I bought <strong>${esc(label)}</strong> for <strong>${money(total)}</strong>. Your new USD balance is <strong>${money(value.balances.USD)}</strong>.` });
  }

  function showToast(message) {
    const target = $('#toast');
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { target.hidden = true; }, 2200);
  }

  function preserveDrawerPreference(event) {
    if (event.target.closest?.('[data-demo-wallet-drawer]')) {
      drawerInteractionUntil = performance.now() + 180;
      setTimeout(() => { drawerPreference.wallet = !!$('.cw-shell.demo-drawer-open'); }, 0);
    }
    if (event.target.closest?.('[data-demo-faucet-drawer]')) {
      drawerInteractionUntil = performance.now() + 180;
      setTimeout(() => { drawerPreference.faucet = !!$('.cf-shell.demo-drawer-open'); }, 0);
    }
  }

  function restoreDrawerPreference() {
    if (performance.now() < drawerInteractionUntil) return;
    const title = ($('#campusAppsTitle')?.textContent || '').toLowerCase();
    if (title.includes('wallet') && drawerPreference.wallet && !$('.cw-shell.demo-drawer-open')) $('[data-demo-wallet-drawer]')?.click();
    if (title.includes('faucet') && drawerPreference.faucet && !$('.cf-shell.demo-drawer-open')) $('[data-demo-faucet-drawer]')?.click();
  }

  function enforceConsoleActionState() {
    const actions = $('#consoleActions');
    if (!actions || $('#consoleMode')?.hidden) return;
    if (!consoleActionsArmed && !actions.hidden) actions.hidden = true;
  }

  function queueObservers() {
    if (observerFrame) return;
    observerFrame = requestAnimationFrame(() => {
      observerFrame = 0;
      decorateWardrobes();
      decorateBookstore();
      restoreDrawerPreference();
      enforceConsoleActionState();
      if (aiOpen && aiMode === 'attached') positionAttached();
    });
  }

  document.addEventListener('click', event => {
    preserveDrawerPreference(event);

    const dock = event.target.closest?.('.game-dock [data-panel]');
    if (dock && ['agenda','journal','customize'].includes(dock.dataset.panel)) {
      event.preventDefault(); event.stopImmediatePropagation(); openPanel(dock.dataset.panel); return;
    }

    const journalButton = event.target.closest?.('[data-demo-journal-entry]');
    if (journalButton) { journalExpanded = journalButton.dataset.demoJournalEntry; openPanel('journal'); return; }

    const wardrobeToggle = event.target.closest?.('[data-demo-wardrobe-toggle]');
    if (wardrobeToggle) {
      const picker = wardrobeToggle.closest('.demo-wardrobe-picker');
      const menu = $('.demo-wardrobe-menu', picker);
      const next = !!menu?.hidden;
      $$('.demo-wardrobe-menu').forEach(other => { if (other !== menu) other.hidden = true; });
      if (menu) menu.hidden = !next;
      wardrobeToggle.setAttribute('aria-expanded', String(next));
      return;
    }

    const wardrobePick = event.target.closest?.('[data-demo-wardrobe-pick]');
    if (wardrobePick) {
      event.preventDefault(); event.stopPropagation();
      chooseWardrobe(wardrobePick.dataset.demoWardrobePick, wardrobePick.dataset.demoWardrobeId, wardrobePick.dataset.demoWardrobeContext);
      return;
    }

    const courseAdd = event.target.closest?.('[data-demo-course-add]');
    if (courseAdd) { event.preventDefault(); event.stopImmediatePropagation(); addCourseToCart(Number(courseAdd.dataset.demoCourseAdd)); return; }
    const courseRemove = event.target.closest?.('[data-demo-course-remove]');
    if (courseRemove) { event.preventDefault(); removeCourseFromCart(Number(courseRemove.dataset.demoCourseRemove)); return; }
    const courseBuyCart = event.target.closest?.('[data-demo-course-buy-cart]');
    if (courseBuyCart) {
      event.preventDefault();
      const ids = Object.entries(loadCourseCart()).flatMap(([id, quantity]) => Array.from({ length:Number(quantity) || 0 }, () => Number(id)));
      openAi(); aiMode = 'floating'; renderAi(false); requestPurchase(ids); return;
    }

    const aiLaunch = event.target.closest?.('[data-bookstore-ui-v1] [data-cb-ai]');
    if (aiLaunch) { event.preventDefault(); event.stopImmediatePropagation(); aiOpen ? closeAi() : openAi(); return; }
    if (aiOpen && aiMode === 'attached' && event.isTrusted && !event.target.closest('.demo-ai-panel')) closeAi();
    if (event.target.closest?.('[data-demo-ai-close]')) { event.preventDefault(); closeAi(); return; }
    if (event.target.closest?.('[data-demo-ai-detach]')) { event.preventDefault(); aiMode = aiMode === 'attached' ? 'floating' : 'attached'; renderAi(false); return; }
    if (event.target.closest?.('[data-demo-ai-minimize]')) { event.preventDefault(); aiMode = 'minimized'; renderAi(false); return; }
    if (event.target.closest?.('[data-demo-ai-restore]')) { event.preventDefault(); if (performance.now() < suppressBubbleClickUntil) return; aiMode = 'floating'; renderAi(false); return; }

    const prompt = event.target.closest?.('[data-demo-ai-prompt]');
    if (prompt) {
      const labels = { textbooks:'What textbooks do I need?', wallet:'How much money is in my wallet?', recommend:'What should I buy?' };
      answerAi(prompt.dataset.demoAiPrompt, labels[prompt.dataset.demoAiPrompt] || prompt.textContent.trim());
      return;
    }
    const add = event.target.closest?.('[data-demo-ai-add]'); if (add) { addProductToCart(Number(add.dataset.demoAiAdd)); return; }
    const addAll = event.target.closest?.('[data-demo-ai-add-all]'); if (addAll) { addAllProducts(addAll.dataset.demoAiAddAll.split(',').map(Number)); return; }
    const buy = event.target.closest?.('[data-demo-ai-buy]'); if (buy) { requestPurchase([Number(buy.dataset.demoAiBuy)]); return; }
    const buyAll = event.target.closest?.('[data-demo-ai-buy-all]'); if (buyAll) { requestPurchase(buyAll.dataset.demoAiBuyAll.split(',').map(Number)); return; }
    if (event.target.closest?.('[data-demo-ai-cancel-purchase]')) { pendingPurchase = null; appendAiMessage({ role:'buddy', html:'Purchase cancelled. Nothing was charged.' }); return; }
    if (event.target.closest?.('[data-demo-ai-confirm-purchase]')) { executePendingPurchase(); return; }
    const voice = event.target.closest?.('[data-demo-ai-voice]');
    if (voice) {
      const input = $('[data-demo-ai-input]', aiHost());
      if (input) { input.value = 'What is due today?'; const text = input.value; input.value = ''; answerFreeText(text); }
      return;
    }

    if (event.target.closest?.('#initializeBuddy')) setTimeout(primeWallet, 1500);
    if (event.target.closest?.('#consoleButton')) {
      primeWallet(); consoleActionsArmed = false; setTimeout(enforceConsoleActionState, 0); setTimeout(enforceConsoleActionState, 80);
    }
    if (event.target.closest?.('#consoleBuddy,#consoleA')) {
      const actions = $('#consoleActions'); consoleActionsArmed = !!actions?.hidden;
    }
    if (event.target.closest?.('#consoleB,#consolePower')) consoleActionsArmed = false;

    if (event.target.closest?.('[data-console-tool="brief"]')) setTimeout(() => {
      const target = $('#consoleToolContent');
      if (target) target.innerHTML = '<div class="console-tool-card"><span class="console-tool-kicker">IS 635 · Aug 12</span><h2>Daily Brief</h2><p><strong>Presentation day.</strong> Team tech-startup ideas and prototype presentations are tonight.</p><div class="console-brief-list"><span>Presentation · 15 min max</span><span>Presentation + prototype · due midnight</span><span>Peer review · due midnight</span></div></div>';
    }, 0);
    if (event.target.closest?.('[data-dialogue-choice="agenda"]')) setTimeout(() => {
      const target = $('#dialogueText');
      if (target) target.textContent = 'Today is presentation day: team tech-startup ideas and prototype presentations, with presentation/prototype files and peer review due by midnight.';
    }, 0);
  }, true);

  document.addEventListener('change', event => {
    const todo = event.target.closest?.('[data-demo-todo]');
    if (todo) { recordTodo(todo.dataset.demoTodo, todo.checked); openPanel('agenda'); }
  }, true);

  document.addEventListener('submit', event => {
    if (!event.target.matches?.('[data-demo-ai-composer]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const input = $('[data-demo-ai-input]', aiHost());
    const text = input?.value?.trim();
    if (!text) return;
    input.value = ''; answerFreeText(text);
  }, true);

  document.addEventListener('pointerdown', event => {
    if (!aiOpen) return;
    const host = aiHost();
    if (!host) return;

    const resize = event.target.closest?.('[data-demo-ai-resize]');
    if (resize && aiMode === 'floating') {
      const panel = resize.closest('.demo-ai-panel');
      const hostRect = host.getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      resizeState = { id:event.pointerId, edge:resize.dataset.demoAiResize, panel, hostRect, startX:event.clientX, startY:event.clientY, x:rect.left-hostRect.left, y:rect.top-hostRect.top, width:rect.width, height:rect.height };
      panel.setPointerCapture?.(event.pointerId); event.preventDefault(); return;
    }

    const bubble = event.target.closest?.('[data-demo-ai-restore]');
    if (bubble && aiMode === 'minimized') {
      const hostRect = host.getBoundingClientRect();
      const rect = bubble.getBoundingClientRect();
      dragState = { id:event.pointerId, target:bubble, mode:'bubble', startX:event.clientX, startY:event.clientY, x:rect.left-hostRect.left, y:rect.top-hostRect.top, hostRect, moved:false };
      bubble.setPointerCapture?.(event.pointerId); event.preventDefault(); return;
    }

    const handle = event.target.closest?.('[data-demo-ai-drag]');
    if (!handle || aiMode !== 'floating' || event.target.closest('button')) return;
    const panel = handle.closest('.demo-ai-panel');
    const hostRect = host.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    dragState = { id:event.pointerId, target:panel, mode:'panel', startX:event.clientX, startY:event.clientY, x:rect.left-hostRect.left, y:rect.top-hostRect.top, hostRect, moved:false };
    panel.setPointerCapture?.(event.pointerId); event.preventDefault();
  }, true);

  document.addEventListener('pointermove', event => {
    if (resizeState?.id === event.pointerId) {
      const dx = event.clientX - resizeState.startX, dy = event.clientY - resizeState.startY, edge = resizeState.edge;
      let { x, y, width, height } = resizeState;
      if (edge.includes('e')) width += dx;
      if (edge.includes('s')) height += dy;
      if (edge.includes('w')) { width -= dx; x += dx; }
      if (edge.includes('n')) { height -= dy; y += dy; }
      const minW = 280, minH = 300;
      if (width < minW) { if (edge.includes('w')) x -= minW - width; width = minW; }
      if (height < minH) { if (edge.includes('n')) y -= minH - height; height = minH; }
      width = Math.min(width, resizeState.hostRect.width - 16);
      height = Math.min(height, resizeState.hostRect.height - 16);
      x = Math.max(8, Math.min(resizeState.hostRect.width - width - 8, x));
      y = Math.max(8, Math.min(resizeState.hostRect.height - height - 8, y));
      floatingRect = { x, y, width, height };
      Object.assign(resizeState.panel.style, { left:`${x}px`, top:`${y}px`, width:`${width}px`, height:`${height}px` });
      event.preventDefault(); return;
    }

    if (!dragState || dragState.id !== event.pointerId) return;
    const dx = event.clientX - dragState.startX, dy = event.clientY - dragState.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.moved = true;
    const width = dragState.target.offsetWidth, height = dragState.target.offsetHeight;
    const x = Math.max(8, Math.min(dragState.hostRect.width - width - 8, dragState.x + dx));
    const y = Math.max(8, Math.min(dragState.hostRect.height - height - 8, dragState.y + dy));
    dragState.target.style.left = `${x}px`; dragState.target.style.top = `${y}px`;
    floatingRect = { ...floatingRect, x, y };
    event.preventDefault();
  }, true);

  function finishPointer(event) {
    if (resizeState?.id === event.pointerId) resizeState = null;
    if (dragState?.id === event.pointerId) {
      if (dragState.mode === 'bubble' && dragState.moved) suppressBubbleClickUntil = performance.now() + 220;
      dragState = null;
    }
  }
  document.addEventListener('pointerup', finishPointer, true);
  document.addEventListener('pointercancel', finishPointer, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && aiOpen) {
      event.preventDefault();
      if (aiMode === 'minimized') { aiMode = 'floating'; renderAi(false); }
      else closeAi();
    }
  }, true);

  function start() {
    decorateWardrobes();
    const shell = $('#campusAppsShell');
    if (shell) new MutationObserver(queueObservers).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class','aria-expanded'] });
    const app = $('#app');
    if (app) new MutationObserver(queueObservers).observe(app, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
    const consoleActions = $('#consoleActions');
    if (consoleActions) new MutationObserver(enforceConsoleActionState).observe(consoleActions, { attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('resize', queueObservers);
    window.addEventListener('campus-session-changed', queueObservers);
    queueObservers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();