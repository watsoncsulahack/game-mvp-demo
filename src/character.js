(() => {
  'use strict';

  const { normalizeAngle, escapeHtml } = window.CampusBuddyCore;
  const ASSET_ROOT = 'assets/buddy/turnaround';
  const VIEWS_ROOT = `${ASSET_ROOT}/views`;
  const ATLAS = `${ASSET_ROOT}/layers-atlas.png`;
  const CELL_WIDTH = 256;
  const CELL_HEIGHT = 640;
  const SHEET_WIDTH = CELL_WIDTH * 8;
  const ATLAS_HEIGHT = CELL_HEIGHT * 15;
  const SOURCE_BODY_COLOR = '#F7FBFC';
  const SOURCE_EYE_COLOR = '#171923';

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

  const LAYER_ROWS = Object.freeze({
    body:0,
    line:1,
    eyes:2,
    'hair-swept':3,
    'hair-swept-line':4,
    'hair-bob':5,
    'hair-bob-line':6,
    'hair-cloud':7,
    'hair-cloud-line':8,
    'outfit-tee':9,
    'outfit-tee-line':10,
    'outfit-hoodie':11,
    'outfit-hoodie-line':12,
    'outfit-jacket':13,
    'outfit-jacket-line':14
  });

  const OUTFIT_COLORS = Object.freeze({ tee:'#5D7FE6', hoodie:'#5FB594', jacket:'#EF9B7F' });
  let renderSerial = 0;

  function viewForAngle(angle) {
    const normalized = normalizeAngle(angle);
    return TURNAROUND_VIEWS.find(view => view.angle === normalized) || TURNAROUND_VIEWS[0];
  }

  function atlasMask(id, row, viewIndex) {
    const x = -viewIndex * CELL_WIDTH;
    const y = -row * CELL_HEIGHT;
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" style="mask-type:luminance"><image href="${ATLAS}" x="${x}" y="${y}" width="${SHEET_WIDTH}" height="${ATLAS_HEIGHT}" image-rendering="optimizeQuality" style="image-rendering:auto"/></mask>`;
  }

  function maskedFill(id, color) {
    return `<rect width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${color}" mask="url(#${id})"/>`;
  }

  function renderCharacter(buddy, { angle=0, crop='full', pose='standing' } = {}) {
    const view = viewForAngle(angle);
    const appearance = buddy.appearance;
    const prefix = `buddy-${++renderSerial}-${view.index}-${crop}-${appearance.hairStyle}-${appearance.outfit}`;
    const customBody = appearance.bodyColor.toUpperCase() !== SOURCE_BODY_COLOR;
    const customEyes = appearance.eyeColor.toUpperCase() !== SOURCE_EYE_COLOR;
    const hasHair = appearance.hairStyle !== 'none';
    const hasOutfit = appearance.outfit !== 'none';
    const bodyId = `${prefix}-body`;
    const eyesId = `${prefix}-eyes`;
    const hairId = `${prefix}-hair`;
    const hairLineId = `${prefix}-hair-line`;
    const outfitId = `${prefix}-outfit`;
    const outfitLineId = `${prefix}-outfit-line`;
    const viewBox = crop === 'bust' ? '0 0 256 250' : crop === 'waist' ? '0 0 256 405' : '0 0 256 640';
    const defs = [];
    const overlays = [];

    if (customBody) {
      defs.push(atlasMask(bodyId,LAYER_ROWS.body,view.index));
      overlays.push(maskedFill(bodyId,appearance.bodyColor));
    }
    if (hasOutfit) {
      defs.push(atlasMask(outfitId,LAYER_ROWS[`outfit-${appearance.outfit}`],view.index));
      defs.push(atlasMask(outfitLineId,LAYER_ROWS[`outfit-${appearance.outfit}-line`],view.index));
      overlays.push(maskedFill(outfitId,OUTFIT_COLORS[appearance.outfit] || OUTFIT_COLORS.tee));
      overlays.push(maskedFill(outfitLineId,'#111318'));
    }
    if (hasHair) {
      defs.push(atlasMask(hairId,LAYER_ROWS[`hair-${appearance.hairStyle}`],view.index));
      defs.push(atlasMask(hairLineId,LAYER_ROWS[`hair-${appearance.hairStyle}-line`],view.index));
      overlays.push(maskedFill(hairId,appearance.hairColor));
      overlays.push(maskedFill(hairLineId,'#111318'));
    }
    if (customEyes) {
      defs.push(atlasMask(eyesId,LAYER_ROWS.eyes,view.index));
      overlays.push(maskedFill(eyesId,appearance.eyeColor));
    }

    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(buddy.name)} ${view.label.toLowerCase()} view" data-turnaround-view="${view.slug}" data-buddy-angle="${view.angle}" data-pose="${pose}" shape-rendering="geometricPrecision" style="image-rendering:auto">
      ${defs.length ? `<defs>${defs.join('')}</defs>` : ''}
      <image href="${view.file}" x="0" y="0" width="256" height="640" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality" style="image-rendering:auto" data-authored-turnaround="true"/>
      ${overlays.join('')}
    </svg>`;
  }

  function renderConsoleHead(buddy) {
    return renderCharacter(buddy,{crop:'bust'}).replace('<svg ','<svg data-console-head="true" ');
  }

  window.CampusBuddyCharacter = Object.freeze({
    ASSET_ROOT,
    VIEWS_ROOT,
    ATLAS,
    CELL_WIDTH,
    CELL_HEIGHT,
    SOURCE_BODY_COLOR,
    SOURCE_EYE_COLOR,
    TURNAROUND_VIEWS,
    LAYER_ROWS,
    OUTFIT_COLORS,
    viewForAngle,
    renderCharacter,
    renderConsoleHead
  });
})();
