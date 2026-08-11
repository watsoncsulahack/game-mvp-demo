(() => {
  'use strict';

  const STORE_KEY_PREFIX = 'campus-buddy.bookstore-ui.v1:';

  const PRODUCTS = [
    { id:1, name:'Introduction to Design', category:'Books', brand:'North Hall Press', price:38, likes:124, stock:18, sizes:[], collectible:true, newest:30, description:'A practical visual-design primer for first-year coursework.', visual:'book', palette:['#d9dfda','#50665a','#f5efe3'] },
    { id:2, name:'Everyday Campus Hoodie', category:'Apparel', brand:'Campus Standard', price:62, likes:203, stock:9, sizes:['S','M','L','XL'], collectible:true, newest:29, description:'A midweight pullover designed for year-round campus wear.', visual:'hoodie', palette:['#d9d7d1','#3d4248','#ffffff'] },
    { id:3, name:'Reusable Study Tumbler', category:'Accessories', brand:'Studio Union', price:24, likes:91, stock:27, sizes:[], collectible:false, newest:28, description:'An insulated tumbler with a simple leak-resistant lid.', visual:'tumbler', palette:['#dbe2e1','#446b6a','#f8f9f7'] },
    { id:4, name:'Campus Sketch Notebook', category:'Supplies', brand:'Studio Union', price:16, likes:158, stock:42, sizes:[], collectible:true, newest:27, description:'A compact hardbound notebook with heavyweight blank pages.', visual:'notebook', palette:['#ede2d5','#a8612a','#fffaf4'] },
    { id:5, name:'Classic Campus Cap', category:'Apparel', brand:'Campus Standard', price:28, likes:76, stock:0, sizes:['S','M','L'], collectible:false, newest:26, description:'An adjustable six-panel cap with a neutral embroidered mark.', visual:'cap', palette:['#e3e1dc','#5e6264','#fafafa'] },
    { id:6, name:'Campus Architecture Print', category:'Accessories', brand:'North Hall Press', price:22, likes:187, stock:11, sizes:[], collectible:true, newest:25, description:'A minimal art print inspired by university public spaces.', visual:'print', palette:['#e9e3dc','#bf6a27','#23303a'] },
    { id:7, name:'Foundations of Computing', category:'Books', brand:'North Hall Press', price:54, likes:146, stock:15, sizes:[], collectible:false, newest:24, description:'An accessible survey of modern computing concepts and methods.', visual:'book2', palette:['#dfe4eb','#425a78','#f8fbff'] },
    { id:8, name:'Utility Canvas Tote', category:'Accessories', brand:'Campus Standard', price:18, likes:112, stock:33, sizes:[], collectible:true, newest:23, description:'A durable everyday tote for books, supplies, and small purchases.', visual:'tote', palette:['#ece7df','#856a48','#ffffff'] },
    { id:9, name:'Semester Student Planner', category:'Supplies', brand:'Studio Union', price:14, likes:88, stock:36, sizes:[], collectible:false, newest:22, description:'A week-by-week academic planner with project and exam pages.', visual:'notebook', palette:['#e4e0d8','#67736c','#fffdf8'] },
    { id:10, name:'Laboratory Safety Goggles', category:'Supplies', brand:'Campus Standard', price:19, likes:64, stock:21, sizes:[], collectible:false, newest:21, description:'Clear impact-resistant goggles for introductory laboratory courses.', visual:'print', palette:['#e5ecee','#53707a','#ffffff'] },
    { id:11, name:'Seven-Port USB-C Hub', category:'Accessories', brand:'Studio Union', price:49, likes:171, stock:8, sizes:[], collectible:false, newest:20, description:'A compact hub for displays, storage, charging, and classroom peripherals.', visual:'tumbler', palette:['#dde0e4','#434a54','#f7f8fa'] },
    { id:12, name:'Campus Seal Crewneck', category:'Apparel', brand:'Campus Standard', price:48, likes:194, stock:17, sizes:['S','M','L','XL'], collectible:true, newest:19, description:'A soft fleece crewneck with a restrained embroidered campus seal.', visual:'hoodie', palette:['#dde2df','#405f55','#ffffff'] },
    { id:13, name:'Engineering Graph Pad', category:'Supplies', brand:'Studio Union', price:9, likes:57, stock:58, sizes:[], collectible:false, newest:18, description:'Precision grid paper for diagrams, calculations, and technical notes.', visual:'notebook', palette:['#e4eaf1','#4e6984','#ffffff'] },
    { id:14, name:'Library Bookmark Set', category:'Accessories', brand:'North Hall Press', price:8, likes:103, stock:0, sizes:[], collectible:true, newest:17, description:'Four archival bookmarks inspired by campus library collections.', visual:'print', palette:['#eee4d9','#93633f','#fffaf2'] },
    { id:15, name:'Insulated Lunch Tote', category:'Accessories', brand:'Campus Standard', price:26, likes:82, stock:14, sizes:[], collectible:false, newest:16, description:'A wipe-clean insulated tote sized for a full day on campus.', visual:'tote', palette:['#dfe5df','#53695a','#ffffff'] },
    { id:16, name:'Fine Point Pen Set', category:'Supplies', brand:'Studio Union', price:12, likes:119, stock:65, sizes:[], collectible:false, newest:15, description:'Six smooth fine-point pens for annotation, sketching, and planning.', visual:'tumbler', palette:['#ebe2e3','#825a63','#ffffff'] },
    { id:17, name:'Principles of Economics', category:'Books', brand:'North Hall Press', price:68, likes:132, stock:12, sizes:[], collectible:true, newest:14, description:'A current introductory economics text with applied campus examples.', visual:'book2', palette:['#e5e1d9','#735c3f','#fffdf5'] },
    { id:18, name:'Studio Work Apron', category:'Apparel', brand:'Studio Union', price:34, likes:74, stock:19, sizes:['S','M','L','XL'], collectible:false, newest:13, description:'A durable canvas apron with divided pockets for studio tools.', visual:'hoodie', palette:['#e5dfd4','#725d42','#fffaf0'] },
    { id:19, name:'Quiet-Click Wireless Mouse', category:'Accessories', brand:'Studio Union', price:29, likes:166, stock:23, sizes:[], collectible:false, newest:12, description:'A portable wireless mouse designed for shared study spaces.', visual:'cap', palette:['#e0e3e7','#4d5560','#ffffff'] },
    { id:20, name:'Stoneware Campus Mug', category:'Accessories', brand:'Campus Standard', price:17, likes:141, stock:31, sizes:[], collectible:true, newest:11, description:'A balanced stoneware mug with a subtle campus wordmark.', visual:'tumbler', palette:['#e8e3dc','#776a5d','#fffdf8'] },
    { id:21, name:'Molecular Model Kit', category:'Supplies', brand:'Campus Standard', price:32, likes:97, stock:7, sizes:[], collectible:false, newest:10, description:'A reusable molecular construction kit for chemistry coursework.', visual:'print', palette:['#e5e8ec','#50637a','#ffffff'] },
    { id:22, name:'Ribbed Campus Beanie', category:'Apparel', brand:'Campus Standard', price:23, likes:152, stock:25, sizes:['S','M','L'], collectible:true, newest:9, description:'A warm ribbed knit beanie with a small woven campus label.', visual:'cap', palette:['#e1e0dc','#4f5654','#ffffff'] },
    { id:23, name:'Recycled Folder Pack', category:'Supplies', brand:'Studio Union', price:11, likes:49, stock:72, sizes:[], collectible:false, newest:8, description:'Five durable recycled-paper folders for organizing course materials.', visual:'notebook', palette:['#e0e7df','#5d745e','#ffffff'] },
    { id:24, name:'Compact Study Desk Lamp', category:'Accessories', brand:'Studio Union', price:41, likes:178, stock:0, sizes:[], collectible:false, newest:7, description:'A dimmable task light with a small footprint for dorm desks.', visual:'print', palette:['#e6e3dc','#6d6455','#fffdf6'] },
    { id:25, name:'Academic Writing Handbook', category:'Books', brand:'North Hall Press', price:31, likes:109, stock:20, sizes:[], collectible:true, newest:6, description:'A concise reference for research, revision, citation, and argument.', visual:'book', palette:['#e9e2d9','#805841','#fffaf4'] },
    { id:26, name:'Breakaway Campus Lanyard', category:'Accessories', brand:'Campus Standard', price:7, likes:68, stock:84, sizes:[], collectible:false, newest:5, description:'A soft woven lanyard with a safety breakaway and card clip.', visual:'tote', palette:['#e1e5e6','#52686f','#ffffff'] },
    { id:27, name:'Padded Laptop Sleeve', category:'Accessories', brand:'Studio Union', price:36, likes:161, stock:13, sizes:['S','M','L'], collectible:false, newest:4, description:'A protective recycled-fabric sleeve with an accessory pocket.', visual:'tote', palette:['#dfe1e4','#4e5661','#ffffff'] },
    { id:28, name:'Dual-Tip Art Marker Set', category:'Supplies', brand:'Studio Union', price:39, likes:136, stock:16, sizes:[], collectible:true, newest:3, description:'Twelve coordinated dual-tip markers for studio and presentation work.', visual:'tumbler', palette:['#ece0dd','#8a5b52','#fffaf8'] },
    { id:29, name:'Data Structures in Practice', category:'Books', brand:'North Hall Press', price:59, likes:183, stock:10, sizes:[], collectible:true, newest:2, description:'A project-oriented guide to core data structures and algorithms.', visual:'book2', palette:['#dfe5eb','#3f5c78','#f8fbff'] },
    { id:30, name:'Packable Campus Rain Jacket', category:'Apparel', brand:'Campus Standard', price:72, likes:214, stock:6, sizes:['S','M','L','XL'], collectible:true, newest:1, description:'A lightweight water-resistant shell that packs into its own pocket.', visual:'hoodie', palette:['#dce3e6','#355e70','#ffffff'] }
  ];

  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);

  let currentEmail = '';
  let state = createState();
  let syncing = false;
  let syncFrame = 0;

  function createState() {
    return {
      section:'shop',
      search:'',
      searchOpen:false,
      categories:new Set(),
      brands:new Set(),
      sizes:new Set(),
      price:'all',
      collectibleOnly:false,
      inStockOnly:true,
      sort:'featured',
      view:'grid',
      filtersOpen:false,
      cart:[],
      quantities:Object.fromEntries(PRODUCTS.map(product => [product.id, 1])),
      liked:new Set(),
      selectedProductId:null,
      modalQuantity:1,
      cartOpen:false,
      infoOpen:false,
      fulfillment:'pickup',
      orders:[]
    };
  }

  function getSession() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function storageKey(email) {
    return `${STORE_KEY_PREFIX}${String(email || '').toLowerCase()}`;
  }

  function loadForEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || normalized === currentEmail) return;
    currentEmail = normalized;
    state = createState();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(normalized)) || 'null');
      if (!saved || typeof saved !== 'object') return;
      state.cart = Array.isArray(saved.cart)
        ? saved.cart.map(item => ({ id:Number(item.id), quantity:Number(item.quantity) || 1 })).filter(item => PRODUCTS.some(product => product.id === item.id))
        : [];
      state.liked = new Set(Array.isArray(saved.liked) ? saved.liked.map(Number) : []);
      state.orders = Array.isArray(saved.orders) ? saved.orders : [];
    } catch {}
  }

  function persist() {
    if (!currentEmail) return;
    try {
      localStorage.setItem(storageKey(currentEmail), JSON.stringify({
        cart:state.cart,
        liked:[...state.liked],
        orders:state.orders
      }));
    } catch {}
  }

  function notify(message) {
    const target = $('#toast');
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { target.hidden = true; }, 2400);
  }

  function productById(id) {
    return PRODUCTS.find(product => product.id === Number(id)) || null;
  }

  function productSvg(product) {
    const [bg, primary, light] = product.palette;
    const shape = {
      book:`<rect x="54" y="27" width="132" height="166" rx="8" fill="${primary}"/><rect x="65" y="39" width="110" height="142" rx="4" fill="${light}"/><path d="M87 71h66M87 89h44M87 123h66" stroke="${primary}" stroke-width="7" stroke-linecap="round"/>`,
      book2:`<rect x="50" y="30" width="140" height="160" rx="8" fill="${primary}"/><circle cx="120" cy="95" r="31" fill="none" stroke="${light}" stroke-width="10"/><path d="M82 145h76" stroke="${light}" stroke-width="9" stroke-linecap="round"/>`,
      hoodie:`<path d="M82 55c7-22 69-22 76 0l28 27-18 32-15-9v88H87v-88l-15 9-18-32 28-27Z" fill="${primary}"/><path d="M98 45c4 28 40 28 44 0" fill="none" stroke="${light}" stroke-width="10" stroke-linecap="round"/><path d="M108 121h24" stroke="${light}" stroke-width="8" stroke-linecap="round"/>`,
      tumbler:`<path d="M84 49h72l-9 139H93L84 49Z" fill="${primary}"/><rect x="78" y="39" width="84" height="18" rx="9" fill="${light}"/><path d="M105 79h30" stroke="${light}" stroke-width="8" stroke-linecap="round"/>`,
      notebook:`<rect x="60" y="31" width="126" height="164" rx="10" fill="${primary}"/><rect x="77" y="47" width="93" height="132" rx="5" fill="${light}"/><path d="M57 52h13M57 78h13M57 104h13M57 130h13M57 156h13" stroke="${primary}" stroke-width="7" stroke-linecap="round"/>`,
      cap:`<path d="M69 121c0-43 20-68 56-68s56 25 56 68H69Z" fill="${primary}"/><path d="M119 121c47 1 75 13 81 28-46 10-90 4-120-10" fill="${light}"/><path d="M125 54v65" stroke="${light}" stroke-width="7"/>`,
      print:`<rect x="48" y="27" width="144" height="166" rx="5" fill="${primary}"/><rect x="61" y="40" width="118" height="140" fill="${light}"/><path d="m75 155 34-55 24 31 19-25 19 49H75Z" fill="${primary}"/><circle cx="92" cy="77" r="13" fill="${primary}"/>`,
      tote:`<path d="M63 79h114l-10 112H73L63 79Z" fill="${primary}"/><path d="M94 83c0-42 52-42 52 0" fill="none" stroke="${primary}" stroke-width="12" stroke-linecap="round"/><rect x="98" y="117" width="44" height="38" rx="6" fill="${light}"/>`
    }[product.visual] || '';
    return `<svg viewBox="0 0 240 220" role="img" aria-label="${esc(product.name)}"><rect width="240" height="220" rx="24" fill="${bg}"/>${shape}</svg>`;
  }

  function filteredProducts() {
    const query = state.search.trim().toLowerCase();
    let result = PRODUCTS.filter(product => {
      const searchText = [product.name, product.category, product.brand, product.description].join(' ').toLowerCase();
      return (!query || searchText.includes(query))
        && (!state.categories.size || state.categories.has(product.category))
        && (!state.brands.size || state.brands.has(product.brand))
        && (!state.sizes.size || product.sizes.some(size => state.sizes.has(size)))
        && (!state.collectibleOnly || product.collectible)
        && (!state.inStockOnly || product.stock > 0)
        && (state.price === 'all'
          || (state.price === 'under25' && product.price < 25)
          || (state.price === '25to50' && product.price >= 25 && product.price <= 50)
          || (state.price === 'over50' && product.price > 50));
    });
    if (state.sort === 'low') result = result.sort((a,b) => a.price - b.price);
    if (state.sort === 'high') result = result.sort((a,b) => b.price - a.price);
    if (state.sort === 'newest') result = result.sort((a,b) => b.newest - a.newest);
    if (state.sort === 'liked') result = result.sort((a,b) => (b.likes + (state.liked.has(b.id) ? 1 : 0)) - (a.likes + (state.liked.has(a.id) ? 1 : 0)));
    return result;
  }

  function cartCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  function cartSubtotal() {
    return state.cart.reduce((sum, item) => {
      const product = productById(item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  function checkoutTotals() {
    const subtotal = cartSubtotal();
    const discount = subtotal * 0.10;
    const shipping = state.fulfillment === 'shipping' ? 8 : 0;
    const taxable = Math.max(0, subtotal - discount + shipping);
    const tax = taxable * 0.0725;
    const fee = Math.max(0, subtotal - discount) * 0.015;
    return { subtotal, discount, shipping, tax, fee, total:taxable + tax + fee };
  }

  function activeFilterCount() {
    return state.categories.size + state.brands.size + state.sizes.size + (state.price === 'all' ? 0 : 1) + (state.collectibleOnly ? 1 : 0) + (state.inStockOnly ? 0 : 1);
  }

  function stepperMarkup(product, quantity, context = 'card') {
    return `<div class="cb-stepper" aria-label="Quantity for ${esc(product.name)}">
      <button type="button" data-cb-qty="-1" data-cb-product-id="${product.id}" data-cb-context="${context}" aria-label="Decrease quantity">−</button>
      <output>${quantity}</output>
      <button type="button" data-cb-qty="1" data-cb-product-id="${product.id}" data-cb-context="${context}" aria-label="Increase quantity">+</button>
    </div>`;
  }

  function productCardMarkup(product) {
    const quantity = state.quantities[product.id] || 1;
    const liked = state.liked.has(product.id);
    return `<article class="cb-product-card${product.stock === 0 ? ' is-out' : ''}">
      ${product.collectible ? `<button class="cb-collectible-badge" type="button" data-cb-collectible-info aria-label="Collectible integration information">C</button>` : ''}
      <button class="cb-product-image-button" type="button" data-cb-product-open="${product.id}" aria-label="View ${esc(product.name)} details">
        <div class="cb-product-visual">${productSvg(product)}</div>
      </button>
      <div class="cb-product-card-body">
        <div class="cb-product-meta"><span>${esc(product.category)}</span><strong>${money(product.price)}</strong></div>
        <button class="cb-product-name" type="button" data-cb-product-open="${product.id}">${esc(product.name)}</button>
        <p class="cb-product-description">${esc(product.description)}</p>
        <div class="cb-product-purchase-row">
          ${stepperMarkup(product, quantity)}
          <button class="cb-add-button" type="button" data-cb-add="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
        </div>
        <div class="cb-product-footer">
          <span class="cb-stock ${product.stock === 0 ? 'out' : ''}">${product.stock === 0 ? 'Out of stock' : `In stock · ${product.stock}`}</span>
          <button class="cb-like-button${liked ? ' liked' : ''}" type="button" data-cb-like="${product.id}" aria-pressed="${liked}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"/></svg>
            <span>${product.likes + (liked ? 1 : 0)}</span>
          </button>
        </div>
      </div>
    </article>`;
  }

  function filterPanelMarkup() {
    const categories = ['Books','Apparel','Accessories','Supplies'];
    const brands = ['Campus Standard','North Hall Press','Studio Union'];
    const sizes = ['S','M','L','XL'];
    return `<aside class="cb-filters-panel${state.filtersOpen ? ' open' : ''}" aria-label="Product filters">
      <div class="cb-filter-header"><h2>Filters</h2><button type="button" data-cb-clear-filters>Clear</button><button class="cb-filter-close" type="button" data-cb-filter-close aria-label="Close filters">×</button></div>
      <fieldset><legend>Category</legend>${categories.map(value => `<label><input type="checkbox" data-cb-filter-category value="${value}" ${state.categories.has(value) ? 'checked' : ''}> ${value}</label>`).join('')}</fieldset>
      <fieldset><legend>Price range</legend>
        <label><input type="radio" name="cbPrice" data-cb-filter-price value="all" ${state.price === 'all' ? 'checked' : ''}> Any price</label>
        <label><input type="radio" name="cbPrice" data-cb-filter-price value="under25" ${state.price === 'under25' ? 'checked' : ''}> Under $25</label>
        <label><input type="radio" name="cbPrice" data-cb-filter-price value="25to50" ${state.price === '25to50' ? 'checked' : ''}> $25–$50</label>
        <label><input type="radio" name="cbPrice" data-cb-filter-price value="over50" ${state.price === 'over50' ? 'checked' : ''}> Over $50</label>
      </fieldset>
      <fieldset><legend>Brand</legend>${brands.map(value => `<label><input type="checkbox" data-cb-filter-brand value="${value}" ${state.brands.has(value) ? 'checked' : ''}> ${value}</label>`).join('')}</fieldset>
      <fieldset><legend>Clothing size</legend><div class="cb-size-options">${sizes.map(value => `<label><input type="checkbox" data-cb-filter-size value="${value}" ${state.sizes.has(value) ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div></fieldset>
      <label class="cb-switch-row"><span>In stock only</span><input type="checkbox" data-cb-filter-stock ${state.inStockOnly ? 'checked' : ''}></label>
      <label class="cb-switch-row"><span>Collectible eligible</span><input type="checkbox" data-cb-filter-collectible ${state.collectibleOnly ? 'checked' : ''}></label>
    </aside>`;
  }

  function activeFiltersMarkup() {
    const chips = [];
    state.categories.forEach(value => chips.push({ type:'category', value, label:value }));
    state.brands.forEach(value => chips.push({ type:'brand', value, label:value }));
    state.sizes.forEach(value => chips.push({ type:'size', value, label:`Size ${value}` }));
    if (state.price !== 'all') chips.push({ type:'price', value:state.price, label:{ under25:'Under $25', '25to50':'$25–$50', over50:'Over $50' }[state.price] });
    if (state.collectibleOnly) chips.push({ type:'collectible', value:'1', label:'Collectible eligible' });
    if (!state.inStockOnly) chips.push({ type:'stock', value:'all', label:'Including out of stock' });
    if (!chips.length) return '';
    return `<div class="cb-active-filters">${chips.map(chip => `<span>${esc(chip.label)}<button type="button" data-cb-remove-filter="${chip.type}" data-cb-remove-value="${esc(chip.value)}" aria-label="Remove ${esc(chip.label)}">×</button></span>`).join('')}</div>`;
  }

  function shopMarkup() {
    const products = filteredProducts();
    return `<section class="cb-page cb-shop-page">
      <div class="cb-shop-heading"><h1><span>${products.length}</span> products</h1></div>
      <div class="cb-catalog-shell${state.filtersOpen ? ' filters-open' : ''}">
        ${filterPanelMarkup()}
        <button class="cb-filter-scrim${state.filtersOpen ? ' open' : ''}" type="button" data-cb-filter-close aria-label="Close filters"></button>
        <div class="cb-catalog-results">
          <div class="cb-catalog-controls">
            <div class="cb-controls-left">
              <button class="cb-control-button" type="button" data-cb-filter-toggle aria-expanded="${state.filtersOpen}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="4"/><path d="M10 4v16"/></svg><span>Filters${activeFilterCount() ? ` · ${activeFilterCount()}` : ''}</span>
              </button>
              <div class="cb-search-control${state.searchOpen ? ' open' : ''}">
                <button class="cb-control-button icon" type="button" data-cb-search-toggle aria-label="Search products"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
                ${state.searchOpen ? `<div class="cb-search-panel"><input type="search" data-cb-search-input placeholder="Search bookstore products" value="${esc(state.search)}" autocomplete="off"><button type="button" data-cb-search-clear aria-label="Clear search">×</button></div>` : ''}
              </div>
            </div>
            <div class="cb-controls-right">
              <label class="cb-sort-control"><span>Sort:</span><select data-cb-sort><option value="featured" ${state.sort === 'featured' ? 'selected' : ''}>Featured</option><option value="low" ${state.sort === 'low' ? 'selected' : ''}>Price: low to high</option><option value="high" ${state.sort === 'high' ? 'selected' : ''}>Price: high to low</option><option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest</option><option value="liked" ${state.sort === 'liked' ? 'selected' : ''}>Most liked</option></select></label>
              <button class="cb-control-button icon" type="button" data-cb-view-toggle aria-label="Switch ${state.view === 'grid' ? 'to list' : 'to grid'} view">
                ${state.view === 'grid' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="4" height="4" rx="1"/><path d="M11 7h9"/><rect x="4" y="15" width="4" height="4" rx="1"/><path d="M11 17h9"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'}
              </button>
            </div>
          </div>
          ${activeFiltersMarkup()}
          ${products.length ? `<div class="cb-product-grid${state.view === 'list' ? ' list-view' : ''}">${products.map(productCardMarkup).join('')}</div>` : `<div class="cb-empty-state"><h2>No products match these filters.</h2><p>Clear one or more filters to see additional items.</p><button type="button" data-cb-clear-filters>Clear filters</button></div>`}
        </div>
      </div>
    </section>`;
  }

  function ordersMarkup(session) {
    if (!state.orders.length) {
      return `<section class="cb-page"><div class="cb-placeholder-heading"><p>Bookstore account</p><h1>Orders</h1><span>Purchases for ${esc(session.email)} will appear here.</span></div><div class="cb-empty-state account"><h2>No bookstore orders yet</h2><p>Add products from the Shop and complete a storefront demo checkout.</p><button type="button" data-cb-section="shop">Browse the store</button></div></section>`;
    }
    return `<section class="cb-page"><div class="cb-placeholder-heading"><p>Bookstore account</p><h1>Orders</h1><span>Storefront demo purchases associated with ${esc(session.email)}.</span></div><div class="cb-orders-list">${state.orders.map(order => `<article class="cb-order-card"><div class="cb-order-head"><div><h2>Order ${esc(order.id)}</h2><p>${esc(order.createdLabel)} · ${order.fulfillment === 'shipping' ? 'Campus delivery' : 'Bookstore pickup'}</p></div><span>Completed</span></div><div class="cb-order-items">${order.items.map(item => `<div><span>${item.quantity} × ${esc(item.name)}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join('')}</div><div class="cb-order-total"><span>Total</span><strong>${money(order.total)}</strong></div></article>`).join('')}</div></section>`;
  }

  function bookshelfMarkup(session) {
    return `<section class="cb-page"><div class="cb-placeholder-heading"><p>Your digital library</p><h1>Bookshelf</h1><span>Linked bookstore account: ${esc(session.email)}</span></div><div class="cb-empty-state account"><div class="cb-empty-symbol">C</div><h2>Bookshelf integration comes next</h2><p>The core Bookstore storefront is connected now. Collectibles and Buddy unlocks will be integrated in a later pass.</p><button type="button" data-cb-section="shop">Return to Shop</button></div></section>`;
  }

  function checkoutMarkup(session) {
    const totals = checkoutTotals();
    return `<section class="cb-page cb-checkout-page">
      <div class="cb-checkout-topbar"><button type="button" data-cb-checkout-back>← <span>Back to cart</span></button><div><p>Campus Bookstore</p><h1>Checkout</h1></div><span>Storefront prototype</span></div>
      <div class="cb-checkout-layout">
        <div class="cb-checkout-column">
          <section class="cb-checkout-card"><div class="cb-checkout-card-head"><div><h2>Your items</h2><p>Review the products in this storefront demo.</p></div><span>${cartCount()} ${cartCount() === 1 ? 'item' : 'items'}</span></div><div class="cb-checkout-items">${state.cart.map(item => { const product = productById(item.id); return product ? `<div><span class="cb-checkout-thumb">${productSvg(product)}</span><span><b>${esc(product.name)}</b><small>${item.quantity} × ${money(product.price)}</small></span><strong>${money(product.price * item.quantity)}</strong></div>` : ''; }).join('')}</div></section>
          <section class="cb-checkout-card"><div class="cb-checkout-card-head"><div><h2>Order options</h2><p>Account and fulfillment for this demo order.</p></div></div><div class="cb-checkout-options"><div><span><b>Campus account</b><small>Already linked from Campus Buddy</small></span><strong>${esc(session.email)}</strong></div><label><span><b>Fulfillment</b><small>Choose pickup or campus delivery</small></span><select data-cb-fulfillment><option value="pickup" ${state.fulfillment === 'pickup' ? 'selected' : ''}>Campus pickup · Free</option><option value="shipping" ${state.fulfillment === 'shipping' ? 'selected' : ''}>Standard shipping · $8.00</option></select></label></div></section>
        </div>
        <aside class="cb-checkout-card cb-checkout-summary"><div class="cb-checkout-card-head"><div><h2>Order summary</h2><p>Calculated from the current cart.</p></div></div><div class="cb-summary-lines"><div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><div><span>Student discount</span><strong>− ${money(totals.discount)}</strong></div><div><span>Fulfillment</span><strong>${totals.shipping ? money(totals.shipping) : 'Free'}</strong></div><div><span>Estimated state tax</span><strong>${money(totals.tax)}</strong></div><div><span>Processing fee</span><strong>${money(totals.fee)}</strong></div><div class="total"><span>Grand total</span><strong>${money(totals.total)}</strong></div></div><button class="cb-place-order" type="button" data-cb-place-order>Complete demo purchase</button><p>Storefront UI only. This pass does not debit Campus Wallet or mint collectibles.</p></aside>
      </div>
    </section>`;
  }

  function cartDrawerMarkup() {
    return `<button class="cb-overlay${state.cartOpen ? ' open' : ''}" type="button" data-cb-cart-close aria-label="Close cart"></button><aside class="cb-cart-drawer${state.cartOpen ? ' open' : ''}" aria-hidden="${!state.cartOpen}"><div class="cb-drawer-header"><div><p>Current order</p><h2>Cart</h2></div><button type="button" data-cb-cart-close aria-label="Close cart">×</button></div>${state.cart.length ? `<div class="cb-cart-items">${state.cart.map(item => { const product = productById(item.id); return product ? `<article class="cb-cart-item"><div class="cb-cart-thumb">${productSvg(product)}</div><div><div class="cb-cart-item-head"><span><b>${esc(product.name)}</b><small>${money(product.price)} each</small></span><strong>${money(product.price * item.quantity)}</strong></div><div class="cb-cart-item-actions">${stepperMarkup(product, item.quantity, 'cart')}<button type="button" data-cb-remove-cart="${product.id}">Remove</button></div></div></article>` : ''; }).join('')}</div><div class="cb-cart-summary"><div><span>Subtotal</span><strong>${money(cartSubtotal())}</strong></div><button type="button" data-cb-checkout>Checkout</button></div>` : `<div class="cb-cart-empty"><p>Your cart is empty.</p><span>Add an item from the shop to begin.</span></div>`}</aside>`;
  }

  function productModalMarkup() {
    const product = productById(state.selectedProductId);
    if (!product) return '';
    return `<div class="cb-modal-layer" data-cb-product-modal-layer><section class="cb-product-modal" role="dialog" aria-modal="true" aria-label="${esc(product.name)} details"><button class="cb-modal-close" type="button" data-cb-product-close aria-label="Close product details">×</button><div class="cb-product-modal-layout"><div class="cb-product-modal-visual">${productSvg(product)}</div><div class="cb-product-modal-copy"><div class="cb-product-modal-meta"><span>${esc(product.category)} · ${esc(product.brand)}</span><strong>${money(product.price)}</strong></div><h2>${esc(product.name)}</h2><p>${esc(product.description)}</p>${product.collectible ? `<button class="cb-modal-collectible" type="button" data-cb-collectible-info><span>C</span><span><b>Collectible eligible</b><small>Integration planned for a later pass.</small></span></button>` : ''}<div class="cb-modal-purchase">${stepperMarkup(product, state.modalQuantity, 'modal')}<button class="cb-add-button" type="button" data-cb-modal-add="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Out of stock' : 'Add to cart'}</button></div></div></div></section></div>`;
  }

  function infoModalMarkup() {
    if (!state.infoOpen) return '';
    return `<div class="cb-modal-layer" data-cb-info-layer><section class="cb-info-modal" role="dialog" aria-modal="true" aria-label="Future integration"><button class="cb-modal-close" type="button" data-cb-info-close aria-label="Close">×</button><div class="cb-info-symbol">C</div><p>Future integration</p><h2>Collectibles are not connected yet</h2><span>The bookstore keeps the collectible indicators from the source demo, but minting and Buddy unlock behavior will be integrated in a later pass.</span></section></div>`;
  }

  function headerMarkup(session) {
    const section = state.section === 'checkout' ? 'shop' : state.section;
    const nav = key => `cb-section-tab${section === key ? ' active' : ''}`;
    return `<header class="cb-site-header"><div class="cb-header-main"><button class="cb-brand" type="button" data-cb-section="shop">Campus Bookstore</button><nav class="cb-section-nav" aria-label="Bookstore sections"><button class="${nav('shop')}" type="button" data-cb-section="shop"><span>Shop</span></button><button class="${nav('orders')}" type="button" data-cb-section="orders"><span>Orders</span></button><button class="${nav('bookshelf')}" type="button" data-cb-section="bookshelf"><span>Bookshelf</span></button></nav><div class="cb-header-actions"><button class="cb-header-icon-button" type="button" data-cb-ai title="AI Assistant"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.75c.75 4.58 4.3 8.13 8.88 8.88-4.58.75-8.13 4.3-8.88 8.88-.75-4.58-4.3-8.13-8.88-8.88C7.7 10.88 11.25 7.33 12 2.75Z"/></svg><span>AI Assistant</span></button><button class="cb-cart-button" type="button" data-cb-cart-open><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg><span>Cart</span><b>${cartCount()}</b></button><button class="cb-login-button logged-in" type="button" data-cb-account title="Linked through Campus Buddy"><i></i><span>${esc(session.email)}</span></button></div></div></header>`;
  }

  function sectionMarkup(session) {
    if (state.section === 'orders') return ordersMarkup(session);
    if (state.section === 'bookshelf') return bookshelfMarkup(session);
    if (state.section === 'checkout') return checkoutMarkup(session);
    return shopMarkup();
  }

  function bookstoreMarkup(session) {
    return `<section class="cb-shell" data-bookstore-ui-v1>${headerMarkup(session)}<div class="cb-body"><main class="cb-main-scroll">${sectionMarkup(session)}</main>${cartDrawerMarkup()}${productModalMarkup()}${infoModalMarkup()}</div></section>`;
  }

  function locationForSection() {
    if (state.section === 'orders') return 'bookstore.campus.local/orders';
    if (state.section === 'bookshelf') return 'bookstore.campus.local/bookshelf';
    if (state.section === 'checkout') return 'bookstore.campus.local/checkout';
    return 'bookstore.campus.local/shop';
  }

  function render(options = {}) {
    const session = getSession();
    const content = $('#campusAppsContent');
    const shell = $('#campusAppsShell');
    if (!session || !content || !shell) return;
    loadForEmail(session.email);
    const scroller = content.querySelector('.cb-main-scroll');
    const previousScroll = options.resetScroll ? 0 : (scroller?.scrollTop || 0);
    shell.classList.add('bookstore-mode');
    content.innerHTML = bookstoreMarkup(session);
    const title = $('#campusAppsTitle');
    if (title && title.textContent !== locationForSection()) title.textContent = locationForSection();
    requestAnimationFrame(() => {
      const nextScroller = content.querySelector('.cb-main-scroll');
      if (nextScroller) nextScroller.scrollTop = previousScroll;
      if (options.focusSearch) {
        const input = content.querySelector('[data-cb-search-input]');
        input?.focus();
        if (input) input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  function setSection(section) {
    if (!['shop','orders','bookshelf'].includes(section)) return;
    state.section = section;
    state.cartOpen = false;
    state.selectedProductId = null;
    state.infoOpen = false;
    render({ resetScroll:true });
  }

  function clearFilters() {
    state.categories.clear();
    state.brands.clear();
    state.sizes.clear();
    state.price = 'all';
    state.collectibleOnly = false;
    state.inStockOnly = true;
    state.search = '';
    render({ resetScroll:true, focusSearch:state.searchOpen });
  }

  function changeSet(set, value, checked) {
    checked ? set.add(value) : set.delete(value);
  }

  function changeQuantity(id, delta, context) {
    const product = productById(id);
    if (!product) return;
    if (context === 'cart') {
      const item = state.cart.find(candidate => candidate.id === product.id);
      if (!item) return;
      item.quantity = Math.max(1, Math.min(product.stock || 1, item.quantity + delta));
      persist();
      render();
      return;
    }
    if (context === 'modal') {
      state.modalQuantity = Math.max(1, Math.min(product.stock || 1, state.modalQuantity + delta));
      render();
      return;
    }
    state.quantities[product.id] = Math.max(1, Math.min(product.stock || 1, (state.quantities[product.id] || 1) + delta));
    render();
  }

  function addToCart(id, quantity) {
    const product = productById(id);
    if (!product || product.stock === 0) return;
    const requested = Math.max(1, Number(quantity) || 1);
    const existing = state.cart.find(item => item.id === product.id);
    const existingQuantity = existing?.quantity || 0;
    const nextQuantity = Math.min(product.stock, existingQuantity + requested);
    if (existing) existing.quantity = nextQuantity;
    else state.cart.push({ id:product.id, quantity:Math.min(product.stock, requested) });
    persist();
    notify(`${product.name} added to cart.`);
    state.selectedProductId = null;
    render();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(item => item.id !== Number(id));
    persist();
    render();
  }

  function openProduct(id) {
    const product = productById(id);
    if (!product) return;
    state.selectedProductId = product.id;
    state.modalQuantity = state.quantities[product.id] || 1;
    render();
  }

  function placeOrder() {
    if (!state.cart.length) return;
    const session = getSession();
    if (!session) return;
    const totals = checkoutTotals();
    const now = new Date();
    const order = {
      id:`CB-${Date.now().toString(36).toUpperCase()}`,
      createdLabel:now.toLocaleString(),
      fulfillment:state.fulfillment,
      email:session.email,
      total:Math.round(totals.total * 100) / 100,
      items:state.cart.map(item => {
        const product = productById(item.id);
        return { id:item.id, name:product?.name || 'Campus item', price:product?.price || 0, quantity:item.quantity };
      })
    };
    state.orders.unshift(order);
    state.cart = [];
    state.section = 'orders';
    state.cartOpen = false;
    persist();
    render({ resetScroll:true });
    notify('Demo bookstore order completed.');
  }

  function removeFilter(type, value) {
    if (type === 'category') state.categories.delete(value);
    if (type === 'brand') state.brands.delete(value);
    if (type === 'size') state.sizes.delete(value);
    if (type === 'price') state.price = 'all';
    if (type === 'collectible') state.collectibleOnly = false;
    if (type === 'stock') state.inStockOnly = true;
    render({ focusSearch:state.searchOpen });
  }

  function syncUi() {
    syncFrame = 0;
    if (syncing) return;
    syncing = true;
    try {
      const shell = $('#campusAppsShell');
      const content = $('#campusAppsContent');
      const title = $('#campusAppsTitle');
      if (!shell || !content || !title || shell.hidden) return;
      const isBookstore = title.textContent.includes('bookstore');
      shell.classList.toggle('bookstore-mode', isBookstore);
      if (!isBookstore) return;
      const session = getSession();
      if (!session) return;
      loadForEmail(session.email);
      if (!content.querySelector('[data-bookstore-ui-v1]')) render({ resetScroll:true });
    } finally {
      syncing = false;
    }
  }

  function queueSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(syncUi);
  }

  document.addEventListener('input', event => {
    if (!event.target.matches?.('[data-cb-search-input]')) return;
    state.search = event.target.value;
    render({ focusSearch:true });
  });

  document.addEventListener('change', event => {
    const root = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!root) return;
    if (event.target.matches('[data-cb-sort]')) {
      state.sort = event.target.value;
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-category]')) {
      changeSet(state.categories, event.target.value, event.target.checked);
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-brand]')) {
      changeSet(state.brands, event.target.value, event.target.checked);
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-size]')) {
      changeSet(state.sizes, event.target.value, event.target.checked);
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-price]')) {
      state.price = event.target.value;
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-stock]')) {
      state.inStockOnly = event.target.checked;
      render();
      return;
    }
    if (event.target.matches('[data-cb-filter-collectible]')) {
      state.collectibleOnly = event.target.checked;
      render();
      return;
    }
    if (event.target.matches('[data-cb-fulfillment]')) {
      state.fulfillment = event.target.value === 'shipping' ? 'shipping' : 'pickup';
      render();
    }
  });

  document.addEventListener('click', event => {
    const root = event.target.closest?.('[data-bookstore-ui-v1]');
    if (!root) return;

    const section = event.target.closest('[data-cb-section]');
    if (section) {
      setSection(section.dataset.cbSection);
      return;
    }
    if (event.target.closest('[data-cb-ai]')) {
      notify('Bookstore AI Assistant integration will be added in a later pass.');
      return;
    }
    if (event.target.closest('[data-cb-account]')) {
      notify(`Campus Bookstore is linked to ${currentEmail}.`);
      return;
    }
    if (event.target.closest('[data-cb-cart-open]')) {
      state.cartOpen = true;
      render();
      return;
    }
    if (event.target.closest('[data-cb-cart-close]')) {
      state.cartOpen = false;
      render();
      return;
    }
    if (event.target.closest('[data-cb-filter-toggle]')) {
      state.filtersOpen = !state.filtersOpen;
      render();
      return;
    }
    if (event.target.closest('[data-cb-filter-close]')) {
      state.filtersOpen = false;
      render();
      return;
    }
    if (event.target.closest('[data-cb-clear-filters]')) {
      clearFilters();
      return;
    }
    if (event.target.closest('[data-cb-search-toggle]')) {
      state.searchOpen = !state.searchOpen;
      render({ focusSearch:state.searchOpen });
      return;
    }
    if (event.target.closest('[data-cb-search-clear]')) {
      state.search = '';
      render({ focusSearch:true });
      return;
    }
    if (event.target.closest('[data-cb-view-toggle]')) {
      state.view = state.view === 'grid' ? 'list' : 'grid';
      render();
      return;
    }
    const removeFilterButton = event.target.closest('[data-cb-remove-filter]');
    if (removeFilterButton) {
      removeFilter(removeFilterButton.dataset.cbRemoveFilter, removeFilterButton.dataset.cbRemoveValue);
      return;
    }
    const quantityButton = event.target.closest('[data-cb-qty]');
    if (quantityButton) {
      changeQuantity(quantityButton.dataset.cbProductId, Number(quantityButton.dataset.cbQty), quantityButton.dataset.cbContext || 'card');
      return;
    }
    const addButton = event.target.closest('[data-cb-add]');
    if (addButton) {
      const id = Number(addButton.dataset.cbAdd);
      addToCart(id, state.quantities[id] || 1);
      return;
    }
    const modalAdd = event.target.closest('[data-cb-modal-add]');
    if (modalAdd) {
      addToCart(modalAdd.dataset.cbModalAdd, state.modalQuantity);
      return;
    }
    const productOpen = event.target.closest('[data-cb-product-open]');
    if (productOpen) {
      openProduct(productOpen.dataset.cbProductOpen);
      return;
    }
    if (event.target.closest('[data-cb-product-close]') || event.target.matches('[data-cb-product-modal-layer]')) {
      state.selectedProductId = null;
      render();
      return;
    }
    if (event.target.closest('[data-cb-collectible-info]')) {
      state.infoOpen = true;
      render();
      return;
    }
    if (event.target.closest('[data-cb-info-close]') || event.target.matches('[data-cb-info-layer]')) {
      state.infoOpen = false;
      render();
      return;
    }
    const like = event.target.closest('[data-cb-like]');
    if (like) {
      const id = Number(like.dataset.cbLike);
      state.liked.has(id) ? state.liked.delete(id) : state.liked.add(id);
      persist();
      render();
      return;
    }
    const removeCart = event.target.closest('[data-cb-remove-cart]');
    if (removeCart) {
      removeFromCart(removeCart.dataset.cbRemoveCart);
      return;
    }
    if (event.target.closest('[data-cb-checkout]')) {
      if (!state.cart.length) return;
      state.cartOpen = false;
      state.section = 'checkout';
      render({ resetScroll:true });
      return;
    }
    if (event.target.closest('[data-cb-checkout-back]')) {
      state.section = 'shop';
      state.cartOpen = true;
      render({ resetScroll:true });
      return;
    }
    if (event.target.closest('[data-cb-place-order]')) {
      placeOrder();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const shell = $('#campusAppsShell');
    const title = $('#campusAppsTitle');
    if (!shell || shell.hidden || !title?.textContent.includes('bookstore')) return;
    if (state.infoOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.infoOpen = false;
      render();
      return;
    }
    if (state.selectedProductId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.selectedProductId = null;
      render();
      return;
    }
    if (state.cartOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.cartOpen = false;
      render();
      return;
    }
    if (state.filtersOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.filtersOpen = false;
      render();
    }
  }, true);

  const start = () => {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(queueSync).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('campus-session-changed', queueSync);
    queueSync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
