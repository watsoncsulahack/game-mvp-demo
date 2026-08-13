(() => {
  'use strict';

  const COURSE_CART_PREFIX = 'campus-buddy.course-cart.v1:';
  const COURSE_PRODUCTS = Object.freeze([
    { id:101, name:'A Survival Guide for Startups in the Era of Tech Giants', price:18, likes:71, stock:24, description:'Startup-strategy reading from the IS 635 HBS course pack.' },
    { id:102, name:'Business Model Generation', price:34, likes:146, stock:18, description:'Business-model framework listed in the IS 635 required course pack.' },
    { id:103, name:'Testing Business Ideas', price:32, likes:132, stock:16, description:'A practical guide to testing assumptions and technology business ideas.' },
    { id:104, name:'Value Proposition Design', price:31, likes:119, stock:20, description:'Course material for designing and evaluating customer value propositions.' },
    { id:105, name:'An Introduction to Blockchain', price:18, likes:98, stock:29, description:'Introductory blockchain reading used in IS 635.' },
    { id:106, name:'Using Blockchain to Build Customer Trust in AI', price:18, likes:84, stock:27, description:'Reading connecting blockchain mechanisms with trust in AI systems.' },
    { id:107, name:'AI Wars', price:18, likes:112, stock:21, description:'AI-focused course-pack reading assigned during the summer schedule.' },
    { id:108, name:'Why Design Thinking Works', price:15, likes:105, stock:32, description:'Design-thinking reading from the required HBS course pack.' },
    { id:109, name:'IBM: Design Thinking', price:15, likes:76, stock:31, description:'IBM design-thinking material listed in the required course pack.' },
    { id:110, name:"HBR's 10 Must Reads on Design Thinking", price:28, likes:164, stock:14, description:'HBR design-thinking collection listed in the required course pack.' },
    { id:111, name:'Busbud: Building a Data Company', price:18, likes:69, stock:26, description:'Busbud case study listed in the required HBS course pack.' },
    { id:112, name:'Blockchain Case Studies', price:18, likes:92, stock:25, description:'Blockchain case-study material from the required course pack.' },
    { id:113, name:'3 Ways to Help People Understand What Your Data Means', price:15, likes:81, stock:34, description:'Data-storytelling reading used in the IS 635 visualization unit.' },
    { id:114, name:'Data Visualization with Big Data', price:18, likes:97, stock:23, description:'Big-data visualization reading from the required course pack.' },
    { id:115, name:'Internet Crime Complaint Center (IC3) Report 2024', price:0, likes:58, stock:99, description:'Cybersecurity reading from the syllabus, represented as a free digital item.' }
  ]);

  const courseById = new Map(COURSE_PRODUCTS.map(product => [product.id, product]));
  const draftQuantity = new Map(COURSE_PRODUCTS.map(product => [product.id, 1]));
  const nativeCatalog = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const parseMoney = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
  let syncFrame = 0;
  let catalogMessageSerial = 0;
  const catalogAiMessages = [];

  function email() {
    return String(window.CampusBuddyState?.email || window.CampusUnifiedApps?.getSession?.()?.email || $('#studentEmail')?.value || 'student@university.edu').trim().toLowerCase();
  }

  function courseCartKey() { return `${COURSE_CART_PREFIX}${email()}`; }

  function readCourseCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(courseCartKey()) || '{}');
      const cart = {};
      COURSE_PRODUCTS.forEach(product => {
        const quantity = Math.max(0, Math.floor(Number(raw[product.id]) || 0));
        if (quantity) cart[product.id] = quantity;
      });
      return cart;
    } catch { return {}; }
  }

  function writeCourseCart(cart) {
    try { localStorage.setItem(courseCartKey(), JSON.stringify(cart)); } catch {}
    queueSync();
  }

  function clearCourseCart() {
    try { localStorage.removeItem(courseCartKey()); } catch {}
    queueSync();
  }

  function courseCount(cart = readCourseCart()) {
    return Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
  }

  function courseSubtotal(cart = readCourseCart()) {
    return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (courseById.get(Number(id))?.price || 0) * Number(quantity || 0), 0);
  }

  function courseItems(cart = readCourseCart()) {
    return Object.entries(cart).flatMap(([id, quantity]) => {
      const product = courseById.get(Number(id));
      return product ? [{ ...product, quantity:Number(quantity) || 1 }] : [];
    });
  }

  function addCourse(id, quantity = 1) {
    const product = courseById.get(Number(id));
    if (!product) return;
    const cart = readCourseCart();
    cart[product.id] = Math.max(0, Number(cart[product.id] || 0) + Math.max(1, Number(quantity) || 1));
    writeCourseCart(cart);
    const toast = $('#toast');
    if (toast) {
      toast.textContent = `${product.name} added to cart.`;
      toast.hidden = false;
      clearTimeout(addCourse.timer);
      addCourse.timer = setTimeout(() => { toast.hidden = true; }, 1800);
    }
  }

  function changeCourseCartQuantity(id, delta) {
    const cart = readCourseCart();
    const next = Math.max(0, Number(cart[id] || 0) + Number(delta || 0));
    if (next) cart[id] = next;
    else delete cart[id];
    writeCourseCart(cart);
  }

  function courseBookArt(product) {
    const hues = [24,145,278,207,176,12,338,54,164,223,112,256,8,194,346];
    const index = Math.max(0, COURSE_PRODUCTS.findIndex(item => item.id === product.id));
    const hue = hues[index] || 24;
    return `<svg viewBox="0 0 240 220" role="img" aria-label="${esc(product.name)}"><rect width="240" height="220" rx="24" fill="hsl(${hue} 28% 91%)"/><rect x="55" y="28" width="130" height="164" rx="8" fill="hsl(${hue} 34% 34%)"/><rect x="67" y="40" width="106" height="140" rx="4" fill="hsl(${hue} 52% 95%)"/><path d="M88 73h64M88 94h43M88 130h64" stroke="hsl(${hue} 34% 34%)" stroke-width="7" stroke-linecap="round"/></svg>`;
  }

  function filterAllows(product, root) {
    const categories = $$('[data-cb-filter-category]:checked', root).map(input => input.value);
    const brands = $$('[data-cb-filter-brand]:checked', root).map(input => input.value);
    const sizes = $$('[data-cb-filter-size]:checked', root).map(input => input.value);
    const price = $('[data-cb-filter-price]:checked', root)?.value || 'all';
    const collectibleOnly = !!$('[data-cb-filter-collectible]:checked', root);
    const query = String($('[data-cb-search-input]', root)?.value || '').trim().toLowerCase();
    if (categories.length && !categories.includes('Books')) return false;
    if (brands.length && !brands.includes('North Hall Press')) return false;
    if (sizes.length) return false;
    if (collectibleOnly) return false;
    if (price === 'under25' && !(product.price < 25)) return false;
    if (price === '25to50' && !(product.price >= 25 && product.price <= 50)) return false;
    if (price === 'over50' && !(product.price > 50)) return false;
    if (query && !`${product.name} Books North Hall Press ${product.description}`.toLowerCase().includes(query)) return false;
    return true;
  }

  function courseCardMarkup(product) {
    const quantity = draftQuantity.get(product.id) || 1;
    return `<article class="cb-product-card demo-course-shop-card" data-demo-course-product="${product.id}">
      <button class="cb-product-image-button" type="button" data-store-course-info="${product.id}" aria-label="View ${esc(product.name)} details"><div class="cb-product-visual">${courseBookArt(product)}</div></button>
      <div class="cb-product-card-body">
        <div class="cb-product-meta"><span>Books</span><strong>${money(product.price)}</strong></div>
        <button class="cb-product-name" type="button" data-store-course-info="${product.id}">${esc(product.name)}</button>
        <p class="cb-product-description cb-product-description-with-more"><span>${esc(product.description)}</span><button class="cb-learn-more" type="button" data-store-course-info="${product.id}">Learn more</button></p>
        <div class="cb-product-purchase-row"><div class="cb-stepper" aria-label="Quantity for ${esc(product.name)}"><button type="button" data-store-course-draft="${product.id}" data-delta="-1" aria-label="Decrease quantity">−</button><output>${quantity}</output><button type="button" data-store-course-draft="${product.id}" data-delta="1" aria-label="Increase quantity">+</button></div><button class="cb-add-button" type="button" data-store-course-add="${product.id}">Add to cart</button></div>
        <div class="cb-product-footer"><span class="cb-stock">In stock · ${product.stock}</span><button class="cb-like-button" type="button" aria-label="${product.likes} likes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"/></svg><span>${product.likes}</span></button></div>
      </div>
    </article>`;
  }

  function cacheNativeCatalog(root) {
    $$('.cb-product-card:not([data-demo-course-product])', root).forEach(card => {
      const idSource = $('[data-cb-add], [data-cb-product-open]', card);
      const id = Number(idSource?.dataset.cbAdd || idSource?.dataset.cbProductOpen || 0);
      if (!id) return;
      const name = $('.cb-product-name', card)?.textContent.trim();
      if (!name) return;
      nativeCatalog.set(id, {
        id,
        name,
        price:parseMoney($('.cb-product-meta strong', card)?.textContent),
        category:$('.cb-product-meta span', card)?.textContent.trim() || '',
        description:$('.cb-product-description', card)?.textContent.replace(/Learn more\s*$/i,'').trim() || '',
        stock:Number(($('.cb-stock', card)?.textContent.match(/(\d+)/) || [])[1]) || 0,
        course:false
      });
    });
  }

  function injectCourseProducts(root) {
    const grid = $('.cb-product-grid', root);
    if (!grid) return;
    cacheNativeCatalog(root);
    const visible = COURSE_PRODUCTS.filter(product => filterAllows(product, root));
    const signature = visible.map(product => `${product.id}:${draftQuantity.get(product.id) || 1}`).join('|');
    const current = grid.dataset.demoCourseGridSignature || '';
    if (current !== signature || !grid.querySelector('[data-demo-course-product]')) {
      $$('[data-demo-course-product]', grid).forEach(card => card.remove());
      const holder = document.createElement('div');
      holder.innerHTML = visible.map(courseCardMarkup).join('');
      while (holder.firstElementChild) grid.append(holder.firstElementChild);
      grid.dataset.demoCourseGridSignature = signature;
    }
    $$('.demo-course-materials', root).forEach(section => section.remove());
    const count = $$('.cb-product-card', grid).length;
    const heading = $('.cb-shop-heading h1 span', root);
    if (heading && heading.textContent !== String(count)) heading.textContent = String(count);
  }

  function nativeCourseCartRow(product, quantity) {
    return `<article class="cb-cart-item demo-course-cart-item" data-demo-course-cart-row="${product.id}"><div class="cb-cart-thumb">${courseBookArt(product)}</div><div><div class="cb-cart-item-head"><span><b>${esc(product.name)}</b><small>${money(product.price)} each</small></span><strong>${money(product.price * quantity)}</strong></div><div class="cb-cart-item-actions"><div class="cb-stepper"><button type="button" data-store-course-cart-qty="${product.id}" data-delta="-1" aria-label="Decrease quantity">−</button><output>${quantity}</output><button type="button" data-store-course-cart-qty="${product.id}" data-delta="1" aria-label="Increase quantity">+</button></div><button type="button" data-demo-course-remove="${product.id}">Remove</button></div></div></article>`;
  }

  function ensureCartSummary(drawer, subtotal) {
    let summary = $(':scope > .cb-cart-summary', drawer);
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'cb-cart-summary';
      summary.dataset.demoCourseOnlySummary = '1';
      summary.innerHTML = `<div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><button type="button" data-demo-course-only-checkout>Checkout</button>`;
      drawer.append(summary);
      return;
    }
    const strong = $('strong', summary);
    if (!strong) return;
    if (!summary.dataset.demoBaseSubtotal) summary.dataset.demoBaseSubtotal = String(parseMoney(strong.textContent));
    const next = money((Number(summary.dataset.demoBaseSubtotal) || 0) + subtotal);
    if (strong.textContent !== next) strong.textContent = next;
  }

  function unifyCourseCart(root) {
    const cart = readCourseCart();
    const count = courseCount(cart);
    const drawer = $('.cb-cart-drawer', root);
    if (!drawer) return;
    const block = $('[data-demo-course-cart-block]', drawer);
    if (!count) {
      block?.remove();
      return;
    }
    if (!block) return;
    let items = $(':scope > .cb-cart-items', drawer);
    if (!items) {
      items = document.createElement('div');
      items.className = 'cb-cart-items demo-course-only-items';
      $('.cb-drawer-header', drawer)?.insertAdjacentElement('afterend', items);
    }
    if (block.parentElement !== items) items.append(block);
    block.className = 'demo-course-cart-unified';
    const signature = Object.entries(cart).map(([id,quantity]) => `${id}:${quantity}`).join('|');
    if (block.dataset.demoNativeSignature !== signature) {
      block.innerHTML = courseItems(cart).map(item => nativeCourseCartRow(item, item.quantity)).join('');
      block.dataset.demoNativeSignature = signature;
    }
    ensureCartSummary(drawer, courseSubtotal(cart));
  }

  function summaryRow(scope, label) {
    return $$('.cb-summary-lines > div', scope).find(row => $('span', row)?.textContent.trim().toLowerCase() === label.toLowerCase()) || null;
  }

  function setSummary(scope, label, value, negative = false) {
    const strong = $('strong', summaryRow(scope,label));
    if (!strong) return;
    const next = negative ? `− ${money(value)}` : money(value);
    if (strong.textContent !== next) strong.textContent = next;
  }

  function appendCourseCheckoutRows(page, cart) {
    const holder = $('.cb-checkout-items', page);
    if (!holder) return;
    const signature = Object.entries(cart).map(([id,quantity]) => `${id}:${quantity}`).join('|');
    if (holder.dataset.demoCourseCheckoutSignature === signature) return;
    $$('[data-demo-course-checkout-row]', holder).forEach(row => row.remove());
    courseItems(cart).forEach(item => {
      const row = document.createElement('div');
      row.dataset.demoCourseCheckoutRow = String(item.id);
      row.innerHTML = `<span class="cb-checkout-thumb">${courseBookArt(item)}</span><span><b>${esc(item.name)}</b><small>${item.quantity} × ${money(item.price)}</small></span><strong>${money(item.price * item.quantity)}</strong><button class="cb-checkout-remove" type="button" data-store-course-checkout-remove="${item.id}">Remove</button>`;
      holder.append(row);
    });
    holder.dataset.demoCourseCheckoutSignature = signature;
  }

  function addCheckoutRemoveButtons(root, page) {
    const nativeCartRows = $$('.cb-cart-drawer .cb-cart-item:not(.demo-course-cart-item)', root);
    const nativeNames = new Map(nativeCartRows.map(row => [$('.cb-cart-item-head b', row)?.textContent.trim(), $('[data-cb-remove-cart]', row)]));
    $$('.cb-checkout-items > div:not([data-demo-course-checkout-row])', page).forEach(row => {
      if ($('.cb-checkout-remove', row)) return;
      const name = $('b', row)?.textContent.trim();
      if (!name || !nativeNames.has(name)) return;
      const button = document.createElement('button');
      button.className = 'cb-checkout-remove';
      button.type = 'button';
      button.dataset.storeNativeCheckoutRemove = name;
      button.textContent = 'Remove';
      row.append(button);
    });
  }

  function augmentCheckout(root) {
    const page = $('.cb-checkout-page', root);
    const cart = readCourseCart();
    if (!page) return;
    if (courseCount(cart)) {
      appendCourseCheckoutRows(page, cart);
      const subtotalStrong = $('strong', summaryRow(page,'Subtotal'));
      if (subtotalStrong) {
        if (!page.dataset.demoBaseSubtotal) page.dataset.demoBaseSubtotal = String(parseMoney(subtotalStrong.textContent));
        const subtotal = (Number(page.dataset.demoBaseSubtotal) || 0) + courseSubtotal(cart);
        const shipping = parseMoney($('strong', summaryRow(page,'Fulfillment'))?.textContent);
        const discount = subtotal * .10;
        const taxable = Math.max(0, subtotal - discount + shipping);
        const tax = taxable * .0725;
        const fee = Math.max(0, subtotal - discount) * .015;
        const total = taxable + tax + fee;
        setSummary(page,'Subtotal',subtotal);
        setSummary(page,'Student discount',discount,true);
        setSummary(page,'Estimated state tax',tax);
        setSummary(page,'Processing fee',fee);
        setSummary(page,'Grand total',total);
        page.dataset.demoCombinedTotal = String(Math.round(total*100)/100);
      }
    }
    addCheckoutRemoveButtons(root,page);
  }

  function rebuildCatalogApi() {
    const all = [...nativeCatalog.values(), ...COURSE_PRODUCTS.map(product => ({ ...product, category:'Books', brand:'North Hall Press', course:true }))];
    window.CampusBookstoreCatalog = Object.freeze({
      all:() => all.map(product => ({ ...product })),
      get:id => all.find(product => product.id === Number(id)) || null,
      search:query => {
        const terms = String(query || '').toLowerCase().split(/\s+/).filter(term => term.length > 2);
        if (!terms.length) return [];
        return all.filter(product => terms.some(term => `${product.name} ${product.category || ''} ${product.description || ''}`.toLowerCase().includes(term)));
      }
    });
  }

  function appendCatalogAiMessage(role, html) {
    const thread = $('.demo-ai-thread');
    if (!thread) return;
    const id = `catalog-${++catalogMessageSerial}`;
    catalogAiMessages.push({ id, role, html });
    const wrap = document.createElement('div');
    wrap.className = `demo-ai-message ${role}`;
    wrap.dataset.storeCatalogMessage = id;
    wrap.innerHTML = `<div><span>${role === 'user' ? 'You' : (window.CampusBuddyState?.buddy?.name || 'Buddy')}</span><div class="demo-ai-text">${html}</div></div>`;
    thread.append(wrap);
    thread.scrollTop = thread.scrollHeight;
  }

  function restoreCatalogAiMessages() {
    const thread = $('.demo-ai-thread');
    if (!thread || !catalogAiMessages.length) return;
    catalogAiMessages.forEach(message => {
      if ($(`[data-store-catalog-message="${message.id}"]`, thread)) return;
      const wrap = document.createElement('div');
      wrap.className = `demo-ai-message ${message.role}`;
      wrap.dataset.storeCatalogMessage = message.id;
      wrap.innerHTML = `<div><span>${message.role === 'user' ? 'You' : (window.CampusBuddyState?.buddy?.name || 'Buddy')}</span><div class="demo-ai-text">${message.html}</div></div>`;
      thread.append(wrap);
    });
  }

  function catalogResultMarkup(results) {
    return `<div class="demo-ai-products">${results.slice(0,6).map(product => `<article><div><b>${esc(product.name)}</b><span>${money(product.price)}</span></div><div><button type="button" data-store-ai-catalog-add="${product.id}">Add to cart</button></div></article>`).join('')}</div>`;
  }

  function handleCatalogQuestion(event) {
    const form = event.target.closest?.('[data-demo-ai-composer]');
    if (!form) return false;
    const input = $('[data-demo-ai-input]', form);
    const text = input?.value?.trim();
    if (!text || /textbooks? do i need|course pack|required readings?/i.test(text)) return false;
    const catalog = window.CampusBookstoreCatalog;
    if (!catalog) return false;
    const explicitProductQuestion = /(sell|carry|stock|have|find|product|book|hoodie|shirt|tumbler|planner|cap|mouse|mug|jacket|notebook|pen|lamp|lanyard|sleeve|marker|goggles|apron|beanie|tote)/i.test(text);
    if (!explicitProductQuestion) return false;
    const results = catalog.search(text);
    if (!results.length) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value = '';
    appendCatalogAiMessage('user', esc(text));
    appendCatalogAiMessage('buddy', `I found these matching products in the same Bookstore catalog.${catalogResultMarkup(results)}`);
    return true;
  }

  function sync() {
    syncFrame = 0;
    $('#consoleRemark')?.remove();
    const root = $('[data-bookstore-ui-v1]');
    if (root) {
      injectCourseProducts(root);
      unifyCourseCart(root);
      augmentCheckout(root);
      rebuildCatalogApi();
    }
    restoreCatalogAiMessages();
  }

  function queueSync() { if (!syncFrame) syncFrame = requestAnimationFrame(sync); }

  document.addEventListener('submit', event => { handleCatalogQuestion(event); }, true);

  document.addEventListener('click', event => {
    const draft = event.target.closest?.('[data-store-course-draft]');
    if (draft) {
      event.preventDefault();
      const id = Number(draft.dataset.storeCourseDraft);
      const next = Math.max(1, Math.min(9, (draftQuantity.get(id) || 1) + Number(draft.dataset.delta || 0)));
      draftQuantity.set(id,next);
      queueSync();
      return;
    }
    const add = event.target.closest?.('[data-store-course-add]');
    if (add) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = Number(add.dataset.storeCourseAdd);
      addCourse(id, draftQuantity.get(id) || 1);
      return;
    }
    const cartQty = event.target.closest?.('[data-store-course-cart-qty]');
    if (cartQty) {
      event.preventDefault();
      event.stopImmediatePropagation();
      changeCourseCartQuantity(Number(cartQty.dataset.storeCourseCartQty), Number(cartQty.dataset.delta || 0));
      return;
    }
    const courseCheckoutRemove = event.target.closest?.('[data-store-course-checkout-remove]');
    if (courseCheckoutRemove) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const cart = readCourseCart();
      delete cart[Number(courseCheckoutRemove.dataset.storeCourseCheckoutRemove)];
      writeCourseCart(cart);
      courseCheckoutRemove.closest('[data-demo-course-checkout-row]')?.remove();
      queueSync();
      return;
    }
    const nativeCheckoutRemove = event.target.closest?.('[data-store-native-checkout-remove]');
    if (nativeCheckoutRemove) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = nativeCheckoutRemove.dataset.storeNativeCheckoutRemove;
      const root = $('[data-bookstore-ui-v1]');
      const target = $$('.cb-cart-drawer .cb-cart-item:not(.demo-course-cart-item)', root).find(row => $('.cb-cart-item-head b', row)?.textContent.trim() === name)?.querySelector('[data-cb-remove-cart]');
      target?.click();
      return;
    }
    const catalogAdd = event.target.closest?.('[data-store-ai-catalog-add]');
    if (catalogAdd) {
      const id = Number(catalogAdd.dataset.storeAiCatalogAdd);
      if (courseById.has(id)) addCourse(id,1);
      else {
        const attempt = () => {
          const button = $(`[data-bookstore-ui-v1] [data-cb-add="${id}"]`);
          if (button) { button.click(); return true; }
          return false;
        };
        if (!attempt()) {
          $('[data-bookstore-ui-v1] [data-cb-section="shop"]')?.click();
          requestAnimationFrame(() => requestAnimationFrame(attempt));
        }
      }
      return;
    }
  }, true);

  function start() {
    $('#consoleRemark')?.remove();
    const content = $('#campusAppsContent');
    if (content) new MutationObserver(sync).observe(content,{childList:true,subtree:true});
    const app = $('#app');
    if (app) new MutationObserver(queueSync).observe(app,{childList:true,subtree:true});
    window.addEventListener('campus-session-changed',queueSync);
    sync();
  }

  window.CampusDemoBookstoreStability = Object.freeze({
    COURSE_PRODUCTS:Object.freeze(Object.fromEntries(COURSE_PRODUCTS.map(product => [product.id, product]))),
    readCourseCart,
    clearCourseCart,
    courseCount,
    courseSubtotal,
    courseItems,
    parseMoney,
    money,
    summaryRow,
    augmentCheckout,
    sync:queueSync
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();