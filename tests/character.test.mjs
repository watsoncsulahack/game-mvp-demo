import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;
const angles = [0,45,90,135,180,225,270,315];

test('turnaround exposes exactly eight authored views', () => {
  assert.equal(character.TURNAROUND_VIEWS.length,8);
  assert.equal(Array.from(character.TURNAROUND_VIEWS,view=>view.angle).join(','),angles.join(','));
  assert.equal(new Set(Array.from(character.TURNAROUND_VIEWS,view=>view.slug)).size,8);
});

test('all eight views render from the turnaround atlas rather than anatomy paths', () => {
  const renders = angles.map(angle=>character.renderCharacter(state.buddy,{angle}));
  assert.equal(new Set(renders).size,8);
  for (const [index,svg] of renders.entries()) {
    assert.match(svg,/^<svg/);
    assert.match(svg,new RegExp(`data-buddy-angle="${angles[index]}"`));
    assert.match(svg,/layers-atlas\.png/);
    assert.doesNotMatch(svg,/<path\b/);
    assert.doesNotMatch(svg,/undefined|NaN/);
  }
});

test('body, eye, hair, and clothing customization persist at every angle', () => {
  state.buddy.appearance.bodyColor='#DDEEFF';
  state.buddy.appearance.eyeColor='#2244AA';
  state.buddy.appearance.hairStyle='bob';
  state.buddy.appearance.hairColor='#775599';
  state.buddy.appearance.outfit='hoodie';
  for (const angle of angles) {
    const svg=character.renderCharacter(state.buddy,{angle});
    assert.match(svg,/#DDEEFF/);
    assert.match(svg,/#2244AA/);
    assert.match(svg,/#775599/);
    assert.match(svg,/layers-atlas\.png/);
    assert.match(svg,/buddy-\d+-\d+-full-bob-hoodie-hair/);
    assert.match(svg,/buddy-\d+-\d+-full-bob-hoodie-outfit/);
  }
});

test('every selectable appearance layer has an atlas row', () => {
  const required=['body','line','eyes',
    ...['swept','bob','cloud'].flatMap(style=>[`hair-${style}`,`hair-${style}-line`]),
    ...['tee','hoodie','jacket'].flatMap(style=>[`outfit-${style}`,`outfit-${style}-line`])];
  assert.equal(Object.keys(character.LAYER_ROWS).length,required.length);
  for (const layer of required) assert.equal(typeof character.LAYER_ROWS[layer],'number',`${layer} should have an atlas row`);
  const atlas=path.join(root,'assets/buddy/turnaround/layers-atlas.png');
  assert.ok(fs.existsSync(atlas));
  assert.ok(fs.statSync(atlas).size>0);
});