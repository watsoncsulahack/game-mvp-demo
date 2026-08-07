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
      shellColor: '#eafcff',
      signalColor: '#69e7b0',
      hair: 'none',
      hairColor: 0,
      outfit: 'none'
    },
    player: { x: 8, y: 7, dir: 'down', step: 0 },
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
    return `<path data-hair="true" d="${shapes[style] || shapes.swept}" fill="${color}" stroke="#48677a" stroke-width="5" stroke-linejoin="round"/>`;
  }

  function outfitMarkup(style, view) {
    if (style === 'none') return '';
    const side=view==='side';
    const palette=style==='hoodie'?['#5fb594','#397b69','#38546d']:style==='jacket'?['#ef9b7f','#fff5dc','#4d6178']:['#5d7fe6','#dff7ff','#405675'];
    const [top,trim,pants]=palette;
    return side
      ? `<g data-outfit="true"><path d="M137 175Q160 163 185 177L198 217L190 345H137L130 218Z" fill="${top}" stroke="#48677a" stroke-width="6"/><path d="M138 339L188 339L200 482Q202 497 190 502L176 500L161 383L154 495Q151 506 139 503L127 497L136 339Z" fill="${pants}" stroke="#48677a" stroke-width="6"/>${style==='hoodie'?`<path d="M140 179Q160 151 181 177L174 204L159 192L147 205Z" fill="${trim}"/>`:''}</g>`
      : `<g data-outfit="true"><path d="M103 181Q160 157 217 181L230 224L211 236L203 348H117L109 236L90 224Z" fill="${top}" stroke="#48677a" stroke-width="6"/><path d="M118 342H202L209 481Q213 498 198 503H180L161 390L143 503H124Q108 498 112 481Z" fill="${pants}" stroke="#48677a" stroke-width="6"/>${style==='hoodie'?`<path d="M129 179Q160 145 191 179L180 210L160 193L140 210Z" fill="${trim}" stroke="#48677a" stroke-width="4"/>`:style==='jacket'?`<path d="M132 177L160 210L188 177M160 210V342" fill="none" stroke="${trim}" stroke-width="6"/>`:`<path d="M142 177Q160 192 178 177" fill="none" stroke="${trim}" stroke-width="5"/>`}</g>`;
  }

  function characterMarkup({ pose = 'standing', angle = 0 } = {}) {
    const normalized = normalizePreviewAngle(angle);
    const mirrored = normalized === 270;
    const view = normalized === 180 ? 'back' : normalized === 90 || normalized === 270 ? 'side' : 'front';
    const shell = state.pal.shellColor || palettes.shell[state.pal.shell];
    const signal = state.pal.signalColor || palettes.signal[state.pal.signal];
    const hair = palettes.hair[state.pal.hairColor];
    const bodyPath = view === 'side'
      ? 'M163 41C143 41 130 52 127 72L125 111Q125 135 143 148V163Q127 170 121 190L113 239L103 321Q100 334 106 345L101 354Q98 363 108 370Q118 376 126 367L136 354Q141 346 135 337L143 270L141 348L130 474L112 495Q106 504 116 510H154Q161 508 163 498L166 414L176 492Q178 505 190 507L209 502Q217 496 210 483L190 347L191 216Q190 181 177 163V148Q195 136 198 112L201 78Q202 55 184 45Q174 40 163 41Z'
      : 'M160 40C135 40 119 52 115 73L112 110Q111 133 138 149V162Q113 166 99 184L88 207L78 292L74 326Q72 339 80 347L78 356Q76 367 87 372Q98 376 105 366L113 355Q118 347 110 338L115 321L122 247L126 335Q130 350 119 374L111 474L96 495Q90 505 103 511H140Q151 510 153 497L158 407H162L167 497Q169 510 180 511H217Q230 505 224 495L209 474L201 374Q190 350 194 335L198 247L205 321L210 338Q202 347 207 355L215 366Q222 376 233 372Q244 367 242 356L240 347Q248 339 246 326L242 292L232 207L221 184Q207 166 182 162V149Q209 133 208 110L205 73Q201 52 176 42Q168 39 160 40Z';
    const eyes = view === 'back' ? '' : view === 'side'
      ? `<rect data-signal-eye="true" x="174" y="111" width="13" height="62" rx="7" fill="${signal}" filter="url(#eyeGlow)"/>`
      : `<rect data-signal-eye="true" x="124" y="110" width="13" height="64" rx="7" fill="${signal}" filter="url(#eyeGlow)"/><rect data-signal-eye="true" x="183" y="110" width="13" height="64" rx="7" fill="${signal}" filter="url(#eyeGlow)"/>`;
    const transform = `${mirrored ? 'translate(320 0) scale(-1 1)' : ''}${pose === 'sitting' ? ' rotate(5 160 330)' : ''}`;
    return `<g transform="${transform}" data-entity-view="${normalized}">
      <ellipse cx="160" cy="518" rx="67" ry="9" fill="#58758a" opacity=".16"/>
      <path data-base-body="true" d="${bodyPath}" fill="url(#entityFill)" stroke="#62889b" stroke-width="7" stroke-linejoin="round"/>
      <path data-anatomy="neck" d="M134 149V164H186V149" fill="none" stroke="transparent"/>
      ${view==='side' ? '<path data-visible-arm="true" data-anatomy="hand" d="M121 190L103 321Q100 334 106 345L101 354Q98 363 108 370Q118 376 126 367" fill="none" stroke="transparent"/>' : '<path data-visible-arm="true" data-anatomy="hand" d="M99 184L74 326Q72 339 80 347L78 356Q76 367 87 372Q98 376 105 366" fill="none" stroke="transparent"/><path data-visible-arm="true" data-anatomy="hand" d="M221 184L246 326Q248 339 240 347L242 356Q244 367 233 372Q222 376 215 366" fill="none" stroke="transparent"/>'}
      <path data-anatomy="foot" d="M111 474L96 495Q90 505 103 511H140M209 474L224 495Q230 505 217 511H180" fill="none" stroke="transparent"/>
      ${eyes}
      ${hairMarkup(state.pal.hair, hair, view)}
      ${outfitMarkup(state.pal.outfit, view)}
    </g>`;
  }

  function characterSvg({ crop = 'full', pose = 'standing', angle = 0 } = {}) {
    const normalized = normalizePreviewAngle(angle);
    const shell = state.pal.shellColor || palettes.shell[state.pal.shell];
    const signal = state.pal.signalColor || palettes.signal[state.pal.signal];
    const viewBox = crop === 'bust' ? '66 40 188 220' : crop === 'waist' ? '43 38 234 375' : '28 30 264 500';
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(state.pal.name)} electronic blank canvas entity, ${PREVIEW_VIEW_LABELS[normalized]} view">
      <defs><linearGradient id="entityFill" x1="0" y1="0" x2=".72" y2="1"><stop stop-color="#ffffff"/><stop offset=".48" stop-color="${shell}"/><stop offset="1" stop-color="#a8ddea"/></linearGradient><filter id="eyeGlow" x="-200%" y="-80%" width="500%" height="260%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${characterMarkup({pose,angle:normalized})}
    </svg>`;
  }

  function consoleFormSvg() {
    const shell=state.pal.shellColor||palettes.shell[state.pal.shell];
    const signal=state.pal.signalColor||palettes.signal[state.pal.signal];
    const hair=palettes.hair[state.pal.hairColor];
    const consoleHair=state.pal.hair==='none'?'':state.pal.hair==='bob'
      ? `<path d="M62 111V65Q65 31 128 29Q190 31 194 65V130H174V73Q128 51 83 73V126H62Z" fill="${hair}"/>`
      : state.pal.hair==='cloud'
        ? `<path d="M58 78Q48 51 77 44Q91 17 116 34Q145 13 161 37Q192 31 201 58Q211 82 185 91Q156 74 128 86Q95 72 58 78Z" fill="${hair}"/>`
        : `<path d="M61 80Q63 31 126 28Q184 31 197 70Q155 49 79 98Z" fill="${hair}"/>`;
    return `<svg data-console-head="true" viewBox="0 0 256 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(state.pal.name)} low-resolution Console head" shape-rendering="crispEdges">
      <defs><linearGradient id="consoleHeadFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".58" stop-color="${shell}"/><stop offset="1" stop-color="#9bd5e3"/></linearGradient></defs>
      <path d="M128 35Q71 35 67 87V127Q68 166 96 183L96 207H160V183Q188 166 189 127V87Q185 35 128 35Z" fill="url(#consoleHeadFill)" stroke="#173e4c" stroke-width="8"/>
      ${consoleHair}
      <rect x="91" y="91" width="14" height="59" rx="7" fill="${signal}"/><rect x="151" y="91" width="14" height="59" rx="7" fill="${signal}"/>
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

  function addSwatch(root, field, index, value) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.setProperty('--swatch', value);
    button.dataset.swatchField = field;
    button.dataset.swatchIndex = String(index);
    button.title = `${field} ${index + 1}`;
    button.addEventListener('click', () => { state.pal[field] = index; syncChoices(); });
    root.append(button);
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
    palettes.hair.forEach((value,index) => addSwatch($('#hairColorChoices'),'hairColor',index,value));
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
    setupRgbControl('shell');
    setupRgbControl('signal');
    syncChoices();
  }

  function setupRgbControl(field) {
    const ids={shell:['shellR','shellG','shellB'],signal:['signalR','signalG','signalB']}[field];
    const update=()=>{
      const hex='#'+ids.map(id=>Number($(`#${id}`).value).toString(16).padStart(2,'0')).join('').toUpperCase();
      state.pal[`${field}Color`]=hex;
      $(`#${field}ColorOutput`).value=hex;
      renderCharacterEverywhere();
    };
    ids.forEach(id=>$(`#${id}`).addEventListener('input',update));
  }

  function syncChoices() {
    $$('[data-disposition]').forEach(button => button.classList.toggle('active', button.dataset.disposition === state.pal.disposition));
    $$('[data-hair]').forEach(button => button.classList.toggle('active', button.dataset.hair === state.pal.hair));
    $$('[data-outfit]').forEach(button => button.classList.toggle('active', button.dataset.outfit === state.pal.outfit));
    ['shell','signal','hairColor'].forEach(field => $$(`[data-swatch-field="${field}"]`).forEach(button => button.classList.toggle('active', Number(button.dataset.swatchIndex) === state.pal[field])));
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

  function roomSceneSvg() {
    const t = roomThemes[state.room];
    const shell=state.pal.shellColor||palettes.shell[state.pal.shell];
    const signal=state.pal.signalColor||palettes.signal[state.pal.signal];
    const night = state.time === 'night';
    const sunset = state.time === 'sunset';
    const sky = night ? '#172a59' : sunset ? '#ef8d73' : t.sky;
    const overlay = night ? '<rect width="1200" height="650" fill="#132550" opacity=".40"/>' : sunset ? '<rect width="1200" height="650" fill="#e66d58" opacity=".14"/>' : '';
    const activity = state.activity;
    let palTransform = 'translate(450 115) scale(.78)';
    let pose = 'standing';
    if (activity === 'desk') { palTransform = 'translate(540 100) scale(.64)'; pose = 'sitting'; }
    if (activity === 'bed') { palTransform = 'translate(170 168) scale(.61)'; pose = 'sitting'; }
    if (activity === 'bookshelf') palTransform = 'translate(795 125) scale(.67)';
    if (activity === 'window') palTransform = 'translate(430 90) scale(.70)';
    const activityLabel = {center:'hanging out',desk:'working at the computer',bed:'sitting on the bed',bookshelf:'looking through the shelf',window:'watching campus outside'}[activity];
    return `<svg viewBox="0 0 1200 650" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-label="${escapeHtml(t.label)} Home">
      <defs><linearGradient id="entityFill" x1="0" y1="0" x2=".72" y2="1"><stop stop-color="#fff"/><stop offset=".48" stop-color="${shell}"/><stop offset="1" stop-color="#a8ddea"/></linearGradient><filter id="eyeGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
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
      <g transform="${palTransform}">${characterMarkup({expression:'smile',pose})}</g>
      <g transform="translate(18 18)"><rect width="270" height="50" rx="14" fill="rgba(16,26,51,.86)"/><text x="18" y="22" fill="#6be6d0" font-family="monospace" font-size="13" font-weight="900">HOME</text><text x="18" y="40" fill="#fff" font-family="Arial, sans-serif" font-size="14">${escapeHtml(state.pal.name)} is ${activityLabel}.</text></g>
      ${overlay}
    </svg>`;
  }

  function updateRoomScene() {
    document.documentElement.dataset.roomTheme = state.room;
    $('#roomScene').innerHTML = roomSceneSvg();
    $('#dialogueBackground').innerHTML = roomSceneSvg();
    $('#headerPalState').textContent = ({center:'Relaxing in the room',desk:'Using the computer',bed:'Sitting on the bed',bookshelf:'Browsing the bookshelf',window:'Looking out the window'})[state.activity];
    const hit = $('#roomPalHit');
    const positions = {
      center:{left:'50%',top:'55%',width:'220px',height:'390px'},
      desk:{left:'59%',top:'49%',width:'170px',height:'310px'},
      bed:{left:'28%',top:'56%',width:'160px',height:'280px'},
      bookshelf:{left:'76%',top:'51%',width:'170px',height:'320px'},
      window:{left:'50%',top:'48%',width:'180px',height:'330px'}
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
    if (view === 'room') updateRoomScene();
    else drawWorld();
  }

  const grid = { cols:16, rows:10, tile:60, originX:0, originY:0 };
  const objects = [
    {id:'bed',x:.8,y:2.4,w:4.1,h:4,anchor:[5,5.8],label:'Sit on the bed'},
    {id:'desk',x:5.8,y:1.1,w:5.4,h:3.9,anchor:[8.5,4],label:'Use the computer'},
    {id:'bookshelf',x:12,y:1.9,w:3.2,h:3.6,anchor:[11,5.4],label:'Browse the bookshelf'},
    {id:'window',x:6.7,y:.25,w:3.1,h:1.55,anchor:[5.4,3.8],label:'Look out the window'}
  ];

  function playerNearObject() {
    const p = state.player;
    let best = null, distance = Infinity;
    objects.forEach(object => {
      const d = Math.hypot(p.x-object.anchor[0],p.y-object.anchor[1]);
      if (d < distance) { distance=d; best=object.id; }
    });
    return distance <= 1.5 ? best : null;
  }

  function isBlocked(x,y) {
    if (x < 1 || x > 14 || y < 2 || y > 8.5) return true;
    if (x < 5 && y < 6.1) return true;
    if (x > 11.2 && y < 5.3) return true;
    if (x > 5.5 && x < 11.3 && y < 3.8) return true;
    return false;
  }

  function movePlayer(dx,dy) {
    if (state.view !== 'explorer') return;
    const nx = clamp(state.player.x + dx,1,14), ny = clamp(state.player.y + dy,2,8.5);
    if (!isBlocked(nx,ny)) { state.player.x=nx; state.player.y=ny; state.player.step=(state.player.step+1)%2; }
    state.player.dir = dx<0?'left':dx>0?'right':dy<0?'up':'down';
    drawWorld();
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
    const unit = Math.max(rect.width/16,rect.height/10);
    const offsetX=clamp(rect.width/2-state.player.x*unit,rect.width-unit*16,0);
    const offsetY=clamp(rect.height/2-state.player.y*unit,rect.height-unit*10,0);
    const x = (event.clientX-rect.left-offsetX)/unit, y = (event.clientY-rect.top-offsetY)/unit;
    const object = objects.find(item => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
    interactObject(object?.id || null);
  }

  function drawPixelPal(ctx,x,y,scale=1) {
    const shell=state.pal.shellColor || palettes.shell[state.pal.shell],signal=state.pal.signalColor || palettes.signal[state.pal.signal];
    const px=4*scale;
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
      ctx.fillStyle=palettes.hair[state.pal.hairColor];
      ctx.fillRect(-5*px,-10*px,10*px,3*px);ctx.fillRect(-4*px,-8*px,2*px,2*px);
      if(state.pal.hair==='bob') {ctx.fillRect(-5*px,-8*px,1*px,5*px);ctx.fillRect(4*px,-8*px,1*px,5*px);}
    }
    ctx.fillStyle=signal;ctx.fillRect(-2.5*px,-7*px,1*px,3*px);ctx.fillRect(1.5*px,-7*px,1*px,3*px);
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-3*px,-9*px,1*px,11*px);
    ctx.restore();
  }

  function drawWorld() {
    const canvas=$('#worldCanvas'),ctx=canvas.getContext('2d');
    const rect=canvas.getBoundingClientRect(),pixelRatio=Math.min(window.devicePixelRatio||1,2);
    if(rect.width>0&&rect.height>0){const nextWidth=Math.round(rect.width*pixelRatio),nextHeight=Math.round(rect.height*pixelRatio);if(canvas.width!==nextWidth||canvas.height!==nextHeight){canvas.width=nextWidth;canvas.height=nextHeight;}}
    const canvasWidth=canvas.width,canvasHeight=canvas.height,t=roomThemes[state.room];
    const unit=Math.max(canvasWidth/16,canvasHeight/10),w=unit*16,h=unit*10,sx=unit,sy=unit;
    const offsetX=clamp(canvasWidth/2-state.player.x*unit,canvasWidth-w,0);
    const offsetY=clamp(canvasHeight/2-state.player.y*unit,canvasHeight-h,0);
    ctx.clearRect(0,0,canvasWidth,canvasHeight);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#111d38';ctx.fillRect(0,0,canvasWidth,canvasHeight);
    ctx.save();ctx.translate(offsetX,offsetY);
    ctx.fillStyle=t.wall;ctx.fillRect(0,0,w,sy*2.2);
    ctx.fillStyle=t.floor;ctx.fillRect(0,sy*2.2,w,h-sy*2.2);
    ctx.strokeStyle='rgba(80,44,31,.30)';ctx.lineWidth=2;
    for(let y=2.2;y<=10;y+=.7){ctx.beginPath();ctx.moveTo(0,y*sy);ctx.lineTo(w,y*sy);ctx.stroke();}
    for(let x=0;x<=16;x++){ctx.beginPath();ctx.moveTo(x*sx,sy*2.2);ctx.lineTo((x-2)*sx,h);ctx.stroke();}
    // Window and corkboard on wall.
    ctx.fillStyle=state.time==='night'?'#1a3267':state.time==='sunset'?'#ed9277':t.sky;ctx.fillRect(sx*6.7,sy*.25,sx*3.1,sy*1.55);ctx.strokeStyle='#14244a';ctx.lineWidth=7;ctx.strokeRect(sx*6.7,sy*.25,sx*3.1,sy*1.55);ctx.beginPath();ctx.moveTo(sx*8.25,sy*.25);ctx.lineTo(sx*8.25,sy*1.8);ctx.stroke();
    ctx.fillStyle='#b6794a';ctx.fillRect(sx*12.3,sy*.35,sx*2.6,sy*1.2);ctx.strokeRect(sx*12.3,sy*.35,sx*2.6,sy*1.2);
    // Bed.
    ctx.fillStyle='#75482f';ctx.fillRect(sx*.8,sy*2.4,sx*4.1,sy*4.0);ctx.strokeRect(sx*.8,sy*2.4,sx*4.1,sy*4.0);ctx.fillStyle=t.bedding;ctx.fillRect(sx*1.05,sy*2.55,sx*3.6,sy*3.35);ctx.strokeRect(sx*1.05,sy*2.55,sx*3.6,sy*3.35);ctx.fillStyle='#fff5df';ctx.fillRect(sx*1.2,sy*2.7,sx*2.1,sy*.85);ctx.strokeRect(sx*1.2,sy*2.7,sx*2.1,sy*.85);
    // Desk.
    ctx.fillStyle='#85532f';ctx.fillRect(sx*5.8,sy*2.4,sx*5.4,sy*.8);ctx.strokeRect(sx*5.8,sy*2.4,sx*5.4,sy*.8);ctx.fillRect(sx*6.1,sy*3.1,sx*.45,sy*1.9);ctx.fillRect(sx*10.5,sy*3.1,sx*.45,sy*1.9);ctx.fillStyle='#233c66';ctx.fillRect(sx*7.4,sy*1.1,sx*2.0,sy*1.25);ctx.strokeRect(sx*7.4,sy*1.1,sx*2.0,sy*1.25);ctx.fillStyle='#54b5e8';ctx.fillRect(sx*7.65,sy*1.35,sx*1.5,sy*.75);
    // Shelf.
    ctx.fillStyle='#705038';ctx.fillRect(sx*12.0,sy*1.9,sx*3.2,sy*3.6);ctx.strokeRect(sx*12.0,sy*1.9,sx*3.2,sy*3.6);for(let r=1;r<4;r++){ctx.beginPath();ctx.moveTo(sx*12,sy*(1.9+r*.9));ctx.lineTo(sx*15.2,sy*(1.9+r*.9));ctx.stroke();}
    // Rug.
    ctx.fillStyle=t.rug;ctx.fillRect(sx*5.8,sy*5.0,sx*5.1,sy*3.4);ctx.strokeRect(sx*5.8,sy*5.0,sx*5.1,sy*3.4);ctx.strokeStyle=t.accent;ctx.lineWidth=4;ctx.strokeRect(sx*6.1,sy*5.3,sx*4.5,sy*2.8);
    // Door/threshold.
    ctx.fillStyle='#24314b';ctx.fillRect(sx*6.8,sy*9.1,sx*2.4,sy*.9);
    // Buddy.
    drawPixelPal(ctx,state.player.x*sx,state.player.y*sy,unit/48);
    // Night overlay.
    if(state.time==='night'){ctx.fillStyle='rgba(15,31,67,.35)';ctx.fillRect(0,0,w,h);}
    ctx.restore();
    // Prompt.
    const near=playerNearObject();
    $('#worldPrompt').hidden=!near;
    if(near) $('#worldPromptText').textContent=objects.find(o=>o.id===near)?.label||'Interact';
    drawMiniMap();
  }

  function drawMiniMap() {
    const c=$('#miniMap'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#111f38';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#e4bd67';ctx.lineWidth=3;ctx.strokeRect(8,8,c.width-16,c.height-16);ctx.strokeRect(14,15,32,35);ctx.strokeRect(54,14,40,21);ctx.strokeRect(101,14,20,35);ctx.fillStyle='#5cf29b';ctx.beginPath();ctx.arc(8+(state.player.x/16)*(c.width-16),8+(state.player.y/10)*(c.height-16),5,0,Math.PI*2);ctx.fill();
  }

  function showDialogue(kind='talk') {
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
    $('#metaButton').addEventListener('click',()=>$('#metaBar').hidden=!$('#metaBar').hidden);$('#metaBar').addEventListener('click',event=>{if(event.target.dataset.time){state.time=event.target.dataset.time;updateRoomScene();drawWorld();}if(event.target.dataset.activity){state.activity=event.target.dataset.activity;const map={center:[8,7],desk:[8,4],bed:[5,6],bookshelf:[12,5]};if(map[state.activity]){state.player.x=map[state.activity][0];state.player.y=map[state.activity][1];}updateRoomScene();drawWorld();}if(event.target.hasAttribute('data-meta-close'))$('#metaBar').hidden=true;});
    $$('.game-dock button').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));
    $$('[data-panel-close]').forEach(button=>button.addEventListener('click',closePanel));
    $('#consoleButton').addEventListener('click',openConsole);$('#consolePower').addEventListener('click',closeConsole);$('#consolePal').addEventListener('click',toggleConsoleActions);$('#consoleActions').addEventListener('click',event=>{const tool=event.target.dataset.consoleTool;if(tool)openConsoleTool(tool);});$('#consoleBack').addEventListener('click',closeConsoleTool);$('#consoleB').addEventListener('click',()=>state.consoleTool?closeConsoleTool():($('#consoleActions').hidden=true,state.consoleSelected=false));$('#consoleA').addEventListener('click',()=>state.consoleTool?null:toggleConsoleActions());$('#consoleMic').addEventListener('click',()=>showConsoleRemark('I heard you. Voice recognition is represented as a local demo action.'));$('#consoleRemark').addEventListener('click',()=>$('#consoleRemark').hidden=true);$('#consoleToolContent').addEventListener('click',handleConsoleDynamicClick);
    $$('.touch-controls [data-move]').forEach(button=>button.addEventListener('click',()=>{const d=button.dataset.move;movePlayer(d==='left'?-1:d==='right'?1:0,d==='up'?-1:d==='down'?1:0);}));$('[data-interact]').addEventListener('click',interactWorld);
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
      const key=event.key.toLowerCase();if(['arrowleft','a'].includes(key))movePlayer(-.5,0);if(['arrowright','d'].includes(key))movePlayer(.5,0);if(['arrowup','w'].includes(key))movePlayer(0,-.5);if(['arrowdown','s'].includes(key))movePlayer(0,.5);if(['e','enter',' '].includes(key)){event.preventDefault();interactWorld();}
    });
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
