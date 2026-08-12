import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;
const angles = [0,45,90,135,180,225,270,315];
const slugs = ['front','left-quarter-front','left-side','left-quarter-rear','rear','right-quarter-rear','right-side','right-quarter-front'];

test('turnaround maps eight angles to eight separate authored PNG files', () => {
  assert.equal(character.TURNAROUND_VIEWS.length,8);
  assert.deepEqual(Array.from(character.TURNAROUND_VIEWS,view=>view.angle),angles);
  assert.deepEqual(Array.from(character.TURNAROUND_VIEWS,view=>view.slug),slugs);
  assert.equal(new Set(Array.from(character.TURNAROUND_VIEWS,view=>view.file)).size,8);
});

test('character manifest uses one frame and bottom-center anchor', () => {
  assert.equal(character.FRAME.width,256);
  assert.equal(character.FRAME.height,640);
  assert.equal(character.FRAME.anchor.x,128);
  assert.equal(character.FRAME.anchor.y,640);
  assert.equal(character.FRAME.anchor.name,'bottom-center');
  assert.deepEqual(Array.from(character.LAYER_ORDER),['top','bottom','footwear']);
});

test('rendering emits ordinary aligned image layers with no SVG masks', () => {
  for (const [index,angle] of angles.entries()) {
    const markup=character.renderCharacter(state.buddy,{angle});
    assert.match(markup,new RegExp(`data-source-path="assets/buddy/turnaround/views/${slugs[index]}\\.png"`));
    assert.equal((markup.match(/<img\b/g)||[]).length,4);
    assert.match(markup,/data-character-layer="top"/);
    assert.match(markup,/data-character-layer="bottom"/);
    assert.match(markup,/data-character-layer="footwear"/);
    assert.match(markup,/data-anchor="bottom-center"/);
    assert.doesNotMatch(markup,/<svg\b|<mask\b|layers-atlas\.png|\.webp/);
    assert.doesNotMatch(markup,/undefined|NaN/);
  }
});

test('clearing wardrobe layers leaves only the authored body image', () => {
  Object.assign(state.buddy.appearance,{top:'none',bottom:'none',footwear:'none'});
  const markup=character.renderCharacter(state.buddy);
  assert.equal((markup.match(/<img\b/g)||[]).length,1);
  assert.match(markup,/data-character-layer="body"/);
});

test('all eight authored body PNG files exist', () => {
  for (const slug of slugs) {
    const file=path.join(root,'assets/buddy/turnaround/views',`${slug}.png`);
    assert.ok(fs.existsSync(file),`${slug}.png should exist`);
    const data=fs.readFileSync(file);
    assert.ok(data.length>1000,`${slug}.png should contain image data`);
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  }
});
