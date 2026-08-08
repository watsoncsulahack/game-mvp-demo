(() => {
  'use strict';

  const Core = window.CampusBuddyCore;
  const Character = window.CampusBuddyCharacter;
  const Room = window.CampusBuddyRoom;
  const Explorer = window.CampusBuddyExplorer;
  const UI = window.CampusBuddyUI;
  const state = Core.createState();
  const modal = UI.createModalManager();
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const previewLabels = Object.fromEntries(Character.TURNAROUND_VIEWS.map(view => [view.angle,view.label]));
  let toastTimer = null;
  let focusTimer = null;

  const explorer = Explorer.createExplorer({
    state,
    canvas:$('#worldCanvas'),
    miniMap:$('#miniMap'),
    prompt:$('#worldPrompt'),
    promptText:$('#worldPromptText')
  });

  function syncViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--app-visual-viewport-height', `${Math.round(height)}px`);
  }

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    $('#gameTime').textContent = time;
    $('#consoleTime').textContent = time;
    $('#gameDate').textContent = now.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
    $('#worldLocation').textContent = Room.locationLabel(state);
  }

  function renderPreview() {
    const angle = Core.normalizeAngle(state.previewAngle);
    const view = Character.viewForAngle(angle);
    $('#fullArtPreview').innerHTML = Character.renderCharacter(state.buddy,{angle});
    $('#rotationStatus').textContent = `${view.label} · ${view.index+1}/8`;
    $('#artViewport').setAttribute('aria-label', `Rotate Buddy. ${view.label} view, ${view.index+1} of 8. Drag horizontally or use Left and Right Arrow keys.`);
  }

  function renderBuddyEverywhere() {
    renderPreview();
    $('#initArt').innerHTML = Character.renderCharacter(state.buddy);
    $('#headerPortrait').innerHTML = Character.renderCharacter(state.buddy,{crop:'bust'});
    $('#dialogueArt').innerHTML = Character.renderCharacter(state.buddy,{crop:'waist'});
    $('#quickBust').innerHTML = Character.renderCharacter(state.buddy,{crop:'bust'});
    $('#consoleBuddy').innerHTML = Character.renderConsoleHead(state.buddy);
    $('#headerBuddyName').textContent = state.buddy.name;
    $('#dialogueName').textContent = state.buddy.name;
    $('#quickSpeaker').textContent = state.buddy.name;
  }

  function setStep(step) {
    state.onboardingStep = step;
    $$('.onboarding-step').forEach(section => section.hidden = Number(section.dataset.step) !== step);
    $$('[data-step-dot]').forEach(dot => {
      const number = Number(dot.dataset.stepDot);
      dot.classList.toggle('active', number === step);
      dot.classList.toggle('done', number < step);
    });
    renderBuddyEverywhere();
    $('.onboarding-step:not([hidden])')?.scrollTo(0,0);
  }

  function selectButtons(selector, value, key) {
    $$(selector).forEach(button => button.classList.toggle('active', button.dataset[key] === value));
  }

  function syncCustomization() {
    selectButtons('[data-disposition]',state.buddy.disposition,'disposition');
    selectButtons('[data-hair]',state.buddy.appearance.hairStyle,'hair');
    selectButtons('[data-outfit]',state.buddy.appearance.outfit,'outfit');
    $('#hairColorField').hidden = state.buddy.appearance.hairStyle === 'none';
    renderBuddyEverywhere();
  }

  function buildChoices() {
    Object.entries(Core.DISPOSITIONS).forEach(([key,description]) => {
      const button = document.createElement('button');
      button.type='button'; button.dataset.disposition=key; button.textContent=Core.capitalize(key);
      button.addEventListener('click',()=>{state.buddy.disposition=key;$('#dispositionHelp').textContent=description;syncCustomization();});
      $('#dispositionChoices').append(button);
    });
    for (const [key,label] of Object.entries({none:'None',swept:'Swept',bob:'Bob',cloud:'Cloud'})) {
      const button=document.createElement('button'); button.type='button'; button.dataset.hair=key; button.textContent=label;
      button.addEventListener('click',()=>{state.buddy.appearance.hairStyle=key;syncCustomization();}); $('#hairChoices').append(button);
    }
    for (const [key,label] of Object.entries({none:'None',tee:'Campus tee',hoodie:'Soft hoodie',jacket:'Light jacket'})) {
      const button=document.createElement('button'); button.type='button'; button.dataset.outfit=key; button.textContent=label;
      button.addEventListener('click',()=>{state.buddy.appearance.outfit=key;syncCustomization();}); $('#outfitChoices').append(button);
    }
    const hue = (id,output,property,saturation,lightness) => $('#'+id).addEventListener('input',event=>{
      const color=Core.hslToHex(Number(event.target.value),saturation,lightness);
      state.buddy.appearance[property]=color; $('#'+output).value=color; renderBuddyEverywhere();
    });
    hue('bodyHue','bodyColorOutput','bodyColor',80,92);
    hue('eyeHue','eyeColorOutput','eyeColor',82,48);
    hue('hairHue','hairColorOutput','hairColor',58,28);
    syncCustomization();
  }

  function fillReview() {
    const profile=Core.profileFromEmail(state.email); state.campus=profile.campus; state.identity=profile.identity;
    $('#reviewName').textContent=state.buddy.name; $('#reviewDisposition').textContent=Core.capitalize(state.buddy.disposition);
    $('#reviewEmail').textContent=state.email; $('#reviewCampus').textContent=state.campus; $('#reviewIdentity').textContent=state.identity;
  }

  function updateHome() {
    document.documentElement.dataset.roomTheme=state.room;
    $('#roomScene').innerHTML=Room.roomSceneSvg(state);
    $('#dialogueBackground').innerHTML=Room.roomSceneSvg(state,{includeBuddy:false,includeStatus:false});
    $('#headerBuddyState').textContent=Room.activityLabel(state.activity);
    const activity=Room.activityModel(state.activity).buddy;
    const hit=$('#roomBuddyHit');
    hit.style.left=`${((activity.x+160*activity.scale)/1200)*100}%`;
    hit.style.top=`${((activity.y+250*activity.scale)/650)*100}%`;
    hit.style.width=`${Math.max(8,(180*activity.scale/1200)*100)}%`;
    hit.style.height=`${Math.max(18,(360*activity.scale/650)*100)}%`;
    updateClock();
  }

  function setView(view) {
    state.view=view; $('#roomView').hidden=view!=='room'; $('#explorerView').hidden=view!=='explorer';
    $('#roomViewButton').classList.toggle('active',view==='room'); $('#explorerViewButton').classList.toggle('active',view==='explorer');
    $('#viewHint').textContent=view==='room'?'A close, composed view of the same room state.':'Move with WASD or directional keys; click objects or press E to interact.';
    $('#roomActionRing').hidden=true; explorer.stop();
    if(view==='room') updateHome(); else explorer.draw();
  }

  function showToast(message) {
    const toast=$('#toast'); toast.textContent=message; toast.hidden=false; clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{toast.hidden=true;if(state.view==='explorer')explorer.draw();},2600);
  }

  function interactObject(object) {
    if(!object){showToast(`${state.buddy.name} looks around the room.`);return;}
    state.activity=object.id; updateHome(); explorer.draw(); showToast(object.line);
  }

  function openDialogue(kind='talk') {
    const location={center:'hanging out',desk:'checking the computer',bed:'sitting on the bed',bookshelf:'looking through our shelf',window:'watching campus outside'}[state.activity]||'hanging out';
    const lines={talk:`Hey. I was ${location}. What should we do first?`,check:'I am doing all right. Home and Explorer are still showing the same room state.',plan:'We can check your agenda, then decide whether to study, explore, or take a break.'};
    $('#dialogueText').textContent=lines[kind]||lines.talk; modal.open($('#dialogueMode'));
  }

  function openPanel(name) {
    const [title,kicker,content]=UI.panelData(state,name); $('#panelTitle').textContent=title; $('#panelKicker').textContent=kicker; $('#panelContent').innerHTML=content; modal.open($('#appPanel'));
  }

  function stopFocusTimer() { if(focusTimer){clearInterval(focusTimer);focusTimer=null;} }
  function closeConsoleTool() { stopFocusTimer(); state.consoleTool=null; $('#consoleToolScreen').hidden=true; }
  function openConsoleTool(tool) { stopFocusTimer(); state.consoleTool=tool; $('#consoleToolContent').innerHTML=UI.consoleToolMarkup(state,tool); $('#consoleToolScreen').hidden=false; }

  function initializeBuddy() {
    $('#initialization').hidden=false;
    const stages=[['Building local identity…',18],['Saving Buddy appearance…',42],['Preparing dorm state…',67],['Linking Home and Explorer Mode…',88],['Initialization complete.',100]];
    let index=0;
    const advance=()=>{const [label,value]=stages[index++];$('#initStatus').textContent=label;$('#initProgress').style.width=`${value}%`;if(index<stages.length)setTimeout(advance,320);else setTimeout(()=>{$('#initialization').hidden=true;$('#onboarding').hidden=true;$('#game').hidden=false;renderBuddyEverywhere();setView('room');showToast('Welcome Home. Toggle Explorer Mode when you want to move.');},380);};
    advance();
  }

  function setupOnboarding() {
    $('#identityForm').addEventListener('submit',event=>{event.preventDefault();const email=$('#studentEmail').value.trim();if(!Core.validateEmail(email)){ $('#identityError').textContent='Enter a university email ending in .edu.';return;}state.email=email;$('#identityError').textContent='';setStep(2);});
    $('#sampleProfile').addEventListener('click',()=>{$('#studentEmail').value='mika@student.csulb.edu';state.email='mika@student.csulb.edu';setStep(2);});
    $('#buddyName').addEventListener('input',event=>{state.buddy.name=event.target.value.trim()||'Buddy';renderBuddyEverywhere();});
    $('#designBack').addEventListener('click',()=>setStep(1));
    $('#designForm').addEventListener('submit',event=>{event.preventDefault();if(!state.buddy.name.trim()){ $('#designError').textContent='Give your Buddy a name.';return;}$('#designError').textContent='';fillReview();setStep(3);});
    $('#reviewBack').addEventListener('click',()=>setStep(2)); $('#initializeBuddy').addEventListener('click',initializeBuddy);
    $$('.room-card').forEach(card=>card.addEventListener('click',()=>{state.room=card.dataset.room;$$('.room-card').forEach(other=>other.classList.toggle('selected',other===card));}));
    let dragging=false,startX=0,startAngle=0,pointerId=null; const viewport=$('#artViewport');
    const rotate=delta=>{state.previewAngle=Core.normalizeAngle(state.previewAngle+delta);renderPreview();};
    viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;dragging=true;startX=event.clientX;startAngle=state.previewAngle;pointerId=event.pointerId;viewport.setPointerCapture?.(pointerId);});
    viewport.addEventListener('pointermove',event=>{if(!dragging)return;state.previewAngle=Core.normalizeAngle(startAngle-Math.round((event.clientX-startX)/46)*45);renderPreview();});
    const finish=()=>{dragging=false;if(pointerId!==null&&viewport.hasPointerCapture?.(pointerId))viewport.releasePointerCapture(pointerId);pointerId=null;};
    viewport.addEventListener('pointerup',finish); viewport.addEventListener('pointercancel',finish);
    viewport.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();rotate(-45);}if(event.key==='ArrowRight'){event.preventDefault();rotate(45);}});
    $('#rotateBuddyLeft').addEventListener('click',()=>rotate(-45)); $('#rotateBuddyRight').addEventListener('click',()=>rotate(45));
  }

  function setupGame() {
    $('#roomViewButton').addEventListener('click',()=>setView('room')); $('#explorerViewButton').addEventListener('click',()=>setView('explorer'));
    $('#roomBuddyHit').addEventListener('click',()=>{$('#roomActionRing').hidden=!$('#roomActionRing').hidden;});
    $('#roomActionRing').addEventListener('click',event=>{const action=event.target.dataset.roomAction;if(!action)return;if(['talk','check','plan'].includes(action))openDialogue(action);else showToast(`${state.buddy.name}: I am trying to look dignified right now.`);});
    $('#metaButton').addEventListener('click',()=>$('#metaBar').hidden=!$('#metaBar').hidden);
    $('#metaBar').addEventListener('click',event=>{if(event.target.dataset.time){state.time=event.target.dataset.time;updateHome();explorer.draw();}if(event.target.dataset.activity){state.activity=event.target.dataset.activity;const object=Room.objectById(state.activity);if(object)explorer.setPosition(Math.round(object.anchor.x),Math.round(object.anchor.y));updateHome();explorer.draw();}if(event.target.hasAttribute('data-meta-close'))$('#metaBar').hidden=true;});
    $$('.game-dock button').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));
    $('#worldPrompt').addEventListener('click',()=>interactObject(explorer.nearest())); $('[data-interact]').addEventListener('click',()=>interactObject(explorer.nearest()));
    $('#worldCanvas').addEventListener('click',event=>interactObject(explorer.objectAtPointer(event)));
    $$('.touch-controls [data-move]').forEach(button=>{const direction=button.dataset.move;const move={dx:direction==='left'?-1:direction==='right'?1:0,dy:direction==='up'?-1:direction==='down'?1:0};const key=event=>`pointer-${event.pointerId}`;button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);explorer.hold(key(event),move);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>explorer.release(key(event)));button.addEventListener('click',event=>{if(event.detail===0)explorer.move(move.dx,move.dy);});});
  }

  function setupOverlays() {
    $('#dialogueClose').addEventListener('click',()=>modal.close($('#dialogueMode'))); $('#dialogueBackdrop').addEventListener('click',()=>modal.close($('#dialogueMode')));
    $('.dialogue-choices').addEventListener('click',event=>{const choice=event.target.dataset.dialogueChoice;if(!choice)return;if(choice==='later')modal.close($('#dialogueMode'));else $('#dialogueText').textContent=choice==='agenda'?'Your main item is the team demo. I would start with the synchronized room explanation.':`I like ${Room.ROOM_THEMES[state.room].label}. Home and Explorer are using the same room model.`;});
    $('#buddyPortraitButton').addEventListener('click',()=>{$('#quickText').textContent=`I am currently ${Room.activityLabel(state.activity).toLowerCase()}.`;modal.open($('#quickChat'));});
    $$('[data-quick-close]').forEach(button=>button.addEventListener('click',()=>modal.close($('#quickChat')))); $$('[data-panel-close]').forEach(button=>button.addEventListener('click',()=>modal.close($('#appPanel'))));
    $('#consoleButton').addEventListener('click',()=>{state.consoleTool=null;$('#consoleActions').hidden=true;$('#consoleToolScreen').hidden=true;renderBuddyEverywhere();updateClock();modal.open($('#consoleMode'));});
    $('#consolePower').addEventListener('click',()=>{closeConsoleTool();modal.close($('#consoleMode'));setView('room');});
    $('#consoleBuddy').addEventListener('click',()=>{$('#consoleActions').hidden=!$('#consoleActions').hidden;$('#consoleRemark').hidden=true;});
    $('#consoleActions').addEventListener('click',event=>{if(event.target.dataset.consoleTool)openConsoleTool(event.target.dataset.consoleTool);});
    $('#consoleBack').addEventListener('click',closeConsoleTool); $('#consoleB').addEventListener('click',()=>state.consoleTool?closeConsoleTool():$('#consoleActions').hidden=true); $('#consoleA').addEventListener('click',()=>{$('#consoleActions').hidden=!$('#consoleActions').hidden;});
    $('#consoleMic').addEventListener('click',()=>{$('#consoleRemark').textContent='I heard you. Voice recognition is represented as a local demo action.';$('#consoleRemark').hidden=false;}); $('#consoleRemark').addEventListener('click',event=>event.currentTarget.hidden=true);
    $('#consoleToolContent').addEventListener('click',event=>{if(event.target.matches('[data-console-sample]')){$('#consoleRemark').textContent='You have two important blocks today. I can help prepare either one.';$('#consoleRemark').hidden=false;closeConsoleTool();}if(event.target.matches('[data-calculate]')){try{$('#consoleCalcResult').textContent=String(Core.evaluateArithmetic($('#consoleCalcInput').value));}catch{$('#consoleCalcResult').textContent='Invalid expression';}}if(event.target.matches('[data-focus-start]')){stopFocusTimer();let seconds=25*60;const readout=$('#focusReadout');event.target.disabled=true;focusTimer=setInterval(()=>{seconds-=1;readout.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(seconds<=0)stopFocusTimer();},1000);}});
  }

  function setupKeyboard() {
    document.addEventListener('keydown',event=>{for(const active of [$('#appPanel'),$('#consoleMode'),$('#dialogueMode'),$('#quickChat')])if(!active.hidden)modal.trap(event,active);if(event.key==='Escape'){if(!$('#appPanel').hidden)return modal.close($('#appPanel'));if(!$('#consoleMode').hidden){if(state.consoleTool)return closeConsoleTool();closeConsoleTool();return modal.close($('#consoleMode'));}if(!$('#dialogueMode').hidden)return modal.close($('#dialogueMode'));if(!$('#quickChat').hidden)return modal.close($('#quickChat'));}if(!$('#appPanel').hidden||!$('#consoleMode').hidden||!$('#dialogueMode').hidden||!$('#quickChat').hidden||state.view!=='explorer')return;const key=event.key.toLowerCase();const moves={arrowleft:{dx:-1,dy:0},a:{dx:-1,dy:0},arrowright:{dx:1,dy:0},d:{dx:1,dy:0},arrowup:{dx:0,dy:-1},w:{dx:0,dy:-1},arrowdown:{dx:0,dy:1},s:{dx:0,dy:1}};if(moves[key]){event.preventDefault();explorer.hold(key,moves[key]);}else if(['e','enter',' '].includes(key)){event.preventDefault();interactObject(explorer.nearest());}});
    document.addEventListener('keyup',event=>explorer.release(event.key.toLowerCase())); window.addEventListener('blur',explorer.stop);
  }

  buildChoices(); setupOnboarding(); setupGame(); setupOverlays(); setupKeyboard();
  $$('[data-room-preview]').forEach(canvas=>Room.drawRoomPreview(canvas,canvas.dataset.roomPreview));
  syncViewportHeight(); window.visualViewport?.addEventListener('resize',syncViewportHeight); window.addEventListener('resize',()=>{syncViewportHeight();if(state.view==='explorer'&&!$('#game').hidden)explorer.draw();});
  renderBuddyEverywhere(); setStep(1); updateClock(); setInterval(updateClock,30000);
})();