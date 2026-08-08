import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserScripts } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const render = angle => context.CampusBuddyCharacter.renderCharacter(state.buddy,{angle});

test('turntable renders four distinct views without undefined output', () => {
  const renders = [0,90,180,270].map(render);
  assert.equal(new Set(renders).size,4);
  for (const svg of renders) {
    assert.match(svg,/^<svg/);
    assert.match(svg,/data-base-body="true"/);
    assert.doesNotMatch(svg,/undefined|NaN/);
  }
});

test('front, side, and rear views expose the intended eye counts', () => {
  assert.equal((render(0).match(/data-eye="true"/g)||[]).length,1,'front eye path contains both vertical eyes');
  assert.match(render(0),/M132 78V116M188 78V116/);
  assert.equal((render(90).match(/data-eye="true"/g)||[]).length,1);
  assert.equal((render(180).match(/data-eye="true"/g)||[]).length,0);
  assert.match(render(270),/scale\(-1 1\)/);
});

test('optional customization layers over the same base body', () => {
  state.buddy.appearance.hairStyle='swept';
  state.buddy.appearance.outfit='hoodie';
  const svg=render(0);
  assert.match(svg,/data-base-body="true"/);
  assert.match(svg,/data-hair="true"/);
  assert.match(svg,/data-outfit="true"/);
});
