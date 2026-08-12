(() => {
  'use strict';

  const $ = (selector, root=document) => root.querySelector(selector);
  let frame = 0;
  let previewPointer = null;
  let customizePointer = null;
  let customizeAngle = 0;

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);

  function state() { return window.CampusBuddyState || null; }
  function setText(element, value) {
    if (!element) return;
    const next = String(value);
    if (element.textContent !== next) element.textContent = next;
  }

  function hexToHue(hex) {
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex));
    if (!match) return 0;
    const [r,g,b] = match.slice(1).map(value => parseInt(value,16) / 255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max-min;
    if (!delta) return 0;
    let hue = max === r ? ((g-b)/delta)%6 : max === g ? (b-r)/delta+2 : (r-g)/delta+4;
    hue *= 60;
    if (hue < 0) hue += 360;
    return Math.round(hue);
  }

  function colorControl(key, label, current, saturation, lightness) {
    return `<label class="demo-color-control" data-demo-color-wrap="${key}"><span>${label}</span><div><input type="range" min="0" max="359" step="1" value="${hexToHue(current)}" data-demo-color="${key}" data-sat="${saturation}" data-light="${lightness}" aria-label="${label}"><output>${esc(current)}</output></div></label>`;
  }

  function appearanceMarkup(value) {
    const appearance = value.buddy.appearance;
    return `<fieldset class="demo-cosmetics-fieldset"><legend>Appearance</legend><div class="demo-cosmetics-grid"><div class="demo-hair-choice"><span>Hair style</span><div class="chip-row"><button type="button" data-demo-hair="none">None</button><button type="button" data-demo-hair="swept">Swept</button><button type="button" data-demo-hair="bob">Bob</button><button type="button" data-demo-hair="cloud">Cloud</button></div></div>${colorControl('eyeColor','Eye color',appearance.eyeColor,58,19)}${colorControl('bodyColor','Body color',appearance.bodyColor,30,96)}${colorControl('hairColor','Hair color',appearance.hairColor,40,25)}</div></fieldset>`;
  }

  function setupAppearanceControls() {
    const value = state();
    const fields = $('.design-fields');
    if (!value || !fields) return;
    if (!fields.querySelector('.demo-cosmetics-fieldset')) {
      const wardrobe = fields.querySelector('.wardrobe-fieldset');
      wardrobe?.insertAdjacentHTML('beforebegin', appearanceMarkup(value));
    }
    syncAppearanceControls();
  }

  function syncAppearanceControls() {
    const value = state();
    if (!value) return;
    const appearance = value.buddy.appearance;
    document.querySelectorAll('[data-demo-hair]').forEach(button => {
      button.classList.toggle('active', button.dataset.demoHair === appearance.hairStyle);
    });
    const hair = $('[data-demo-color="hairColor"]');
    const wrap = $('[data-demo-color-wrap="hairColor"]');
    if (hair) {
      hair.disabled = appearance.hairStyle === 'none';
      wrap?.classList.toggle('is-disabled', hair.disabled);
    }
  }

  function appearanceSignature(value, angle) {
    const appearance = value?.buddy?.appearance || {};
    return [value?.buddy?.name || '', angle, appearance.bodyColor, appearance.eyeColor, appearance.hairStyle, appearance.hairColor, appearance.top, appearance.bottom, appearance.footwear].join('|');
  }

  function renderInto(element, markup, signature) {
    if (!element || element.dataset.demoRenderSignature === signature) return;
    element.dataset.demoRenderSignature = signature;
    element.innerHTML = markup;
  }

  function syncCustomizePreview(force=false) {
    const value = state();
    const Character = window.CampusBuddyCharacter;
    const preview = $('[data-customize-preview]');
    if (!value || !Character || !preview) return;
    const signature = appearanceSignature(value, customizeAngle);
    if (force) delete preview.dataset.demoRenderSignature;
    renderInto(preview, Character.renderCharacter(value.buddy,{angle:customizeAngle}), signature);
    const view = Character.viewForAngle(customizeAngle);
    setText($('[data-customize-angle]'), `${view.label} · ${view.index+1}/8`);
  }

  function refreshBuddyVisuals() {
    const value = state();
    const Character = window.CampusBuddyCharacter;
    if (!value || !Character) return;
    const angle = value.previewAngle || 0;
    const signature = appearanceSignature(value, angle);
    const targets = [
      ['#fullArtPreview', Character.renderCharacter(value.buddy,{angle}), signature],
      ['#initArt', Character.renderCharacter(value.buddy), appearanceSignature(value,0)],
      ['#headerPortrait', Character.renderCharacter(value.buddy,{crop:'bust'}), `${signature}|header`],
      ['#dialogueArt', Character.renderCharacter(value.buddy,{crop:'waist'}), `${signature}|dialogue`],
      ['#quickBust', Character.renderCharacter(value.buddy,{crop:'bust'}), `${signature}|quick`]
    ];
    targets.forEach(([selector, markup, key]) => renderInto($(selector), markup, key));
    const consoleBuddy = $('#consoleBuddy');
    if (consoleBuddy) renderInto(consoleBuddy, Character.renderCharacter(value.buddy), `${signature}|console-full`);
    const roomBuddy = $('#roomBuddyArt');
    if (roomBuddy) {
      const pose = window.CampusBuddyRoom?.activityModel(value.activity)?.buddy?.pose || 'standing';
      renderInto(roomBuddy, Character.renderCharacter(value.buddy,{pose}), `${signature}|room|${pose}`);
    }
    const view = Character.viewForAngle(angle);
    setText($('#rotationStatus'), `${view.label} · ${view.index+1}/8`);
    syncAppearanceControls();
    syncCustomizePreview(true);
    syncHomePosition();
  }

  function syncHomePosition() {
    const value = state();
    const scene = $('#roomScene');
    const art = $('#roomBuddyArt');
    if (!value || !scene || !art) return;
    const rect = scene.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return;

    const scale = Math.min(rect.width/1200, rect.height/650);
    const offsetX = (rect.width - 1200*scale)/2;
    const offsetY = (rect.height - 650*scale)/2;
    const px = Number(value.player?.displayX ?? value.player?.x ?? 8);
    const py = Number(value.player?.displayY ?? value.player?.y ?? 7);
    const spriteScale = Math.max(.54, Math.min(.72, .54 + Math.max(0, py-3)*.035));
    const centerX = 80 + (Math.max(0,Math.min(16,px))/16)*1040;
    const feetY = 340 + Math.max(0,Math.min(10,py))*34;
    const left = centerX - 128*spriteScale;
    const top = feetY - 640*spriteScale;

    art.style.left = `${offsetX + left*scale}px`;
    art.style.top = `${offsetY + top*scale}px`;
    art.style.width = `${256*spriteScale*scale}px`;
    art.style.height = `${640*spriteScale*scale}px`;

    const hit = $('#roomBuddyHit');
    if (hit) {
      hit.style.left = `${offsetX + centerX*scale}px`;
      hit.style.top = `${offsetY + (top + 320*spriteScale)*scale}px`;
      hit.style.width = `${Math.max(70,180*spriteScale*scale)}px`;
      hit.style.height = `${Math.max(150,360*spriteScale*scale)}px`;
    }
  }

  function syncConsole() {
    const modal = $('#consoleMode');
    if (!modal || modal.hidden) return;
    const value = state();
    const Character = window.CampusBuddyCharacter;
    const mic = $('#consoleMic');
    if (mic && !mic.dataset.demoIcon) {
      mic.dataset.demoIcon = '1';
      mic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';
      mic.setAttribute('aria-label','Microphone');
    }
    if (value && Character) {
      renderInto($('#consoleBuddy'), Character.renderCharacter(value.buddy), `${appearanceSignature(value,0)}|console-full`);
    }
    const actions = $('#consoleActions');
    if (actions) actions.hidden = false;
  }

  function openDashboardFromDesk(event) {
    const value = state();
    if (!value || value.view !== 'explorer') return false;
    const near = window.CampusBuddyExplorer?.nearestObject?.(value.player);
    if (near?.id !== 'desk') return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    window.CampusUnifiedApps?.open?.('dashboard');
    return true;
  }

  function sync() {
    frame = 0;
    setupAppearanceControls();
    syncCustomizePreview();
    syncConsole();
    syncHomePosition();
  }
  function queue() { if (!frame) frame = requestAnimationFrame(sync); }

  document.addEventListener('input', event => {
    const color = event.target.closest?.('[data-demo-color]');
    if (!color) return;
    const value = state();
    if (!value) return;
    const key = color.dataset.demoColor;
    value.buddy.appearance[key] = window.CampusBuddyCore.hslToHex(Number(color.value), Number(color.dataset.sat), Number(color.dataset.light));
    setText(color.parentElement.querySelector('output'), value.buddy.appearance[key]);
    refreshBuddyVisuals();
  }, true);

  document.addEventListener('click', event => {
    const hairButton = event.target.closest?.('[data-demo-hair]');
    if (hairButton) {
      const value = state();
      if (value) {
        value.buddy.appearance.hairStyle = hairButton.dataset.demoHair;
        refreshBuddyVisuals();
      }
      return;
    }

    const rotate = event.target.closest?.('[data-customize-rotate]');
    if (rotate) {
      customizeAngle = window.CampusBuddyCore.normalizeAngle(customizeAngle + Number(rotate.dataset.customizeRotate));
      syncCustomizePreview(true);
      return;
    }

    if (event.target.closest?.('#roomScene [aria-label="desk"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.CampusUnifiedApps?.open?.('dashboard');
      return;
    }

    if (event.target.closest?.('#worldPrompt,[data-interact]') && openDashboardFromDesk(event)) return;

    const canvas = event.target.closest?.('#worldCanvas');
    if (canvas) {
      const Explorer = window.CampusBuddyExplorer;
      const object = Explorer?.objectAtGridPoint?.(Explorer.gridPointFromPointer(canvas,event));
      if (object?.id === 'desk') {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.CampusUnifiedApps?.open?.('dashboard');
        return;
      }
    }

    if (event.target.closest?.('#roomViewButton')) requestAnimationFrame(syncHomePosition);
    if (event.target.closest?.('#consoleButton')) requestAnimationFrame(syncConsole);
  }, true);

  document.addEventListener('keydown', event => {
    const value = state();
    const key = event.key.toLowerCase();
    if (value?.view === 'explorer' && ['e','enter',' '].includes(key)) openDashboardFromDesk(event);
  }, true);

  document.addEventListener('pointerdown', event => {
    const customize = event.target.closest?.('[data-customize-turnaround]');
    if (customize && !event.target.closest('button')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      customizePointer = { id:event.pointerId, startX:event.clientX, startAngle:customizeAngle, moved:false };
      customize.setPointerCapture?.(event.pointerId);
      return;
    }

    const viewport = event.target.closest?.('#artViewport');
    if (!viewport || event.target.closest('button')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = viewport.getBoundingClientRect();
    previewPointer = { id:event.pointerId, startX:event.clientX, startAngle:state()?.previewAngle || 0, moved:false, width:rect.width, left:rect.left };
    viewport.setPointerCapture?.(event.pointerId);
  }, true);

  document.addEventListener('pointermove', event => {
    if (customizePointer && customizePointer.id === event.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const dx = event.clientX - customizePointer.startX;
      if (Math.abs(dx) > 5) customizePointer.moved = true;
      if (customizePointer.moved) {
        customizeAngle = window.CampusBuddyCore.normalizeAngle(customizePointer.startAngle - Math.round(dx/32)*45);
        syncCustomizePreview(true);
      }
      return;
    }

    if (!previewPointer || previewPointer.id !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const dx = event.clientX - previewPointer.startX;
    if (Math.abs(dx) > 5) previewPointer.moved = true;
    if (previewPointer.moved) {
      const value = state();
      if (value) {
        value.previewAngle = window.CampusBuddyCore.normalizeAngle(previewPointer.startAngle - Math.round(dx/30)*45);
        refreshBuddyVisuals();
      }
    }
  }, true);

  document.addEventListener('pointerup', event => {
    if (customizePointer && customizePointer.id === event.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!customizePointer.moved) {
        const target = $('[data-customize-turnaround]');
        const rect = target?.getBoundingClientRect();
        if (rect) customizeAngle = window.CampusBuddyCore.normalizeAngle(customizeAngle + (event.clientX < rect.left + rect.width/2 ? -45 : 45));
        syncCustomizePreview(true);
      }
      customizePointer = null;
      return;
    }

    if (!previewPointer || previewPointer.id !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const value = state();
    if (value && !previewPointer.moved) {
      const midpoint = previewPointer.left + previewPointer.width/2;
      value.previewAngle = window.CampusBuddyCore.normalizeAngle(value.previewAngle + (event.clientX < midpoint ? -45 : 45));
      refreshBuddyVisuals();
    }
    previewPointer = null;
  }, true);

  document.addEventListener('pointercancel', event => {
    if (previewPointer?.id === event.pointerId) previewPointer = null;
    if (customizePointer?.id === event.pointerId) customizePointer = null;
  }, true);

  function start() {
    const app = $('#app');
    if (app) new MutationObserver(queue).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('campus-session-changed', queue);
    setupAppearanceControls();
    queue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
