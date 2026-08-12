(() => {
  'use strict';

  const { normalizeAngle, escapeHtml } = window.CampusBuddyCore;
  const ASSET_ROOT = 'assets/buddy/turnaround';
  const VIEWS_ROOT = `${ASSET_ROOT}/views`;
  const FRAME = Object.freeze({ width:256, height:640, anchor:Object.freeze({ x:128, y:640, name:'bottom-center' }) });

  const TURNAROUND_VIEWS = Object.freeze([
    { angle:0, index:0, slug:'front', label:'Front', file:`${VIEWS_ROOT}/front.png` },
    { angle:45, index:1, slug:'left-quarter-front', label:'Left quarter front', file:`${VIEWS_ROOT}/left-quarter-front.png` },
    { angle:90, index:2, slug:'left-side', label:'Left side', file:`${VIEWS_ROOT}/left-side.png` },
    { angle:135, index:3, slug:'left-quarter-rear', label:'Left quarter rear', file:`${VIEWS_ROOT}/left-quarter-rear.png` },
    { angle:180, index:4, slug:'rear', label:'Rear', file:`${VIEWS_ROOT}/rear.png` },
    { angle:225, index:5, slug:'right-quarter-rear', label:'Right quarter rear', file:`${VIEWS_ROOT}/right-quarter-rear.png` },
    { angle:270, index:6, slug:'right-side', label:'Right side', file:`${VIEWS_ROOT}/right-side.png` },
    { angle:315, index:7, slug:'right-quarter-front', label:'Right quarter front', file:`${VIEWS_ROOT}/right-quarter-front.png` }
  ]);

  const CLOTHING_CATALOG = Object.freeze({
    top:Object.freeze({
      none:Object.freeze({ label:'No top', shortLabel:'None', description:'Base Buddy layer only.', root:null }),
      'tee-classic':Object.freeze({ label:'Classic campus tee', shortLabel:'Classic tee', description:'Soft cream tee with navy trim.', root:`${ASSET_ROOT}/clothing/tops/shirts/tee-classic` })
    }),
    bottom:Object.freeze({
      none:Object.freeze({ label:'No bottoms', shortLabel:'None', description:'Base Buddy layer only.', root:null }),
      'jeans-wide-leg':Object.freeze({ label:'Wide-leg jeans', shortLabel:'Wide-leg jeans', description:'Relaxed denim with stitched pockets.', root:`${ASSET_ROOT}/clothing/bottoms/jeans-wide-leg` })
    }),
    footwear:Object.freeze({
      none:Object.freeze({ label:'No shoes', shortLabel:'None', description:'Base Buddy layer only.', root:null }),
      'sneakers-low-top':Object.freeze({ label:'Low-top sneakers', shortLabel:'Low-top sneakers', description:'Everyday cream campus sneakers.', root:`${ASSET_ROOT}/clothing/footwear/shoes/sneakers-low-top` })
    })
  });

  const LAYER_ORDER = Object.freeze(['top','bottom','footwear']);

  function viewForAngle(angle) {
    const normalized = normalizeAngle(angle);
    return TURNAROUND_VIEWS.find(view => view.angle === normalized) || TURNAROUND_VIEWS[0];
  }

  function assetUrl(file) {
    if (typeof document === 'undefined' || !document.baseURI || typeof URL === 'undefined') return file;
    try { return new URL(file,document.baseURI).href; } catch { return file; }
  }

  function selectedLayer(appearance, category) {
    const catalog = CLOTHING_CATALOG[category];
    const selected = appearance?.[category];
    return catalog[selected] ? selected : 'none';
  }

  function layerFile(category, id, viewOrAngle = 0) {
    const item = CLOTHING_CATALOG[category]?.[id];
    if (!item?.root) return null;
    const view = typeof viewOrAngle === 'object' ? viewOrAngle : viewForAngle(viewOrAngle);
    return `${item.root}/${view.slug}.png`;
  }

  function equippedLayers(appearance) {
    return Object.fromEntries(LAYER_ORDER.map(category => [category,selectedLayer(appearance,category)]));
  }

  function layerImage(file, category, id, extraClass = '') {
    const source = assetUrl(file);
    return `<img class="buddy-sprite-layer buddy-sprite-layer--${category}${extraClass ? ` ${extraClass}` : ''}" src="${source}" data-source-path="${file}" data-character-layer="${category}" data-layer-id="${id}" width="${FRAME.width}" height="${FRAME.height}" alt="" aria-hidden="true" loading="eager" decoding="sync" draggable="false">`;
  }

  function renderCharacter(buddy, { angle=0, crop='full', pose='standing' } = {}) {
    const view = viewForAngle(angle);
    const appearance = buddy.appearance || {};
    const selected = equippedLayers(appearance);
    const cropName = ['full','waist','bust'].includes(crop) ? crop : 'full';
    const garmentNames = LAYER_ORDER
      .map(category => CLOTHING_CATALOG[category][selected[category]])
      .filter(item => item.root)
      .map(item => item.shortLabel.toLowerCase());
    const label = `${buddy.name} ${view.label.toLowerCase()} view${garmentNames.length ? ` wearing ${garmentNames.join(', ')}` : ''}`;
    const layers = [layerImage(view.file,'body','base','buddy-sprite-layer--body')];

    for (const category of LAYER_ORDER) {
      const id = selected[category];
      const file = layerFile(category,id,view);
      if (file) layers.push(layerImage(file,category,id));
    }

    return `<span class="buddy-sprite buddy-sprite--${cropName}" role="img" aria-label="${escapeHtml(label)}" data-turnaround-view="${view.slug}" data-buddy-angle="${view.angle}" data-pose="${escapeHtml(pose)}" data-anchor="${FRAME.anchor.name}" data-anchor-x="${FRAME.anchor.x}" data-anchor-y="${FRAME.anchor.y}"><span class="buddy-sprite-frame">${layers.join('')}</span></span>`;
  }

  function renderConsoleHead(buddy) {
    return renderCharacter(buddy,{crop:'bust'}).replace('class="buddy-sprite ','class="buddy-sprite buddy-sprite--console ');
  }

  function renderLayerThumbnail(category, id) {
    const item = CLOTHING_CATALOG[category]?.[id];
    if (!item?.root) return '<span class="wardrobe-empty-art" aria-hidden="true">None</span>';
    const file = layerFile(category,id,TURNAROUND_VIEWS[0]);
    return `<img src="${assetUrl(file)}" data-source-path="${file}" width="${FRAME.width}" height="${FRAME.height}" alt="" aria-hidden="true" loading="eager" decoding="sync" draggable="false">`;
  }

  function whenImagesReady(root = document) {
    const images = [...root.querySelectorAll('.buddy-sprite img,.wardrobe-option img')];
    return Promise.all(images.map(image => {
      if (image.complete && image.naturalWidth) return Promise.resolve();
      if (typeof image.decode === 'function') return image.decode().catch(()=>{});
      return new Promise(resolve => {
        image.addEventListener('load',resolve,{once:true});
        image.addEventListener('error',resolve,{once:true});
      });
    }));
  }

  window.CampusBuddyCharacter = Object.freeze({
    ASSET_ROOT,
    VIEWS_ROOT,
    FRAME,
    TURNAROUND_VIEWS,
    CLOTHING_CATALOG,
    LAYER_ORDER,
    viewForAngle,
    assetUrl,
    selectedLayer,
    layerFile,
    equippedLayers,
    renderCharacter,
    renderConsoleHead,
    renderLayerThumbnail,
    whenImagesReady
  });
})();
