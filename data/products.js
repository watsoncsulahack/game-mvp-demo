/*
 * Architecture spike: declarative Bookstore catalog.
 *
 * This is JavaScript rather than fetched JSON so the current no-build demo can
 * still be opened directly from disk. Its contents are intentionally JSON-like;
 * if the app later runs behind a server this shape can move to products.json or
 * an API response without changing the Bookstore model.
 */
(() => {
  'use strict';

  const products = [
    {
      id:'book-introduction-to-design',
      sku:'BOOK-DESIGN-001',
      name:'Introduction to Design',
      description:'A practical visual-design primer for first-year coursework.',
      media:{
        image:'assets/products/introduction-to-design.svg',
        mediaType:'image/svg+xml',
        files:[]
      },
      commerce:{
        category:'books',
        brand:'North Hall Press',
        price:{ amount:38, currency:'USD' },
        inventory:{ stock:18 }
      },
      attributes:{ collectible:true, sizes:[] },
      course:null
    },
    {
      id:'apparel-everyday-campus-hoodie',
      sku:'APPAREL-HOODIE-001',
      name:'Everyday Campus Hoodie',
      description:'A midweight pullover designed for year-round campus wear.',
      media:{
        image:'assets/products/everyday-campus-hoodie.svg',
        mediaType:'image/svg+xml',
        files:[]
      },
      commerce:{
        category:'apparel',
        brand:'Campus Standard',
        price:{ amount:62, currency:'USD' },
        inventory:{ stock:9 }
      },
      attributes:{ collectible:true, sizes:['S','M','L','XL'] },
      course:null
    },
    {
      id:'book-foundations-of-computing',
      sku:'BOOK-COMP-001',
      name:'Foundations of Computing',
      description:'An accessible survey of modern computing concepts and methods.',
      media:{
        image:'assets/products/foundations-of-computing.svg',
        mediaType:'image/svg+xml',
        files:[]
      },
      commerce:{
        category:'books',
        brand:'North Hall Press',
        price:{ amount:54, currency:'USD' },
        inventory:{ stock:15 }
      },
      attributes:{ collectible:false, sizes:[] },
      course:null
    },
    {
      id:'book-business-model-generation',
      sku:'IS635-BOOK-002',
      name:'Business Model Generation',
      description:'Business-model framework listed in the IS 635 required course pack.',
      media:{
        image:'assets/products/business-model-generation.svg',
        mediaType:'image/svg+xml',
        files:[]
      },
      commerce:{
        category:'books',
        brand:'North Hall Press',
        price:{ amount:34, currency:'USD' },
        inventory:{ stock:18 }
      },
      attributes:{ collectible:false, sizes:[] },
      course:{ code:'IS 635', required:true }
    }
  ];

  window.BookstoreCatalog = Object.freeze(products.map(product => Object.freeze(product)));
})();
