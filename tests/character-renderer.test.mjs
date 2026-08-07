import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = source.indexOf('  const PREVIEW_ANGLES');
const end = source.indexOf('  function consoleFormSvg');
assert.ok(start >= 0 && end > start, 'character renderer block should be extractable');

const context = {
  state: {
    pal: {
      name: 'Mika',
      shell: 0,
      signal: 0,
      hair: 'none',
      hairColor: 0,
      outfit: 'none'
    }
  },
  palettes: {
    shell: ['#eafcff','#cdeff6','#d9e7ff','#e9ddff','#d8f5ec'],
    signal: ['#69e7b0','#55d4dc','#fff1a8','#ff9fd2','#d9c4ff'],
    hair: ['#26354d','#5b3a2f','#a8673d','#e2bd69','#76588f']
  },
  escapeHtml: value => String(value),
  console
};
context.globalThis = context;
vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.renderCharacter = characterSvg;`, context);

const angles = [0,90,180,270];

test('the turntable renders four distinct 90-degree views', () => {
  const renders = angles.map(angle => context.renderCharacter({ angle }));
  assert.equal(new Set(renders).size, 4);
  for (const [index, svg] of renders.entries()) {
    assert.match(svg, /^<svg/);
    assert.match(svg, /simple customizable Buddy/i);
    assert.match(svg, new RegExp(`${angles[index]}|Front|side|Back`, 'i'));
    assert.doesNotMatch(svg, /undefined|NaN/);
  }
});

test('default Buddy is one cohesive pale body with the reference vertical eyes', () => {
  const front = context.renderCharacter({ angle: 0 });
  const side = context.renderCharacter({ angle: 90 });
  const rear = context.renderCharacter({ angle: 180 });
  assert.match(front, /data-signal-eye/g);
  assert.equal((front.match(/data-signal-eye/g) || []).length, 2);
  assert.equal((side.match(/data-signal-eye/g) || []).length, 1);
  assert.equal((rear.match(/data-signal-eye/g) || []).length, 0);
  assert.equal((front.match(/data-base-body/g) || []).length, 1);
  assert.match(front, /#eafcff/i);
  assert.match(front, /#69e7b0/i);
  assert.equal((front.match(/data-signal-eye="true"/g) || []).length, 2);
  assert.match(front, /M129 78C128 90 128 103 129 114/);
  assert.match(side, /M181 76C179 89 179 105 178 119/);
  assert.doesNotMatch(`${front}${side}`, /data-signal-eye="true"[^>]+\s(?:width|height)=/i, 'eyes should be hand-drawn paths rather than dot rectangles');
  assert.doesNotMatch(`${front}${side}${rear}`, /data-hair|data-outfit|mouth|nose|data-segmented-limb/i);
});

test('optional hair and clothing layer over the same Buddy base', () => {
  context.state.pal.hair = 'swept';
  context.state.pal.outfit = 'hoodie';
  const customized = context.renderCharacter({ angle: 0 });
  assert.match(customized, /data-base-body/);
  assert.match(customized, /data-hair/);
  assert.match(customized, /data-outfit/);
});

test('reference anatomy has a neck, hands, and feet with correct arm visibility', () => {
  context.state.pal.hair = 'none';
  context.state.pal.outfit = 'none';
  const front = context.renderCharacter({ angle: 0 });
  const right = context.renderCharacter({ angle: 90 });
  const back = context.renderCharacter({ angle: 180 });
  const left = context.renderCharacter({ angle: 270 });
  for (const render of [front,right,back,left]) {
    assert.match(render, /data-anatomy="neck"/);
    assert.match(render, /data-anatomy="hand"/);
    assert.match(render, /data-anatomy="foot"/);
  }
  assert.equal((front.match(/data-visible-arm/g) || []).length, 2);
  assert.equal((back.match(/data-visible-arm/g) || []).length, 2);
  assert.equal((right.match(/data-visible-arm/g) || []).length, 1);
  assert.equal((left.match(/data-visible-arm/g) || []).length, 1);
  assert.match(front, /L157 323C158 315 163 315 164 323/, 'front silhouette should have the long legs from the reference');
  assert.match(right, /M148 37C128 37 115 49 112 70/, 'side view should use the dedicated reference profile');
  assert.match(right, /H170C162 184 157 178 157 169/, 'profile should include the reference under-jaw and throat recess');
  assert.match(right, /L204 497/, 'profile foot should project in the facing direction');
  assert.match(left, /translate\(320 0\) scale\(-1 1\)/, 'left profile should mirror the same model geometry');
  assert.equal((back.match(/data-signal-eye/g) || []).length, 0);
});
