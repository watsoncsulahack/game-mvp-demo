/*
 * Architecture spike: one coherent Bookstore module.
 *
 * This file is intentionally NOT wired into index.html. It demonstrates what the
 * current campus-bookstore.js + campus-bookstore-ui.js relationship could become
 * after the historical DOM-patching layer is absorbed into the primary renderer.
 */
(() => {
  'use strict';

  // Keep catalog data inline in this direction. The point of this branch is to
  // test whether one understandable Bookstore module is preferable to multiple
  // cooperating files before introducing another data boundary.
  const PRODUCTS = Object.freeze([
    Object.freeze({ id:1, name:'Introduction to Design', category:'Books', brand:'North Hall Press', price:38, stock:18, collectible:true }),
    Object.freeze({ id:2, name:'Everyday Campus Hoodie', category:'Apparel', brand:'Campus Standard', price:62, stock:9, collectible:true }),
    Object.freeze({ id:7, name:'Foundations of Computing', category:'Books', brand:'North Hall Press', price:54, stock:15, collectible:false })
  ]);

  function createInitialState() {
    return {
      navigation:{
        section:'shop'
      },
      catalog:{
        search:'',
        categories:new Set(),
        brands:new Set(),
        price:'all',
        collectibleOnly:false,
        inStockOnly:true,
        sort:'featured',
        view:'grid'
      },
      overlays:{
        searchOpen:false,
        filtersOpen:false,
        cartOpen:false,
        selectedProductId:null
      },
      commerce:{
        cart:[],
        draftQuantities:Object.fromEntries(PRODUCTS.map(product => [product.id,1])),
        fulfillment:'pickup',
        orders:[]
      },
      liked:new Set()
    };
  }

  function productById(id) {
    return PRODUCTS.find(product => product.id === Number(id)) || null;
  }

  function visibleProducts(state) {
    const query = state.catalog.search.trim().toLowerCase();
    let products = PRODUCTS.filter(product => {
      const searchable = `${product.name} ${product.category} ${product.brand}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (!state.catalog.categories.size || state.catalog.categories.has(product.category))
        && (!state.catalog.brands.size || state.catalog.brands.has(product.brand))
        && (!state.catalog.collectibleOnly || product.collectible)
        && (!state.catalog.inStockOnly || product.stock > 0)
        && (state.catalog.price === 'all'
          || (state.catalog.price === 'under25' && product.price < 25)
          || (state.catalog.price === '25to50' && product.price >= 25 && product.price <= 50)
          || (state.catalog.price === 'over50' && product.price > 50));
    });

    if (state.catalog.sort === 'low') products = products.toSorted((a,b) => a.price - b.price);
    if (state.catalog.sort === 'high') products = products.toSorted((a,b) => b.price - a.price);
    return products;
  }

  function cartSubtotal(state) {
    return state.commerce.cart.reduce((total,item) => {
      const product = productById(item.id);
      return total + (product ? product.price * item.quantity : 0);
    },0);
  }

  function addToCart(state,id,quantity = 1) {
    const product = productById(id);
    if (!product || product.stock < 1) return state;

    const requested = Math.max(1,Math.floor(Number(quantity) || 1));
    const existing = state.commerce.cart.find(item => item.id === product.id);
    if (existing) existing.quantity = Math.min(product.stock,existing.quantity + requested);
    else state.commerce.cart.push({ id:product.id, quantity:Math.min(product.stock,requested) });
    return state;
  }

  function productCardMarkup(product,state) {
    const liked = state.liked.has(product.id);
    const quantity = state.commerce.draftQuantities[product.id] || 1;
    return `<article class="cb-product-card" data-product-id="${product.id}">
      <div class="cb-product-card-body">
        <div class="cb-product-meta"><span>${product.category}</span><strong>$${product.price.toFixed(2)}</strong></div>
        <h2>${product.name}</h2>
        <p>${product.brand}</p>
        <div class="cb-product-purchase-row">
          <div class="cb-stepper"><button data-action="decrement" data-product-id="${product.id}">−</button><output>${quantity}</output><button data-action="increment" data-product-id="${product.id}">+</button></div>
          <button data-action="add" data-product-id="${product.id}" ${product.stock < 1 ? 'disabled' : ''}>${product.stock < 1 ? 'Out of stock' : 'Add to cart'}</button>
        </div>
        <button data-action="like" data-product-id="${product.id}" aria-pressed="${liked}">${liked ? 'Liked' : 'Like'}</button>
      </div>
    </article>`;
  }

  function renderCatalog(root,state) {
    root.innerHTML = visibleProducts(state).map(product => productCardMarkup(product,state)).join('');
  }

  function createStore() {
    const state = createInitialState();
    return {
      state,
      products:PRODUCTS,
      visibleProducts:() => visibleProducts(state),
      productById,
      addToCart:(id,quantity) => addToCart(state,id,quantity),
      cartSubtotal:() => cartSubtotal(state),
      renderCatalog:root => renderCatalog(root,state)
    };
  }

  window.BookstorePrototype = Object.freeze({ createStore, createInitialState });
})();
