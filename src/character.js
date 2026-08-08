(() => {
  'use strict';

  const { normalizeAngle, escapeHtml } = window.CampusBuddyCore;
  const ASSET_ROOT = 'assets/buddy/turnaround';
  const ATLAS = `${ASSET_ROOT}/layers-atlas.png`;
  const CELL_WIDTH = 256;
  const CELL_HEIGHT = 640;
  const SHEET_WIDTH = CELL_WIDTH * 8;
  const ATLAS_HEIGHT = CELL_HEIGHT * 15;

  const TURNAROUND_VIEWS = Object.freeze([
    { angle:0, index:0, slug:'front', label:'Front' },
    { angle:45, index:1, slug:'left-quarter-front', label:'Left quarter front' },
    { angle:90, index:2, slug:'left-side', label:'Left side' },
    { angle:135, index:3, slug:'left-quarter-rear', label:'Left quarter rear' },
    { angle:180, index:4, slug:'rear', label:'Rear' },
    { angle:225, index:5, slug:'right-quarter-rear', label:'Right quarter rear' },
    { angle:270, index:6, slug:'right-side', label:'Right side' },
    { angle:315, index:7, slug:'right-quarter-front', label:'Right quarter front' }
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

  let renderSerial = 0;

  const OUTFIT_COLORS = Object.freeze({
    tee:'#5D7FE6',
    hoodie:'#5FB594',
    jacket:'#EF9B7F'
  });

  function viewForAngle(angle) {
    const normalized = normalizeAngle(angle);
    return TURNAROUND_VIEWS.find(view => view.angle === normalized) || TURNAROUND_VIEWS[0];
  }

  function atlasMask(id, row, viewIndex) {
    const x = -viewIndex * CELL_WIDTH;
    const y = -row * CELL_HEIGHT;
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" style="mask-type:luminance"><image href="${ATLAS}" x="${x}" y="${y}" width="${SHEET_WIDTH}" height="${ATLAS_HEIGHT}"/></mask>`;
  }

  function maskedFill(id, color) {
    return `<rect width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${color}" mask="url(#${id})"/>`;
  }

  function renderCharacter(buddy, { angle=0, crop='full', pose='standing' } = {}) {
    const view = viewForAngle(angle);
    const appearance = buddy.appearance;
    const prefix = `buddy-${++renderSerial}-${view.index}-${crop}-${appearance.hairStyle}-${appearance.outfit}`;
    const bodyId = `${prefix}-body`;
    const lineId = `${prefix}-line`;
    const eyesId = `${prefix}-eyes`;
    const hairId = `${prefix}-hair`;
    const hairLineId = `${prefix}-hair-line`;
    const outfitId = `${prefix}-outfit`;
    const outfitLineId = `${prefix}-outfit-line`;
    const viewBox = crop === 'bust' ? '0 0 256 250' : crop === 'waist' ? '0 0 256 405' : '0 0 256 640';
    const hair = appearance.hairStyle === 'none' ? '' : `${atlasMask(hairId,LAYER_ROWS[`hair-${appearance.hairStyle}`],view.index)}${atlasMask(hairLineId,LAYER_ROWS[`hair-${appearance.hairStyle}-line`],view.index)}`;
    const outfit = appearance.outfit === 'none' ? '' : `${atlasMask(outfitId,LAYER_ROWS[`outfit-${appearance.outfit}`],view.index)}${atlasMask(outfitLineId,LAYER_ROWS[`outfit-${appearance.outfit}-line`],view.index)}`;

    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(buddy.name)} ${view.label.toLowerCase()} view" data-turnaround-view="${view.slug}" data-buddy-angle="${view.angle}" data-pose="${pose}">
      <defs>
        ${atlasMask(bodyId,LAYER_ROWS.body,view.index)}
        ${atlasMask(lineId,LAYER_ROWS.line,view.index)}
        ${atlasMask(eyesId,LAYER_ROWS.eyes,view.index)}
        ${hair}${outfit}
      </defs>
      ${maskedFill(bodyId,appearance.bodyColor)}
      ${appearance.outfit === 'none' ? '' : `${maskedFill(outfitId,OUTFIT_COLORS[appearance.outfit] || OUTFIT_COLORS.tee)}${maskedFill(outfitLineId,'#111318')}`}
      ${appearance.hairStyle === 'none' ? '' : `${maskedFill(hairId,appearance.hairColor)}${maskedFill(hairLineId,'#111318')}`}
      ${maskedFill(lineId,'#111318')}
      ${maskedFill(eyesId,appearance.eyeColor)}
    </svg>`;
  }

  function renderConsoleHead(buddy) {
    return renderCharacter(buddy,{crop:'bust'}).replace('<svg ','<svg data-console-head="true" ');
  }

  window.CampusBuddyCharacter = Object.freeze({
    ASSET_ROOT,
    ATLAS,
    CELL_WIDTH,
    CELL_HEIGHT,
    TURNAROUND_VIEWS,
    LAYER_ROWS,
    OUTFIT_COLORS,
    viewForAngle,
    renderCharacter,
    renderConsoleHead
  });
})();