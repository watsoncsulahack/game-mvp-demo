(() => {
  'use strict';

  const { escapeHtml, capitalize } = window.CampusBuddyCore;

  const ROOM_THEMES = Object.freeze({
    sunlit: { wall:'#D9BD95', floor:'#B67540', rug:'#344F83', bedding:'#325385', accent:'#FFD261', sky:'#83D9ED', label:'Fresh Daytime Dorm' },
    tech: { wall:'#A8BFD2', floor:'#526A80', rug:'#2C4675', bedding:'#3A5F91', accent:'#62E2DC', sky:'#7CC5E9', label:'Gamer Dorm' },
    creative: { wall:'#D8A8A6', floor:'#B47555', rug:'#76518F', bedding:'#8C5F87', accent:'#FFD360', sky:'#98DFEA', label:'Cozy Warm Dorm' }
  });

  const ROOM_GRID = Object.freeze({ cols: 16, rows: 10 });

  const ROOM_OBJECTS = Object.freeze([
    { id:'bed', label:'Sit on the bed', grid:{x:1,y:3,w:3,h:2.5}, anchor:{x:4,y:4}, buddy:{x:190,y:190,scale:.55,pose:'sitting'}, line:'I could sit here for a while.' },
    { id:'desk', label:'Use the computer', grid:{x:6,y:2.5,w:4,h:1.5}, anchor:{x:8,y:4.5}, buddy:{x:560,y:125,scale:.58,pose:'sitting'}, line:'The computer is ready. I saved this spot for Home.' },
    { id:'bookshelf', label:'Browse the bookshelf', grid:{x:13,y:2.2,w:2,h:3}, anchor:{x:12,y:4}, buddy:{x:825,y:145,scale:.60,pose:'standing'}, line:'There are still empty shelves for books we collect.' },
    { id:'window', label:'Look out the window', grid:{x:6,y:.35,w:4,h:1.45}, anchor:{x:8,y:3.2}, buddy:{x:480,y:115,scale:.62,pose:'standing'}, line:'Campus looks calm from here.' }
  ]);

  const CENTER_ACTIVITY = Object.freeze({ id:'center', buddy:{x:472,y:128,scale:.70,pose:'standing'}, line:'I am hanging out in the room.' });

  function objectById(id) {
    return ROOM_OBJECTS.find(object => object.id === id) || null;
  }

  function activityModel(id) {
    return objectById(id) || CENTER_ACTIVITY;
  }

  function activityLabel(id) {
    return ({
      center: 'Relaxing in the room',
      desk: 'Using the computer',
      bed: 'Sitting on the bed',
      bookshelf: 'Browsing the bookshelf',
      window: 'Looking out the window'
    })[id] || 'Relaxing in the room';
  }

  function skyFor(state, theme) {
    return state.time === 'night' ? '#172A59' : state.time === 'sunset' ? '#EF8D73' : theme.sky;
  }

  function roomSceneSvg(state, { includeBuddy = true, includeStatus = true } = {}) {
    const theme = ROOM_THEMES[state.room];
    const activity = activityModel(state.activity);
    const buddy = activity.buddy;
    const night = state.time === 'night';
    const sunset = state.time === 'sunset';
    const overlay = night
      ? '<rect width="1200" height="650" fill="#132550" opacity=".35"/>'
      : sunset ? '<rect width="1200" height="650" fill="#E66D58" opacity=".12"/>' : '';
    const buddySvg = includeBuddy
      ? `<g transform="translate(${buddy.x} ${buddy.y}) scale(${buddy.scale})">${window.CampusBuddyCharacter.renderCharacter(state.buddy, { pose:buddy.pose }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
      : '';
    return `<svg viewBox="0 0 1200 650" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(theme.label)} Home">
      <rect width="1200" height="650" fill="${theme.wall}"/>
      <rect y="420" width="1200" height="230" fill="${theme.floor}"/>
      <g stroke="#693F2C" stroke-width="2" opacity=".24">${Array.from({length:13},(_,i)=>`<path d="M${i*100} 420L${i*82-100} 650"/>`).join('')}${Array.from({length:6},(_,i)=>`<path d="M0 ${455+i*38}H1200"/>`).join('')}</g>
      <g aria-label="window"><rect x="405" y="70" width="300" height="230" fill="${skyFor(state, theme)}" stroke="#14244A" stroke-width="12"/><path d="M555 70V300M405 184H705" stroke="#14244A" stroke-width="8"/><path d="M415 255Q500 176 585 252Q650 190 695 245V292H415Z" fill="#5E9B79" opacity="${night?.45:.88}"/><circle cx="650" cy="118" r="28" fill="${night?'#F1E7B8':'#FFF1A8'}"/></g>
      <g aria-label="bed"><rect x="58" y="334" width="345" height="155" rx="8" fill="#7B4A2C" stroke="#14244A" stroke-width="8"/><rect x="73" y="300" width="310" height="155" rx="8" fill="${theme.bedding}" stroke="#14244A" stroke-width="8"/><rect x="79" y="304" width="142" height="62" rx="16" fill="#FFF6DF" stroke="#14244A" stroke-width="6"/></g>
      <g aria-label="desk"><rect x="468" y="327" width="343" height="34" fill="#86522D" stroke="#14244A" stroke-width="7"/><rect x="493" y="359" width="25" height="145" fill="#86522D"/><rect x="760" y="359" width="25" height="145" fill="#86522D"/><rect x="566" y="215" width="144" height="108" rx="5" fill="#1C315D" stroke="#14244A" stroke-width="8"/><rect x="579" y="228" width="118" height="78" fill="#4E9DE7"/></g>
      <g aria-label="bookshelf"><rect x="885" y="140" width="245" height="365" fill="#765032" stroke="#14244A" stroke-width="9"/><path d="M892 220H1122M892 310H1122M892 400H1122" stroke="#14244A" stroke-width="7"/><g fill="${theme.accent}"><rect x="915" y="165" width="30" height="48"/><rect x="954" y="158" width="25" height="55"/><rect x="990" y="170" width="36" height="43"/></g></g>
      <path aria-label="rug" d="M370 465L826 465L905 630H288Z" fill="${theme.rug}" stroke="#14244A" stroke-width="8"/><path d="M392 487H804L855 602H336Z" fill="none" stroke="${theme.accent}" stroke-width="5" opacity=".7"/>
      ${buddySvg}
      ${includeStatus ? `<g transform="translate(18 18)"><rect width="280" height="52" rx="14" fill="rgba(16,26,51,.86)"/><text x="18" y="22" fill="#6BE6D0" font-family="monospace" font-size="13" font-weight="900">HOME</text><text x="18" y="41" fill="#FFF" font-family="Arial, sans-serif" font-size="14">${escapeHtml(activityLabel(state.activity))}</text></g>` : ''}
      ${overlay}
    </svg>`;
  }

  function drawRoomPreview(canvas, roomKey) {
    const ctx = canvas.getContext('2d');
    const theme = ROOM_THEMES[roomKey];
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.wall; ctx.fillRect(0, 0, width, height * .55);
    ctx.fillStyle = theme.floor; ctx.fillRect(0, height * .55, width, height * .45);
    ctx.strokeStyle = '#14244A'; ctx.lineWidth = 3;
    ctx.fillStyle = theme.sky; ctx.fillRect(width*.37,height*.08,width*.28,height*.28); ctx.strokeRect(width*.37,height*.08,width*.28,height*.28);
    ctx.fillStyle = theme.bedding; ctx.fillRect(width*.05,height*.42,width*.31,height*.34); ctx.strokeRect(width*.05,height*.42,width*.31,height*.34);
    ctx.fillStyle = '#8A572F'; ctx.fillRect(width*.42,height*.43,width*.31,height*.12); ctx.strokeRect(width*.42,height*.43,width*.31,height*.12);
    ctx.fillStyle = '#755035'; ctx.fillRect(width*.79,height*.19,width*.16,height*.48); ctx.strokeRect(width*.79,height*.19,width*.16,height*.48);
    ctx.fillStyle = theme.rug; ctx.fillRect(width*.35,height*.68,width*.34,height*.22); ctx.strokeRect(width*.35,height*.68,width*.34,height*.22);
  }

  function locationLabel(state) {
    return `${ROOM_THEMES[state.room].label} · ${capitalize(state.time)}`;
  }

  window.CampusBuddyRoom = Object.freeze({
    ROOM_THEMES,
    ROOM_GRID,
    ROOM_OBJECTS,
    objectById,
    activityModel,
    activityLabel,
    roomSceneSvg,
    drawRoomPreview,
    locationLabel
  });
})();
