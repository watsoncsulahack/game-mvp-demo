(() => {
  'use strict';

  window.BookstoreCatalog = Object.freeze([
    Object.freeze({
      id:'book-foundations-of-computing',
      sku:'BOOK-COMP-001',
      name:'Foundations of Computing',
      description:'An accessible survey of modern computing concepts and methods.',
      media:{ image:'assets/products/foundations-of-computing.svg', mediaType:'image/svg+xml', files:[] },
      commerce:{ category:'books', brand:'North Hall Press', price:{ amount:54, currency:'USD' }, inventory:{ stock:15 } },
      attributes:{ collectible:true, sizes:[] },
      digitalAsset:{
        tokenizable:true,
        metadata:{
          name:'Foundations of Computing',
          image:'assets/products/foundations-of-computing.svg',
          mediaType:'image/svg+xml',
          description:'Digital companion collectible for Foundations of Computing.',
          files:[]
        }
      }
    })
  ]);
})();
