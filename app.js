(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  const palettes = {
    shell: ['#eafcff','#cdeff6','#d9e7ff','#e9ddff','#d8f5ec'],
    signal: ['#69e7b0','#55d4dc','#fff1a8','#ff9fd2','#d9c4ff'],
    hair: ['#26354d','#5b3a2f','#a8673d','#e2bd69','#76588f']
  };

  const dispositions = {
    curious: 'Curious Buddies ask follow-up questions and notice patterns.',
    steady: 'Steady Buddies prefer clear routines, calm plans, and follow-through.',
    playful: 'Playful Buddies develop jokes, wordplay, and surprising reactions.',
    bold: 'Bold Buddies propose experiments and encourage decisive action.',
    reflective: 'Reflective Buddies connect today with earlier memories and themes.'
  };

  const state = {
    step: 1,
    email: '',
    campus: 'University',
    identity: 'BUDDY-000000',
    room: 'sunlit',
    time: 'day',
    view: 'room',
    wallet: 60,
    pal: {
      name: 'Mika',
      disposition: 'curious',
      shell: 0,
      signal: 0,
      shellColor: '#f7fbfc',
      signalColor: '#171923',
      hair: 'none',
      hairColor: 0,
      hairColorValue: '#26354d',
      outfit: 'none'
    },
    player: { x: 8, y: 7, displayX: 8, displayY: 7, dir: 'down', step: 0, movement: null },
    activity: 'center',
    actionRing: false,
    consoleSelected: false,
    consoleTool: null,
    remarkTimer: null,
    previewAngle: 0
  };

  const roomThemes = {
    sunlit: { wall:'#d9bd95', wall2:'#c79f72', floor:'#b67540', rug:'#344f83', bedding:'#325385', accent:'#ffd261', sky:'#83d9ed', label:'Fresh Daytime Dorm' },
    tech: { wall:'#a8bfd2', wall2:'#748da5', floor:'#526a80', rug:'#2c4675', bedding:'#3a5f91', accent:'#62e2dc', sky:'#7cc5e9', label:'Gamer Dorm' },
    creative: { wall:'#d8a8a6', wall2:'#b97882', floor:'#b47555', rug:'#76518f', bedding:'#8c5f87', accent:'#ffd360', sky:'#98dfea', label:'Cozy Warm Dorm' }
  };

  function hashText(text) {
    let h = 2166136261;
    for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return Math.abs(h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function profileFromEmail(email) {
    const domain = email.split('@')[1] || 'university.edu';
    let campus = domain.split('.')[0].replace(/[-_]/g,' ');
    if (/csulb|student\.csulb/i.test(domain)) campus = 'California State University, Long Beach';
    else campus = campus.replace(/\b\w/g, c => c.toUpperCase()) || 'University';
    return { campus, identity: `BUDDY-${hashText(email).slice(0,6)}` };
  }

  const PREVIEW_ANGLES = [0,90,180,270];
  const PREVIEW_VIEW_LABELS = { 0:'Front', 90:'Right side', 180:'Back', 270:'Left side' };

  function normalizePreviewAngle(angle) {
    return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  }

  function hairMarkup(style, color, view) {
    if (style === 'none') return '';
    const side = view === 'side';
    const back = view === 'back';
    const shapes = {
      swept: side ? 'M129 91Q130 48 165 41Q197 42 207 70Q184 62 164 76L140 111Z' : back ? 'M113 104Q114 48 160 40Q207 48 208 106L199 149Q178 138 160 145Q141 138 121 149Z' : 'M112 104Q113 50 159 41Q204 47 211 96Q187 72 162 78Q137 83 120 118Z',
      bob: side ? 'M128 96Q128 48 165 41Q203 44 209 80L203 164L181 151L169 75L140 113L140 165L122 151Z' : back ? 'M110 102Q111 47 160 40Q210 47 210 105L207 173Q184 160 160 168Q136 160 113 173Z' : 'M110 104Q111 49 159 41Q207 49 211 103L207 169L187 156L188 85Q161 70 134 88L133 158L112 170Z',
      cloud: side ? 'M123 87Q122 57 146 51Q158 31 179 45Q201 36 211 59Q226 69 218 91Q222 110 201 115Q183 125 166 111L142 123Q121 116 123 87Z' : 'M105 92Q103 62 130 53Q143 30 166 44Q191 32 203 57Q222 66 215 91Q220 112 198 118Q180 129 160 113Q139 129 119 117Q98 110 105 92Z'
    };
    return `<path data-hair="true" d="${shapes[style] || shapes.swept}" fill="${color}" stroke="#11131a" stroke-width="5" stroke-linejoin="round"/>`;
  }

  function outfitMarkup(style, view) {
    if (style === 'none') return '';
    const side=view==='side';
    const palette=style==='hoodie'?['#5fb594','#397b69','#38546d']:style==='jacket'?['#ef9b7f','#fff5dc','#4d6178']:['#5d7fe6','#dff7ff','#405675'];
    const [top,trim,pants]=palette;
    return side
      ? `<g data-outfit="true"><path d="M137 175Q160 163 185 177L198 217L190 345H137L130 218Z" fill="${top}" stroke="#11131a" stroke-width="6"/><path d="M138 339L188 339L200 482Q202 497 190 502L176 500L161 383L154 495Q151 506 139 503L127 497L136 339Z" fill="${pants}" stroke="#11131a" stroke-width="6"/>${style==='hoodie'?`<path d="M140 179Q160 151 181 177L174 204L159 192L147 205Z" fill="${trim}"/>`:''}</g>`
      : `<g data-outfit="true"><path d="M103 181Q160 157 217 181L230 224L211 236L203 348H117L109 236L90 224Z" fill="${top}" stroke="#11131a" stroke-width="6"/><path d="M118 342H202L209 481Q213 498 198 503H180L161 390L143 503H124Q108 498 112 481Z" fill="${pants}" stroke="#11131a" stroke-width="6"/>${style==='hoodie'?`<path d="M129 179Q160 145 191 179L180 210L160 193L140 210Z" fill="${trim}" stroke="#11131a" stroke-width="4"/>`:style==='jacket'?`<path d="M132 177L160 210L188 177M160 210V342" fill="none" stroke="${trim}" stroke-width="6"/>`:`<path d="M142 177Q160 192 178 177" fill="none" stroke="${trim}" stroke-width="5"/>`}</g>`;
  }

  function characterMarkup({ pose = 'standing', angle = 0 } = {}) {
    const normalized = normalizePreviewAngle(angle);
    const mirrored = normalized === 270;
    const view = normalized === 180 ? 'back' : normalized === 90 || normalized === 270 ? 'side' : 'front';
    const shell = state.pal.shellColor || palettes.shell[state.pal.shell];
    const signal = state.pal.signalColor || palettes.signal[state.pal.signal];
    const hair = state.pal.hairColorValue || palettes.hair[state.pal.hairColor];
    // Each view has its own softly irregular silhouette. The uneven head, broad
    // shoulders, low hands, long legs, and directional feet preserve the human
    // proportions and hand-drawn warmth of the supplied character sheets.
    const frontPath = 'M153 37C136 36 122 41 115 54C110 64 111 78 110 96L109 112C109 132 118 147 138 158L138 177C113 181 96 193 86 211C82 220 81 237 79 259L72 315C70 330 75 342 85 349L80 361C76 370 80 380 90 384C100 388 110 382 113 372L117 360C120 353 118 347 112 343L126 348C129 365 127 386 124 408L116 477L98 500C91 509 96 516 108 516H137C148 516 152 510 153 499L157 323C158 315 163 315 164 323L168 499C169 511 175 516 186 516H214C226 516 230 509 223 500L205 477L199 407C196 385 194 366 197 349L210 343C204 347 202 353 205 360L211 372C214 381 222 387 232 383C241 379 244 369 239 360L234 348C244 340 248 328 246 313L240 259C238 236 237 220 232 210C223 193 204 181 181 177L181 159C199 149 208 133 209 112L208 76C207 54 193 41 172 37C166 36 159 36 153 37Z';
    const backPath = 'M149 37C129 37 115 50 112 68L111 111C110 132 121 148 139 157L139 178C114 181 95 192 85 211C80 224 79 247 77 271L71 339C70 354 76 366 87 372L80 385C75 396 80 407 91 411C103 414 112 406 115 395L120 380C123 370 119 363 112 359L126 354L123 405L116 477L99 500C92 510 97 516 109 516H139C149 516 153 510 154 499L158 326C159 318 164 318 165 326L169 499C170 511 176 516 187 516H212C224 516 229 508 222 500L205 477L199 405L196 355L208 352C202 358 199 367 202 376L208 389C213 400 223 405 233 399C243 393 245 382 239 372L233 360C242 352 246 340 244 325L239 258C237 235 235 219 229 208C219 191 201 181 181 178L181 157C199 148 208 133 208 113L207 70C205 51 190 40 170 37C163 36 156 36 149 37Z';
    const sidePath = 'M148 37C128 37 115 49 112 70L111 117C110 138 120 151 138 158L147 162L146 179C126 183 113 196 109 217C106 241 106 277 107 310C107 333 111 349 118 361L114 473L96 495C87 506 91 514 104 517C122 520 145 517 163 512L204 497C214 493 218 484 212 479C206 474 192 474 178 472L175 365C181 372 190 376 198 371C208 366 212 357 210 345L207 222C205 201 194 189 176 184H170C162 184 157 178 157 169C157 161 162 155 170 154H174C189 153 198 144 201 131C204 120 205 99 201 78C197 55 181 41 160 38C156 37 152 36 148 37Z';
    const bodyPath = view === 'side' ? sidePath : view === 'back' ? backPath : frontPath;
    const eyes = view === 'back' ? '' : view === 'side'
      ? `<path data-signal-eye="true" d="M181 76C179 89 179 105 178 119" fill="none" stroke="${signal}" stroke-width="10" stroke-linecap="round"/>`
      : `<path data-signal-eye="true" d="M129 78C128 90 128 103 129 114" fill="none" stroke="${signal}" stroke-width="10" stroke-linecap="round"/><path data-signal-eye="true" d="M186 78C184 90 184 103 185 115" fill="none" stroke="${signal}" stroke-width="10" stroke-linecap="round"/>`;
    const limbDetail = view === 'side'
      ? '<path data-limb-detail="arm" d="M171 204C169 245 168 294 170 331C171 348 176 360 184 367" fill="none" stroke="#11131a" stroke-width="7" stroke-linecap="round"/>'
      : '<path data-limb-detail="arms" d="M121 219C120 257 117 306 113 342M201 219C202 258 205 307 209 342" fill="none" stroke="#11131a" stroke-width="7" stroke-linecap="round"/>';
    const transform = `${mirrored ? 'translate(320 0) scale(-1 1)' : ''}${pose === 'sitting' ? ' rotate(5 160 330)' : ''}`;
    return `<g transform="${transform}" data-entity-view="${normalized}">
      <ellipse cx="160" cy="522" rx="69" ry="9" fill="#58758a" opacity=".16"/>
      <path data-base-body="true" d="${bodyPath}" fill="${shell}" stroke="#11131a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${limbDetail}
      <path data-anatomy="neck" d="M138 158V178H181V158" fill="none" stroke="transparent"/>
      ${view==='side' ? '<path data-visible-arm="true" data-anatomy="hand" d="M207 222L210 345C212 357 208 366 198 371C190 376 181 372 175 365" fill="none" stroke="transparent"/>' : '<path data-visible-arm="true" data-anatomy="hand" d="M86 211L72 326C70 342 75 354 85 361L78 375C73 386 78 397 88 402C99 407 109 401 114 390" fill="none" stroke="transparent"/><path data-visible-arm="true" data-anatomy="hand" d="M232 210L246 324C248 339 244 352 234 360L241 374C248 384 245 396 235 401C224 407 214 402 209 391" fill="none" stroke="transparent"/>'}
      <path data-anatomy="foot" d="M116 477L98 500C91 509 96 516 108 516H137M205 477L223 500C230 509 226 516 214 516H182" fill="none" stroke="transparent"/>
      ${eyes}
      ${hairMarkup(state.pal.hair, hair, view)}
      ${outfitMarkup(state.pal.outfit, view)}
    </g>`;
  }

  function characterSvg({ crop = 'full', pose = 'standing', angle = 0 } = {}) {
    const normalized = normalizePreviewAngle(angle);
    const viewBox = crop === 'bust' ? '66 40 188 220' : crop === 'waist' ? '43 38 234 375' : '28 30 264 500';
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(state.pal.name)} simple customizable Buddy, ${PREVIEW_VIEW_LABELS[normalized]} view">
      ${characterMarkup({pose,angle:normalized})}
    </svg>`;
  }

  function consoleFormSvg() {
    const shell=state.pal.shellColor||palettes.shell[state.pal.shell];
    const signal=state.pal.signalColor||palettes.signal[state.pal.signal];
    const hair=state.pal.hairColorValue || palettes.hair[state.pal.hairColor];
    const consoleHair=state.pal.hair==='none'?'':state.pal.hair==='bob'
      ? `<path d="M62 111V65Q65 31 128 29Q190 31 194 65V130H174V73Q128 51 83 73V126H62Z" fill="${hair}"/>`
      : state.pal.hair==='cloud'
        ? `<path d="M58 78Q48 51 77 44Q91 17 116 34Q145 13 161 37Q192 31 201 58Q211 82 185 91Q156 74 128 86Q95 72 58 78Z" fill="${hair}"/>`
        : `<path d="M61 80Q63 31 126 28Q184 31 197 70Q155 49 79 98Z" fill="${hair}"/>`;
    return `<svg data-console-head="true" viewBox="0 0 256 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(state.pal.name)} low-resolution Console head" shape-rendering="crispEdges">
      <defs><linearGradient id="consoleHeadFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".58" stop-color="${shell}"/><stop offset="1" stop-color="#c9ced4"/></linearGradient></defs>
      <path d="M128 35Q71 35 67 87V127Q68 166 96 183L96 207H160V183Q188 166 189 127V87Q185 35 128 35Z" fill="url(#consoleHeadFill)" stroke="#252932" stroke-width="8"/>
      ${consoleHair}
      <rect x="93" y="88" width="12" height="58" rx="6" fill="${signal}"/><rect x="151" y="88" width="12" height="58" rx="6" fill="${signal}"/>
      <path d="M80 58V156M90 48H166" fill="none" stroke="#fff" stroke-width="6" opacity=".45"/>
    </svg>`;
  }

  function renderPreviewCharacter() {
    const angle = normalizePreviewAngle(state.previewAngle);
    const label = PREVIEW_VIEW_LABELS[angle];
    $('#fullArtPreview').innerHTML = characterSvg({crop:'full',expression:'smile',angle});
    $('#rotationStatus').textContent = `${label} · ${angle}°`;
    $('#artViewport').setAttribute('aria-label', `Rotate Buddy. ${label} view. Drag horizontally or use Left and Right Arrow keys.`);
  }

  function renderCharacterEverywhere() {
    renderPreviewCharacter();
    $('#initArt').innerHTML = characterSvg({crop:'full',expression:'smile'});
    $('#headerPortrait').innerHTML = characterSvg({crop:'bust',expression:'smile'});
    $('#dialogueArt').innerHTML = characterSvg({crop:'waist',expression:'smile'});
    $('#quickBust').innerHTML = characterSvg({crop:'bust',expression:'talk'});
    $('#consolePal').innerHTML = consoleFormSvg();
    if ($('#previewName')) $('#previewName').textContent = state.pal.name;
    if ($('#previewTrait')) $('#previewTrait').textContent = `${capitalize(state.pal.disposition)} starting disposition`;
    $('#headerPalName').textContent = state.pal.name;
    $('#dialogueName').textContent = state.pal.name;
    $('#quickSpeaker').textContent = state.pal.name;
  }

  function setStep(step) {
    state.step = step;
    $$('.onboarding-step').forEach(section => section.hidden = Number(section.dataset.step) !== step);
    $$('[data-step-dot]').forEach(dot => {
      const n = Number(dot.dataset.stepDot);
      dot.classList.toggle('active', n === step);
      dot.classList.toggle('done', n < step);
    });
    renderCharacterEverywhere();
    $('.onboarding-step:not([hidden])')?.scrollTo(0, 0);
  }


  function buildChoices() {
    Object.keys(dispositions).forEach(key => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.disposition = key;
      button.textContent = capitalize(key);
      button.addEventListener('click', () => {
        state.pal.disposition = key;
        $('#dispositionHelp').textContent = dispositions[key];
        syncChoices();
      });
      $('#dispositionChoices').append(button);
    });
    const hairStyles = {none:'None',swept:'Swept',bob:'Bob',cloud:'Cloud'};
    Object.entries(hairStyles).forEach(([key,label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.hair = key; button.textContent = label;
      button.addEventListener('click', () => { state.pal.hair = key; syncChoices(); });
      $('#hairChoices').append(button);
    });
    const clothing = {none:'None',tee:'Campus tee',hoodie:'Soft hoodie',jacket:'Light jacket'};
    Object.entries(clothing).forEach(([key,label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.outfit = key; button.textContent = label;
      button.addEventListener('click', () => { state.pal.outfit = key; syncChoices(); });
      $('#outfitChoices').append(button);
    });
    setupHueControl('shell', 187, 80, 92, state.pal.shellColor);
    setupHueControl('signal', 240, 82, 48, state.pal.signalColor);
    setupHueControl('hair', 215, 58, 28, state.pal.hairColorValue);
    syncChoices();
  }

  function hslToHex(hue, saturation, lightness) {
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const segment = ((hue % 360) + 360) % 360 / 60;
    const x = chroma * (1 - Math.abs(segment % 2 - 1));
    const [r1,g1,b1] = segment < 1 ? [chroma,x,0] : segment < 2 ? [x,chroma,0] : segment < 3 ? [0,chroma,x] : segment < 4 ? [0,x,chroma] : segment < 5 ? [x,0,chroma] : [chroma,0,x];
    const m = l - chroma / 2;
    return `#${[r1,g1,b1].map(value => Math.round((value + m) * 255).toString(16).padStart(2,'0')).join('').toUpperCase()}`;
  }

  function setupHueControl(field, initialHue, saturation, lightness, initialColor) {
    const input = $(`#${field}Hue`);
    const output = $(`#${field}ColorOutput`);
    const applyColor = color => {
      if (field === 'hair') state.pal.hairColorValue = color;
      else state.pal[`${field}Color`] = color;
      if (output) output.value = color.toUpperCase();
      renderCharacterEverywhere();
    };
    input.value = String(initialHue);
    input.addEventListener('input', () => applyColor(hslToHex(Number(input.value), saturation, lightness)));
    applyColor(initialColor);
  }

  function syncChoices() {
    $$('[data-disposition]').forEach(button => button.classList.toggle('active', button.dataset.disposition === state.pal.disposition));
    $$('[data-hair]').forEach(button => button.classList.toggle('active', button.dataset.hair === state.pal.hair));
    $$('[data-outfit]').forEach(button => button.classList.toggle('active', button.dataset.outfit === state.pal.outfit));
    const hasHair = state.pal.hair !== 'none';
    $('#hairColorField').hidden = !hasHair;
    $('.design-fields').dataset.hasHair = String(hasHair);

    $('#palName').value = state.pal.name;
    renderCharacterEverywhere();
  }

  function fillReview() {
    const profile = profileFromEmail(state.email);
    state.campus = profile.campus;
    state.identity = profile.identity;
    $('#reviewName').textContent = state.pal.name;
    $('#reviewDisposition').textContent = capitalize(state.pal.disposition);
    $('#reviewEmail').textContent = state.email;
    $('#reviewCampus').textContent = state.campus;
    $('#reviewIdentity').textContent = state.identity;
  }

  function validateEmail(value) { return /^[^\s@]+@[^\s@]+\.edu$/i.test(value.trim()); }

  function initializePal() {
    $('#initialization').hidden = false;
    const statuses = [
      ['Building local identity…',18],
      ['Saving Buddy appearance…',42],
      ['Preparing dorm state…',67],
      ['Linking Home and Explorer Mode…',88],
      ['Initialization complete.',100]
    ];
    let index = 0;
    const advance = () => {
      const [label,value] = statuses[index];
      $('#initStatus').textContent = label;
      $('#initProgress').style.width = `${value}%`;
      index += 1;
      if (index < statuses.length) setTimeout(advance, 430);
      else setTimeout(() => {
        $('#initialization').hidden = true;
        $('#onboarding').hidden = true;
        enterGame();
      }, 520);
    };
    advance();
  }

  function drawRoomPreview(canvas, roomKey) {
    const ctx = canvas.getContext('2d');
    const t = roomThemes[roomKey];
    const w = canvas.width, h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = t.wall; ctx.fillRect(0,0,w,h*0.55);
    ctx.fillStyle = t.floor; ctx.fillRect(0,h*0.55,w,h*0.45);
    ctx.strokeStyle = 'rgba(20,36,74,.25)'; ctx.lineWidth=1;
    for(let y=h*.55;y<h;y+=14){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.fillStyle=t.sky;ctx.fillRect(w*.37,h*.08,w*.28,h*.28);ctx.strokeStyle='#14244a';ctx.lineWidth=4;ctx.strokeRect(w*.37,h*.08,w*.28,h*.28);
    ctx.fillStyle=t.bedding;ctx.fillRect(w*.05,h*.42,w*.31,h*.34);ctx.strokeRect(w*.05,h*.42,w*.31,h*.34);
    ctx.fillStyle='#8a572f';ctx.fillRect(w*.42,h*.43,w*.31,h*.12);ctx.strokeRect(w*.42,h*.43,w*.31,h*.12);
    ctx.fillStyle='#293d64';ctx.fillRect(w*.53,h*.26,w*.11,h*.17);ctx.strokeRect(w*.53,h*.26,w*.11,h*.17);
    ctx.fillStyle='#755035';ctx.fillRect(w*.79,h*.19,w*.16,h*.48);ctx.strokeRect(w*.79,h*.19,w*.16,h*.48);
    ctx.fillStyle=t.rug;ctx.fillRect(w*.35,h*.68,w*.34,h*.22);ctx.strokeRect(w*.35,h*.68,w*.34,h*.22);
  }

  function drawRoomPreviews() { $$('[data-room-preview]').forEach(canvas => drawRoomPreview(canvas, canvas.dataset.roomPreview)); }

  function roomSceneSvg({ includeBuddy = true, includeStatus = true } = {}) {
    const t = roomThemes[state.room];
    const shell=state.pal.shellColor||palettes.shell[state.pal.shell];
    const signal=state.pal.signalColor||palettes.signal[state.pal.signal];
    const night = state.time === 'night';
    const sunset = state.time === 'sunset';
    const sky = night ? '#172a59' : sunset ? '#ef8d73' : t.sky;
    const overlay = night ? '<rect width="1200" height="650" fill="#132550" opacity=".40"/>' : sunset ? '<rect width="1200" height="650" fill="#e66d58" opacity=".14"/>' : '';
    const activity = state.activity;
    let palTransform = 'translate(472 128) scale(.70)';
    let pose = 'standing';
    if (activity === 'desk') { palTransform = 'translate(560 125) scale(.58)'; pose = 'sitting'; }
    if (activity === 'bed') { palTransform = 'translate(190 190) scale(.55)'; pose = 'sitting'; }
    if (activity === 'bookshelf') palTransform = 'translate(825 145) scale(.60)';
    if (activity === 'window') palTransform = 'translate(480 115) scale(.62)';
    const activityLabel = {center:'hanging out',desk:'working at the computer',bed:'sitting on the bed',bookshelf:'looking through the shelf',window:'watching campus outside'}[activity];
    return `<svg viewBox="0 0 1200 650" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="${escapeHtml(t.label)} Home">
      <rect width="1200" height="650" fill="${t.wall}"/>
      <rect y="420" width="1200" height="230" fill="${t.floor}"/>
      ${Array.from({length:15},(_,i)=>`<path d="M${i*90} 420L${i*75-80} 650" stroke="#693f2c" stroke-width="2" opacity=".32"/>`).join('')}
      ${Array.from({length:7},(_,i)=>`<path d="M0 ${445+i*36}H1200" stroke="#693f2c" stroke-width="2" opacity=".25"/>`).join('')}
      <rect x="405" y="70" width="300" height="230" fill="${sky}" stroke="#14244a" stroke-width="12"/>
      <path d="M555 70V300M405 184H705" stroke="#14244a" stroke-width="8"/>
      <path d="M415 255Q500 176 585 252Q650 190 695 245V292H415Z" fill="#5e9b79" opacity="${night?.45:.88}"/>
      <circle cx="650" cy="118" r="28" fill="${night?'#f1e7b8':'#fff1a8'}"/>
      <g aria-label="bed"><rect x="58" y="334" width="345" height="155" rx="8" fill="#7b4a2c" stroke="#14244a" stroke-width="8"/><rect x="73" y="300" width="310" height="155" rx="8" fill="${t.bedding}" stroke="#14244a" stroke-width="8"/><rect x="79" y="304" width="142" height="62" rx="16" fill="#fff6df" stroke="#14244a" stroke-width="6"/><path d="M235 306v145" stroke="#d7e6ff" stroke-width="5" opacity=".4"/></g>
      <g aria-label="desk"><rect x="468" y="327" width="343" height="34" fill="#86522d" stroke="#14244a" stroke-width="7"/><rect x="493" y="359" width="25" height="145" fill="#86522d" stroke="#14244a" stroke-width="6"/><rect x="760" y="359" width="25" height="145" fill="#86522d" stroke="#14244a" stroke-width="6"/><rect x="566" y="215" width="144" height="108" rx="5" fill="#1c315d" stroke="#14244a" stroke-width="8"/><rect x="579" y="228" width="118" height="78" fill="#4e9de7"/><circle cx="638" cy="267" r="20" fill="none" stroke="#eaffff" stroke-width="6"/><path d="M626 267l9 9 17-20" fill="none" stroke="#eaffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="625" y="323" width="25" height="18" fill="#14244a"/><path d="M590 362h118" stroke="#14244a" stroke-width="10"/><rect x="620" y="366" width="58" height="105" rx="16" fill="#263d68" stroke="#14244a" stroke-width="7"/></g>
      <g aria-label="bookshelf"><rect x="885" y="140" width="245" height="365" fill="#765032" stroke="#14244a" stroke-width="9"/>${[220,310,400].map(y=>`<path d="M892 ${y}h230" stroke="#14244a" stroke-width="7"/>`).join('')}${[[910,169,32,'#274e77'],[945,159,24,'#aa5b54'],[976,176,35,'#d4ad4c'],[1020,157,28,'#3e6b5c'],[1060,172,39,'#704c83'],[914,240,46,'#415a84'],[970,250,31,'#b66d45'],[1010,232,38,'#d6b86a'],[1060,245,40,'#3c725f']].map(([x,y,w,c])=>`<rect x="${x}" y="${y}" width="${w}" height="48" fill="${c}" stroke="#14244a" stroke-width="3"/>`).join('')}<circle cx="1020" cy="111" r="42" fill="#4e8a5f" stroke="#14244a" stroke-width="7"/><rect x="986" y="118" width="68" height="34" fill="#b96e45" stroke="#14244a" stroke-width="6"/></g>
      <g aria-label="corkboard"><rect x="725" y="60" width="145" height="120" fill="#a96942" stroke="#14244a" stroke-width="8"/><rect x="738" y="75" width="119" height="89" fill="#c78e5d"/>${[[744,88,'#ffd86b'],[786,105,'#f28b86'],[826,83,'#82d8c4']].map(([x,y,c])=>`<rect x="${x}" y="${y}" width="28" height="36" fill="${c}" transform="rotate(${x%2?3:-4} ${x+14} ${y+18})"/><circle cx="${x+14}" cy="${y+5}" r="4" fill="#14244a"/>`).join('')}</g>
      <g aria-label="rug"><path d="M370 465L826 465L905 630H288Z" fill="${t.rug}" stroke="#14244a" stroke-width="8"/><path d="M392 487H804L855 602H336Z" fill="none" stroke="${t.accent}" stroke-width="5" opacity=".7"/></g>
      ${includeBuddy ? `<g transform="${palTransform}">${characterMarkup({pose})}</g>` : ''}
      ${includeStatus ? `<g transform="translate(18 18)"><rect width="270" height="50" rx="14" fill="rgba(16,26,51,.86)"/><text x="18" y="22" fill="#6be6d0" font-family="monospace" font-size="13" font-weight="900">HOME</text><text x="18" y="40" fill="#fff" font-family="Arial, sans-serif" font-size="14">${escapeHtml(state.pal.name)} is ${activityLabel}.</text></g>` : ''}
      ${overlay}
    </svg>`;
  }

  function updateRoomScene() {
    document.documentElement.dataset.roomTheme = state.room;
    $('#roomScene').innerHTML = roomSceneSvg();
    $('#dialogueBackground').innerHTML = roomSceneSvg({includeBuddy:false,includeStatus:false});
    $('#headerPalState').textContent = ({center:'Relaxing in the room',desk:'Using the computer',bed:'Sitting on the bed',bookshelf:'Browsing the bookshelf',window:'Looking out the window'})[state.activity];
    const hit = $('#roomPalHit');
    const positions = {
      center:{left:'50%',top:'55%',width:'180px',height:'330px'},
      desk:{left:'59%',top:'51%',width:'145px',height:'270px'},
      bed:{left:'28%',top:'58%',width:'140px',height:'245px'},
      bookshelf:{left:'77%',top:'53%',width:'150px',height:'280px'},
      window:{left:'51%',top:'49%',width:'155px',height:'290px'}
    };
    Object.assign(hit.style, positions[state.activity] || positions.center);
    updateClock();
  }

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    const date = now.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
    $('#gameTime').textContent = time;
    $('#consoleTime').textContent = time;
    $('#gameDate').textContent = date;
    $('#worldLocation').textContent = `${roomThemes[state.room].label} · ${capitalize(state.time)}`;
  }

  function enterGame() {
    $('#game').hidden = false;
    state.view = 'room';
    state.activity = 'center';
    renderCharacterEverywhere();
    updateRoomScene();
    setView('room');
    drawWorld();
    showToast('Welcome Home. Toggle Explorer Mode when you want to move.');
  }

  function setView(view) {
    state.view = view;
    $('#roomView').hidden = view !== 'room';
    $('#explorerView').hidden = view !== 'explorer';
    $('#roomViewButton').classList.toggle('active', view === 'room');
    $('#explorerViewButton').classList.toggle('active', view === 'explorer');
    $('#viewHint').textContent = view === 'room' ? 'A close, composed view of the same room state.' : 'Move with WASD or directional keys; click objects or press E to interact.';
    state.actionRing = false;
    $('#roomActionRing').hidden = true;
    if (view !== 'explorer') stopPlayerMovement();
    if (view === 'room') updateRoomScene();
    else drawWorld();
  }

  const grid = { cols:16, rows:10 };
  const objects = [
    {id:'bed',x:1,y:3,w:3,h:2.5,anchor:[4,4],label:'Sit on the bed'},
    {id:'desk',x:6,y:2.5,w:4,h:1.5,anchor:[8,4.5],label:'Use the computer'},
    {id:'bookshelf',x:13,y:2.2,w:2,h:3,anchor:[12,4],label:'Browse the bookshelf'},
    {id:'window',x:6,y:.35,w:4,h:1.45,anchor:[8,3.2],label:'Look out the window'}
  ];
  const heldMoves = new Map();
  const PLAYER_STEP_MS = 145;
  let movementFrame = 0;

  function playerNearObject() {
    const p = state.player;
    let best = null, distance = Infinity;
    objects.forEach(object => {
      const d = Math.hypot(p.x-object.anchor[0],p.y-object.anchor[1]);
      if (d < distance) { distance=d; best=object.id; }
    });
    return distance <= 1.25 ? best : null;
  }

  function isBlocked(x,y) {
    if (x < 1 || x > 14 || y < 3 || y > 8) return true;
    return objects.some(object => object.id !== 'window' && x >= Math.floor(object.x) && x <= Math.ceil(object.x + object.w) - 1 && y >= Math.floor(object.y) && y <= Math.ceil(object.y + object.h) - 1);
  }

  function heldMove() {
    return [...heldMoves.values()].at(-1) || null;
  }

  function scheduleMovementFrame() {
    if (!movementFrame) movementFrame = requestAnimationFrame(animatePlayerMovement);
  }

  function animatePlayerMovement(now) {
    movementFrame = 0;
    const movement = state.player.movement;
    if (movement) {
      const progress = clamp((now - movement.startedAt) / PLAYER_STEP_MS, 0, 1);
      state.player.displayX = movement.fromX + (movement.toX - movement.fromX) * progress;
      state.player.displayY = movement.fromY + (movement.toY - movement.fromY) * progress;
      drawWorld();
      if (progress >= 1) {
        state.player.displayX = state.player.x;
        state.player.displayY = state.player.y;
        state.player.movement = null;
        const next = heldMove();
        if (next) movePlayer(next.dx,next.dy);
      }
    }
    if (state.player.movement) scheduleMovementFrame();
  }

  function movePlayer(dx,dy) {
    if (state.view !== 'explorer' || state.player.movement) return false;
    const stepX = Math.sign(dx), stepY = Math.sign(dy);
    const nx = state.player.x + stepX, ny = state.player.y + stepY;
    state.player.dir = stepX<0?'left':stepX>0?'right':stepY<0?'up':'down';
    if (isBlocked(nx,ny)) { drawWorld(); return false; }
    state.player.movement = {
      fromX: state.player.displayX,
      fromY: state.player.displayY,
      toX: nx,
      toY: ny,
      startedAt: performance.now()
    };
    state.player.x = nx;
    state.player.y = ny;
    state.player.step = (state.player.step + 1) % 2;
    scheduleMovementFrame();
    return true;
  }

  function holdPlayerMove(key,move) {
    if (heldMoves.has(key)) return;
    heldMoves.set(key,move);
    if (!state.player.movement) movePlayer(move.dx,move.dy);
  }

  function releasePlayerMove(key) {
    heldMoves.delete(key);
  }

  function stopPlayerMovement() {
    heldMoves.clear();
  }

  function setPlayerPosition(x,y) {
    state.player.x=x;state.player.y=y;state.player.displayX=x;state.player.displayY=y;state.player.movement=null;
  }

  function interactObject(id) {
    if (!id) { showToast(`${state.pal.name} looks around the room.`); return; }
    state.activity = id;
    const text = {bed:'I could sit here for a while.',desk:'The computer is ready. I saved this spot for Home.',bookshelf:'There are still empty shelves for books we collect.',window:'Campus looks calm from here.'}[id];
    updateRoomScene();
    drawWorld();
    showToast(text);
  }

  function interactWorld() { interactObject(playerNearObject()); }

  function interactWorldAtPointer(event) {
    const canvas = $('#worldCanvas');
    const rect = canvas.getBoundingClientRect();
    const unit = Math.min(rect.width/grid.cols,rect.height/grid.rows);
    const offsetX=(rect.width-unit*grid.cols)/2;
    const offsetY=(rect.height-unit*grid.rows)/2;
    const x = (event.clientX-rect.left-offsetX)/unit, y = (event.clientY-rect.top-offsetY)/unit;
    const object = objects.find(item => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
    interactObject(object?.id || null);
  }

  function drawPixelPal(ctx,x,y,tile) {
    const shell=state.pal.shellColor || palettes.shell[state.pal.shell],signal=state.pal.signalColor || palettes.signal[state.pal.signal];
    const px=tile/22;
    ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='rgba(16,26,51,.18)';ctx.fillRect(-5*px,9*px,10*px,2*px);
    ctx.fillStyle=shell;
    ctx.fillRect(-4*px,-10*px,8*px,8*px);ctx.fillRect(-5*px,-8*px,10*px,5*px);
    ctx.fillRect(-4*px,-2*px,8*px,9*px);ctx.fillRect(-5*px,0,1*px,6*px);ctx.fillRect(4*px,0,1*px,6*px);
    ctx.fillRect(-3*px,7*px,2*px,4*px);ctx.fillRect(1*px,7*px,2*px,4*px);
    if(state.pal.outfit!=='none') {
      ctx.fillStyle=state.pal.outfit==='hoodie'?'#5fb594':state.pal.outfit==='jacket'?'#ef9b7f':'#5d7fe6';
      ctx.fillRect(-4*px,-2*px,8*px,7*px);ctx.fillRect(-5*px,0,1*px,4*px);ctx.fillRect(4*px,0,1*px,4*px);
    }
    if(state.pal.hair!=='none') {
      ctx.fillStyle=state.pal.hairColorValue || palettes.hair[state.pal.hairColor];
      ctx.fillRect(-5*px,-10*px,10*px,3*px);ctx.fillRect(-4*px,-8*px,2*px,2*px);
      if(state.pal.hair==='bob') {ctx.fillRect(-5*px,-8*px,1*px,5*px);ctx.fillRect(4*px,-8*px,1*px,5*px);}
    }
    ctx.fillStyle=signal;ctx.fillRect(-3*px,-8*px,2*px,4*px);ctx.fillRect(1*px,-8*px,2*px,4*px);
    ctx.restore();
  }

  function drawWorld() {
    const canvas=$('#worldCanvas'),ctx=canvas.getContext('2d');
    const rect=canvas.getBoundingClientRect(),pixelRatio=Math.min(window.devicePixelRatio||1,2);
    if(rect.width>0&&rect.height>0){const nextWidth=Math.round(rect.width*pixelRatio),nextHeight=Math.round(rect.height*pixelRatio);if(canvas.width!==nextWidth||canvas.height!==nextHeight){canvas.width=nextWidth;canvas.height=nextHeight;}}
    const canvasWidth=canvas.width,canvasHeight=canvas.height,t=roomThemes[state.room];
    const unit=Math.min(canvasWidth/grid.cols,canvasHeight/grid.rows),w=unit*grid.cols,h=unit*grid.rows,sx=unit,sy=unit;
    const offsetX=(canvasWidth-w)/2,offsetY=(canvasHeight-h)/2;
    ctx.clearRect(0,0,canvasWidth,canvasHeight);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#d7e5e6';ctx.fillRect(0,0,canvasWidth,canvasHeight);
    ctx.save();ctx.translate(offsetX,offsetY);
    ctx.fillStyle=t.wall;ctx.fillRect(0,0,w,sy*2.5);
    ctx.fillStyle=t.floor;ctx.fillRect(0,sy*2.5,w,h-sy*2.5);
    ctx.strokeStyle='rgba(20,36,74,.16)';ctx.lineWidth=Math.max(1,pixelRatio);
    for(let x=0;x<=grid.cols;x++){ctx.beginPath();ctx.moveTo(x*sx,0);ctx.lineTo(x*sx,h);ctx.stroke();}
    for(let y=0;y<=grid.rows;y++){ctx.beginPath();ctx.moveTo(0,y*sy);ctx.lineTo(w,y*sy);ctx.stroke();}
    // Wall fixtures: each measurement is expressed in character-sized grid tiles.
    ctx.fillStyle=state.time==='night'?'#1a3267':state.time==='sunset'?'#ed9277':t.sky;ctx.fillRect(sx*6,sy*.35,sx*4,sy*1.45);ctx.strokeStyle='#14244a';ctx.lineWidth=4*pixelRatio;ctx.strokeRect(sx*6,sy*.35,sx*4,sy*1.45);ctx.beginPath();ctx.moveTo(sx*8,sy*.35);ctx.lineTo(sx*8,sy*1.8);ctx.stroke();
    ctx.fillStyle='#b6794a';ctx.fillRect(sx*12,sy*.45,sx*2.5,sy*1.2);ctx.strokeRect(sx*12,sy*.45,sx*2.5,sy*1.2);
    // Bed: three tiles wide, two-and-a-half tiles deep.
    ctx.fillStyle='#75482f';ctx.fillRect(sx*1,sy*3,sx*3,sy*2.5);ctx.strokeRect(sx*1,sy*3,sx*3,sy*2.5);ctx.fillStyle=t.bedding;ctx.fillRect(sx*1.15,sy*3.15,sx*2.7,sy*2.15);ctx.strokeRect(sx*1.15,sy*3.15,sx*2.7,sy*2.15);ctx.fillStyle='#fff5df';ctx.fillRect(sx*1.3,sy*3.3,sx*1.5,sy*.65);ctx.strokeRect(sx*1.3,sy*3.3,sx*1.5,sy*.65);
    // Desk: four tiles wide and one-and-a-half deep.
    ctx.fillStyle='#85532f';ctx.fillRect(sx*6,sy*2.5,sx*4,sy*1.5);ctx.strokeRect(sx*6,sy*2.5,sx*4,sy*1.5);ctx.fillStyle='#233c66';ctx.fillRect(sx*7.2,sy*1.55,sx*1.6,sy*.9);ctx.strokeRect(sx*7.2,sy*1.55,sx*1.6,sy*.9);ctx.fillStyle='#54b5e8';ctx.fillRect(sx*7.4,sy*1.75,sx*1.2,sy*.5);
    // Bookshelf: two tiles wide and three tiles tall.
    ctx.fillStyle='#705038';ctx.fillRect(sx*13,sy*2.2,sx*2,sy*3);ctx.strokeRect(sx*13,sy*2.2,sx*2,sy*3);for(let r=1;r<3;r++){ctx.beginPath();ctx.moveTo(sx*13,sy*(2.2+r));ctx.lineTo(sx*15,sy*(2.2+r));ctx.stroke();}
    // Rug and exit remain walkable.
    ctx.fillStyle=t.rug;ctx.fillRect(sx*6,sy*5,sx*4,sy*3);ctx.strokeRect(sx*6,sy*5,sx*4,sy*3);ctx.strokeStyle=t.accent;ctx.lineWidth=3*pixelRatio;ctx.strokeRect(sx*6.25,sy*5.25,sx*3.5,sy*2.5);
    ctx.fillStyle='#24314b';ctx.fillRect(sx*7,sy*9,sx*2,sy);
    const drawX=state.player.displayX??state.player.x,drawY=state.player.displayY??state.player.y;
    drawPixelPal(ctx,(drawX+.5)*sx,(drawY+.55)*sy,unit);
    if(state.time==='night'){ctx.fillStyle='rgba(15,31,67,.28)';ctx.fillRect(0,0,w,h);}
    ctx.restore();
    const near=playerNearObject();
    $('#worldPrompt').hidden=!near;
    if(near) $('#worldPromptText').textContent=objects.find(o=>o.id===near)?.label||'Interact';
    drawMiniMap();
  }

  function drawMiniMap() {
    const c=$('#miniMap'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#111f38';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#e4bd67';ctx.lineWidth=3;ctx.strokeRect(8,8,c.width-16,c.height-16);ctx.strokeRect(14,15,32,35);ctx.strokeRect(54,14,40,21);ctx.strokeRect(101,14,20,35);ctx.fillStyle='#5cf29b';ctx.beginPath();ctx.arc(8+((state.player.displayX??state.player.x)/16)*(c.width-16),8+((state.player.displayY??state.player.y)/10)*(c.height-16),5,0,Math.PI*2);ctx.fill();
  }

  function showDialogue(kind='talk') {
    $('#toast').hidden = true;
    const lines = {
      talk:`Hey. I am glad you are here. I was ${state.activity==='center'?'hanging out':state.activity==='desk'?'checking the computer':state.activity==='bed'?'sitting on the bed':state.activity==='bookshelf'?'looking through our shelf':'watching campus outside'}. What should we do first?`,
      check:`I am doing all right. The room state is synchronized now, so I will still be here when you switch views.`,
      plan:'We can check your agenda, then decide whether to study, explore, or take a break.'
    };
    $('#dialogueText').textContent=lines[kind]||lines.talk;
    $('#dialogueMode').hidden=false;
  }

  function closeDialogue(){ $('#dialogueMode').hidden=true; }

  function showQuickChat() {
    $('#quickText').textContent = `I am currently ${$('#headerPalState').textContent.toLowerCase()}. Home and Explorer Mode are showing the same state.`;
    $('#quickChat').hidden=false;
  }

  function showToast(message) {
    const toast=$('#toast');toast.textContent=message;toast.hidden=false;
    if(state.view==='explorer')$('#worldPrompt').hidden=true;
    clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{toast.hidden=true;if(state.view==='explorer')drawWorld();},2600);
  }

  function openPanel(name) {
    const data = {
      agenda:['Agenda','Today',`<div class="panel-grid"><article class="panel-card"><h3>3:30 PM · Study block</h3><p>Review the project outline with ${escapeHtml(state.pal.name)}.</p></article><article class="panel-card"><h3>6:30 PM · Team demo</h3><p>Show Home, Explorer Mode, and the synchronized Buddy state.</p></article></div>`],
      journal:['Journal','Local history','<div class="panel-grid"><article class="panel-card"><h3>Move-in day</h3><p>Chose a dorm, initialized the Buddy, and tested two views of the same room.</p></article><article class="panel-card"><h3>Privacy</h3><p>Entries remain local in this demonstration and can eventually be corrected, deleted, or exported.</p></article></div>'],
      collection:['Collection','Owned items',`<div class="panel-grid"><article class="panel-card"><h3>Body color</h3><p>Customizable humanoid base · currently active.</p></article><article class="panel-card"><h3>Move-in Photo</h3><p>A local memory collectible for the corkboard.</p></article></div>`],
      customize:['Customize','Buddy appearance',`<div class="panel-grid"><article class="panel-card"><h3>${escapeHtml(state.pal.name)}</h3><p>${capitalize(state.pal.disposition)} disposition · appearance remains consistent across Home, Explorer, Dialogue, and Console forms.</p></article><article class="panel-card"><h3>MVP scope</h3><p>Use onboarding to change appearance. A larger customization studio is intentionally deferred.</p></article></div>`],
      campusweb:['Campus Web','Embedded applications','<div class="panel-grid"><article class="panel-card"><h3>Campus Wallet</h3><p>Local balance: 60 SHARK. Full source embedding remains a subsequent integration pass.</p></article><article class="panel-card"><h3>Bookstore & Faucet</h3><p>This pass keeps these apps compact while improving anatomy and synchronized room interactions.</p></article></div>']
    }[name] || ['Buddy','Panel',''];
    $('#panelKicker').textContent=data[1];$('#panelTitle').textContent=data[0];$('#panelContent').innerHTML=data[2];
    $('#appPanel').hidden=false;
    $('[data-panel-close]', $('#appPanel')).focus();
  }

  function closePanel() { $('#appPanel').hidden=true; }

  function showConsoleRemark(message='I saved your place in the dorm.') {
    const remark=$('#consoleRemark');remark.textContent=message;remark.hidden=false;clearTimeout(state.remarkTimer);state.remarkTimer=setTimeout(()=>remark.hidden=true,5200);
  }

  function openConsole() {
    $('#toast').hidden=true;
    $('#consoleMode').hidden=false;
    state.consoleSelected=false;state.consoleTool=null;
    $('#consoleActions').hidden=true;$('#consoleToolScreen').hidden=true;
    renderCharacterEverywhere();updateClock();showConsoleRemark();
  }

  function closeConsole() { $('#consoleMode').hidden=true;setView('room'); }

  function toggleConsoleActions() {
    state.consoleSelected=!state.consoleSelected;
    $('#consoleActions').hidden=!state.consoleSelected;
    $('#consoleGlow').hidden=false;setTimeout(()=>$('#consoleGlow').hidden=true,850);
    if(state.consoleSelected) $('#consoleRemark').hidden=true;
  }

  function openConsoleTool(tool) {
    state.consoleTool=tool;$('#consoleToolScreen').hidden=false;
    const cards = {
      talk:`<div class="console-tool-card"><h2>Talk</h2><p>Tap MIC and speak. In this prototype, ${escapeHtml(state.pal.name)} will acknowledge a sample request.</p><button class="button primary" data-console-sample>Ask about today</button></div>`,
      brief:`<div class="console-tool-card"><h2>Daily Brief</h2><p>You have a study block at 3:30 PM and a team demo at 6:30 PM. Your Buddy is currently ${escapeHtml($('#headerPalState').textContent.toLowerCase())}.</p></div>`,
      wallet:`<div class="console-tool-card"><h2>Wallet</h2><div class="console-balance">${state.wallet} SHARK</div><p>${escapeHtml(state.pal.name)} cannot spend your money without permission. A future allowance can grant a bounded amount.</p></div>`,
      calc:`<div class="console-tool-card"><h2>Calculator</h2><p><input id="consoleCalcInput" inputmode="decimal" placeholder="12 * 4" style="width:100%;height:52px;border:3px solid #63e2ce;border-radius:9px;padding:0 12px;background:#061f29;color:#fff;font-size:20px"><button class="button primary" data-calculate style="margin-top:12px">Calculate</button></p><strong id="consoleCalcResult" style="font-size:28px"></strong></div>`,
      focus:`<div class="console-tool-card"><h2>Focus</h2><p id="focusReadout" class="console-balance">25:00</p><button class="button primary" data-focus-start>Start 25-minute timer</button></div>`
    };
    $('#consoleToolContent').innerHTML=cards[tool]||cards.brief;
  }

  function closeConsoleTool(){state.consoleTool=null;$('#consoleToolScreen').hidden=true;}

  function handleConsoleDynamicClick(event) {
    if(event.target.matches('[data-console-sample]')) { showConsoleRemark('You have two important blocks today. I can help prepare either one.'); closeConsoleTool(); }
    if(event.target.matches('[data-calculate]')) {
      const input=$('#consoleCalcInput').value.trim();
      let result='Invalid expression';
      if(/^[0-9+\-*/().\s%]+$/.test(input)) { try { result=String(Function(`"use strict";return (${input})`)()); } catch {} }
      $('#consoleCalcResult').textContent=result;
    }
    if(event.target.matches('[data-focus-start]')) {
      let seconds=25*60;const readout=$('#focusReadout');event.target.disabled=true;
      const tick=()=>{seconds--;readout.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(seconds>0&&state.consoleTool==='focus')setTimeout(tick,1000);};tick();
    }
  }

  function rotatePreview(delta) {
    state.previewAngle = normalizePreviewAngle(state.previewAngle + delta);
    renderPreviewCharacter();
  }

  function setupArtRotation() {
    const viewport = $('#artViewport');
    let dragging = false;
    let startX = 0;
    let startAngle = 0;
    let activePointer = null;

    viewport.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      dragging = true;
      startX = event.clientX;
      startAngle = state.previewAngle;
      activePointer = event.pointerId;
      viewport.classList.add('is-rotating');
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!dragging) return;
      const steps = Math.round((event.clientX-startX) / 52);
      const nextAngle = normalizePreviewAngle(startAngle - steps * 90);
      if (nextAngle !== state.previewAngle) {
        state.previewAngle = nextAngle;
        renderPreviewCharacter();
      }
    });
    const finish = event => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-rotating');
      if (activePointer !== null && viewport.hasPointerCapture(activePointer)) viewport.releasePointerCapture(activePointer);
      activePointer = null;
      event?.preventDefault();
    };
    viewport.addEventListener('pointerup', finish);
    viewport.addEventListener('pointercancel', finish);
    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); rotatePreview(-90); }
      if (event.key === 'ArrowRight') { event.preventDefault(); rotatePreview(90); }
    });
    $('#rotateBuddyLeft').addEventListener('click', () => rotatePreview(-90));
    $('#rotateBuddyRight').addEventListener('click', () => rotatePreview(90));
  }

  function setupVisualViewport() {
    const viewport = window.visualViewport;
    const syncHeight = () => {
      const height = viewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-visual-viewport-height', `${Math.round(height)}px`);
    };
    syncHeight();
    viewport?.addEventListener('resize', syncHeight);
    viewport?.addEventListener('scroll', syncHeight);
    window.addEventListener('resize', syncHeight);
    window.addEventListener('orientationchange', syncHeight);
  }

  function bindEvents() {
    $('#identityForm').addEventListener('submit',event=>{
      event.preventDefault();const email=$('#studentEmail').value.trim();
      if(!validateEmail(email)){ $('#identityError').textContent='Enter a university email ending in .edu.'; return; }
      state.email=email;$('#identityError').textContent='';setStep(2);
    });
    $('#sampleProfile').addEventListener('click',()=>{$('#studentEmail').value='mika@student.csulb.edu';state.email='mika@student.csulb.edu';setStep(2);});
    $('#palName').addEventListener('input',event=>{state.pal.name=event.target.value.trim()||'Buddy';renderCharacterEverywhere();});
    $('#designBack').addEventListener('click',()=>setStep(1));
    $('#designForm').addEventListener('submit',event=>{event.preventDefault();if(!state.pal.name.trim()){ $('#designError').textContent='Give your Buddy a name.';return;}$('#designError').textContent='';fillReview();setStep(3);});
    $('#reviewBack').addEventListener('click',()=>setStep(2));
    $('#initializePal').addEventListener('click',initializePal);
    $$('.room-card').forEach(card=>card.addEventListener('click',()=>{state.room=card.dataset.room;$$('.room-card').forEach(c=>c.classList.toggle('selected',c===card));}));
    $('#roomViewButton').addEventListener('click',()=>setView('room'));
    $('#explorerViewButton').addEventListener('click',()=>setView('explorer'));
    $('#roomPalHit').addEventListener('click',()=>{state.actionRing=!state.actionRing;$('#roomActionRing').hidden=!state.actionRing;});
    $('#roomActionRing').addEventListener('click',event=>{
      const action=event.target.dataset.roomAction;if(!action)return;
      if(action==='talk'||action==='check'||action==='plan')showDialogue(action);
      else {showToast(`${state.pal.name}: I can compress into an icon, but I am trying to look dignified right now.`);}
    });
    $('#dialogueClose').addEventListener('click',closeDialogue);$('#dialogueBackdrop').addEventListener('click',closeDialogue);
    $('.dialogue-choices').addEventListener('click',event=>{const choice=event.target.dataset.dialogueChoice;if(!choice)return;if(choice==='later')closeDialogue();else if(choice==='agenda')$('#dialogueText').textContent='Your main item is the team demo. I would start with the synchronized room-view explanation.';else $('#dialogueText').textContent=`I like ${roomThemes[state.room].label}. The important part is that this background matches Explorer Mode.`;});
    $('#palPortraitButton').addEventListener('click',showQuickChat);$$('[data-quick-close]').forEach(button=>button.addEventListener('click',()=>$('#quickChat').hidden=true));
    $('#metaButton').addEventListener('click',()=>$('#metaBar').hidden=!$('#metaBar').hidden);$('#metaBar').addEventListener('click',event=>{if(event.target.dataset.time){state.time=event.target.dataset.time;updateRoomScene();drawWorld();}if(event.target.dataset.activity){state.activity=event.target.dataset.activity;const map={center:[8,7],desk:[8,4],bed:[5,6],bookshelf:[12,5]};if(map[state.activity])setPlayerPosition(map[state.activity][0],map[state.activity][1]);updateRoomScene();drawWorld();}if(event.target.hasAttribute('data-meta-close'))$('#metaBar').hidden=true;});
    $$('.game-dock button').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));
    $$('[data-panel-close]').forEach(button=>button.addEventListener('click',closePanel));
    $('#consoleButton').addEventListener('click',openConsole);$('#consolePower').addEventListener('click',closeConsole);$('#consolePal').addEventListener('click',toggleConsoleActions);$('#consoleActions').addEventListener('click',event=>{const tool=event.target.dataset.consoleTool;if(tool)openConsoleTool(tool);});$('#consoleBack').addEventListener('click',closeConsoleTool);$('#consoleB').addEventListener('click',()=>state.consoleTool?closeConsoleTool():($('#consoleActions').hidden=true,state.consoleSelected=false));$('#consoleA').addEventListener('click',()=>state.consoleTool?null:toggleConsoleActions());$('#consoleMic').addEventListener('click',()=>showConsoleRemark('I heard you. Voice recognition is represented as a local demo action.'));$('#consoleRemark').addEventListener('click',()=>$('#consoleRemark').hidden=true);$('#consoleToolContent').addEventListener('click',handleConsoleDynamicClick);
    $$('.touch-controls [data-move]').forEach(button=>{
      const direction=button.dataset.move;
      const move={dx:direction==='left'?-1:direction==='right'?1:0,dy:direction==='up'?-1:direction==='down'?1:0};
      const pointerKey=event=>`pointer-${event.pointerId}`;
      button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);holdPlayerMove(pointerKey(event),move);});
      button.addEventListener('pointerup',event=>releasePlayerMove(pointerKey(event)));
      button.addEventListener('pointercancel',event=>releasePlayerMove(pointerKey(event)));
      button.addEventListener('lostpointercapture',event=>releasePlayerMove(pointerKey(event)));
      button.addEventListener('click',event=>{if(event.detail===0)movePlayer(move.dx,move.dy);});
    });
    $('[data-interact]').addEventListener('click',interactWorld);
    $('#worldPrompt').addEventListener('click',interactWorld);$('#worldCanvas').addEventListener('click',interactWorldAtPointer);
    window.addEventListener('resize',()=>{if(state.view==='explorer'&&!$('#game').hidden)drawWorld();});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        if(!$('#appPanel').hidden){closePanel();return;}
        if(!$('#consoleMode').hidden){state.consoleTool?closeConsoleTool():closeConsole();return;}
        if(!$('#dialogueMode').hidden){closeDialogue();return;}
        if(!$('#quickChat').hidden){$('#quickChat').hidden=true;return;}
      }
      if(!$('#appPanel').hidden)return;
      if(!$('#consoleMode').hidden){if(event.key.toLowerCase()==='b')state.consoleTool?closeConsoleTool():($('#consoleActions').hidden=true,state.consoleSelected=false);return;}
      if(!$('#dialogueMode').hidden||!$('#quickChat').hidden)return;
      if(state.view!=='explorer')return;
      const key=event.key.toLowerCase();
      const moves={arrowleft:{dx:-1,dy:0},a:{dx:-1,dy:0},arrowright:{dx:1,dy:0},d:{dx:1,dy:0},arrowup:{dx:0,dy:-1},w:{dx:0,dy:-1},arrowdown:{dx:0,dy:1},s:{dx:0,dy:1}};
      if(moves[key]){event.preventDefault();holdPlayerMove(key,moves[key]);return;}
      if(['e','enter',' '].includes(key)){event.preventDefault();interactWorld();}
    });
    document.addEventListener('keyup',event=>releasePlayerMove(event.key.toLowerCase()));
    window.addEventListener('blur',stopPlayerMovement);
  }

  buildChoices();
  bindEvents();
  setupVisualViewport();
  setupArtRotation();
  renderCharacterEverywhere();
  drawRoomPreviews();
  setStep(1);
  updateClock();
  setInterval(updateClock,30000);
})();
