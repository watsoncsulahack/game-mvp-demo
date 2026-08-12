(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  let frame = 0;
  let previewPointer = null;
  let customizeAngle = 0;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  function state() { return window.CampusBuddyState || null; }
  function setText(element,value) { if (!element) return; const next=String(value); if (element.textContent!==next) element.textContent=next; }
  function hexToHue(hex) {
    const match=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex));if(!match)return 0;
    const [r,g,b]=match.slice(1).map(v=>parseInt(v,16)/255);const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(!d)return 0;let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;return Math.round(h);
  }

  function appearanceMarkup(value) {
    const a=value.buddy.appearance;
    return `<fieldset class="demo-cosmetics-fieldset"><legend>Appearance</legend><div class="demo-cosmetics-grid"><div class="demo-hair-choice"><span>Hair style</span><div class="chip-row"><button type="button" data-demo-hair="none">None</button><button type="button" data-demo-hair="swept">Swept</button><button type="button" data-demo-hair="bob">Bob</button><button type="button" data-demo-hair="cloud">Cloud</button></div></div>${colorControl('eyeColor','Eye color',a.eyeColor,58,19)}${colorControl('bodyColor','Body color',a.bodyColor,30,96)}${colorControl('hairColor','Hair color',a.hairColor,40,25)}</div></fieldset>`;
  }
  function colorControl(key,label,current,sat,light){return `<label class="demo-color-control" data-demo-color-wrap="${key}"><span>${label}</span><div><input type="range" min="0" max="359" step="1" value="${hexToHue(current)}" data-demo-color="${key}" data-sat="${sat}" data-light="${light}" aria-label="${label}"><output>${esc(current)}</output></div></label>`;}

  function setupAppearanceControls() {
    const value=state(),fields=$('.design-fields');if(!value||!fields)return;
    $('.look-status')?.remove();
    if(!fields.querySelector('.demo-cosmetics-fieldset')){const wardrobe=fields.querySelector('.wardrobe-fieldset');wardrobe?.insertAdjacentHTML('beforebegin',appearanceMarkup(value));}
    syncAppearanceControls();
  }

  function syncAppearanceControls() {
    const value=state();if(!value)return;const a=value.buddy.appearance;
    document.querySelectorAll('[data-demo-hair]').forEach(button=>button.classList.toggle('active',button.dataset.demoHair===a.hairStyle));
    const hair=$('[data-demo-color="hairColor"]');const wrap=$('[data-demo-color-wrap="hairColor"]');if(hair){hair.disabled=a.hairStyle==='none';wrap?.classList.toggle('is-disabled',hair.disabled);}
  }

  function refreshBuddyVisuals() {
    const value=state(),Character=window.CampusBuddyCharacter;if(!value||!Character)return;
    const angle=value.previewAngle||0;
    const targets=[['#fullArtPreview',{angle}],['#initArt',{}],['#headerPortrait',{crop:'bust'}],['#dialogueArt',{crop:'waist'}],['#quickBust',{crop:'bust'}]];
    targets.forEach(([selector,options])=>{const el=$(selector);if(el)el.innerHTML=Character.renderCharacter(value.buddy,options);});
    const consoleBuddy=$('#consoleBuddy');if(consoleBuddy)consoleBuddy.innerHTML=Character.renderConsoleHead(value.buddy);
    const roomBuddy=$('.room-buddy-art');if(roomBuddy)roomBuddy.innerHTML=Character.renderCharacter(value.buddy,{pose:window.CampusBuddyRoom?.activityModel(value.activity)?.buddy?.pose||'standing'});
    const view=Character.viewForAngle(angle);setText($('#rotationStatus'),`${view.label} · ${view.index+1}/8`);
    syncAppearanceControls();syncCustomizePreview();
  }

  function syncCustomizePreview() {
    const value=state(),Character=window.CampusBuddyCharacter,preview=$('[data-customize-preview]');if(!value||!Character||!preview)return;
    preview.innerHTML=Character.renderCharacter(value.buddy,{angle:customizeAngle});const view=Character.viewForAngle(customizeAngle);setText($('[data-customize-angle]'),`${view.label} · ${view.index+1}/8`);
  }

  function syncConsole() {
    const modal=$('#consoleMode');if(!modal||modal.hidden)return;
    const mic=$('#consoleMic');if(mic&&!mic.dataset.demoIcon){mic.dataset.demoIcon='1';mic.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';mic.setAttribute('aria-label','Microphone');}
    const actions=$('#consoleActions');if(actions&&!$('#consoleToolScreen')?.hidden){}else if(actions)actions.hidden=false;
    const value=state();if(value?.consoleTool==='wallet'&&!$('#consoleToolScreen')?.hidden){const content=$('#consoleToolContent');if(content)content.innerHTML=window.CampusBuddyUI.consoleToolMarkup(value,'wallet');}
  }


  function sync() { frame=0; setupAppearanceControls(); syncCustomizePreview(); syncConsole(); }
  function queue() { if (!frame) frame=requestAnimationFrame(sync); }

  document.addEventListener('input', event => {
    const color=event.target.closest?.('[data-demo-color]'); if (!color) return;
    const value=state(); if (!value) return;
    const key=color.dataset.demoColor, sat=Number(color.dataset.sat), light=Number(color.dataset.light);
    value.buddy.appearance[key]=window.CampusBuddyCore.hslToHex(Number(color.value),sat,light);
    setText(color.parentElement.querySelector('output'),value.buddy.appearance[key]);
    refreshBuddyVisuals();
  }, true);

  document.addEventListener('click', event => {
    const hairButton=event.target.closest?.('[data-demo-hair]');
    if (hairButton) { const value=state(); if(value){value.buddy.appearance.hairStyle=hairButton.dataset.demoHair;refreshBuddyVisuals();} return; }
    const rotate=event.target.closest?.('[data-customize-rotate]');
    if (rotate) { customizeAngle=window.CampusBuddyCore.normalizeAngle(customizeAngle+Number(rotate.dataset.customizeRotate));syncCustomizePreview();return; }
    const desk=event.target.closest?.('#roomScene [aria-label="desk"]');
    if (desk) { event.preventDefault();event.stopImmediatePropagation();window.CampusUnifiedApps?.open?.('dashboard');return; }
    if (event.target.closest?.('#worldPrompt,[data-interact]')) {
      const value=state();const near=value&&window.CampusBuddyExplorer?.nearestObject?.(value.player);
      if(value?.view==='explorer'&&near?.id==='desk'){event.preventDefault();event.stopImmediatePropagation();window.CampusUnifiedApps?.open?.('dashboard');return;}
    }
    if(event.target.closest?.('#consoleButton'))requestAnimationFrame(()=>{const actions=$('#consoleActions');if(actions)actions.hidden=false;});
  }, true);

  document.addEventListener('keydown',event=>{
    const value=state();const key=event.key.toLowerCase();
    if(value?.view==='explorer'&&['e','enter',' '].includes(key)){
      const near=window.CampusBuddyExplorer?.nearestObject?.(value.player);
      if(near?.id==='desk'){event.preventDefault();event.stopImmediatePropagation();window.CampusUnifiedApps?.open?.('dashboard');}
    }
  },true);

  document.addEventListener('pointerdown',event=>{
    const viewport=event.target.closest?.('#artViewport');if(!viewport||event.target.closest('button'))return;
    event.preventDefault();event.stopImmediatePropagation();
    const rect=viewport.getBoundingClientRect();
    previewPointer={id:event.pointerId,startX:event.clientX,startAngle:state()?.previewAngle||0,moved:false,width:rect.width,left:rect.left};
    viewport.setPointerCapture?.(event.pointerId);
  },true);
  document.addEventListener('pointermove',event=>{
    if(!previewPointer||previewPointer.id!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    const dx=event.clientX-previewPointer.startX;if(Math.abs(dx)>5)previewPointer.moved=true;
    if(previewPointer.moved){const value=state();if(value){value.previewAngle=window.CampusBuddyCore.normalizeAngle(previewPointer.startAngle-Math.round(dx/30)*45);refreshBuddyVisuals();}}
  },true);
  document.addEventListener('pointerup',event=>{
    if(!previewPointer||previewPointer.id!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    const value=state();if(value&&!previewPointer.moved){const midpoint=previewPointer.left+previewPointer.width/2;value.previewAngle=window.CampusBuddyCore.normalizeAngle(value.previewAngle+(event.clientX<midpoint?-45:45));refreshBuddyVisuals();}
    previewPointer=null;
  },true);
  document.addEventListener('pointercancel',event=>{if(previewPointer?.id===event.pointerId)previewPointer=null;},true);

  function start(){
    const app=$('#app');
    if(app)new MutationObserver(queue).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    setupAppearanceControls();queue();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
